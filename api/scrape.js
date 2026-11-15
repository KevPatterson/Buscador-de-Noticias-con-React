import * as cheerio from 'cheerio';
import { secureFetch, validateUrl } from '../src/lib/secureFetch.js';
import { configurarCors } from '../src/lib/cors.js';
import { DOMAIN_RULES } from '../config/extractors.js';

const asSingleValue = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeText = (value = '') =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Los articulos largos (reportajes, discursos) superan con frecuencia los
// 10 000 caracteres; truncarlos dejaba el boletin a medias.
const MAX_TEXTO = 60000;
const clampText = (value = '', max = MAX_TEXTO) => value.slice(0, max);

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
  // Solo rechaza paginas que declaren explicitamente un error. La heuristica
  // anterior descartaba articulos cortos legitimos por su longitud.
  if (status >= 400) return true;

  const htmlLower = html.toLowerCase();

  const errorPatterns = [
    /404\s+(not\s+found|page\s+not\s+found)/i,
    /403\s+(forbidden|access\s+denied)/i,
    // Titulos como "Página 404" o "Error 404 - Medio" llegan con estado 200.
    /<title>[^<]*\b(404|403)\b[^<]*<\/title>/i,
    /p[aá]gina\s+no\s+encontrada|page\s+not\s+found/i,
    /^<html>\s*<head>\s*<title>\s*404/i,
    /^<html>\s*<head>\s*<title>\s*403/i,
    /\[dlm_no_access\]/i, // Drupal no access shortcode
  ];

  return errorPatterns.some((pattern) => pattern.test(htmlLower));
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
  const vistos = new Set();

  const agregar = (texto) => {
    const limpio = normalizeText(texto);
    if (limpio.length < 20) return;
    // Descarta bloques que son solo una URL.
    if (/^(https?:\/\/|www\.)\S+$/i.test(limpio)) return;
    if (vistos.has(limpio)) return;
    vistos.add(limpio);
    chunks.push(limpio);
  };

  node.find('p, blockquote').each((_, element) => {
    agregar($(element).text());
  });

  // Algunos medios (p. ej. noticiaslatam.lat) publican cada parrafo dentro de
  // un <div> sin <p>. Solo se toman bloques hoja para no duplicar contenido.
  node.find('div').each((_, element) => {
    const bloque = $(element);
    if (bloque.find('p, div, blockquote, li').length > 0) return;
    agregar(bloque.text());
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

  const domainRule = Object.keys(DOMAIN_RULES).find((domain) => host.includes(domain));
  const selectorsToTry = (domainRule && DOMAIN_RULES[domainRule].contentSelectors)
    ? DOMAIN_RULES[domainRule].contentSelectors
    : CONTENT_SELECTORS;

  // Se evaluan todos los candidatos y se elige el que aporta mas texto, en
  // lugar del primero que tenga dos parrafos: una card de portada podia ganar
  // frente al cuerpo real del articulo.
  let mejor = null;
  let mejorLongitud = 0;

  for (const selector of selectorsToTry) {
    const nodos = $(selector).slice(0, 5);

    nodos.each((_, element) => {
      const candidato = $(element);
      const parrafos = getParagraphsFromNode($, candidato);
      const longitud = parrafos.reduce((total, parrafo) => total + parrafo.length, 0);
      if (parrafos.length > 0 && longitud > mejorLongitud) {
        mejor = candidato;
        mejorLongitud = longitud;
      }
    });
  }

  if (mejor && mejorLongitud >= 200) return mejor;

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

// ---------------------------------------------------------------------------
// Resolucion de enlaces de Google News
// ---------------------------------------------------------------------------
// Los feeds configurados con "site:" devuelven URLs del redireccionador
// news.google.com/rss/articles/... La pagina intermedia expone data-n-a-id,
// data-n-a-ts y data-n-a-sg; con ellos el endpoint batchexecute devuelve la URL
// real del medio. Sin este paso la extraccion devolvia 0 caracteres.
const CACHE_GOOGLE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_GOOGLE = 500;
const cacheGoogleNews = new Map();

const esUrlGoogleNews = (value) => {
  try {
    return new URL(value).hostname.toLowerCase() === 'news.google.com';
  } catch {
    return false;
  }
};

const leerCacheGoogle = (url) => {
  const entrada = cacheGoogleNews.get(url);
  if (!entrada) return '';
  if (Date.now() - entrada.ts > CACHE_GOOGLE_TTL_MS) {
    cacheGoogleNews.delete(url);
    return '';
  }
  return entrada.destino;
};

const guardarCacheGoogle = (url, destino) => {
  if (cacheGoogleNews.size >= MAX_CACHE_GOOGLE) {
    cacheGoogleNews.delete(cacheGoogleNews.keys().next().value);
  }
  cacheGoogleNews.set(url, { ts: Date.now(), destino });
};

// Descarta destinos que no son la pagina de un articulo: portadas, listados de
// seccion, formularios de correo y descargas (PDF de ediciones impresas).
const esDestinoArticulo = (destino = '') => {
  try {
    const url = new URL(destino);
    if (!url.pathname || url.pathname === '/') return false;
    if (/\/component\/mailto\b/i.test(url.pathname)) return false;
    if (/\/category\//i.test(url.pathname)) return false;
    if (/[?&]download=/i.test(url.search)) return false;

    // Joomla publica los listados de seccion como /index.php/es/cultura sin el
    // identificador numerico que llevan las notas reales.
    if (/\/index\.php\//i.test(url.pathname)) {
      const ultimoSegmento = url.pathname.replace(/\/+$/, '').split('/').pop() || '';
      if (!/\d/.test(ultimoSegmento)) return false;
    }

    return true;
  } catch {
    return false;
  }
};

const extraerDestinoBatchexecute = (cuerpo = '') => {
  const inicio = cuerpo.indexOf('[[');
  if (inicio < 0) return '';

  let datos;
  try {
    datos = JSON.parse(cuerpo.slice(inicio));
  } catch {
    return '';
  }

  if (!Array.isArray(datos)) return '';

  for (const fila of datos) {
    if (!Array.isArray(fila)) continue;
    for (const celda of fila) {
      if (typeof celda !== 'string' || !celda.trim().startsWith('[')) continue;
      try {
        const anidado = JSON.parse(celda);
        if (
          Array.isArray(anidado) &&
          typeof anidado[1] === 'string' &&
          /^https?:\/\//i.test(anidado[1])
        ) {
          return anidado[1];
        }
      } catch {
        // La celda no contiene el JSON esperado.
      }
    }
  }

  return '';
};

const leerCandidatosGoogle = async (targetUrl, tiempoEsperaMs) => {
  try {
    const { body: html } = await secureFetch(targetUrl, { tiempoEsperaMs });
    const $ = cheerio.load(html);
    const candidatos = [];

    $('[data-n-a-id][data-n-a-ts][data-n-a-sg]').each((_, elemento) => {
      const id = $(elemento).attr('data-n-a-id');
      const ts = $(elemento).attr('data-n-a-ts');
      const sg = $(elemento).attr('data-n-a-sg');
      if (id && ts && sg) candidatos.push({ id, ts, sg });
    });

    return candidatos;
  } catch {
    return [];
  }
};

export const resolverUrlGoogleNews = async (targetUrl) => {
  if (!esUrlGoogleNews(targetUrl)) return targetUrl;

  const enCache = leerCacheGoogle(targetUrl);
  if (enCache) return enCache;

  try {
    // El redireccionador de Google puede tardar varios segundos en servir la
    // pagina intermedia; el presupuesto total sigue bajo el limite de Vercel.
    let candidatos = await leerCandidatosGoogle(targetUrl, 15000);

    // En ocasiones Google sirve una variante sin los atributos de resolucion.
    // Un segundo intento con menos presupuesto recupera esos casos sin
    // acercarse al limite de la funcion.
    if (!candidatos.length) {
      candidatos = await leerCandidatosGoogle(targetUrl, 10000);
    }

    for (const { id, ts, sg } of candidatos) {
      const inner = JSON.stringify([
        'garturlreq',
        [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
        id,
        Number(ts),
        sg,
      ]);
      const frecuencia = JSON.stringify([[['Fbv4je', inner]]]);

      try {
        const { body } = await secureFetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
          metodo: 'POST',
          cabeceras: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            Accept: '*/*',
          },
          cuerpo: `f.req=${encodeURIComponent(frecuencia)}`,
          tiempoEsperaMs: 10000,
          maxBytes: 512 * 1024,
        });

        const destino = extraerDestinoBatchexecute(body);
        if (!destino) continue;

        // El destino resuelto tambien debe pertenecer a la allowlist.
        const validada = validateUrl(destino);
        if (!esDestinoArticulo(validada.href)) continue;
        guardarCacheGoogle(targetUrl, validada.href);
        return validada.href;
      } catch {
        // Probar con el siguiente candidato.
      }
    }
  } catch {
    // Sin resolucion no se puede extraer el articulo.
  }

  return '';
};

const extractUsingReadableProxy = async (targetUrl) => {
  try {
    const cleanTarget = targetUrl.replace(/^https?:\/\//i, '');
    const proxyUrl = `https://r.jina.ai/http://${cleanTarget}`;
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsAppScraper/1.0)',
        Accept: 'text/plain',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) return { texto: '', metodo: '' };

    // El proxy puede devolver respuestas enormes; se corta antes de procesar.
    const longitud = Number(response.headers.get('content-length') || 0);
    if (longitud > 4 * 1024 * 1024) return { texto: '', metodo: '' };

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

  // Los enlaces de Google News se resuelven a la URL real del medio. Sin este
  // paso el fetch devuelve una pagina intermedia sin articulo.
  try {
    const resuelta = await resolverUrlGoogleNews(targetUrl);
    if (!resuelta) {
      res.setHeader('Cache-Control', 's-maxage=300');
      return emptyResponse(res);
    }
    targetUrl = resuelta;
  } catch {
    res.setHeader('Cache-Control', 's-maxage=300');
    return emptyResponse(res);
  }

  const responderProxy = (proxyResult) => {
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
  };

  let html;
  try {
    // secureFetch aplica allowlist, validacion DNS/IP, redirecciones, limites
    // de tamano y timeout: evita SSRF y respuestas sin acotar.
    const respuesta = await secureFetch(targetUrl, {
      tiempoEsperaMs: 12000,
      maxBytes: 3 * 1024 * 1024,
    });
    html = respuesta.body;

    if (!html || isErrorPage(html, respuesta.statusCode)) {
      const proxyResult = await extractUsingReadableProxy(targetUrl);
      if (proxyResult.texto) return responderProxy(proxyResult);
      res.setHeader('Cache-Control', 's-maxage=300');
      return emptyResponse(res);
    }
  } catch {
    // Fallback para fuentes que rechazan la peticion directa (WAF, TLS, etc.).
    const proxyResult = await extractUsingReadableProxy(targetUrl);
    if (proxyResult.texto) return responderProxy(proxyResult);
    res.setHeader('Cache-Control', 's-maxage=300');
    return emptyResponse(res);
  }

  try {
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
