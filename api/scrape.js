import * as cheerio from 'cheerio';
import { validateUrl } from '../src/lib/secureFetch.js';
import { configurarCors } from '../src/lib/cors.js';
import { DOMAIN_RULES } from '../config/extractors.js';

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

const isErrorPage = (html = '', status = 200) => {
  // Detecta páginas de error basándose en el contenido HTML
  // Solo rechaza si está CLARAMENTE en modo error
  if (status >= 400) return true;
  
  const htmlLower = html.toLowerCase();
  
  // Patrones MÁS ESPECÍFICOS que indican claramente una página de error
  const errorPatterns = [
    // 404/403 explícitos
    /404\s+(not\s+found|page\s+not\s+found)/i,
    /403\s+(forbidden|access\s+denied)/i,
    /<title>\s*404/i,
    /<title>\s*403/i,
    // Mensajes claros de error sin contenido
    /^<html>\s*<head>\s*<title>\s*404/i,
    /^<html>\s*<head>\s*<title>\s*403/i,
    // Página sin contenido (solo estructura)
    /\[dlm_no_access\]/i,  // Drupal no access shortcode
  ];
  
  // Si está en una lista de patrones claros, es un error
  const isError = errorPatterns.some(pattern => pattern.test(htmlLower));
  
  // Protección adicional: si el HTML tiene MUY poco contenido de texto
  // (menor a 200 caracteres sin tags) probablemente sea una página stub/error
  if (!isError && html.replace(/<[^>]*>/g, '').trim().length < 150) {
    // Pero si tiene contenido con palabras clave de artículo, no es error
    if (/página de ejemplo|está diferente|permanecerá/i.test(htmlLower)) {
      return false; // Es un artículo legítimo aunque corto
    }
    // Si tiene muy poco contenido Y patrones de error, rechaza
    if (/sin resumen|sin acceso|no encontrado|error/i.test(htmlLower)) {
      return true;
    }
  }
  
  return isError;
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

const cleanPressLatinFirstParagraph = (text = '') => {
  // Elimina el prefijo "Buenos Aires, 10 nov (Prensa Latina)" o similar
  // Patrón: "Lugar, X mes/día (Agencia) Texto inicial"
  // Captura: "Buenos Aires, 10 nov (Prensa Latina) " y lo elimina del primer párrafo
  const presensLatinPattern = /^([A-ZÁ][a-záéíóú\s'.-]*,\s*\d{1,2}\s+[A-Za-záéíóú]+\s*\([^)]*\)\s+)+/i;
  
  const paragraphs = text.split('\n\n');
  if (paragraphs.length === 0) return text;
  
  // Solo procesa el primer párrafo
  const firstParagraph = paragraphs[0];
  const cleanedFirst = firstParagraph.replace(presensLatinPattern, '').trim();
  
  // Si se eliminó algo, reemplaza el primer párrafo
  if (cleanedFirst !== firstParagraph.trim()) {
    const result = [cleanedFirst, ...paragraphs.slice(1)].join('\n\n');
    return result;
  }
  
  return text;
};

const splitRadioBayamoParagraphs = (text = '') => {
  // Radio Bayamo a veces extrae todo como un bloque
  // Intenta dividir por patrones naturales
  const paragraphs = text.split('\n\n');
  
  // Si ya hay múltiples párrafos bien formados, devuelve el texto original
  if (paragraphs.length > 3) return text;
  
  // Si el texto es muy corto, no intentes dividir
  if (text.length < 300) return text;
  
  // Divide por patrones naturales: punto seguido de mayúscula o punto-nueva línea
  // Usa límite de palabra para evitar dividir incorrectamente
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÁ])/);
  
  // Agrupa las oraciones en párrafos más lógicos (cada 2-4 oraciones dependiendo del tamaño)
  const groupedParagraphs = [];
  let currentGroup = [];
  let currentGroupLength = 0;
  const targetLength = 200; // Objetivo de caracteres por párrafo
  
  sentences.forEach((sentence) => {
    currentGroup.push(sentence);
    currentGroupLength += sentence.length;
    
    // Si alcanzamos el objetivo o tenemos 3 oraciones, agrupa
    if (currentGroupLength >= targetLength || currentGroup.length >= 3) {
      const paragraph = currentGroup.join(' ').trim();
      if (paragraph.length > 40) {
        groupedParagraphs.push(paragraph);
      }
      currentGroup = [];
      currentGroupLength = 0;
    }
  });
  
  // Agrega el último grupo si existe
  if (currentGroup.length > 0) {
    const lastParagraph = currentGroup.join(' ').trim();
    if (lastParagraph.length > 40) {
      groupedParagraphs.push(lastParagraph);
    }
  }
  
  // Si logramos crear múltiples párrafos bien formados, úsalos
  if (groupedParagraphs.length > 2) {
    return groupedParagraphs.join('\n\n');
  }
  
  return text;
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

  if (host.includes('prensa-latina.cu')) {
    // Limpia el prefijo de Prensa Latina del primer párrafo
    // Patrón más flexible: "Lugar, X mes (Agencia)"
    text = cleanPressLatinFirstParagraph(text);
  }

  if (host.includes('radiobayamo.icrt.cu')) {
    // Intenta dividir párrafos para Radio Bayamo
    text = splitRadioBayamoParagraphs(text);
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
  // Avoid matching ids that merely contain 'ad-' inside words (e.g. tdb-autoload-article)
  '[id^="ad-"]',
  '[class*=" ad-"]',
  '[class*="ads"]',
  '[class*="banner"]',
  '[class*="sponsor"]',
];

const cleanDom = ($, targetUrl = '') => {
  // Primero, aplicar removeSelectors específicos del dominio si existen
  let host = '';
  try {
    host = new URL(targetUrl).hostname.toLowerCase();
  } catch {
    host = '';
  }
  
  const domainRule = Object.keys(DOMAIN_RULES).find(domain => host.includes(domain));
  if (domainRule && DOMAIN_RULES[domainRule].removeSelectors) {
    DOMAIN_RULES[domainRule].removeSelectors.forEach((selector) => {
      $(selector).remove();
    });
  }
  
  // Luego, aplicar selectores globales
  NOISE_SELECTORS.forEach((selector) => {
    $(selector).remove();
  });
};

const extraerMetadatosJsonLd = ($) => {
  const metadatos = { titulo: '', autor: '', fecha: '', imagen: '', urlCanonica: '' };

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const walk = (value) => {
        if (Array.isArray(value)) {
          value.forEach(walk);
          return;
        }
        if (!value || typeof value !== 'object') return;

        const type = String(value['@type'] || '').toLowerCase();
        if (type.includes('article') || type.includes('newsarticle')) {
          if (value.headline && !metadatos.titulo) metadatos.titulo = String(value.headline).slice(0, 200);
          if (value.author && !metadatos.autor) {
            if (typeof value.author === 'string') metadatos.autor = value.author;
            else if (value.author[0]?.name) metadatos.autor = value.author[0].name;
          }
          if (value.datePublished && !metadatos.fecha) metadatos.fecha = value.datePublished;
          if (value.image && !metadatos.imagen) {
            if (typeof value.image === 'string') metadatos.imagen = value.image;
            else if (value.image[0]?.url) metadatos.imagen = value.image[0].url;
          }
          if (value.url && !metadatos.urlCanonica) metadatos.urlCanonica = value.url;
        }

        Object.values(value).forEach(walk);
      };
      walk(parsed);
    } catch {
      return;
    }
  });

  return metadatos;
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

