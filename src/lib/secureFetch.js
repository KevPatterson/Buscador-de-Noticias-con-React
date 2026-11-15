// Cliente de fetch con controles de SSRF para las serverless functions de CUBAPRESS.
//
// Valida el dominio contra la allowlist derivada de src/config, resuelve el DNS
// antes de conectar, bloquea direcciones privadas, de loopback y link-local, sigue
// las redirecciones de forma manual revalidando dominio e IP en cada salto, y limita
// el tiempo de espera y el tamano de la respuesta.
//
// Errores: lanza SecureFetchError con codigo de estado y mensaje generico (sin stack
// traces ni detalles internos).
import { URL } from 'url';
import { lookup as dnsLookupCb } from 'dns';
import { promisify } from 'util';
import iconv from 'iconv-lite';

import { DOMINIOS_ADICIONALES, DOMINIOS_PREFERIDOS } from '../config/fuentes.js';
import { FUENTES_RSS } from '../config/fuentes-rss.js';

const dnsLookup = promisify(dnsLookupCb);

// Dominios permitidos: dominios de fuentes configuradas, hostnames de los feeds RSS
// y el redireccionador de Google News (usado por algunos feeds configurados).
const FEED_HOSTS = FUENTES_RSS.map((fuente) => {
  try {
    return new URL(fuente.feed).hostname.toLowerCase();
  } catch {
    return '';
  }
}).filter(Boolean);

export const ALLOWED_DOMAINS = [...new Set([
  ...DOMINIOS_PREFERIDOS.map((dominio) => dominio.toLowerCase()),
  ...DOMINIOS_ADICIONALES.map((dominio) => dominio.toLowerCase()),
  ...FEED_HOSTS,
  'news.google.com',
])];

export const isHostAllowed = (hostname) => {
  const host = String(hostname || '').toLowerCase();
  return ALLOWED_DOMAINS.some((dominio) => host === dominio || host.endsWith(`.${dominio}`));
};

const ipv4ANumero = (ip) => ip.split('.').map((parte) => Number.parseInt(parte, 10)).reduce((acumulado, valor) => acumulado * 256 + valor, 0);

const estaEnRango = (numero, inicio, fin) => numero >= inicio && numero <= fin;

const esIpv4Bloqueada = (ip) => {
  const partes = ip.split('.');
  if (
    partes.length !== 4 ||
    partes.some((parte) => {
      const numero = Number.parseInt(parte, 10);
      return Number.isNaN(numero) || numero < 0 || numero > 255;
    })
  ) {
    return false;
  }
  const numero = ipv4ANumero(ip);
  return (
    // 0.0.0.0/8 (incluye 0.0.0.0)
    estaEnRango(numero, 0x00000000, 0x00FFFFFF) ||
    // 10.0.0.0/8
    estaEnRango(numero, 0x0A000000, 0x0AFFFFFF) ||
    // 100.64.0.0/10 (CGNAT compartido)
    estaEnRango(numero, 0x64400000, 0x647FFFFF) ||
    // 127.0.0.0/8 (loopback)
    estaEnRango(numero, 0x7F000000, 0x7FFFFFFF) ||
    // 169.254.0.0/16 (link-local, incluye metadata de nube 169.254.169.254)
    estaEnRango(numero, 0xA9FE0000, 0xA9FEFFFF) ||
    // 172.16.0.0/12
    estaEnRango(numero, 0xAC100000, 0xAC1FFFFF) ||
    // 192.0.0.0/24 (asignaciones especiales)
    estaEnRango(numero, 0xC0000000, 0xC00000FF) ||
    // 192.0.2.0/24 (documentacion)
    estaEnRango(numero, 0xC0000200, 0xC00002FF) ||
    // 192.168.0.0/16
    estaEnRango(numero, 0xC0A80000, 0xC0A8FFFF) ||
    // 198.18.0.0/15 (benchmarking)
    estaEnRango(numero, 0xC6120000, 0xC613FFFF) ||
    // 198.51.100.0/24 (documentacion)
    estaEnRango(numero, 0xC6336400, 0xC63364FF) ||
    // 203.0.113.0/24 (documentacion)
    estaEnRango(numero, 0xCB007100, 0xCB0071FF) ||
    // 224.0.0.0/4 (multicast)
    estaEnRango(numero, 0xE0000000, 0xEFFFFFFF) ||
    // 240.0.0.0/4 (reservado) y 255.255.255.255 (broadcast)
    estaEnRango(numero, 0xF0000000, 0xFFFFFFFF)
  );
};

// Convierte una IPv6 con IPv4 embebida (::ffff:127.0.0.1 o ::ffff:7f00:1)
// a su representacion IPv4 para reutilizar el bloqueo de rangos.
const ipv4DesdeIpv6Mapeada = (ip) => {
  const lower = String(ip).toLowerCase();
  if (!lower.startsWith('::ffff:')) return '';

  const resto = lower.slice('::ffff:'.length);
  if (resto.includes('.')) return resto;

  const grupos = resto.split(':');
  if (grupos.length !== 2) return '';
  const [alto, bajo] = grupos.map((grupo) => Number.parseInt(grupo, 16));
  if (!Number.isInteger(alto) || !Number.isInteger(bajo)) return '';

  return [alto >> 8, alto & 0xff, bajo >> 8, bajo & 0xff].join('.');
};

