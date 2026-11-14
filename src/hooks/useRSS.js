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
    // Si no hay fuente RSS seleccionada, limpiar estado
    if (!fuenteRSS) {
      setNoticias([]);
      setLoading(false);
      setError('');
      setFeedNoDisponible(false);
      setFeedMensaje('');
      return;
    }

    // Crear cancelación token para esta solicitud
    const controller = new AbortController();
    let isMounted = true;

    const consultarRSS = async () => {
      // Resetear estado al iniciar solicitud
      if (isMounted) {
        setLoading(true);
        setError('');
        setFeedNoDisponible(false);
        setFeedMensaje('');
        setNoticias([]);
      }

      try {
        const response = await fetch(`/api/rss?feed=${encodeURIComponent(fuenteRSS.feed)}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        // Solo actualizar si el componente sigue montado y no fue cancelado
        if (!isMounted || controller.signal.aborted) return;

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
        if (requestError.name === 'AbortError' || !isMounted) return;
        setError(requestError.message || 'No se pudo obtener el feed RSS.');
        setNoticias([]);
        setFeedNoDisponible(true);
        setFeedMensaje(requestError.message || 'Fuente temporalmente no disponible');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    consultarRSS();

    // Cleanup: cancelar solicitud y marcar como desmontado
    return () => {
      isMounted = false;
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
