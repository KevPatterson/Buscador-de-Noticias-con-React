/**
 * Obtiene noticias mediante el endpoint serverless /api/news.
 * Las claves de API residen solo en el servidor (variables sin prefijo VITE_);
 * el frontend nunca las maneja.
 */
export const fetchConFallback = async (params) => {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.set('q', params.query);
  if (params.categoria) searchParams.set('categoria', params.categoria);
  if (params.domainurl) searchParams.set('fuente', params.domainurl);
  if (params.pagina) searchParams.set('pagina', String(params.pagina));

  const res = await fetch(`/api/news?${searchParams.toString()}`, { signal: params.signal });

  if (!res.ok) {
    const mensaje = await res.text().catch(() => '');
    throw new Error(mensaje || 'No se pudo obtener noticias');
  }

  const data = await res.json();
  return {
    resultados: data.resultados || [],
    fuente: data.fuente || 'rss',
    nextPage: data.nextPage || null,
    totalResults: typeof data.totalResults === 'number' ? data.totalResults : (data.resultados || []).length,
  };
};