const esIpv6Bloqueada = (ip) => {
  const lower = String(ip).toLowerCase().replace(/^\[|\]$/g, '');

  // IPv4 embebida: se valida contra los mismos rangos que IPv4.
  const mapeada = ipv4DesdeIpv6Mapeada(lower);
  if (mapeada) return esIpv4Bloqueada(mapeada);

  if (lower === '::' || lower === '::1') return true; // no especificada y loopback
  // fc00::/7 direcciones unicast de ambito local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // fe80::/10 direcciones de enlace local
  if (['fe8', 'fe9', 'fea', 'feb'].some((prefijo) => lower.startsWith(prefijo))) return true;
  // ff00::/8 multicast
  if (lower.startsWith('ff')) return true;
  // 64:ff9b::/96 (NAT64)
  if (lower.startsWith('64:ff9b:')) return true;

  return false;
};

export const esIpBloqueada = (ip) => {
  if (typeof ip !== 'string' || !ip) return false;
  const limpia = ip.replace(/^\[|\]$/g, '');
  return limpia.includes(':') ? esIpv6Bloqueada(limpia) : esIpv4Bloqueada(limpia);
};

export class SecureFetchError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'SecureFetchError';
  }
}

export const validateUrl = (input) => {
  if (!input || typeof input !== 'string') {
    throw new SecureFetchError(400, 'Falta el parametro url');
  }

  let url;
  try {
    url = new URL(decodeURIComponent(input.trim()));
  } catch {
    throw new SecureFetchError(400, 'URL invalida');
  }

  const protocolo = url.protocol.replace(/:$/, '').toLowerCase();
  if (protocolo !== 'http' && protocolo !== 'https') {
    throw new SecureFetchError(400, 'Solo se permiten los esquemas http y https');
  }

  if (url.username || url.password) {
    throw new SecureFetchError(400, 'La URL no debe contener credenciales de usuario');
  }

  if (input.length > 2048) {
    throw new SecureFetchError(400, 'La URL excede los 2048 caracteres permitidos');
  }

  const host = url.hostname.toLowerCase();
  if (!isHostAllowed(host)) {
    throw new SecureFetchError(403, 'El dominio no esta en la lista de permitidos');
  }

  return url;
};

// Valida un destino completo (allowlist + DNS + bloqueo de IP privada).
// Se usa para validar cada salto de redireccion y es reutilizable en pruebas.
export const validarDestinoSeguro = async (input) => {
  const url = validateUrl(input);
  await resolveHost(url.hostname);
  return url;
};

// Limita una promesa con un temporizador que se limpia al resolver o fallar.
const conLimite = (promesa, tiempoEsperaMs, mensaje) =>
  new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => reject(new Error(mensaje)), tiempoEsperaMs);
    promesa.then(
      (valor) => {
        clearTimeout(temporizador);
        resolve(valor);
      },
      (error) => {
        clearTimeout(temporizador);
        reject(error);
      }
    );
  });

export const resolveHost = async (hostname) => {
  let info;
  try {
    // El DNS nativo no es cancelable: sin limite, un resolver colgado puede
    // bloquear la funcion mucho mas alla del timeout de la peticion HTTP.
    info = await conLimite(dnsLookup(hostname, { all: false }), 2500, 'DNS_TIMEOUT');
  } catch {
    throw new SecureFetchError(502, 'No se pudo resolver el dominio');
  }

  if (!info || !info.address) {
    throw new SecureFetchError(502, 'No se pudo resolver el dominio');
  }

  if (esIpBloqueada(info.address)) {
    throw new SecureFetchError(403, 'Direccion IP privada, de loopback o link-local no permitida');
  }

  return info;
};

const TIEMPO_ESPERA_MS = 10000;
const MAXIMO_BYTES = 2 * 1024 * 1024;
const MAXIMO_REDIRECTS = 3;
const USUARIO_AGENTE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MIMES_PERMITIDOS = [
  'text/html',
  'application/xhtml+xml',
  'application/xml',
  'text/xml',
  'application/rss+xml',
  'application/json',
  'text/plain',
];

const cabeceraBasica = (hostname) => ({
  'User-Agent': USUARIO_AGENTE,
  Accept: 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  Host: hostname,
});

