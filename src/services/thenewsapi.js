const API_BASE_URL = 'https://api.thenewsapi.com/v1/news/all';

const MAP_CATEGORIAS_THENEWSAPI = {
  top: 'general',
  technology: 'tech',
};

const mapCategoria = (categoria) => {
  if (!categoria) return '';
  return MAP_CATEGORIAS_THENEWSAPI[categoria] || categoria;
};

const parseDominios = (domainurl = '') =>
  domainurl
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

const perteneceADominio = (item, dominiosPermitidos) => {
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

export const fetchTheNewsAPI = async ({ query, categoria, pagina, domainurl, signal }) => {
  const categoriaMapeada = mapCategoria(categoria);
  const dominiosPermitidos = parseDominios(domainurl);

  const params = new URLSearchParams({
    api_token: import.meta.env.VITE_THENEWSAPI_KEY,
    language: 'es',
    ...(query && { search: query }),
    ...(categoriaMapeada && { categories: categoriaMapeada }),
    ...(domainurl && { source: domainurl }),
    ...(pagina && { page: pagina }),
  });

  const res = await fetch(`${API_BASE_URL}?${params}`, { signal });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 429 || res.status === 402) throw new Error('QUOTA_EXCEEDED');

    const requestError = new Error('TheNewsAPI error');
    requestError.status = res.status;
    throw requestError;
  }

  const resultadosCrudos = data.data || [];
  const resultadosFiltrados = resultadosCrudos.filter((item) => perteneceADominio(item, dominiosPermitidos));
  const resultados = normalizarTheNewsAPI(resultadosFiltrados);
  const paginaActual = Number.parseInt(String(pagina || '1'), 10);
  const siguientePagina = Number.isNaN(paginaActual) ? null : String(paginaActual + 1);

  return {
    resultados,
    nextPage: resultados.length > 0 ? siguientePagina : null,
    totalResults: typeof data.meta?.found === 'number' ? data.meta.found : resultados.length,
  };
};
