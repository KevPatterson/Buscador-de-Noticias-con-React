import { fetchFeed } from './rss.js';
import { FUENTES_RSS } from '../src/config/fuentes-rss.js';
import { configurarCors } from '../src/lib/cors.js';
import { conTimeout } from '../src/lib/timeout.js';
import { dedupeNoticias } from '../src/lib/dedupe.js';

// Tiempo maximo de espera por API externa. Si una rama se pasa, se registra
// y la cascada continua con la siguiente fuente en vez de colgar la request.
const TIEMPO_ESPERA_API_MS = 5000;


const NEWSDATA_BASE = 'https://newsdata.io/api/1/news';
const THENEWSAPI_BASE = 'https://api.thenewsapi.com/v1/news/all';
const NEWSAPI_BASE = 'https://newsapi.org/v2/top-headlines';

const asSingle = (value) => (Array.isArray(value) ? value[0] : value);

const normalizarNewsData = (items = []) =>
  items.map((item) => ({
    title: item.title || '',
    link: item.link || '',
    pubDate: item.pubDate || '',
    description: item.description || '',
    image_url: item.image_url || null,
    source_name: item.source_id || '',
    source_domain: item.source_id || '',
    source_id: item.source_id || '',
    content: item.content || '',
    snippet: item.snippet || '',
    _origen: 'newsdata',
  }));

const normalizarTheNewsAPI = (items = []) =>
  items.map((item) => ({
    title: item.title || '',
    link: item.url || '',
    pubDate: item.published_at || '',
    description: item.description || '',
    image_url: item.image_url || null,
    source_name: item.source || '',
    source_domain: item.source || '',
    source_id: item.source || '',
    content: item.snippet || item.description || '',
    snippet: item.snippet || '',
    _origen: 'thenewsapi',
  }));

const MAP_CATEGORIAS_THENEWSAPI = { top: 'general', technology: 'tech' };
const mapCategoriaTheNewsAPI = (categoria) => {
  if (!categoria) return '';
  return MAP_CATEGORIAS_THENEWSAPI[categoria] || categoria;
};

const normalizarNewsAPI = (items = []) =>
  items.map((item) => ({
    title: item.title || '',
    link: item.url || '',
    pubDate: item.publishedAt || '',
    description: item.description || '',
    image_url: item.urlToImage || null,
    source_name: item.source?.name || '',
    source_domain: item.source?.id || item.source?.name || '',
    source_id: item.source?.id || item.source?.name || '',
    content: item.content || '',
    snippet: item.description || '',
    _origen: 'newsapi',
  }));

const MAP_CATEGORIAS_NEWSAPI = { top: 'general', politics: 'general' };
const mapCategoriaNewsAPI = (categoria) => {
  if (!categoria) return '';
  return MAP_CATEGORIAS_NEWSAPI[categoria] || categoria;
};

const obtenerNewsData = async ({ query, categoria, pagina, domainurl }) => {
  const params = new URLSearchParams({ apikey: process.env.NEWSDATA_API_KEY, language: 'es' });
  if (query) params.set('q', query);
  if (categoria) params.set('category', categoria);
  if (pagina) params.set('page', pagina);
  if (domainurl) params.set('domainurl', domainurl);

  const res = await fetch(`${NEWSDATA_BASE}?${params}`);
  const data = await res.json();

  if (!res.ok || data.status === 'error') {
    const code = data.results?.code || '';
    if (code === 'TooManyRequests' || res.status === 429) throw new Error('QUOTA_EXCEEDED');
    throw new Error(data.results?.message || 'NewsData error');
  }

  const resultados = normalizarNewsData(data.results || []);
  return {
    resultados,
    nextPage: data.nextPage || null,
    totalResults: typeof data.totalResults === 'number' ? data.totalResults : resultados.length,
  };
};

