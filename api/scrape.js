import cheerio from 'cheerio';

const asSingleValue = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeText = (value = '') =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const CONTENT_SELECTORS = [
  'article',
  '.post-content',
  '.entry-content',
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

const getParagraphsFromNode = ($, node) => {
  const chunks = [];

  node.find('p').each((_, element) => {
    const paragraph = normalizeText($(element).text());
    if (paragraph.length >= 40) chunks.push(paragraph);
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

  return normalizeText(paragraphs.join('\n\n'));
};

const emptyResponse = (res) => res.status(200).json({ fullText: '' });

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
      },
    });

    if (!response.ok) return emptyResponse(res);

    const html = await response.text();
    const $ = cheerio.load(html);

    cleanDom($);
    const fullText = extractFullText($);

    if (!fullText || fullText.length < 120) return emptyResponse(res);

    return res.status(200).json({ fullText });
  } catch {
    return emptyResponse(res);
  }
}
