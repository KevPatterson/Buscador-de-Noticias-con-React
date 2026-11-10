// Script de pruebas de validación SSRF
// Valida que secureFetch rechaza URLs maliciosas y protege contra SSRF
// Uso: node scripts/test-ssrf.js

import { validarDestinoSeguro, esIpBloqueada } from '../src/lib/secureFetch.js';

const PRUEBAS_SSRF = [
  // URLs que DEBEN SER RECHAZADAS (403 o 502)
  {
    url: 'http://127.0.0.1',
    debeRechazar: true,
    razon: 'Loopback IPv4',
  },
  {
    url: 'http://localhost',
    debeRechazar: true,
    razon: 'Loopback localhost',
  },
  {
    url: 'http://169.254.169.254',
    debeRechazar: true,
    razon: 'Metadata cloud (AWS/GCP/Azure)',
  },
  {
    url: 'http://10.0.0.1',
    debeRechazar: true,
    razon: 'Red privada 10.0.0.0/8',
  },
  {
    url: 'http://192.168.1.1',
    debeRechazar: true,
    razon: 'Red privada 192.168.0.0/16',
  },
  {
    url: 'http://172.16.0.1',
    debeRechazar: true,
    razon: 'Red privada 172.16.0.0/12',
  },
  {
    url: 'http://[::1]',
    debeRechazar: true,
    razon: 'Loopback IPv6',
  },
  {
    url: 'http://dominio-no-permitido.com',
    debeRechazar: true,
    razon: 'Dominio fuera de allowlist',
  },
  // URLs que DEBEN SER ACEPTADAS
  {
    url: 'https://cubadebate.cu',
    debeRechazar: false,
    razon: 'Dominio permitido (fuente cubana)',
  },
  {
    url: 'https://granma.cu',
    debeRechazar: false,
    razon: 'Dominio permitido (fuente cubana)',
  },
  {
    url: 'https://news.google.com/search?q=cuba',
    debeRechazar: false,
    razon: 'News.google.com permitido (usado en feeds)',
  },
];

// Pruebas de validación de IP
const PRUEBAS_IP = [
  { ip: '127.0.0.1', bloqueada: true, tipo: 'Loopback IPv4' },
  { ip: '10.0.0.1', bloqueada: true, tipo: 'Red privada 10.0.0.0/8' },
  { ip: '192.168.1.1', bloqueada: true, tipo: 'Red privada 192.168.0.0/16' },
  { ip: '172.16.0.1', bloqueada: true, tipo: 'Red privada 172.16.0.0/12' },
  { ip: '169.254.169.254', bloqueada: true, tipo: 'Metadata cloud' },
  { ip: '0.0.0.0', bloqueada: true, tipo: 'Especial 0.0.0.0' },
  { ip: '8.8.8.8', bloqueada: false, tipo: 'IP pública (Google DNS)' },
  { ip: '1.1.1.1', bloqueada: false, tipo: 'IP pública (Cloudflare DNS)' },
  { ip: '::1', bloqueada: true, tipo: 'Loopback IPv6' },
];

const formatearFila = (nombre, pasa) => {
  const marca = pasa ? '✓' : '✗';
  return `${marca.padEnd(3)} ${nombre}`;
};

const ejecutarPruebas = async () => {
  console.log('\n🔒 PRUEBAS DE VALIDACIÓN SSRF\n');

  // Pruebas de validación de IP
  console.log('📍 Validación de IPs bloqueadas:');
  console.log('-----------------------------------\n');

  let ipPasadas = 0;
  let ipFallidas = 0;

  for (const prueba of PRUEBAS_IP) {
    const esIpBloq = esIpBloqueada(prueba.ip);
    const pasa = esIpBloq === prueba.bloqueada;

    if (pasa) ipPasadas += 1;
    else ipFallidas += 1;

    const marca = pasa ? '✓' : '✗';
    const estado = prueba.bloqueada ? '(BLOQUEADA)' : '(PERMITIDA)';
    console.log(`${marca.padEnd(3)} ${prueba.ip.padEnd(18)} ${estado.padEnd(15)} ${prueba.tipo}`);
  }

  console.log(`\n📊 IPs: ${ipPasadas} correctas, ${ipFallidas} incorrectas\n`);

  // Pruebas de validación de URLs (requiere conexión)
  console.log('🌐 Validación de URLs (nota: requiere conexión):');
  console.log('---------------------------------------------------\n');

  let urlPasadas = 0;
  let urlFallidas = 0;

  for (const prueba of PRUEBAS_SSRF) {
    let pasa = false;

    try {
      await validarDestinoSeguro(prueba.url);
      pasa = !prueba.debeRechazar; // Si no lanzó error, debía ser aceptada
    } catch (e) {
      pasa = prueba.debeRechazar; // Si lanzó error, debía ser rechazada
    }

    if (pasa) urlPasadas += 1;
    else urlFallidas += 1;

    const marca = pasa ? '✓' : '✗';
    const esperado = prueba.debeRechazar ? '(RECHAZAR)' : '(ACEPTAR)';
    console.log(`${marca.padEnd(3)} ${prueba.url.padEnd(40)} ${esperado.padEnd(15)} ${prueba.razon}`);
  }

  console.log(`\n📊 URLs: ${urlPasadas} correctas, ${urlFallidas} incorrectas\n`);

  const totalPasadas = ipPasadas + urlPasadas;
  const totalFallidas = ipFallidas + urlFallidas;

  console.log(`📋 Resultado final: ${totalPasadas} pasadas, ${totalFallidas} fallidas\n`);

  process.exit(totalFallidas > 0 ? 1 : 0);
};

ejecutarPruebas().catch((e) => {
  console.error(`\n❌ Error en pruebas SSRF: ${e.message}\n`);
  process.exit(1);
});
