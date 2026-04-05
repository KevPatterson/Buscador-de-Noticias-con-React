import { useCallback, useEffect, useMemo, useState } from 'react';
import { FUENTES_RSS } from '../config/fuentes-rss';

const filtrarPorQuery = (results, query) => {
  const queryTrim = (query || '').trim().toLowerCase();
  if (!queryTrim) return results;

  return results.filter((item) => {
    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    return title.includes(queryTrim) || description.includes(queryTrim);
  });
};

const useRSS = ({ fuenteEspecifica, query }) => {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryTick, setRetryTick] = useState(0);

  const fuenteRSS = useMemo(
    () => FUENTES_RSS.find((fuente) => fuente.dominio === fuenteEspecifica) || null,
    [fuenteEspecifica]
  );

  useEffect(() => {
    if (!fuenteRSS) {
      setNoticias([]);
      setLoading(false);
      setError('');
      return;
    }

    const controller = new AbortController();

    const consultarRSS = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/rss?feed=${encodeURIComponent(fuenteRSS.feed)}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok || data.status !== 'ok') {
          throw new Error(data.message || 'No se pudo obtener el feed RSS.');
        }

        const filtradas = filtrarPorQuery(data.results || [], query);
        setNoticias(filtradas);
      } catch (requestError) {
        if (requestError.name === 'AbortError') return;
        setError(requestError.message || 'No se pudo obtener el feed RSS.');
        setNoticias([]);
      } finally {
        setLoading(false);
      }
    };

    consultarRSS();

    return () => {
      controller.abort();
    };
  }, [fuenteRSS, query, retryTick]);

  const refetch = useCallback(() => {
    setRetryTick((value) => value + 1);
  }, []);

  return {
    noticias,
    loading,
    error,
    refetch,
  };
};

export default useRSS;
