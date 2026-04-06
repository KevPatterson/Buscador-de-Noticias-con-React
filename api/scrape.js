import * as cheerio from 'cheerio';

const asSingleValue = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeText = (value = '') =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const clampText = (value = '', max = 10000) => value.slice(0, max);

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
  '[id*="ad-"]',
  '[class*=" ad-"]',
  '[class*="ads"]',
  '[class*="banner"]',
  '[class*="sponsor"]',
];

const cleanDom = ($) => {
  NOISE_SELECTORS.forEach((selector) => {
    $(selector).remove();
  });
};

const walkJson = (value, collector) => {
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, collector));
    return;
  }

  if (!value || typeof value !== 'object') return;

  const type = String(value['@type'] || '').toLowerCase();
  const candidate = value.articleBody || value.text;

  if ((type.includes('article') || type.includes('newsarticle')) && typeof candidate === 'string') {
    const cleaned = normalizeText(candidate);
    if (cleaned.length > 120) collector.push(cleaned);
  }

  Object.values(value).forEach((nested) => walkJson(nested, collector));
};

const extractFromJsonLd = ($) => {
  const candidates = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      walkJson(parsed, candidates);
    } catch {
      // Ignorar bloques JSON-LD invalidos.
    }
  });

  return candidates.sort((a, b) => b.length - a.length)[0] || '';
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
  if (mergedText) return mergedText;
  return normalizeText(container.text());
};

const emptyResponse = (res) => res.status(200).json({ fullText: '' });

const extractUsingReadableProxy = async (targetUrl) => {
  try {
    const cleanTarget = targetUrl.replace(/^https?:\/\//i, '');
    const proxyUrl = `https://r.jina.ai/http://${cleanTarget}`;
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsAppScraper/1.0)',
        Accept: 'text/plain',
      },
    });

    if (!response.ok) return '';
    const plainText = normalizeText(await response.text());
    return plainText.length >= 220 ? plainText : '';
  } catch {
    return '';
  }
};

export default async function handler(req, res) {
  const urlParam = asSingleValue(req.query.url);

  if (!urlParam) return emptyResponse(res);

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(urlParam);
    new URL(targetUrl);
  } catch {
    return emptyResponse(res);
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsAppScraper/1.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) return emptyResponse(res);

    const html = await response.text();
    const $ = cheerio.load(html);

    const fullTextFromJsonLd = extractFromJsonLd($);
    if (fullTextFromJsonLd) {
      return res.status(200).json({ fullText: clampText(fullTextFromJsonLd) });
    }

    cleanDom($);
    const fullText = extractFullText($);

    if (fullText) return res.status(200).json({ fullText: clampText(fullText) });

    const fullTextFromProxy = await extractUsingReadableProxy(targetUrl);
    if (fullTextFromProxy) return res.status(200).json({ fullText: clampText(fullTextFromProxy) });

    return emptyResponse(res);
  } catch {
    return emptyResponse(res);
  }
}
