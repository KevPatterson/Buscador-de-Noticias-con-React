import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GRUPOS_DOMINIOS } from '../config/fuentes';

const API_BASE_URL = 'https://newsdata.io/api/1/news';
const UMBRAL_RESULTADOS_PREFERIDOS = 5;

const buildBaseKey = ({ query, categoria, pais }) =>
  JSON.stringify({ query: query.trim().toLowerCase(), categoria, language: 'es', pais });

const buildRequestKey = ({ query, categoria, pais, pagina, fuenteEspecifica }) =>
  JSON.stringify({
    query: query.trim().toLowerCase(),
    categoria,
    language: 'es',
    pais,
    pagina: pagina || '',
    fuenteEspecifica: fuenteEspecifica || '',
  });

const normalizeNews = (results = []) =>
  results.map((item) => ({
    title: item.title,
    description: item.description,
    content: item.content,
    snippet: item.snippet,
    image_url: item.image_url,
    link: item.link,
    source_id: item.source_id,
    pubDate: item.pubDate,
  }));

const dedupeByLink = (results = []) => {
  const mapa = new Map();

  results.forEach((item, index) => {
    const clave = item.link || `${item.title || 'sin-titulo'}-${index}`;
    if (!mapa.has(clave)) mapa.set(clave, item);
  });

  return Array.from(mapa.values());
};

const buildRequestUrl = ({
  apiKey,
  categoria,
  pais,
  query,
  pagina,
  domainurl,
  includeCountry = true,
  includeCategory = true,
}) => {
  const queryParams = new URLSearchParams({
    apikey: apiKey,
    language: 'es',
  });

  if (includeCategory && categoria) queryParams.set('category', categoria);
  if (includeCountry && pais) queryParams.set('country', pais);
  if (query.length >= 2) queryParams.set('q', query);
  if (pagina) queryParams.set('page', pagina);
  if (domainurl) queryParams.set('domainurl', domainurl);

  return `${API_BASE_URL}?${queryParams.toString()}`;
};

const fetchNewsData = async ({ url, signal }) => {
  const response = await fetch(url, { signal });
  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    const requestError = new Error(data.results?.message || 'No se pudo obtener noticias.');
    requestError.status = response.status;
    requestError.results = data.results;
    throw requestError;
  }

  return data;
};

const getDominiosInvalidos = (requestError) => {
  if (requestError?.status !== 422) return [];
  if (!Array.isArray(requestError.results)) return [];

  return requestError.results
    .filter((item) => item?.code === 'UnsupportedFilter' && item?.invalid_domain)
    .map((item) => item.invalid_domain);
};

const getProximoGrupo = () => {
  const total = GRUPOS_DOMINIOS.length;
  if (!total) return [];

  const ultimo = parseInt(sessionStorage.getItem('ultimo_grupo_dominio') ?? '-1', 10);
  const proximo = (ultimo + 1) % total;
  sessionStorage.setItem('ultimo_grupo_dominio', String(proximo));

  return GRUPOS_DOMINIOS[proximo];
};

const fetchNoticias = async ({ apiKey, categoria, pais, query, pagina, signal, fuenteEspecifica }) => {
  let domainurl;

  if (fuenteEspecifica) {
    domainurl = fuenteEspecifica;
  } else {
    const grupo = getProximoGrupo();
    domainurl = grupo.join(',');
  }

  if (!domainurl) {
    const urlSinDominio = buildRequestUrl({ apiKey, categoria, pais, query, pagina });
    const dataSinDominio = await fetchNewsData({ url: urlSinDominio, signal });
    return {
      ...dataSinDominio,
      results: dataSinDominio.results || [],
      _fuenteCubana: false,
    };
  }

  let dataFase1 = { results: [], nextPage: null, totalResults: 0 };
  let resultadosFase1 = [];

  try {
    const urlFase1 = buildRequestUrl({
      apiKey,
      categoria,
      pais,
      query,
      pagina,
      domainurl,
      includeCountry: !fuenteEspecifica,
      includeCategory: !fuenteEspecifica,
    });
    dataFase1 = await fetchNewsData({ url: urlFase1, signal });
    resultadosFase1 = dataFase1.results || [];

    if (fuenteEspecifica && resultadosFase1.length === 0 && query.length >= 2) {
      const urlSinQuery = buildRequestUrl({
        apiKey,
        categoria,
        pais,
        query: '',
        pagina,
        domainurl,
        includeCountry: false,
        includeCategory: false,
      });
      dataFase1 = await fetchNewsData({ url: urlSinQuery, signal });
      resultadosFase1 = dataFase1.results || [];
    }
  } catch (errorFase1) {
    if (errorFase1.name === 'AbortError') throw errorFase1;

    const dominiosInvalidos = getDominiosInvalidos(errorFase1);
    if (dominiosInvalidos.length > 0 && !fuenteEspecifica) {
      const dominiosValidos = domainurl
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item && !dominiosInvalidos.includes(item));

      if (dominiosValidos.length > 0) {
        try {
          const urlFase1Reintento = buildRequestUrl({
            apiKey,
            categoria,
            pais,
            query,
            pagina,
            domainurl: dominiosValidos.join(','),
          });
          dataFase1 = await fetchNewsData({ url: urlFase1Reintento, signal });
          resultadosFase1 = dataFase1.results || [];
        } catch (reintentoError) {
          if (reintentoError.name === 'AbortError') throw reintentoError;
          resultadosFase1 = [];
        }
      } else {
        resultadosFase1 = [];
      }
    } else if (fuenteEspecifica) {
      resultadosFase1 = [];
    } else {
      resultadosFase1 = [];
    }
  }

  if (fuenteEspecifica) {
    return {
      ...dataFase1,
      results: resultadosFase1,
      _fuenteCubana: true,
    };
  }

  if (resultadosFase1.length >= UMBRAL_RESULTADOS_PREFERIDOS) {
    return {
      ...dataFase1,
      results: resultadosFase1,
      _fuenteCubana: true,
    };
  }

  const urlFase2 = buildRequestUrl({ apiKey, categoria, pais, query, pagina });
  const dataFase2 = await fetchNewsData({ url: urlFase2, signal });
  const resultadosFase2 = dataFase2.results || [];
  const combinados = dedupeByLink([...resultadosFase1, ...resultadosFase2]);

  return {
    ...dataFase2,
    results: combinados,
    _fuenteCubana: false,
  };
};

const useNoticias = (params) => {
  const { query = '', categoria = 'top', pais = 'cu', pagina = '', fuenteEspecifica = null } = params || {};

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
    () => buildBaseKey({ query: debouncedQuery, categoria, pais }),
    [categoria, debouncedQuery, pais]
  );

  const requestKey = useMemo(
    () => buildRequestKey({ query: debouncedQuery, categoria, pais, pagina, fuenteEspecifica }),
    [categoria, debouncedQuery, fuenteEspecifica, pais, pagina]
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

    if (queryTrim.length === 1) {
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

    const consultarApi = async () => {
      try {
        const data = await fetchNoticias({
          apiKey,
          categoria,
          pais,
          query: queryTrim,
          pagina,
          signal: controller.signal,
          fuenteEspecifica,
        });

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
  }, [baseKey, categoria, debouncedQuery, fuenteEspecifica, pagina, pais, requestKey, retryTick]);

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