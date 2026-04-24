import * as cheerio from 'cheerio';

const asSingleValue = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeText = (value = '') =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const clampText = (value = '', max = 10000) => value.slice(0, max);

const BOILERPLATE_START_MARKERS = [
  'Do Not Process My Personal Information',
  'Personal Data Processing Opt Outs',
  'I want to opt-out',
  'RESUMEN DE AUDIO (GENERADO POR IA)',
  'Latest stories',
  'Historias Relacionadas',
  'Previous article',
  'Next article',
  'Ultimas entradas',
  'Últimas entradas',
  'All Rights Reserved',
  'Todos los derechos reservados',
  'We use cookies',
  'Do Not Sell My Data',
  'Gracias por compartir',
  'UNLOCK ALL',
  'Sign in',
];

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

const stripLeadingBoilerplate = (value = '') => {
  const lines = value.split('\n');
  let startIndex = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    const isBoilerplate = BOILERPLATE_START_MARKERS.some((marker) =>
      line.toLowerCase().includes(marker.toLowerCase())
    );

    if (isBoilerplate || /^#\s/.test(line) || /^\[.*\]\(https?:\/\//.test(line)) {
      startIndex = i + 1;
      continue;
    }

    break;
  }

  return lines.slice(startIndex).join('\n');
};

const cutAtMarker = (value = '', markers = []) => {
  let cutIndex = -1;

  markers.forEach((marker) => {
    const idx = value.toLowerCase().indexOf(marker.toLowerCase());
    if (idx > 0 && (cutIndex === -1 || idx < cutIndex)) {
      cutIndex = idx;
    }
  });

  if (cutIndex > 0) return value.slice(0, cutIndex);
  return value;
};

const cleanupProxyText = (targetUrl, rawText = '') => {
  let text = rawText;

  text = text
    .replace(/(^|\n)Title:\s.*?(\n|$)/g, '\n')
    .replace(/(^|\n)URL Source:\s.*?(\n|$)/g, '\n')
    .replace(/(^|\n)Warning:\s.*?(\n|$)/g, '\n')
    .replace(/(^|\n)Markdown Content:\s*(\n|$)/g, '\n');

  text = text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^\*\s+\[/.test(trimmed)) return false;
      if (/^\[[^\]]+\]\(https?:\/\//.test(trimmed)) return false;
      return true;
    })
    .join('\n');

  text = stripLeadingBoilerplate(text);

  let host = '';
  try {
    host = new URL(targetUrl).hostname.toLowerCase();
  } catch {
    host = '';
  }

  if (host.includes('holanews.com')) {
    const startMatch = text.match(/[A-ZÁÉÍÓÚÑ][^\n]{2,},\s*\d{1,2}\s+[A-Za-záéíóúñ]+\s*\(EFE\)\.-/i);
    if (startMatch?.index >= 0) {
      text = text.slice(startMatch.index);
    }

    const endMarkers = [
      'Previous article',
      'Next article',
      'Historias Relacionadas',
      'Latest stories',
      'Subscribe',
      'All Rights Reserved',
    ];
    text = cutAtMarker(text, endMarkers);
  }

  if (host.includes('efe.com')) {
    const datelineStart = text.match(/[A-ZÁÉÍÓÚÑa-záéíóúñ\s.'-]+\(EFE\)\.-/);
    if (datelineStart?.index >= 0) {
      text = text.slice(datelineStart.index);
    }

    text = cutAtMarker(text, [
      'Últimas entradas',
      'Ultimas entradas',
      'Todos los derechos reservados',
      'Do Not Sell My Data',
      'We use cookies',
      'Gracias por compartir',
      'Volver arriba',
    ]);
  }

  if (/too many requests|rate-limited/i.test(text)) return '';

  const normalized = normalizeText(text);
  return dedupeParagraphs(normalized);
};

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
      return;
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
  if (mergedText) return dedupeParagraphs(mergedText);
  return dedupeParagraphs(normalizeText(container.text()));
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
    const rawText = await response.text();
    const plainText = cleanupProxyText(targetUrl, rawText);
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

    if (!response.ok) {
      const fullTextFromProxyOnError = await extractUsingReadableProxy(targetUrl);
      if (fullTextFromProxyOnError) {
        return res.status(200).json({ fullText: clampText(fullTextFromProxyOnError) });
      }
      return emptyResponse(res);
    }

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
