import cheerio from 'cheerio';

const asSingleValue = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeText = (value = '') =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();

const collectParagraphs = ($root) => {
  const chunks = [];

  $root.find('p').each((_, element) => {
    const paragraph = normalizeText(cheerio.load(element).text());
    if (paragraph.length >= 35) chunks.push(paragraph);
  });

  return chunks.join('\n\n');
};

const extractFromArticle = ($) => {
  let bestText = '';

  $('article').each((_, element) => {
    const articleText = collectParagraphs($(element));
    if (articleText.length > bestText.length) bestText = articleText;
  });

  return bestText;
};

const extractFallbackParagraphs = ($) => collectParagraphs($.root());

const jsonScrapeFailed = (res, message, extra = {}) =>
  res.status(200).json({
    status: 'ok',
    scraped: false,
    message,
    text: '',
    ...extra,
  });

export default async function handler(req, res) {
  const urlParam = asSingleValue(req.query.url);

  if (!urlParam) {
    return jsonScrapeFailed(res, 'Falta parametro url');
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(urlParam);
    new URL(targetUrl);
  } catch {
    return jsonScrapeFailed(res, 'URL invalida');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsAppScraper/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (response.status === 403) {
      return jsonScrapeFailed(res, 'El sitio bloqueo el scraping (403)', { httpStatus: 403 });
    }

    if (!response.ok) {
      return jsonScrapeFailed(res, `No se pudo obtener el articulo (HTTP ${response.status})`, {
        httpStatus: response.status,
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const articleText = extractFromArticle($);
    const fallbackText = articleText || extractFallbackParagraphs($);
    const finalText = normalizeText(fallbackText);

    if (!finalText || finalText.length < 120) {
      return jsonScrapeFailed(res, 'No se encontro texto util para extraer');
    }

    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(200).json({
      status: 'ok',
      scraped: true,
      message: 'Extraccion completada',
      text: finalText,
    });
  } catch (error) {
    return jsonScrapeFailed(res, error.message || 'Fallo inesperado durante el scraping');
  }
}
