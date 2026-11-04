import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { Document } from 'linkedom';
import { secureFetch, SecureFetchError, validateUrl } from '../src/lib/secureFetch.js';
import { configurarCors } from '../src/lib/cors.js';
import { obtenerReglas } from '../src/config/extraccion.js';

const asSingleValue = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeText = (value = '') =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const clampText = (value = '', max = 10000) => value.slice(0, max);

const MIN_PARAGRAFO = 40;
const MIN_CUERPO_VALIDO = 300;
const MAX_DENSIDAD_ENLACES = 0.5;

// Selectores de ruido eliminados siempre (limpieza del DOM, punto 2.4).
const RUIDO_GLOBAL = [
  'script',
  'style',
  'noscript',
  'nav',
  'aside',
  'footer',
  'iframe',
  'form',
  'button',
  // botones/bloques de compartir
  '.share', '.social', '.share-buttons', '.social-share', '.share-buttons',
  // bloques relacionados / te puede interesar
  '.related', '.related-posts', '.related-articles', '.te-puede-interesar', '.lea-tambien',
  '.publicidad', '.ads', '.advertisement', '.sponsored', '.promo', '.banner', '.cookie', '.modal', '.popup',
];

const limpiarDOM = ($, reglas) => {
  RUIDO_GLOBAL.forEach((selector) => {
    try { $(selector).remove(); } catch {}
  });

  if (reglas && Array.isArray(reglas.quitar)) {
    reglas.quitar.forEach((selector) => {
      try { $(selector).remove(); } catch {}
    });
  }

  // Eliminar nodos de comentario HTML.
  $('*').contents().each((_, node) => {
    if (node.nodeType === 8) {
      try { $(node).remove(); } catch {}
    }
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

// Texto de un contenedor: parrafos (>= 40 caracteres), subtitulos y listas.
const textoDeContenedor = ($, nodo) => {
  const bloques = [];

  nodo.find('p, h1, h2, h3, h4, h5, h6, li').each((_, element) => {
    const $elemento = $(element);
    const esParrafo = $elemento.is('p');
    const texto = normalizeText($elemento.text());

    if (!texto) return;
    if (esParrafo && texto.length < MIN_PARAGRAFO) return;

    bloques.push(texto);
  });

  return dedupeParagraphs(bloques.join('\n\n'));
};

const densidadEnlaces = ($, nodo) => {
  const textoTotal = normalizeText(nodo.text()).length;
  if (!textoTotal) return 1;
  const textoEnlaces = nodo.find('a').text().length;
  return textoEnlaces / textoTotal;
};

const esTextoValido = (texto) => {
  if (!texto || texto.length < MIN_CUERPO_VALIDO) return false;
  const parrafos = texto.split(/\n{2,}/).filter((p) => p.trim().length >= MIN_PARAGRAFO);
  return parrafos.length >= 2;
};

const caminarJsonLD = (valor, colector) => {
  if (Array.isArray(valor)) {
    valor.forEach((item) => caminarJsonLD(item, colector));
    return;
  }

  if (!valor || typeof valor !== 'object') return;

  const tipo = String(valor['@type'] || '').toLowerCase();
  const esArticulo =
    tipo.includes('newsarticle') || tipo.includes('article') || tipo.includes('reportage') || tipo.includes('blogposting');

  if (esArticulo && typeof valor.articleBody === 'string') {
    colector.push(valor);
  }

  Object.values(valor).forEach((anidado) => caminarJsonLD(anidado, colector));
};

const autorJsonLD = (valor) => {
  if (!valor) return '';
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor)) return autorJsonLD(valor[0]) || '';
  if (typeof valor === 'object') return valor.name || valor['#text'] || '';
  return '';
};

const imagenJsonLD = (valor) => {
  if (!valor) return '';
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor)) return imagenJsonLD(valor[0]) || '';
  if (typeof valor === 'object') return valor.url || valor['@_url'] || valor['#text'] || '';
  return '';
};

