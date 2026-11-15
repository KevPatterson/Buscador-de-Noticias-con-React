import { useEffect, useState } from 'react';

// Descubrimiento via GDELT (sin clave): titulares globales de las ultimas 24h.
const useTendencias = ({ activo, query }) => {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!activo) return;

    const controller = new AbortController();

    const consultar = async () => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          q: (query || '').trim() || 'Cuba',
          timespan: '1d',
        });
        const response = await fetch(`/api/tendencias?${params}`, { signal: controller.signal });
        const data = await response.json();

        if (!response.ok || data.status !== 'ok') {
          throw new Error(data.message || 'No se pudieron obtener tendencias.');
        }

        setNoticias(data.resultados || []);
      } catch (requestError) {
        if (requestError.name === 'AbortError') return;
        setError(requestError.message || 'No se pudieron obtener tendencias.');
        setNoticias([]);
      } finally {
        setLoading(false);
      }
    };

    consultar();

    return () => controller.abort();
  }, [activo, query, recarga]);

  return { noticias, loading, error, refetch: () => setRecarga((valor) => valor + 1) };
};

export default useTendencias;
