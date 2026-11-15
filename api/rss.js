import { XMLParser } from 'fast-xml-parser';
import { secureFetch, SecureFetchError, validateUrl } from '../src/lib/secureFetch.js';
import { configurarCors } from '../src/lib/cors.js';
import { htmlToPlainText, normalizeText } from '../src/lib/textUtil.js';
import { FUENTES_RSS } from '../src/config/fuentes-rss.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: false,
});

// Tiempo de espera por feed: presupuesto total que incluye redirecciones y
// lectura del cuerpo. 8s equilibra la latencia fria con sitios cubanos
// notoriamente lentos (~5-7s) sin acercarse al limite de la serverless function.
const TIEMPO_ESPERA_FEED_MS = 8000;

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const pickText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (typeof value['#text'] === 'string') return value['#text'];
    if (typeof value['@_href'] === 'string') return value['@_href'];
  }
  return '';
};

const pickLink = (item) => {
  if (!item) return '';

  const link = item.link;
  if (!link) return '';

  if (typeof link === 'string') return link;
  if (typeof link === 'object' && typeof link['@_href'] === 'string') return link['@_href'];

  const linkArray = asArray(link);
  const withHref = linkArray.find((entry) => typeof entry?.['@_href'] === 'string');
  if (withHref) return withHref['@_href'];

  const withText = linkArray.find((entry) => typeof entry?.['#text'] === 'string');
  return withText ? withText['#text'] : '';
};

const pickImage = (item) => {
  const mediaContent = asArray(item?.['media:content'])[0];
  if (mediaContent?.['@_url']) return mediaContent['@_url'];

  const enclosure = asArray(item?.enclosure)[0];
  if (enclosure?.['@_url']) return enclosure['@_url'];

  const mediaThumbnail = asArray(item?.['media:thumbnail'])[0];
  if (mediaThumbnail?.['@_url']) return mediaThumbnail['@_url'];

  return null;
};

// Cache en memoria por feed: la rama RSS de /api/news consulta todos los feeds
// en cada request, lo que multiplica latencia y peticiones salientes. TTL corto
// porque las noticias son frescas; en Vercel la memoria es por instancia, asi
// que el cache amortiza las requests repetidas dentro de la misma instancia.
// Solo se cachean respuestas con contenido: los fallos transitorios no se
// envenenan y quedan disponibles para un reintento inmediato.
const CACHE_FEED_TTL_MS = 90 * 1000;
const cacheFeeds = new Map();

const leerCacheFeed = (feedUrl) => {
  const entrada = cacheFeeds.get(feedUrl);
  if (!entrada) return null;
  if (Date.now() - entrada.ts > CACHE_FEED_TTL_MS) {
    cacheFeeds.delete(feedUrl);
    return null;
  }
  // Copia superficial del arreglo para que el llamador no mutue la cache.
  return { ...entrada.payload, results: [...entrada.payload.results] };
};

const guardarCacheFeed = (feedUrl, payload) => {
  if (cacheFeeds.size > 100) cacheFeeds.clear();
  cacheFeeds.set(feedUrl, { ts: Date.now(), payload });
};