const extraerJsonLD = ($) => {
  const candidatos = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text() || $(element).text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      caminarJsonLD(parsed, candidatos);
    } catch {
      return;
    }
  });

  candidatos.sort((a, b) => (b.articleBody || '').length - (a.articleBody || '').length);
  const mejor = candidatos[0];
  if (!mejor) return null;

  return {
    cuerpo: normalizeText(mejor.articleBody),
    titulo: mejor.headline || '',
    fecha: mejor.datePublished || '',
    autor: autorJsonLD(mejor.author),
    imagen: imagenJsonLD(mejor.image),
  };
};

const extraerPorSelectoresDeDominio = ($, reglas) => {
  if (!reglas || !reglas.selectorCuerpo) return null;

  const selectores = String(reglas.selectorCuerpo)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const selector of selectores) {
    const nodo = $(selector).first();
    if (!nodo.length) continue;

    const texto = textoDeContenedor($, nodo);
    if (!esTextoValido(texto)) continue;
    if (densidadEnlaces($, nodo) >= MAX_DENSIDAD_ENLACES) continue;

    const fecha = reglas.selectorFecha
      ? normalizeText($(reglas.selectorFecha).first().text()) || ''
      : '';
    const autor = reglas.selectorAutor
      ? normalizeText($(reglas.selectorAutor).first().text()) || ''
      : '';

    return { cuerpo: texto, fecha, autor };
  }

  return null;
};

const extraerConReadability = (html, url) => {
  try {
    const documento = new Document(html, { url, contentType: 'text/html' });
    const resultado = new Readability(documento).parse();
    if (!resultado) return null;
    return {
      cuerpo: normalizeText(resultado.textContent || ''),
      titulo: resultado.title || '',
      html: resultado.content || '',
    };
  } catch {
    return null;
  }
};

