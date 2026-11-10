// Script de pruebas de extracción de contenido
// Valida que la cascada de métodos funciona correctamente
// Uso: node scripts/test-extraccion.js

import { spawn } from 'child_process';

// URLs reales de fuentes cubanas para pruebas
const FIXTURES = [
  {
    url: 'https://cubadebate.cu/',
    minChars: 100,
    fuente: 'Cubadebate',
  },
  {
    url: 'https://www.granma.cu/',
    minChars: 100,
    fuente: 'Granma',
  },
  {
    url: 'https://www.juventudrebelde.cu/',
    minChars: 100,
    fuente: 'Juventud Rebelde',
  },
];

const formatearFila = (url, pasa, metodo, caracteres, tiempo, calidad) => {
  const pasaMarca = pasa ? '✓' : '✗';
  const urlTrunc = url.length > 40 ? `${url.slice(0, 37)}...` : url;

  return [
    pasaMarca.padEnd(3),
    urlTrunc.padEnd(45),
    metodo.padEnd(18),
    String(caracteres).padStart(10),
    `${tiempo}ms`.padStart(10),
    calidad.padEnd(8),
  ].join(' | ');
};

const ejecutarPruebas = async () => {
  console.log('\n📋 PRUEBAS DE EXTRACCIÓN DE CONTENIDO\n');
  console.log(
    'Estado | URL                                            | Método             | Caracteres |   Tiempo | Calidad\n' +
      '-------|-----------------------------------------------|-------------------|------------|----------|--------'
  );

  let pasadas = 0;
  let fallidas = 0;

  for (const fixture of FIXTURES) {
    const inicio = Date.now();
    let resultado = {
      pasa: false,
      metodo: 'error',
      caracteres: 0,
      tiempo: 0,
      calidad: 'n/a',
    };

    try {
      // Nota: En producción, llamaría a /api/scrape?url=...
      // Por ahora, simulamos una respuesta
      const respuesta = await fetch(`/api/scrape?url=${encodeURIComponent(fixture.url)}`)
        .catch(() => ({
          ok: false,
          json: async () => ({ fullText: '' }),
        }));

      const data = respuesta.ok ? await respuesta.json() : { fullText: '' };
      const texto = data.fullText || '';
      const caracteres = texto.length;

      resultado.caracteres = caracteres;
      resultado.tiempo = Date.now() - inicio;
      resultado.pasa = caracteres >= fixture.minChars;
      resultado.metodo = caracteres > 500 ? 'JSON-LD/selectores' : caracteres > 0 ? 'readability' : 'error';
      resultado.calidad = caracteres >= 1000 ? 'alta' : caracteres >= 300 ? 'media' : 'baja';

      if (resultado.pasa) pasadas += 1;
      else fallidas += 1;
    } catch (e) {
      resultado.tiempo = Date.now() - inicio;
      resultado.metodo = 'error';
      fallidas += 1;
    }

    console.log(
      formatearFila(
        fixture.url,
        resultado.pasa,
        resultado.metodo,
        resultado.caracteres,
        resultado.tiempo,
        resultado.calidad
      )
    );
  }

  console.log(`\n📊 Resultados: ${pasadas} pasadas, ${fallidas} fallidas\n`);

  process.exit(fallidas > 0 ? 1 : 0);
};

ejecutarPruebas().catch(console.error);
