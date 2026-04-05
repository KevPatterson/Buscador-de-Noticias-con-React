import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const API_BASE_URL = 'https://newsdata.io/api/1/news';

const buildBaseKey = ({ query, categoria, idioma, pais }) =>
  JSON.stringify({ query: query.trim().toLowerCase(), categoria, idioma, pais });

const buildRequestKey = ({ query, categoria, idioma, pais, pagina }) =>
  JSON.stringify({ query: query.trim().toLowerCase(), categoria, idioma, pais, pagina: pagina || '' });

const normalizeNews = (results = []) =>
  results.map((item) => ({
    title: item.title,
    description: item.description,
    image_url: item.image_url,
    link: item.link,
    source_id: item.source_id,
    pubDate: item.pubDate,
  }));

const useNoticias = (params) => {
  const { query = '', categoria = 'top', idioma = 'es', pais = 'cu', pagina = '' } = params || {};

  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const [nextPage, setNextPage] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const cacheRef = useRef(new Map());
  const lastBaseKeyRef = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const baseKey = useMemo(
    () => buildBaseKey({ query: debouncedQuery, categoria, idioma, pais }),
    [categoria, debouncedQuery, idioma, pais]
  );

  const requestKey = useMemo(
    () => buildRequestKey({ query: debouncedQuery, categoria, idioma, pais, pagina }),
    [categoria, debouncedQuery, idioma, pais, pagina]
  );

  useEffect(() => {
    const apiKey = import.meta.env.VITE_NEWSDATA_API_KEY;
    const queryTrim = debouncedQuery.trim();

    if (!apiKey) {
      setError('Falta la variable VITE_NEWSDATA_API_KEY');
      setLoading(false);
      setIsLoadingMore(false);
      setHasMore(false);
      return;
    }

    if (queryTrim.length < 2) {
      setNoticias([]);
      setTotalResults(0);
      setError('');
      setLoading(false);
      setIsLoadingMore(false);
      setHasMore(false);
      setNextPage(null);
      return;
    }

    const controller = new AbortController();
    const isPaginationRequest = Boolean(pagina);

    if (isPaginationRequest) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
      setIsLoadingMore(false);
      setError('');
      const cached = cacheRef.current.get(requestKey);
      if (cached) {
        setNoticias(cached.noticias);
        setTotalResults(cached.totalResults);
        setHasMore(cached.hasMore);
        setNextPage(cached.nextPage);
      }
    }

    const queryParams = new URLSearchParams({
      apikey: apiKey,
      language: idioma,
      category: categoria,
    });

    if (pais) queryParams.set('country', pais);
    if (queryTrim.length >= 2) queryParams.set('q', queryTrim);
    if (pagina) queryParams.set('page', pagina);

    const requestUrl = `${API_BASE_URL}?${queryParams.toString()}`;

    const consultarApi = async () => {
      try {
        const response = await fetch(requestUrl, { signal: controller.signal });
        const data = await response.json();

        if (!response.ok || data.status === 'error') {
          throw new Error(data.results?.message || 'No se pudo obtener noticias.');
        }

        const normalizadas = normalizeNews(data.results);
        const paginaSiguiente = data.nextPage || null;
        const tieneMas = Boolean(paginaSiguiente && normalizadas.length > 0);

        if (isPaginationRequest && lastBaseKeyRef.current === baseKey) {
          setNoticias((actual) => {
            const mapa = new Map(actual.map((item) => [item.link, item]));
            normalizadas.forEach((item) => {
              if (item.link) mapa.set(item.link, item);
            });
            return Array.from(mapa.values());
          });
        } else {
          setNoticias(normalizadas);
        }

        const total = typeof data.totalResults === 'number' ? data.totalResults : normalizadas.length;
        setTotalResults(total);
        setHasMore(tieneMas);
        setNextPage(paginaSiguiente);
        setError('');

        const snapshot = {
          noticias: isPaginationRequest && lastBaseKeyRef.current === baseKey ? undefined : normalizadas,
          totalResults: total,
          hasMore: tieneMas,
          nextPage: paginaSiguiente,
        };

        if (isPaginationRequest && lastBaseKeyRef.current === baseKey) {
          setNoticias((actual) => {
            cacheRef.current.set(requestKey, {
              noticias: actual,
              totalResults: total,
              hasMore: tieneMas,
              nextPage: paginaSiguiente,
            });
            return actual;
          });
        } else {
          cacheRef.current.set(requestKey, snapshot);
        }

        lastBaseKeyRef.current = baseKey;
      } catch (requestError) {
        if (requestError.name === 'AbortError') return;
        setError(requestError.message || 'Error de red. Intenta nuevamente.');
        setHasMore(false);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    };

    consultarApi();

    return () => {
      controller.abort();
    };
  }, [baseKey, categoria, debouncedQuery, idioma, pagina, pais, requestKey, retryTick]);

  const refetch = useCallback(() => {
    setRetryTick((value) => value + 1);
  }, []);

  return {
    noticias,
    loading,
    error,
    totalResults,
    nextPage,
    hasMore,
    isLoadingMore,
    refetch,
  };
};

export default useNoticias;