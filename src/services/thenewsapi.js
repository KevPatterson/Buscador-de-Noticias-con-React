const API_BASE_URL = 'https://api.thenewsapi.com/v1/news/all';

const MAP_CATEGORIAS_THENEWSAPI = {
  top: 'general',
  technology: 'tech',
};

const mapCategoria = (categoria) => {
  if (!categoria) return '';
  return MAP_CATEGORIAS_THENEWSAPI[categoria] || categoria;
};

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

export const fetchTheNewsAPI = async ({ query, categoria, pagina, signal }) => {
  const categoriaMapeada = mapCategoria(categoria);

  const params = new URLSearchParams({
    api_token: import.meta.env.VITE_THENEWSAPI_KEY,
    language: 'es',
    ...(query && { search: query }),
    ...(categoriaMapeada && { categories: categoriaMapeada }),
    ...(pagina && { page: pagina }),
  });

  const res = await fetch(`${API_BASE_URL}?${params}`, { signal });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 429) throw new Error('QUOTA_EXCEEDED');

    const requestError = new Error('TheNewsAPI error');
    requestError.status = res.status;
    throw requestError;
  }

  const resultados = normalizarTheNewsAPI(data.data || []);
  const paginaActual = Number.parseInt(String(pagina || '1'), 10);
  const siguientePagina = Number.isNaN(paginaActual) ? null : String(paginaActual + 1);

  return {
    resultados,
    nextPage: resultados.length > 0 ? siguientePagina : null,
    totalResults: typeof data.meta?.found === 'number' ? data.meta.found : resultados.length,
  };
};
