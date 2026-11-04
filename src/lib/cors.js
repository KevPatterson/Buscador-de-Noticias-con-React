// Cabeceras CORS restrictivas para las serverless functions.
// Solo se permite el dominio de despliegue en Vercel y localhost en desarrollo.
const ORIGINES_LOCALHOST = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export const configurarCors = (req, res) => {
  const origen = req.headers.origin;
  const origenVercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const permitidos = [origenVercel, ...ORIGINES_LOCALHOST].filter(Boolean);

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (origen && permitidos.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
};
