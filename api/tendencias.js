import { configurarCors } from '../src/lib/cors.js';
import { conTimeout } from '../src/lib/timeout.js';

const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc';
const TIEMPO_ESPERA_MS = 10000;

const asSingle = (value) => (Array.isArray(value) ? value[0] : value);

// GDELT entrega seendate como 20261115T123000Z; se normaliza a ISO para que
// orden.js y las cards lo interpreten con new Date().
const parsearFechaGdelt = (seendate = '') => {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(seendate);
  if (!match) return '';
  const [, anio, mes, dia, hora, minuto, segundo] = match;
  return `${anio}-${mes}-${dia}T${hora}:${minuto}:${segundo}Z`;
};

const normalizar = (articles = []) =>
  articles
    .filter((item) => item?.url && item?.title)
    .map((item) => ({
      title: item.title,
      link: item.url,
      pubDate: parsearFechaGdelt(item.seendate),
      description: '',
      image_url: item.socialimage || null,
      source_name: item.domain || '',
      source_id: item.domain || '',
    }));

export default async function handler(req, res) {
  const esPreflight = configurarCors(req, res);
  if (esPreflight) return;

  const q = asSingle(req.query.q) || 'Cuba';
  const timespan = asSingle(req.query.timespan) || '1d';
  const maxrecordsRaw = Number.parseInt(String(asSingle(req.query.maxrecords) || '25'), 10);
  const maxrecords = Number.isNaN(maxrecordsRaw) ? 25 : Math.min(Math.max(maxrecordsRaw, 1), 50);

  const params = new URLSearchParams({
    query: q,
    mode: 'ArtList',
    format: 'json',
    maxrecords: String(maxrecords),
    timespan,
    sort: 'HybridRel',
  });

  try {
    const respuesta = await conTimeout(
      fetch(`${GDELT_BASE}?${params}`, {
        headers: { 'User-Agent': 'Cubapress/1.0 (+https://clavisoft.vercel.app)' },
      }),
      TIEMPO_ESPERA_MS,
      'GDELT'
    );

    if (!respuesta.ok) {
      return res.status(502).json({ status: 'error', message: 'GDELT no respondio', resultados: [] });
    }

    const texto = await respuesta.text();
    let data;
    try {
      data = JSON.parse(texto);
    } catch {
      // GDELT responde texto plano cuando no hay resultados o la consulta es invalida.
      res.setHeader('Cache-Control', 's-maxage=120');
      return res.status(200).json({ status: 'ok', resultados: [], message: 'Sin resultados' });
    }

    const resultados = normalizar(data.articles || []);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ status: 'ok', resultados, message: '' });
  } catch (error) {
    console.error('[tendencias] error:', error.message);
    return res.status(502).json({ status: 'error', message: 'No se pudo consultar GDELT', resultados: [] });
  }
}
