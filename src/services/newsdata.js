const API_BASE_URL = 'https://newsdata.io/api/1/news';

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

export const fetchNewsData = async ({
  query,
  categoria,
  pagina,
  domainurl,
  pais,
  includeCountry = true,
  includeCategory = true,
  signal,
}) => {
  const params = new URLSearchParams({
    apikey: import.meta.env.VITE_NEWSDATA_API_KEY,
    language: 'es',
    ...(query && { q: query }),
    ...(includeCategory && categoria && { category: categoria }),
    ...(includeCountry && pais && { country: pais }),
    ...(pagina && { page: pagina }),
    ...(domainurl && { domainurl }),
  });

  const res = await fetch(`${API_BASE_URL}?${params}`, { signal });
  const data = await res.json();

  if (!res.ok || data.status === 'error') {
    const code = data.results?.code || '';
    if (code === 'TooManyRequests' || res.status === 429) {
      throw new Error('QUOTA_EXCEEDED');
    }

    const requestError = new Error(data.results?.message || 'NewsData error');
    requestError.status = res.status;
    requestError.results = data.results;
    throw requestError;
  }

  const resultados = normalizarNewsData(data.results || []);

  return {
    resultados,
    nextPage: data.nextPage || null,
    totalResults: typeof data.totalResults === 'number' ? data.totalResults : resultados.length,
  };
};