const getMainContainer = ($, targetUrl = '') => {
  let host = '';
  try {
    host = new URL(targetUrl).hostname.toLowerCase();
  } catch {
    host = '';
  }
  
  const domainRule = Object.keys(DOMAIN_RULES).find(domain => host.includes(domain));
  const selectorsToTry = (domainRule && DOMAIN_RULES[domainRule].contentSelectors) 
    ? DOMAIN_RULES[domainRule].contentSelectors 
    : CONTENT_SELECTORS;
  
  for (const selector of selectorsToTry) {
    const candidate = $(selector).first();
    if (!candidate.length) continue;

    const paragraphs = getParagraphsFromNode($, candidate);
    if (paragraphs.length >= 2) return candidate;
  }

  const body = $('body').first();
  return body.length ? body : $.root();
};

const extractFullText = ($, targetUrl = '') => {
  const container = getMainContainer($, targetUrl);
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

const emptyResponse = (res) => res.status(200).json({ 
  cuerpo: '', 
  metodo: '', 
  calidad: 'baja',
  autor: '',
  titulo: '',
  fecha: '',
  imagen: '',
  urlCanonica: '',
});

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

    if (!response.ok) return { texto: '', metodo: '' };
    const rawText = await response.text();
    const plainText = cleanupProxyText(targetUrl, rawText);
    return { texto: plainText.length >= 220 ? plainText : '', metodo: 'jina-proxy' };
  } catch {
    return { texto: '', metodo: '' };
  }
};

