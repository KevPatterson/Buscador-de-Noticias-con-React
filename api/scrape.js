import * as cheerio from 'cheerio';
import { secureFetch, SecureFetchError, validateUrl } from '../src/lib/secureFetch.js';
import { configurarCors } from '../src/lib/cors.js';

const asSingleValue = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeText = (value = '') =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const clampText = (value = '', max = 10000) => value.slice(0, max);

const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'canvas',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  'menu',
  '[role="navigation"]',
  '.menu',
  '.nav',
  '.navbar',
  '.header',
  '.footer',
  '.breadcrumbs',
  '.share',
  '.social',
  '.related',
  '.comments',
  '.comment',
  '.popup',
  '.modal',
  '.ads',
  'ads',
  '.ad',
  '.advertisement',
  '.sponsored',
  '.promo',
  '.cookie',
  '[id^="ad-"]',
  '[class*=" ad-"]',
  '[class*="ads"]',
  '[class*="banner"]',
  '[class*="sponsor"]',
];

const cleanDom = ($) => {
  NOISE_SELECTORS.forEach((selector) => {
    $(selector).remove();
  });
  // Eliminar nodos de comentario HTML restantes.
  $('*').contents().each((_, node) => {
    if (node.nodeType === 8) $(node).remove();
  });
};

const normalizeForCompare = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim();

const dedupeParagraphs = (value = '') => {
  const seen = new Set();
  const result = [];

  value.split(/\n{2,}/).forEach((paragraph) => {
    const cleanParagraph = normalizeText(paragraph);
    if (!cleanParagraph) return;

    const key = normalizeForCompare(cleanParagraph);
    if (!key || seen.has(key)) return;

    seen.add(key);
    result.push(cleanParagraph);
  });

  return result.join('\n\n');
};

const walkJson = (value, collector) => {
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, collector));
    return;
  }

  if (!value || typeof value !== 'object') return;

  const type = String(value['@type'] || '').toLowerCase();
  const candidate = value.articleBody || value.text;

  if (
    (type.includes('article') || type.includes('newsarticle') || type.includes('reportage')) &&
    typeof candidate === 'string'
  ) {
    const cleaned = normalizeText(candidate);
    if (cleaned.length > 120) collector.push(cleaned);
  }

  Object.values(value).forEach((nested) => walkJson(nested, collector));
};

const extractFromJsonLd = ($) => {
  const candidatos = { cuerpo: '', titulo: '', fecha: '', autor: '', imagen: '' };

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text() || $(element).text();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const cuerpos = [];
      walkJson(parsed, cuerpos);

      if (cuerpos.length > 0 && cuerpos[0].length > candidatos.cuerpo.length) {
        candidatos.cuerpo = cuerpos[0];
        candidatos.titulo = parsed.headline || candidatos.titulo;
        candidatos.fecha = parsed.datePublished || candidatos.fecha;
        candidatos.autor =
          parsed.author && typeof parsed.author === 'object' ? parsed.author.name : parsed.author || candidatos.autor;
        candidatos.imagen = parsed.image || candidatos.imagen;
      }
    } catch {
      return;
    }
  });

  return candidatos;
};

const getParagraphsFromNode = ($, node) => {
  const chunks = [];

  node.find('p').each((_, element) => {
    const paragraph = normalizeText($(element).text());
    if (paragraph.length >= 20) chunks.push(paragraph);
  });

  return chunks;
};

const getMainContainer = ($) => {
  const CONTENT_SELECTORS = [
    'article',
    '.main-content',
    '.post-content',
    '.entry-content',
    '#article-body',
    '[itemprop="articleBody"]',
    '.article-content',
    '.news-content',
    '.story-body',
    'main article',
  ];

  for (const selector of CONTENT_SELECTORS) {
    const candidate = $(selector).first();
    if (!candidate.length) continue;

    const paragraphs = getParagraphsFromNode($, candidate);
    if (paragraphs.length >= 2) return candidate;
  }

  const body = $('body').first();
  return body.length ? body : $.root();
};

const extractFullText = ($) => {
  const container = getMainContainer($);
  let paragraphs = getParagraphsFromNode($, container);

  if (paragraphs.length === 0) {
    paragraphs = getParagraphsFromNode($, $('body'));
  }

  if (paragraphs.length === 0) {
    return normalizeText(container.text());
  }

  const mergedText = normalizeText(paragraphs.join('\n\n'));
  if (mergedText) return dedupeParagraphs(mergedText);
  return dedupeParagraphs(normalizeText(container.text()));
};

const normalizeDate = (value) => {
  if (!value) return '';
  const fecha = new Date(value);
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toISOString();
};

const resolverURL = (valor, baseUrl) => {
  if (!valor) return '';
  try {
    return new URL(valor, baseUrl).href;
  } catch {
    return '';
  }
};

const extraerMetadatos = ($, baseUrl) => {
  const attr = (selector, nombre) => $(selector).attr(nombre) || '';
  const meta = (nombre) => attr(`meta[name="${nombre}"]`, 'content');
  const metaProperty = (propiedad) => attr(`meta[property="${propiedad}"]`, 'content');

  const titulo =
    metaProperty('og:title') ||
    meta('twitter:title') ||
    $('title').text().trim() ||
    '';

  const fecha =
    normalizeDate(metaProperty('article:published_time')) ||
    normalizeDate(meta('date')) ||
    '';

  const autor = metaProperty('article:author') || meta('author') || '';

  const imagen = resolverURL(metaProperty('og:image') || meta('twitter:image') || '', baseUrl);

  const descripcion = metaProperty('og:description') || meta('description') || '';

  return { titulo, fecha, autor, imagen, descripcion };
};

const obtenerUrlCanonica = ($, baseUrl) => {
  const href = $('link[rel="canonical"]').attr('href');
  return resolverURL(href, baseUrl);
};

export default async function handler(req, res) {
  const esPreflight = configurarCors(req, res);
  if (esPreflight) return;

  const urlParam = asSingleValue(req.query.url);

  if (!urlParam) {
    return res.status(400).json({ status: 'error', message: 'Falta el parametro url' });
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(urlParam);
    new URL(targetUrl);
  } catch {
    return res.status(400).json({ status: 'error', message: 'URL invalida' });
  }

  try {
    // validateUrl dentro de secureFetch aplica: esquema http/https, sin credenciales,
    // maximo 2048 caracteres, allowlist de dominios y bloqueo de IPs privadas.
    const response = await secureFetch(targetUrl);
    const $ = cheerio.load(response.body);

    const metadatos = extraerMetadatos($, response.finalUrl);
    const urlCanonica = obtenerUrlCanonica($, response.finalUrl) || response.finalUrl;

    let cuerpo = extractFromJsonLd($).cuerpo;
    let metodo = 'json-ld';
    let calidad = cuerpo.length >= 300 ? 'alta' : 'baja';

    if (!cuerpo || cuerpo.length < 300) {
      cleanDom($);
      cuerpo = extractFullText($);
      metodo = 'heuristica';
      calidad = cuerpo.length >= 300 ? 'media' : 'baja';
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      status: 'ok',
      titulo: metadatos.titulo,
      cuerpo: clampText(cuerpo),
      fecha: metadatos.fecha,
      autor: metadatos.autor,
      imagen: metadatos.imagen,
      urlCanonica,
      metodo,
      calidad,
    });
  } catch (error) {
    if (error instanceof SecureFetchError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }

    return res.status(502).json({ status: 'error', message: 'No se pudo extraer el articulo' });
  }
}
