import { XMLParser } from 'fast-xml-parser';
import { secureFetch, SecureFetchError, validateUrl } from '../src/lib/secureFetch.js';
import { configurarCors } from '../src/lib/cors.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: false,
});

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

// Descarga y parsea un feed RSS aplicando los controles de SSRF.
// Usado tanto por el handler /api/rss como por el fallback de /api/news.
export const fetchFeed = async (feedUrl) => {
  // validateUrl lanza SecureFetchError (400/403/502) para URLs invalidas o no permitidas.
  validateUrl(feedUrl);

  let response;
  try {
    response = await secureFetch(feedUrl);
  } catch (error) {
    if (error instanceof SecureFetchError && (error.statusCode === 400 || error.statusCode === 403)) {
      throw error;
    }
    return { results: [], message: 'Feed no disponible', statusCode: 200 };
  }

  const parsed = parser.parse(response.body);
  const channel = parsed?.rss?.channel || parsed?.feed;
  if (!channel) {
    return { results: [], message: 'Formato RSS no reconocido', statusCode: 200 };
  }

  const items = channel?.item || channel?.entry || [];
  const itemArray = asArray(items);

  const sourceName = pickText(channel?.title) || new URL(feedUrl).hostname;
  const sourceDomain = new URL(feedUrl).hostname;

  const results = itemArray.slice(0, 20).map((item) => {
    const descripcion = pickText(item?.description) || pickText(item?.summary) || '';
    const contentEncoded = pickText(item?.['content:encoded']) || '';
    // Punto 2.1: si el feed trae contenido completo (content:encoded con mas de ~500
    // caracteres limpios), se usa directamente y no hace falta scrapeo.
    const description =
      contentEncoded && normalizeText(contentEncoded).length > 500
        ? contentEncoded
        : descripcion || contentEncoded;

    return {
      title: pickText(item?.title),
      link: pickLink(item),
      pubDate: item?.pubDate || item?.published || item?.updated || '',
      description,
      image_url: pickImage(item),
      source_name: sourceName,
      source_domain: sourceDomain,
      source_id: sourceDomain,
      content_encoded: contentEncoded,
    };
  });

  return { results, message: '', statusCode: response.statusCode };
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
    const { results, message, statusCode } = await fetchFeed(feedUrl);
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