export default async function handler(req, res) {
  const esPreflight = configurarCors(req, res);
  if (esPreflight) return;

  const urlParam = asSingleValue(req.query.url);

  if (!urlParam) return emptyResponse(res);

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(urlParam);
    // Valida URL contra allowlist y SSRF ANTES de hacer fetch
    validateUrl(targetUrl);
  } catch (error) {
    res.setHeader('Cache-Control', 's-maxage=300');
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
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
      const proxyResult = await extractUsingReadableProxy(targetUrl);
      if (proxyResult.texto) {
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json({ 
          cuerpo: clampText(proxyResult.texto),
          metodo: proxyResult.metodo,
          calidad: 'media',
          autor: '',
          titulo: '',
          fecha: '',
          imagen: '',
          urlCanonica: '',
        });
      }
      res.setHeader('Cache-Control', 's-maxage=300');
      return emptyResponse(res);
    }

    const html = await response.text();
    
    // Valida que no sea una página de error
    if (isErrorPage(html, response.status)) {
      res.setHeader('Cache-Control', 's-maxage=300');
      return emptyResponse(res);
    }

    const $ = cheerio.load(html);

    // Extrae metadatos de JSON-LD si están disponibles
    const metadatos = extraerMetadatosJsonLd($);

    // Método 1: JSON-LD para contenido
    const fullTextFromJsonLd = extractFromJsonLd($);
    if (fullTextFromJsonLd) {
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({ 
        cuerpo: clampText(fullTextFromJsonLd),
        metodo: 'json-ld',
        calidad: 'alta',
        autor: metadatos.autor,
        titulo: metadatos.titulo,
        fecha: metadatos.fecha,
        imagen: metadatos.imagen,
        urlCanonica: metadatos.urlCanonica,
      });
    }

    // Método 2/3: Selectores de dominio o readability
    cleanDom($, targetUrl);
    const fullText = extractFullText($, targetUrl);

    if (fullText) {
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({ 
        cuerpo: clampText(fullText),
        metodo: 'readability',
        calidad: 'alta',
        autor: metadatos.autor,
        titulo: metadatos.titulo,
        fecha: metadatos.fecha,
        imagen: metadatos.imagen,
        urlCanonica: metadatos.urlCanonica,
      });
    }

    // Fallback: proxy
    const proxyResult = await extractUsingReadableProxy(targetUrl);
    if (proxyResult.texto) {
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({ 
        cuerpo: clampText(proxyResult.texto),
        metodo: proxyResult.metodo,
        calidad: 'media',
        autor: metadatos.autor,
        titulo: metadatos.titulo,
        fecha: metadatos.fecha,
        imagen: metadatos.imagen,
        urlCanonica: metadatos.urlCanonica,
      });
    }

    res.setHeader('Cache-Control', 's-maxage=300');
    return emptyResponse(res);
  } catch {
    res.setHeader('Cache-Control', 's-maxage=300');
    return emptyResponse(res);
  }
}