const extraerHeuristica = ($) => {
  const candidatos = $('article, main, section, .content, #content, .post, .entry, div');
  let mejor = null;

  candidatos.each((_, elemento) => {
    const $nodo = $(elemento);
    const texto = textoDeContenedor($, $nodo);
    const parrafos = $nodo.find('p').length;

    if (!esTextoValido(texto)) return;
    if (parrafos < 2) return;
    if (densidadEnlaces($, $nodo) >= MAX_DENSIDAD_ENLACES) return;

    const puntuacion = parrafos * 300 + texto.length - densidadEnlaces($, $nodo) * 1500;
    if (!mejor || puntuacion > mejor.puntuacion) {
      mejor = { texto, puntuacion };
    }
  });

  return mejor ? { cuerpo: mejor.texto } : null;
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

const extraerMetadatosOG = ($, baseUrl) => {
  const attr = (selector, nombre) => $(selector).attr(nombre) || '';
  const meta = (nombre) => attr(`meta[name="${nombre}"]`, 'content');
  const metaProperty = (propiedad) => attr(`meta[property="${propiedad}"]`, 'content');

  const titulo =
    metaProperty('og:title') || meta('twitter:title') || $('title').text().trim() || '';
  const fecha =
    normalizeDate(metaProperty('article:published_time') || meta('date') || '') || '';
  const autor = metaProperty('article:author') || meta('author') || '';
  const imagen = resolverURL(metaProperty('og:image') || meta('twitter:image') || '', baseUrl);
  const descripcion = metaProperty('og:description') || meta('description') || '';

  return { titulo, fecha, autor, imagen, descripcion };
};

const obtenerUrlCanonica = ($, baseUrl) => {
  const href = $('link[rel="canonical"]').attr('href');
  return resolverURL(href, baseUrl) || baseUrl;
};

export default async function handler(req, res) {
  const esPreflight = configurarCors(req, res);
  if (esPreflight) return;

  const urlParam = asSingleValue(req.query.url);
  const descripcionRSS = asSingleValue(req.query.description); // fallback del RSS (punto 2.5)

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
    // validateUrl (dentro de secureFetch): esquema http/https, sin credenciales, max 2048
    // caracteres, allowlist de dominios de src/config, bloqueo de IPs privadas.
    // Sigue redirecciones manualmente (max 3) revalidando dominio e IP en cada salto.
    const response = await secureFetch(targetUrl);
    const $ = cheerio.load(response.body);
    const baseUrl = response.finalUrl;

    // Limpieza del DOM (punto 2.4).
    const reglas = obtenerReglas(new URL(baseUrl).hostname);
    limpiarDOM($, reglas);

    const metadatos = extraerMetadatosOG($, baseUrl);
    const urlCanonica = obtenerUrlCanonica($, baseUrl);

    // Cascada de extraccion (punto 2.2): se queda con el primer resultado valido.
    let extraccion = null;
    let metodo = '';
    let calidad = 'baja';

    // 1) JSON-LD (NewsArticle / Article / ReportageNewsArticle).
    const jsonLD = extraerJsonLD($);
    if (jsonLD && esTextoValido(jsonLD.cuerpo) && densidadEnlaces($, $('body')) < MAX_DENSIDAD_ENLACES) {
      extraccion = jsonLD;
      metodo = 'json-ld';
      calidad = 'alta';
    }

    // 2) Selectores por dominio definidos en src/config.
    if (!extraccion && reglas) {
      const porSelectores = extraerPorSelectoresDeDominio($, reglas);
      if (porSelectores && esTextoValido(porSelectores.cuerpo)) {
        extraccion = porSelectores;
        metodo = 'selectores-dominio';
        calidad = 'alta';
        if (porSelectores.fecha && !metadatos.fecha) metadatos.fecha = normalizeDate(porSelectores.fecha);
        if (porSelectores.autor && !metadatos.autor) metadatos.autor = porSelectores.autor;
      }
    }

    // 3) @mozilla/readability con linkedom.
    if (!extraccion) {
      const resultado = extraerConReadability(response.body, baseUrl);
      if (resultado && esTextoValido(resultado.cuerpo)) {
        extraccion = { cuerpo: resultado.cuerpo };
        if (resultado.titulo && !metadatos.titulo) metadatos.titulo = resultado.titulo;
        metodo = 'readability';
        calidad = 'media';
      }
    }

    // 4) Heuristica propia.
    if (!extraccion) {
      const heuristica = extraerHeuristica($);
      if (heuristica && esTextoValido(heuristica.cuerpo)) {
        extraccion = heuristica;
        metodo = 'heuristica';
        calidad = 'media';
      }
    }

    const cuerpo = extraccion ? clampText(dedupeParagraphs(extraccion.cuerpo)) : '';
    const fechaJSONLD = jsonLD && jsonLD.fecha ? normalizeDate(jsonLD.fecha) : '';
    const autorJSONLD = jsonLD && jsonLD.autor ? jsonLD.autor : '';
    const imagenJSONLD = jsonLD && jsonLD.imagen ? resolverURL(jsonLD.imagen, baseUrl) : '';

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      status: 'ok',
      titulo: metadatos.titulo || (jsonLD ? jsonLD.titulo : ''),
      cuerpo,
      fecha: metadatos.fecha || fechaJSONLD || '',
      autor: metadatos.autor || autorJSONLD || '',
      imagen: metadatos.imagen || imagenJSONLD || '',
      urlCanonica,
      metodo: extraccion ? metodo : 'rss-fallback',
      calidad: extraccion ? calidad : 'baja',
      ...(!extraccion && descripcionRSS ? { descripcionRSS: clampText(descripcionRSS) } : {}),
    });
  } catch (error) {
    if (error instanceof SecureFetchError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }

    return res.status(502).json({ status: 'error', message: 'No se pudo extraer el articulo' });
  }
}
