const API_BASE_URL = 'https://newsapi.org/v2/top-headlines';

const MAP_CATEGORIAS_NEWSAPI = {
  top: 'general',
  politics: 'general',
};

const mapCategoria = (categoria) => {
  if (!categoria) return '';
  return MAP_CATEGORIAS_NEWSAPI[categoria] || categoria;
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

export const fetchNewsAPI = async ({
  query,
  categoria,
  pagina,
  domainurl,
  pais,
  includeCountry = true,
  includeCategory = true,
  signal,
}) => {
  const categoriaMapeada = mapCategoria(categoria);

  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_NEWSAPI_KEY,
    ...(query && { q: query }),
    ...(includeCategory && categoriaMapeada && { category: categoriaMapeada }),
    ...(includeCountry && pais && { country: pais }),
    ...(pagina && { page: pagina }),
    ...(domainurl && { domains: domainurl }),
    pageSize: '20',
  });

  const res = await fetch(`${API_BASE_URL}?${params}`, { signal });
  const data = await res.json();

  if (!res.ok || data.status === 'error') {
    const code = data.code || '';
    if (res.status === 429 || code === 'rateLimited' || code === 'apiKeyExhausted') {
      throw new Error('QUOTA_EXCEEDED');
    }

    const requestError = new Error(data.message || 'NewsAPI.org error');
    requestError.status = res.status;
    requestError.code = code;
    throw requestError;
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