const obtenerTheNewsAPI = async ({ query, categoria, pagina, domainurl }) => {
  const categoriaMapeada = mapCategoriaTheNewsAPI(categoria);
  const params = new URLSearchParams({ api_token: process.env.THENEWSAPI_KEY, language: 'es' });
  if (query) params.set('search', query);
  if (categoriaMapeada) params.set('categories', categoriaMapeada);
  if (domainurl) params.set('source', domainurl);
  if (pagina) params.set('page', pagina);

  const res = await fetch(`${THENEWSAPI_BASE}?${params}`);
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 429 || res.status === 402) throw new Error('QUOTA_EXCEEDED');
    throw new Error('TheNewsAPI error');
  }

  const resultadosCrudos = data.data || [];
  const dominiosPermitidos = (domainurl || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const getHost = (value = '') => {
    try {
      return new URL(value).hostname.toLowerCase();
    } catch {
      return '';
    }
  };
  const perteneceADominio = (item) => {
    if (!dominiosPermitidos.length) return true;
    const source = (item.source || '').toLowerCase();
    const hostFromUrl = getHost(item.url || '');
    return dominiosPermitidos.some(
      (dominio) =>
        source === dominio ||
        source.endsWith(`.${dominio}`) ||
        hostFromUrl === dominio ||
        hostFromUrl.endsWith(`.${dominio}`)
    );
  };
  const resultadosFiltrados = resultadosCrudos.filter(perteneceADominio);
  const resultados = normalizarTheNewsAPI(resultadosFiltrados);
  const paginaActual = Number.parseInt(String(pagina || '1'), 10);
  const siguientePagina = Number.isNaN(paginaActual) ? null : String(paginaActual + 1);

  return {
    resultados,
    nextPage: resultados.length > 0 ? siguientePagina : null,
    totalResults: typeof data.meta?.found === 'number' ? data.meta.found : resultados.length,
  };
};

const obtenerNewsAPI = async ({ query, categoria, pagina, domainurl }) => {
  const categoriaMapeada = mapCategoriaNewsAPI(categoria);
  const params = new URLSearchParams({ apiKey: process.env.NEWSAPI_KEY, pageSize: '20' });
  if (query) params.set('q', query);
  if (categoriaMapeada) params.set('category', categoriaMapeada);
  if (pagina) params.set('page', pagina);
  if (domainurl) params.set('domains', domainurl);

  const res = await fetch(`${NEWSAPI_BASE}?${params}`);
  const data = await res.json();

  if (!res.ok || data.status === 'error') {
    const code = data.code || '';
    if (
      res.status === 429 ||
      res.status === 426 ||
      res.status === 402 ||
      code === 'rateLimited' ||
      code === 'apiKeyExhausted' ||
      code === 'upgradeRequired' ||
      code === 'planUpgradeRequired' ||
      code === 'maximumResultsReached'
    ) {
      throw new Error('QUOTA_EXCEEDED');
    }
    throw new Error(data.message || 'NewsAPI.org error');
  }

  const resultados = normalizarNewsAPI(data.articles || []);
  const paginaActual = Number.parseInt(String(pagina || '1'), 10);
  const siguientePagina = Number.isNaN(paginaActual) ? null : String(paginaActual + 1);

  return {
    resultados,
    nextPage: resultados.length > 0 ? siguientePagina : null,
    totalResults: typeof data.totalResults === 'number' ? data.totalResults : resultados.length,
  };
};

// Deduplica en el servidor para que la paginacion sea coherente con lo que ve
// el cliente. El dedupe del cliente se mantiene como red de seguridad.
const responder = (res, payload, meta) => {
  res.setHeader('Cache-Control', 's-maxage=60');
  return res.status(200).json({
    status: 'ok',
    ...payload,
    resultados: dedupeNoticias(payload.resultados || []),
    ...(meta ? { _meta: meta } : {}),
  });
};

