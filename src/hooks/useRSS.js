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
  const [feedNoDisponible, setFeedNoDisponible] = useState(false);
  const [feedMensaje, setFeedMensaje] = useState('');
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
      setFeedNoDisponible(false);
      setFeedMensaje('');
      return;
    }

    const controller = new AbortController();

    const consultarRSS = async () => {
      setLoading(true);
      setError('');
      setFeedNoDisponible(false);
      setFeedMensaje('');

      try {
        const response = await fetch(`/api/rss?feed=${encodeURIComponent(fuenteRSS.feed)}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok || data.status !== 'ok') {
          throw new Error(data.message || 'No se pudo obtener el feed RSS.');
        }

        const originales = data.results || [];
        const mensajeServidor = (data.message || '').toLowerCase();
        const feedInvalido = originales.length === 0 &&
          (mensajeServidor.includes('feed no disponible') ||
            mensajeServidor.includes('formato rss no reconocido') ||
            mensajeServidor.includes('no se pudo consultar el feed'));

        if (feedInvalido) {
          setFeedNoDisponible(true);
          setFeedMensaje(data.message || 'Fuente temporalmente no disponible');
        }

        const filtradas = filtrarPorQuery(originales, query);
        setNoticias(filtradas.length > 0 ? filtradas : originales);
      } catch (requestError) {
        if (requestError.name === 'AbortError') return;
        setError(requestError.message || 'No se pudo obtener el feed RSS.');
        setNoticias([]);
        setFeedNoDisponible(true);
        setFeedMensaje(requestError.message || 'Fuente temporalmente no disponible');
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
    feedNoDisponible,
    feedMensaje,
    refetch,
  };
};

export default useRSS;