// Descarga y parsea un feed RSS aplicando los controles de SSRF.
// Usado tanto por el handler /api/rss como por el fallback de /api/news.
export const fetchFeed = async (feedUrl, config = {}) => {
  // validateUrl lanza SecureFetchError (400/403/502) para URLs invalidas o no permitidas.
  validateUrl(feedUrl);

  const enCache = leerCacheFeed(feedUrl);
  if (enCache) return enCache;

  let response;
  try {
    response = await secureFetch(feedUrl, {
      tiempoEsperaMs: TIEMPO_ESPERA_FEED_MS,
      senalExterna: config?.senal,
    });
  } catch (error) {
    if (error instanceof SecureFetchError && (error.statusCode === 400 || error.statusCode === 403)) {
      throw error;
    }
    const sinServicio = { results: [], message: 'Feed no disponible', statusCode: 200 };
    return sinServicio;
  }

  const parsed = parser.parse(response.body);
  const channel = parsed?.rss?.channel || parsed?.feed;
  if (!channel) {
    const noReconocido = { results: [], message: 'Formato RSS no reconocido', statusCode: 200 };
    return noReconocido;
  }

  const items = channel?.item || channel?.entry || [];
  const itemArray = asArray(items);

  const sourceName = pickText(channel?.title) || new URL(feedUrl).hostname;
  const sourceDomain = new URL(feedUrl).hostname;

  // Los feeds de Google News (site:) agrupan el sitio real; para diferenciar
  // las fuentes en las cards se muestra el nombre configurado seguido de
  // "(news.google.com)". Los demas feeds conservan su comportamiento.
  const nombreGoogle = sourceDomain === 'news.google.com' && config?.nombre
    ? `${config.nombre} (news.google.com)`
    : '';

  // Función auxiliar para verificar si una URL debe ser excluida
  const shouldExcludeUrl = (url) => {
    if (!config.excludePatterns || !Array.isArray(config.excludePatterns)) return false;
    return config.excludePatterns.some(pattern => url.includes(pattern));
  };

  const results = itemArray
    .filter(item => {
      const link = pickLink(item);
      return !shouldExcludeUrl(link);
    })
    .slice(0, 20)
    .map((item) => {
      const descripcion = pickText(item?.description) || pickText(item?.summary) || '';
      const contentEncoded = pickText(item?.['content:encoded']) || '';
      // Punto 2.1: si el feed trae contenido completo (content:encoded con mas de ~500
      // caracteres limpios), se usa directamente y no hace falta scrapeo.
      // La descripcion se entrega como texto plano: los feeds de Google News
      // traen HTML crudo que de otra forma se mostraria escapado en la card.
      let description =
        contentEncoded && normalizeText(contentEncoded).length > 500
          ? htmlToPlainText(contentEncoded)
          : htmlToPlainText(descripcion || contentEncoded);

      // Google News anade el nombre de la fuente al final de la descripcion;
      // la card ya lo muestra, asi que se elimina esa cola redundante.
      if (nombreGoogle && config.nombre) {
        const cola = ` ${config.nombre.toLowerCase()}`;
        if (description.toLowerCase().endsWith(cola)) {
          description = description.slice(0, -cola.length).trim();
        }
      }

      return {
        title: pickText(item?.title),
        link: pickLink(item),
        pubDate: item?.pubDate || item?.published || item?.updated || '',
        description,
        image_url: pickImage(item),
        source_name: nombreGoogle || sourceName,
        source_domain: sourceDomain,
        source_id: nombreGoogle || sourceDomain,
        content_encoded: contentEncoded,
      };
    });

  const resultado = { results, message: '', statusCode: response.statusCode };
  if (results.length > 0) guardarCacheFeed(feedUrl, resultado);
  return resultado;
};

export default async function handler(req, res) {
  const esPreflight = configurarCors(req, res);
  if (esPreflight) return;

  const feedParam = Array.isArray(req.query.feed) ? req.query.feed[0] : req.query.feed;

  if (!feedParam) {
    return res.status(400).json({ status: 'error', message: 'Falta parametro feed' });
  }

  let feedUrl;
  try {
    feedUrl = decodeURIComponent(feedParam);
  } catch {
    return res.status(400).json({ status: 'error', message: 'Feed invalido' });
  }

  try {
    const config = FUENTES_RSS.find((f) => f.feed === feedUrl) || {};
    const { results, message, statusCode } = await fetchFeed(feedUrl, config);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(statusCode || 200).json({
      status: (statusCode && statusCode >= 400) ? 'error' : 'ok',
      results,
      ...(message ? { message } : {}),
    });
  } catch (error) {
    if (error instanceof SecureFetchError) {
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }

    res.setHeader('Cache-Control', 's-maxage=120');
    return res.status(200).json({ status: 'ok', results: [], message: 'No se pudo consultar el feed RSS' });
  }
}
