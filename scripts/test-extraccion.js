/**
 * Script de pruebas para validar la extracción de contenido de artículos.
 * Ejecuta scraping en un fixture de URLs reales y reporta:
 * - Éxito/fallo
 * - Método usado (JSON-LD, selectores, readability, heurística, RSS)
 * - Longitud del texto extraído
 * - Tiempo de extracción
 * - Calidad (alta/media/baja)
 */

const COLORES = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const FIXTURE_URLS = [
  {
    url: 'https://cubadebate.cu/noticias/2024/11/economia/',
    minChars: 300,
    nombre: 'Cubadebate',
  },
  {
    url: 'https://granma.cu/',
    minChars: 300,
    nombre: 'Granma',
  },
  {
    url: 'https://www.juventudrebelde.cu/',
    minChars: 300,
    nombre: 'Juventud Rebelde',
  },
  {
    url: 'https://www.acn.cu/',
    minChars: 300,
    nombre: 'ACN',
  },
  {
    url: 'https://tribuna.cu/',
    minChars: 300,
    nombre: 'Tribuna',
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const testExtraccion = async () => {
  console.log(`\n${COLORES.bright}${COLORES.blue}=== PRUEBA DE EXTRACCIÓN DE CONTENIDO ===${COLORES.reset}\n`);
  
  const resultados = [];
  
  for (const fixture of FIXTURE_URLS) {
    const { url, minChars, nombre } = fixture;
    const inicio = Date.now();
    
    try {
      const encodedUrl = encodeURIComponent(url);
      const response = await fetch(`http://localhost:5173/api/scrape?url=${encodedUrl}`);
      
      if (!response.ok) {
        resultados.push({
          url: nombre,
          resultado: `${COLORES.red}✗ FALLA${COLORES.reset}`,
          metodo: 'N/A',
          caracteres: 0,
          tiempo: Date.now() - inicio,
          calidad: 'N/A',
        });
        continue;
      }
      
      const data = await response.json();
      const cuerpo = data.cuerpo || '';
      const longitud = cuerpo.length;
      const tiempo = Date.now() - inicio;
      const pasa = longitud >= minChars;
      
      resultados.push({
        url: nombre,
        resultado: pasa ? `${COLORES.green}✓ PASA${COLORES.reset}` : `${COLORES.yellow}⚠ CORTO${COLORES.reset}`,
        metodo: data.metodo || 'desconocido',
        caracteres: longitud,
        tiempo: `${tiempo}ms`,
        calidad: data.calidad || 'baja',
      });
    } catch (error) {
      resultados.push({
        url: nombre,
        resultado: `${COLORES.red}✗ ERROR${COLORES.reset}`,
        metodo: 'N/A',
        caracteres: 0,
        tiempo: `${Date.now() - inicio}ms`,
        calidad: 'N/A',
      });
    }
    
    // Espera un poco entre solicitudes para no sobrecargar
    await sleep(1000);
  }
  
  // Imprime tabla
  console.log(
    `${COLORES.bright}URL${COLORES.reset}` + ' '.repeat(30) + ' | ' + 
    `${COLORES.bright}Estado${COLORES.reset}` + ' '.repeat(12) + ' | ' +
    `${COLORES.bright}Método${COLORES.reset}` + ' '.repeat(12) + ' | ' +
    `${COLORES.bright}Caracteres${COLORES.reset}` + ' | ' +
    `${COLORES.bright}Tiempo${COLORES.reset}` + ' | ' +
    `${COLORES.bright}Calidad${COLORES.reset}`
  );
  
  console.log('-'.repeat(120));
  
  resultados.forEach((resultado) => {
    const padUrl = resultado.url.padEnd(40);
    const padResultado = String(resultado.resultado).padEnd(20);
    const padMetodo = String(resultado.metodo).padEnd(14);
    const padChars = String(resultado.caracteres).padStart(10);
    const padTiempo = String(resultado.tiempo).padStart(8);
    const padCalidad = String(resultado.calidad).padStart(8);
    
    console.log(
      `${padUrl} | ${padResultado} | ${padMetodo} | ${padChars} | ${padTiempo} | ${padCalidad}`
    );
  });
  
  // Resumen
  const pases = resultados.filter((r) => r.resultado.includes('✓')).length;
  const total = resultados.length;
  
  console.log(`\n${COLORES.bright}Resumen: ${pases}/${total} pruebas exitosas${COLORES.reset}`);
  
  if (pases === total) {
    console.log(`${COLORES.green}✓ Todas las pruebas pasaron${COLORES.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${COLORES.yellow}⚠ ${total - pases} prueba(s) necesitan ajuste${COLORES.reset}\n`);
    process.exit(1);
  }
};

testExtraccion().catch((error) => {
  console.error(`${COLORES.red}\nError fatal: ${error.message}${COLORES.reset}`);
  process.exit(1);
});