const detectarCharset = (buffer, contentType) => {
  const matchCabecera = /charset\s*=\s*["']?([^\s"'<>;]+)/i.exec(contentType || '');
  if (matchCabecera) return matchCabecera[1];

  const inicio = iconv.decode(buffer.slice(0, 4096), 'latin1');
  const matchMeta = /<meta[^>]+charset=["']?([^\s"'/>]+)/i.exec(inicio) ||
    /<meta[^>]+http-equiv=["']content-type["'][^>]+content=["'][^"]*;\s*charset=([^"'<>;]+)/i.exec(inicio);
  if (matchMeta) return matchMeta[1];

  return 'utf-8';
};

const decodificarBuffer = (buffer, contentType) => {
  try {
    return iconv.decode(buffer, detectarCharset(buffer, contentType));
  } catch {
    return iconv.decode(buffer, 'utf-8');
  }
};

const leerCuerpoLimitado = async (response, maxBytes) => {
  const chunks = [];
  let total = 0;
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new SecureFetchError(413, 'La respuesta supera el tamano maximo permitido');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
};

export const secureFetch = async (input, opciones = {}) => {
  const {
    maxRedirects = MAXIMO_REDIRECTS,
    tiempoEsperaMs = TIEMPO_ESPERA_MS,
    maxBytes = MAXIMO_BYTES,
    senalExterna,
    metodo = 'GET',
    cuerpo,
    cabeceras = {},
    mimesPermitidos = MIMES_PERMITIDOS,
  } = opciones;
  const urlInicial = validateUrl(input);
  let urlActual = urlInicial;
  let saltos = 0;
  let metodoActual = String(metodo || 'GET').toUpperCase();
  let cuerpoActual = cuerpo;

  // Un solo temporizador para toda la operacion, incluidas las redirecciones y
  // la lectura del cuerpo: el timeout es un presupuesto total por fuente y no
  // se reinicia en cada salto.
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), tiempoEsperaMs);
  // Permite que el llamador imponga un presupuesto global (por ejemplo, la
  // rama RSS de /api/news) sin esperar al timeout individual de cada feed.
  const abortarPorSenalExterna = () => controlador.abort();
  if (senalExterna) {
    if (senalExterna.aborted) controlador.abort();
    else senalExterna.addEventListener('abort', abortarPorSenalExterna, { once: true });
  }
  const senal = controlador.signal;

  try {
    for (;;) {
      // Resuelve y valida la IP antes de cada salto (bloquea rangos privados).
      await resolveHost(urlActual.hostname);

      const cabecerasPeticion = { ...cabeceraBasica(urlActual.hostname), ...cabeceras };
      const opcionesFetch = {
        method: metodoActual,
        headers: cabecerasPeticion,
        signal: senal,
        redirect: 'manual',
      };
      if (cuerpoActual !== undefined && metodoActual !== 'GET' && metodoActual !== 'HEAD') {
        opcionesFetch.body = cuerpoActual;
      }

      let respuesta;

      try {
        // Se usa el hostname (no la IP) para evitar bucles de redireccion en
        // servidores que canonicalizan el Host. El DNS ya se valido y la
        // allowlist restringe los destinos posibles.
        respuesta = await fetch(urlActual.toString(), opcionesFetch);
      } catch (error) {
        if (error.name === 'AbortError') throw new SecureFetchError(504, 'Tiempo de espera agotado al conectar');
        throw new SecureFetchError(502, 'No se pudo acceder a la fuente');
      }

      if (respuesta.status >= 300 && respuesta.status < 400 && respuesta.status !== 304) {
        if (saltos >= maxRedirects) {
          throw new SecureFetchError(400, 'Demasiadas redirecciones');
        }
        const ubicacion = respuesta.headers.get('location');
        if (!ubicacion) {
          throw new SecureFetchError(400, 'Redireccion invalida');
        }
        const siguienteUrl = new URL(ubicacion, urlActual);
        if (!isHostAllowed(siguienteUrl.hostname.toLowerCase())) {
          throw new SecureFetchError(403, 'La redireccion apunta a un dominio no permitido');
        }
        // Revalida dominio e IP en cada salto para evitar DNS rebinding encadenado.
        await validarDestinoSeguro(siguienteUrl.href);
        // 303 y (301/302 con cuerpo) cambian a GET segun la semantica de fetch.
        if (
          respuesta.status === 303 ||
          ((respuesta.status === 301 || respuesta.status === 302) &&
            metodoActual !== 'GET' &&
            metodoActual !== 'HEAD')
        ) {
          metodoActual = 'GET';
          cuerpoActual = undefined;
        }
        urlActual = siguienteUrl;
        saltos += 1;
        continue;
      }

      if (!respuesta.ok || !respuesta.body) {
        throw new SecureFetchError(502, 'La fuente respondio con un error');
      }

      const contentType = (respuesta.headers.get('content-type') || '').toLowerCase();
      const mime = contentType.split(';')[0].trim();
      const mimePermitido =
        mimesPermitidos.includes(mime) || mime.endsWith('/rss') || mime.endsWith('+xml');
      if (!mimePermitido) {
        throw new SecureFetchError(400, 'Tipo de contenido no permitido');
      }

      const buffer = await leerCuerpoLimitado(respuesta, maxBytes);
      return {
        statusCode: respuesta.status,
        headers: Object.fromEntries(respuesta.headers.entries()),
        finalUrl: urlActual.href,
        body: decodificarBuffer(buffer, contentType),
      };
    }
  } finally {
    clearTimeout(temporizador);
    if (senalExterna) senalExterna.removeEventListener('abort', abortarPorSenalExterna);
  }
};
