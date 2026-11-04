import { fetchFeed } from './rss.js';
import { FUENTES_RSS } from '../src/config/fuentes-rss.js';
import { configurarCors } from '../src/lib/cors.js';

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

const responder = (res, payload) => {
  res.setHeader('Cache-Control', 's-maxage=60');
  return res.status(200).json({ status: 'ok', ...payload });
};

export default async function handler(req, res) {
  const esPreflight = configurarCors(req, res);
  if (esPreflight) return;

  const query = asSingle(req.query.q);
  const categoria = asSingle(req.query.categoria);
  const fuente = asSingle(req.query.fuente);
  const pagina = asSingle(req.query.pagina);

  // Fallback entre APIs. Las claves leen de variables de entorno del servidor
  // (sin prefijo VITE_), nunca del bundle del navegador.
  if (process.env.NEWSDATA_API_KEY) {
    try {
      const data = await obtenerNewsData({ query, categoria, pagina, domainurl: fuente });
      return responder(res, { resultados: data.resultados, fuente: 'newsdata', nextPage: data.nextPage, totalResults: data.totalResults });
    } catch (error) {
      if (error.message !== 'QUOTA_EXCEEDED') throw error;
    }
  }

  if (process.env.THENEWSAPI_KEY) {
    try {
      const data = await obtenerTheNewsAPI({ query, categoria, pagina, domainurl: fuente });
      return responder(res, { resultados: data.resultados, fuente: 'thenewsapi', nextPage: data.nextPage, totalResults: data.totalResults });
    } catch (error) {
      if (error.message !== 'QUOTA_EXCEEDED') throw error;
    }
  }

  if (process.env.NEWSAPI_KEY) {
    try {
      const data = await obtenerNewsAPI({ query, categoria, pagina, domainurl: fuente });
      return responder(res, { resultados: data.resultados, fuente: 'newsapi', nextPage: data.nextPage, totalResults: data.totalResults });
    } catch (error) {
      if (error.message !== 'QUOTA_EXCEEDED') throw error;
    }
  }

  // Ultimo recurso: feeds RSS directamente del servidor.
  const fuentesObjetivo = fuente
    ? FUENTES_RSS.filter((fuenteRSS) => fuenteRSS.dominio.toLowerCase() === fuente.toLowerCase())
    : FUENTES_RSS;

  const todos = (
    await Promise.all(
      fuentesObjetivo.map((fuenteRSS) =>
        fetchFeed(fuenteRSS.feed).then((d) => d.results || []).catch(() => [])
      )
    )
  ).flat();

  let resultados = todos;
  if (query) {
    const q = query.toLowerCase();
    resultados = todos.filter(
      (art) => art.title?.toLowerCase().includes(q) || art.description?.toLowerCase().includes(q)
    );
  }

  return responder(res, { resultados, fuente: 'rss', nextPage: null, totalResults: resultados.length });
}
