import { configurarCors } from '../src/lib/cors.js';
import { conTimeout } from '../src/lib/timeout.js';

const asSingleValue = (value) => (Array.isArray(value) ? value[0] : value);

// Limites del resumen: texto acotado para controlar coste y latencia.
const MAXIMO_TEXTO = 6000;
const MINIMO_TEXTO = 120;
const TIEMPO_ESPERA_MS = 20000;

const construirMensajes = (titulo, texto) => [
  {
    role: 'system',
    content:
      'Eres un editor de noticias en espanol. Resume el texto en un maximo de 3 frases, ' +
      'con tono neutral y sin agregar datos que no aparezcan en el texto.',
  },
  {
    role: 'user',
    content: `Titulo: ${titulo || 'Sin titulo'}\n\nTexto:\n${texto}`,
  },
];

export default async function handler(req, res) {
  const esPreflight = configurarCors(req, res);
  if (esPreflight) return;

  const disponible = Boolean(process.env.RESUMEN_API_KEY);

  // GET se usa solo para saber si la funcion esta configurada; no expone la clave.
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', disponible });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Metodo no permitido' });
  }

  if (!disponible) {
    return res.status(503).json({ status: 'error', message: 'Resumen no configurado' });
  }

  const body = req.body || {};
  const titulo = asSingleValue(body.titulo) || '';
  const texto = String(asSingleValue(body.texto) || '');

  if (texto.trim().length < MINIMO_TEXTO) {
    return res.status(400).json({ status: 'error', message: 'Texto insuficiente para resumir' });
  }

  // El proveedor es compatible con OpenAI; la URL y el modelo son configurables
  // para no atar el proyecto a un solo servicio.
  const url = process.env.RESUMEN_API_URL || 'https://api.openai.com/v1/chat/completions';
  const modelo = process.env.RESUMEN_MODELO || 'gpt-4o-mini';

  try {
    const respuesta = await conTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESUMEN_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelo,
          messages: construirMensajes(titulo, texto.slice(0, MAXIMO_TEXTO)),
          temperature: 0.2,
          max_tokens: 220,
        }),
      }),
      TIEMPO_ESPERA_MS,
      'RESUMEN'
    );

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '');
      console.error('[resumen] proveedor respondio', respuesta.status, detalle.slice(0, 200));
      return res.status(502).json({ status: 'error', message: 'El proveedor de resumen fallo' });
    }

    const data = await respuesta.json();
    const resumen = String(data?.choices?.[0]?.message?.content || '').trim();

    if (!resumen) {
      return res.status(502).json({ status: 'error', message: 'Respuesta vacia del proveedor' });
    }

    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).json({ status: 'ok', resumen });
  } catch (error) {
    console.error('[resumen] error:', error.message);
    return res.status(502).json({ status: 'error', message: 'No se pudo generar el resumen' });
  }
}