export default async function handler(req, res) {
  const esPreflight = configurarCors(req, res);
  if (esPreflight) return;

  const query = asSingle(req.query.q);
  const categoria = asSingle(req.query.categoria);
  const fuente = asSingle(req.query.fuente);
  const pagina = asSingle(req.query.pagina);

  const inicio = Date.now();
  // Telemetria ligera por rama; se publica en _meta para medir el baseline
  // (cuotas agotadas, timeouts) sin exponer claves ni detalles internos.
  const intentos = {};

  // Ejecuta una rama con tiempo limite. Cualquier fallo (cuota, timeout, red)
  // se registra y permite continuar con la siguiente fuente en lugar de
  // romper la cascada con un 500.
  const ejecutarRama = async (nombre, obtener) => {
    const comienzo = Date.now();
    try {
      const datos = await conTimeout(obtener(), TIEMPO_ESPERA_API_MS, nombre.toUpperCase());
      intentos[nombre] = { ok: true, ms: Date.now() - comienzo };
      return datos;
    } catch (error) {
      intentos[nombre] = { ok: false, ms: Date.now() - comienzo, error: error.message };
      console.warn(`[news] rama ${nombre} fallida: ${error.message}`);
      return null;
    }
  };

  const enviar = (resultados, nombreFuente, nextPage, totalResults) => {
    const meta = { intentos, latenciaMs: Date.now() - inicio };
    if (meta.latenciaMs > 5000) {
      console.warn(`[news] respuesta lenta (${meta.latenciaMs} ms)`);
    }
    return responder(res, { resultados, fuente: nombreFuente, nextPage, totalResults }, meta);
  };

  // Fallback entre APIs. Las claves leen de variables de entorno del servidor
  // (sin prefijo VITE_), nunca del bundle del navegador.
  if (process.env.NEWSDATA_API_KEY) {
    const datos = await ejecutarRama('newsdata', () =>
      obtenerNewsData({ query, categoria, pagina, domainurl: fuente })
    );
    if (datos) {
      return enviar(datos.resultados, 'newsdata', datos.nextPage, datos.totalResults);
    }
  }

  if (process.env.THENEWSAPI_KEY) {
    const datos = await ejecutarRama('thenewsapi', () =>
      obtenerTheNewsAPI({ query, categoria, pagina, domainurl: fuente })
    );
    if (datos) {
      return enviar(datos.resultados, 'thenewsapi', datos.nextPage, datos.totalResults);
    }
  }

  if (process.env.NEWSAPI_KEY) {
    const datos = await ejecutarRama('newsapi', () =>
      obtenerNewsAPI({ query, categoria, pagina, domainurl: fuente })
    );
    if (datos) {
      return enviar(datos.resultados, 'newsapi', datos.nextPage, datos.totalResults);
    }
  }

  // Ultimo recurso: feeds RSS directamente del servidor.
  // Si se especifica una fuente, intentar cargarla como RSS primero
  let fuentesObjetivo = [];
  
  if (fuente) {
    // Buscar exactamente en FUENTES_RSS
    const fuenteRSS = FUENTES_RSS.find((f) => f.dominio.toLowerCase() === fuente.toLowerCase());
    if (fuenteRSS) {
      fuentesObjetivo = [fuenteRSS];
    } else {
      // Si no encuentra, intenta como búsqueda separada por comas
      fuentesObjetivo = FUENTES_RSS.filter((fuenteRSS) =>
        fuente.toLowerCase().split(',').some((item) => item.trim().toLowerCase() === fuenteRSS.dominio.toLowerCase())
      );
    }
  } else {
    fuentesObjetivo = FUENTES_RSS;
  }

  const inicioRss = Date.now();
  const todos = (
    await Promise.all(
      fuentesObjetivo.map((fuenteRSS) =>
        fetchFeed(fuenteRSS.feed, fuenteRSS).then((d) => d.results || []).catch(() => [])
      )
    )
  ).flat();
  intentos.rss = { ok: true, ms: Date.now() - inicioRss };

  let resultados = todos;
  if (query) {
    const q = query.toLowerCase();
    resultados = todos.filter(
      (art) => art.title?.toLowerCase().includes(q) || art.description?.toLowerCase().includes(q)
    );
  }

  return enviar(resultados, 'rss', null, resultados.length);
}
