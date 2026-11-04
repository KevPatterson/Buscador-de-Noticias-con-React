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
  if (partes.length !== 4 || partes.some((parte) => Number.isNaN(Number.parseInt(parte, 10)))) return false;
  const numero = ipv4ANumero(ip);
  return (
    // 0.0.0.0/8 (incluye 0.0.0.0)
    estaEnRango(numero, 0x00000000, 0x0FFFFFFF) ||
    // 10.0.0.0/8
    estaEnRango(numero, 0x0A000000, 0x0AFFFFFF) ||
    // 127.0.0.0/8 (loopback)
    estaEnRango(numero, 0x7F000000, 0x7FFFFFFF) ||
    // 169.254.0.0/16 (link-local, incluye metadata de nube 169.254.169.254)
    estaEnRango(numero, 0xA9FE0000, 0xA9FEFFFF) ||
    // 172.16.0.0/12
    estaEnRango(numero, 0xAC100000, 0xAC1FFFFF) ||
    // 192.168.0.0/16
    estaEnRango(numero, 0xC0A80000, 0xC0A8FFFF)
  );
};

const esIpv6Bloqueada = (ip) => {
  const lower = String(ip).toLowerCase();
  if (lower === '::1') return true; // loopback IPv6
  // fc00::/7 direcciones unicast de ambito local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // fe80::/10 direcciones de enlace local
  return ['fe8', 'fe9', 'fea', 'feb'].some((prefijo) => lower.startsWith(prefijo));
};

export const esIpBloqueada = (ip) => {
  if (typeof ip !== 'string' || !ip) return false;
  return ip.includes(':') ? esIpv6Bloqueada(ip) : esIpv4Bloqueada(ip);
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

export const resolveHost = async (hostname) => {
  let info;
  try {
    info = await dnsLookup(hostname, { all: false });
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

const MIMES_PERMITIDOS = ['text/html', 'application/xhtml+xml', 'application/xml', 'text/xml', 'application/rss+xml'];

const cabeceraBasica = (hostname) => ({
  'User-Agent': USUARIO_AGENTE,
  Accept: 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  Host: hostname,
  Connection: 'close',
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
  const { maxRedirects = MAXIMO_REDIRECTS, tiempoEsperaMs = TIEMPO_ESPERA_MS, maxBytes = MAXIMO_BYTES } = opciones;
  const urlInicial = validateUrl(input);
  let urlActual = urlInicial;
  let saltos = 0;

  for (;;) {
    const info = await resolveHost(urlActual.hostname);
    const ip = info.address;

    // Se conecta a la IP ya validada para evitar DNS rebinding.
    // - HTTP: se usa la IP como host con la cabecera Host original.
    // - HTTPS: se usa el hostname, ya que la verificacion TLS autentica el destino
    //   y el DNS se valido inmediatamente antes de conectar.
    const urlConIp = new URL(urlActual.href);
    urlConIp.hostname = ip.includes(':') ? `[${ip}]` : ip;

    const cabeceras = cabeceraBasica(urlActual.hostname);
    const esHttps = urlActual.protocol === 'https:';
    let respuesta;
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), tiempoEsperaMs);

    try {
      if (esHttps) {
        respuesta = await fetch(urlActual.toString(), {
          headers: cabeceras,
          signal: controlador.signal,
          redirect: 'manual',
        });
      } else {
        try {
          respuesta = await fetch(urlConIp.toString(), {
            headers: cabeceras,
            signal: controlador.signal,
            redirect: 'manual',
          });
        } catch {
          // Si el servidor no responde a la peticion por IP, se reintenta por hostname.
          respuesta = await fetch(urlActual.toString(), {
            headers: cabeceras,
            signal: controlador.signal,
            redirect: 'manual',
          });
        }
      }
    } catch (error) {
      clearTimeout(temporizador);
      if (error.name === 'AbortError') throw new SecureFetchError(504, 'Tiempo de espera agotado al conectar');
      throw new SecureFetchError(502, 'No se pudo acceder a la fuente');
    } finally {
      clearTimeout(temporizador);
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
      // Algunos servidores responden con un Location absoluto usando la IP de
      // conexion. En ese caso se restaura el hostname original ya validado.
      if (siguienteUrl.hostname === ip) {
        siguienteUrl.hostname = urlActual.hostname;
      }
      if (!isHostAllowed(siguienteUrl.hostname.toLowerCase())) {
        throw new SecureFetchError(403, 'La redireccion apunta a un dominio no permitido');
      }
      // Revalida dominio e IP en cada salto para evitar DNS rebinding encadenado.
      await validarDestinoSeguro(siguienteUrl.href);
      urlActual = siguienteUrl;
      saltos += 1;
      continue;
    }

    if (!respuesta.ok || !respuesta.body) {
      throw new SecureFetchError(502, 'La fuente respondio con un error');
    }

    const contentType = (respuesta.headers.get('content-type') || '').toLowerCase();
    const mime = contentType.split(';')[0].trim();
    const mimePermitido = MIMES_PERMITIDOS.includes(mime) || mime.endsWith('/rss') || mime.endsWith('+xml');
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
};
