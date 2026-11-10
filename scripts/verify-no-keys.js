// Verifica que el bundle de produccion (/dist) no contiene referencias a las
// variables de clave de API. Se ejecuta automaticamente tras `npm run build`
// (script postbuild). Si encuentra alguna, falla con codigo de salida 1.
import fs from 'fs';
import path from 'path';

const DIST_DIR = path.resolve('dist');

const PATRONES = [
  'VITE_NEWSDATA_API_KEY',
  'VITE_THENEWSAPI_KEY',
  'VITE_NEWSAPI_KEY',
  'NEWSDATA_API_KEY',
  'THENEWSAPI_KEY',
  'NEWSAPI_KEY',
];

// Si las claves reales estan definidas en el entorno local, tambien se busca su
// valor literal por si alguno quedara incrustado en el bundle.
const CLAVES_REALES = [
  process.env.NEWSDATA_API_KEY,
  process.env.THENEWSAPI_KEY,
  process.env.NEWSAPI_KEY,
].filter(Boolean);

let archivosConHallazgos = 0;

const recorrer = (directorio) => {
  for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
    const rutaCompleta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      recorrer(rutaCompleta);
      continue;
    }
    if (!entrada.name.match(/\.(js|html|css|json|map)$/i)) continue;

    let contenido;
    try {
      contenido = fs.readFileSync(rutaCompleta, 'utf8');
    } catch {
      continue;
    }

    const hallazgos = PATRONES.filter((patron) => contenido.includes(patron));
    CLAVES_REALES.forEach((clave) => {
      if (clave && clave.length > 8 && contenido.includes(clave)) {
        hallazgos.push(`VALOR_LITERAL_DE_${clave.slice(0, 8)}...`);
      }
    });

    if (hallazgos.length > 0) {
      archivosConHallazgos += 1;
      console.error(`CLAVE EXPUESTA EN ${rutaCompleta}: ${hallazgos.join(', ')}`);
    }
  }
};

if (!fs.existsSync(DIST_DIR)) {
  console.error('No se encontro la carpeta dist. Ejecuta primero npm run build.');
  process.exit(1);
}

recorrer(DIST_DIR);

if (archivosConHallazgos > 0) {
  console.error(
    `Verificacion fallida: ${archivosConHallazgos} archivo(s) de distribucion contienen referencias a claves de API.`
  );
  process.exit(1);
}

console.log('Verificacion OK: no se encontraron claves de API en dist.');
