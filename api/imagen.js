import * as cheerio from 'cheerio';
import { secureFetch, SecureFetchError, validateUrl } from '../src/lib/secureFetch.js';
import { configurarCors } from '../src/lib/cors.js';

const asSingleValue = (value) => (Array.isArray(value) ? value[0] : value);

// Cache en memoria: la imagen de un articulo cambia poco y evita repetir el
// scrapeo cuando varias cards de la misma noticia entran en pantalla.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAXIMO_ENTRADAS = 500;
const cacheImagenes = new Map(); // url -> { ts, imagen }

const leerCache = (url) => {
  const entrada = cacheImagenes.get(url);
  if (!entrada) return null;
  if (Date.now() - entrada.ts > CACHE_TTL_MS) {
    cacheImagenes.delete(url);
    return null;
  }
  return entrada.imagen;
};

const guardarCache = (url, imagen) => {
  if (cacheImagenes.size >= MAXIMO_ENTRADAS) {
    const primeraClave = cacheImagenes.keys().next().value;
    cacheImagenes.delete(primeraClave);
  }
  cacheImagenes.set(url, { ts: Date.now(), imagen });
};

const resolverAbsoluta = (valor, base) => {
  if (!valor) return '';
  try {
    const url = new URL(valor, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

const extraerImagen = (html, baseUrl) => {
  const $ = cheerio.load(html);
  const candidatos = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[property="og:image:url"]').attr('content'),
    $('meta[property="og:image:secure_url"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('meta[name="twitter:image:src"]').attr('content'),
  ];

  // JSON-LD: el campo image puede ser string, { url } o arreglo de strings.
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text();
    if (!raw) return;

    try {
      const walk = (valor) => {
        if (!valor || typeof valor !== 'object') return;
        if (Array.isArray(valor)) {
          valor.forEach(walk);
          return;
        }

        const imagen = valor.image;
        if (typeof imagen === 'string') {
          candidatos.push(imagen);
        } else if (Array.isArray(imagen)) {
          imagen.forEach((item) => {
            if (typeof item === 'string') candidatos.push(item);
            else if (item?.url) candidatos.push(item.url);
          });
        } else if (imagen?.url) {
          candidatos.push(imagen.url);
        }

        Object.values(valor).forEach(walk);
      };
      walk(JSON.parse(raw));
    } catch {
      return;
    }
  });

  for (const candidato of candidatos) {
    const absoluta = resolverAbsoluta(candidato, baseUrl);
    if (absoluta) return absoluta;
  }

  return '';
};

export default async function handler(req, res) {
  const esPreflight = configurarCors(req, res);
  if (esPreflight) return;

  const urlParam = asSingleValue(req.query.url);
  if (!urlParam) {
    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(400).json({ status: 'error', imagen: '' });
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(urlParam);
    validateUrl(targetUrl);
  } catch (error) {
    res.setHeader('Cache-Control', 's-maxage=300');
    const status = error instanceof SecureFetchError && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode
      : 200;
    return res.status(status).json({ status: 'error', imagen: '' });
  }

  const enCache = leerCache(targetUrl);
  if (enCache !== null) {
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ status: 'ok', imagen: enCache, cache: true });
  }

  try {
    const { body } = await secureFetch(targetUrl, { tiempoEsperaMs: 6000 });
    const imagen = extraerImagen(body, targetUrl);
    guardarCache(targetUrl, imagen);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ status: 'ok', imagen });
  } catch {
    // Un fallo de red no se cachea: la card puede reintentar mas tarde.
    res.setHeader('Cache-Control', 's-maxage=120');
    return res.status(200).json({ status: 'ok', imagen: '' });
  }
}
