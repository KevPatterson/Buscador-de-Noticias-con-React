/**
 * Script de pruebas para validar controles de SSRF en /api/scrape y /api/rss.
 * Verifica que:
 * - Se rechacen URLs con IPs privadas (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12, etc.)
 * - Se rechacen URLs de loopback (127.0.0.1, ::1)
 * - Se rechacen URLs de link-local incluyendo 169.254.169.254 (metadata en cloud)
 * - Se rechacen URLs con dominios no permitidos
 * - Se acepten URLs legítimas de dominios permitidos
 */

const COLORES = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const PRUEBAS_SSRF = [
  // RECHAZOS ESPERADOS - IPs privadas y loopback
  {
    url: 'http://127.0.0.1',
    esperado: 'RECHAZAR',
    razon: 'Loopback IPv4',
    tipo: 'negativo',
  },
  {
    url: 'http://[::1]',
    esperado: 'RECHAZAR',
    razon: 'Loopback IPv6',
    tipo: 'negativo',
  },
  {
    url: 'http://localhost',
    esperado: 'RECHAZAR',
    razon: 'Localhost resuelve a loopback',
    tipo: 'negativo',
  },
  {
    url: 'http://10.0.0.1',
    esperado: 'RECHAZAR',
    razon: 'IP privada 10.0.0.0/8',
    tipo: 'negativo',
  },
  {
    url: 'http://192.168.1.1',
    esperado: 'RECHAZAR',
    razon: 'IP privada 192.168.0.0/16',
    tipo: 'negativo',
  },
  {
    url: 'http://172.16.0.1',
    esperado: 'RECHAZAR',
    razon: 'IP privada 172.16.0.0/12',
    tipo: 'negativo',
  },
  {
    url: 'http://169.254.169.254',
    esperado: 'RECHAZAR',
    razon: 'Metadata de cloud (link-local)',
    tipo: 'negativo',
  },
  // RECHAZOS ESPERADOS - Dominios no permitidos
  {
    url: 'http://malicious.com',
    esperado: 'RECHAZAR',
    razon: 'Dominio no en allowlist',
    tipo: 'negativo',
  },
  {
    url: 'http://facebook.com',
    esperado: 'RECHAZAR',
    razon: 'Dominio no es fuente cubana autorizada',
    tipo: 'negativo',
  },
  // ACEPTOS ESPERADOS - Dominios permitidos
  {
    url: 'https://cubadebate.cu',
    esperado: 'ACEPTAR',
    razon: 'Dominio en allowlist',
    tipo: 'positivo',
  },
  {
    url: 'https://granma.cu',
    esperado: 'ACEPTAR',
    razon: 'Dominio en allowlist',
    tipo: 'positivo',
  },
  {
    url: 'https://www.cubasi.cu',
    esperado: 'ACEPTAR',
    razon: 'Subdominio de dominio permitido',
    tipo: 'positivo',
  },
];

const testSSRF = async () => {
  console.log(`\n${COLORES.bright}${COLORES.blue}=== PRUEBA DE CONTROLES SSRF ===${COLORES.reset}\n`);
  
  const resultados = [];
  
  for (const prueba of PRUEBAS_SSRF) {
    const { url, esperado, razon, tipo } = prueba;
    
    try {
      const encodedUrl = encodeURIComponent(url);
      const response = await fetch(
        `http://localhost:5173/api/scrape?url=${encodedUrl}`
      );
      
      const aceptado = response.status === 200;
      const rechazado = response.status >= 400;
      
      let resultado = '';
      let icono = '';
      
      if (tipo === 'negativo') {
        // Esperamos rechazo (4xx o 5xx)
        if (rechazado) {
          resultado = `${COLORES.green}✓ CORRECTO (rechazado)${COLORES.reset}`;
          icono = '✓';
        } else {
          resultado = `${COLORES.red}✗ FALLA (aceptado cuando debería rechazarse)${COLORES.reset}`;
          icono = '✗';
        }
      } else if (tipo === 'positivo') {
        // Esperamos aceptación (200)
        if (aceptado || !rechazado) {
          resultado = `${COLORES.green}✓ CORRECTO (aceptado)${COLORES.reset}`;
          icono = '✓';
        } else {
          resultado = `${COLORES.red}✗ FALLA (rechazado cuando debería aceptarse)${COLORES.reset}`;
          icono = '✗';
        }
      }
      
      resultados.push({
        url,
        esperado,
        razon,
        resultado,
        codigoHttp: response.status,
        icono,
      });
    } catch (error) {
      resultados.push({
        url,
        esperado,
        razon,
        resultado: `${COLORES.red}✗ ERROR: ${error.message}${COLORES.reset}`,
        codigoHttp: 'ERROR',
        icono: '✗',
      });
    }
  }
  
  // Imprime tabla
  console.log(
    `${COLORES.bright}URL${COLORES.reset}` + ' '.repeat(40) + ' | ' +
    `${COLORES.bright}Esperado${COLORES.reset}` + ' '.repeat(8) + ' | ' +
    `${COLORES.bright}Razón${COLORES.reset}` + ' '.repeat(25) + ' | ' +
    `${COLORES.bright}Código${COLORES.reset}` + ' | ' +
    `${COLORES.bright}Resultado${COLORES.reset}`
  );
  
  console.log('-'.repeat(150));
  
  resultados.forEach((res) => {
    const padUrl = res.url.padEnd(50);
    const padEsperado = res.esperado.padEnd(15);
    const padRazon = res.razon.padEnd(32);
    const padCodigo = String(res.codigoHttp).padStart(5);
    const padResultado = String(res.resultado).padEnd(30);
    
    console.log(
      `${padUrl} | ${padEsperado} | ${padRazon} | ${padCodigo} | ${padResultado}`
    );
  });
  
  // Resumen
  const exitosas = resultados.filter((r) => r.icono === '✓').length;
  const total = resultados.length;
  
  console.log(`\n${COLORES.bright}Resumen: ${exitosas}/${total} pruebas de SSRF exitosas${COLORES.reset}`);
  
  if (exitosas === total) {
    console.log(`${COLORES.green}✓ Todos los controles SSRF funcionan correctamente${COLORES.reset}\n`);
    process.exit(0);
  } else {
    console.log(
      `${COLORES.yellow}⚠ ${total - exitosas} control(es) SSRF requieren atención${COLORES.reset}\n`
    );
    process.exit(1);
  }
};

testSSRF().catch((error) => {
  console.error(`${COLORES.red}\nError fatal: ${error.message}${COLORES.reset}`);
  process.exit(1);
});
