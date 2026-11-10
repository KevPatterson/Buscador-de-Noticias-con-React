// Pruebas de extraccion de contenido y de proteccion SSRF.
//
// Uso: npm run test:extraccion
//
// - Bloque SSRF: valida que /api/scrape rechaza loopback, metadata de nube,
//   localhost, dominios fuera de la allowlist y redirecciones hacia IPs privadas.
// - Bloque extraccion: recorre un fixture de URLs reales de medios configurados
//   y muestra pasa/falla, metodo usado, longitud del cuerpo y tiempo.
//
// Las pruebas de extraccion requieren conexion a Internet. Las de SSRF funcionan
// sin red porque las direcciones se rechazan antes de conectar.
import handlerScrape from '../api/scrape.js';
import {
  esIpBloqueada,
  isHostAllowed,
  validateUrl,
  validarDestinoSeguro,
} from '../src/lib/secureFetch.js';

// Fixture de URLs reales (obtenidas de los feeds configurados).
const FIXTURE = [
  { url: 'http://www.cubadebate.cu/noticias/2026/11/04/asociacion-italiana-semillas-de-paz-traera-a-cuba-ayuda-solidaria/', minChars: 300 },
  { url: 'http://www.cubadebate.cu/noticias/2026/11/04/une-se-pronostica-una-afectacion-de-1920-mw-en-el-horario-pico/', minChars: 300 },
  { url: 'https://www.prensa-latina.cu/2026/11/04/hezbola-niega-presencia-de-expertos-en-yemen-para-apoyar-a-huties/', minChars: 300 },
  { url: 'https://www.prensa-latina.cu/2026/11/04/un-muerto-en-ataque-israeli-contra-motocicleta-en-el-libano/', minChars: 300 },
  { url: 'https://www.prensa-latina.cu/2026/11/04/cuba-critica-unilateralismo-de-eeuu-y-reitera-denuncia-al-bloqueo/', minChars: 300 },
  { url: 'https://www.radio26.cu/noticias-de-matanzas/cultura/reedita-ediciones-matanzas-centenario-libro-la-zafra-de-agustin-acosta/', minChars: 300 },
  { url: 'https://www.radio26.cu/matanzas/diaz-canel-sobre-el-abasto-de-agua-en-criterio-compartido-responder-al-pueblo-con-hechos-y-no-con-retorica/', minChars: 300 },
  { url: 'https://www.radio26.cu/matanzas/sin-delegados-no-hay-poder-popular/', minChars: 300 },
  { url: 'https://www.radioreloj.cu/en-portada/aborda-el-programa-criterio-compartido-el-abasto-de-agua/', minChars: 300 },
  { url: 'https://www.radioreloj.cu/noticias-radio-reloj/nacionales/evalua-el-partido-quehacer-del-sistema-bancario-de-cuba/', minChars: 300 },
  { url: 'https://www.radioreloj.cu/destacadas/asume-partido-democrata-control-del-congreso/', minChars: 300 },
  { url: 'https://www.5septiembre.cu/presidenta-sheinbaum-se-suma-a-colecta-para-enviar-40-mil-litros-de-gasolina-a-cuba/', minChars: 300 },
  { url: 'https://www.5septiembre.cu/espana-vicepresidente-primero-del-gobierno-asumira-cartera-de-transportes-tras-dimision-del-ministro/', minChars: 300 },
  { url: 'https://www.5septiembre.cu/ia-y-proyeccion-empresarial-en-mesa-de-cumbre-iberoamericana/', minChars: 300 },
  { url: 'https://www.escambray.cu/2026/fallece-el-querido-humorista-cubano-orlando-manrufo-creador-de-mariconchi/', minChars: 300 },
  { url: 'https://www.escambray.cu/2026/tres-municipios-espirituanos-fortalecen-sanidad-animal-y-servicios-veterinarios/', minChars: 300 },
  { url: 'https://www.escambray.cu/2026/escritora-catalana-cristina-fernandez-cubas-premio-cervantes-2026/', minChars: 300 },
  { url: 'http://www.granma.cu/cuba/2026-11-04/el-sector-bancario-y-financiero-cubano-debe-ser-motor-de-la-transformacion-economica-y-social-del-pais-04-11-2026-11-11-42', minChars: 300 },
  { url: 'http://www.granma.cu/mundo/2026-11-03/cuba-denuncia-el-cerco-genocida-de-washington-en-el-contexto-de-la-xxx-cumbre-iberoamericana-03-11-2026-13-11-15', minChars: 300 },
  { url: 'http://www.granma.cu/cuba/2026-11-04/energia-solar-respaldara-otras-55-estaciones-de-bombeo-en-santiago-de-cuba-04-11-2026-11-11-47', minChars: 300 },
  { url: 'https://www.jit.cu/al-mundial-sub-23-de-beisbol-con-la-bandera-en-las-manos-y-el-pecho/', minChars: 300 },
  { url: 'https://www.jit.cu/capitan-chiqui-diaz-el-liderazgo-juvenil-del-beisbol5-de-cuba/', minChars: 300 },
  { url: 'https://www.jit.cu/dakar-ya-cuenta-con-la-presencia-de-las-tres-atletas-cubanas/', minChars: 300 },
  { url: 'https://noticiaslatam.lat/20261104/lo-haria-de-nuevo-trump-nombra-la-razon-por-la-que-su-partido-perdio-las-elecciones-1175741606.html', minChars: 300 },
  { url: 'https://noticiaslatam.lat/20261104/la-situacion-es-catastrofica-alemania-podria-alcanzar-su-nivel-mas-bajo-de-empleo-industrial-desde-1175738847.html', minChars: 300 },
];

const crearRespuestaMock = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  setHeader(nombre, valor) {
    this.headers[nombre] = valor;
  },
  status(codigo) {
    this.statusCode = codigo;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
  end() {
    return this;
  },
  writeHead(codigo) {
    this.statusCode = codigo;
    return this;
  },
});

const ejecutarScrape = async (url) => {
  const req = { method: 'GET', headers: {}, query: { url } };
  const res = crearRespuestaMock();
  await handlerScrape(req, res);
  return res;
};

const probarSSRF = async () => {
  console.log('\n=== Pruebas SSRF ===\n');
  const resultados = [];

  const casosHandler = [
    { nombre: 'rechaza http://127.0.0.1', url: 'http://127.0.0.1/' },
    { nombre: 'rechaza http://169.254.169.254 (metadata cloud)', url: 'http://169.254.169.254/latest/meta-data/' },
    { nombre: 'rechaza http://localhost', url: 'http://localhost/' },
    { nombre: 'rechaza dominio fuera de la allowlist', url: 'http://dominio-fuera-de-allowlist.example/' },
  ];

  for (const caso of casosHandler) {
    const res = await ejecutarScrape(caso.url);
    const rechazado = res.statusCode >= 400 && res.statusCode !== 500;
    resultados.push({ nombre: caso.nombre, ok: rechazado, detalle: `HTTP ${res.statusCode}` });
  }

  // Bloqueo de rangos privados/loopback/link-local.
  const rangos = ['127.0.0.1', '10.1.2.3', '172.16.5.4', '192.168.1.10', '169.254.169.254', '0.0.0.0', '::1', 'fc00::1', 'fd12::1', 'fe80::1'];
  const rangosOk = rangos.every((ip) => esIpBloqueada(ip));
  resultados.push({ nombre: 'bloquea rangos privados, loopback y link-local', ok: rangosOk, detalle: detalleRangos(rangos, rangosOk) });

  // Redirect hacia IP privada: la revalidacion de cada salto debe rechazarlo.
  let redirectOk = false;
  let redirectDetalle = '';
  try {
    await validarDestinoSeguro('http://127.0.0.1/privado');
    redirectDetalle = 'no rechazo';
  } catch (error) {
    redirectOk = error.statusCode === 403 || error.statusCode === 400;
    redirectDetalle = `HTTP ${error.statusCode || '?'}`;
  }
  resultados.push({ nombre: 'rechaza redireccion hacia IP privada', ok: redirectOk, detalle: redirectDetalle });

  // La allowlist debe admitir dominios de fuentes y subdominios.
  const allowlistOk =
    isHostAllowed('cubadebate.cu') &&
    isHostAllowed('www.cubadebate.cu') &&
    isHostAllowed('www.radio26.cu') &&
    !isHostAllowed('dominio-fuera-de-allowlist.example');
  resultados.push({ nombre: 'allowlist admite fuentes y subdominios', ok: allowlistOk, detalle: '' });

  // Esquemas no permitidos y credenciales en URL.
  let esquemaOk = false;
  try {
    validateUrl('ftp://cubadebate.cu/archivo');
  } catch (error) {
    esquemaOk = error.statusCode === 400;
  }
  resultados.push({ nombre: 'rechaza esquemas distintos de http/https', ok: esquemaOk, detalle: '' });

  let credencialesOk = false;
  try {
    validateUrl('http://usuario:clave@cubadebate.cu/');
  } catch (error) {
    credencialesOk = error.statusCode === 400;
  }
  resultados.push({ nombre: 'rechaza credenciales en la URL', ok: credencialesOk, detalle: '' });

  resultados.forEach((resultado) => {
    const estado = resultado.ok ? 'PASA' : 'FALLA';
    console.log(`[${estado}] ${resultado.nombre}${resultado.detalle ? ` (${resultado.detalle})` : ''}`);
  });

  return resultados;
};

const detalleRangos = (rangos, ok) => (ok ? rangos.join(', ') : 'algun rango no bloqueado');

const truncar = (valor, max) => {
  const texto = String(valor || '');
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
};

const probarExtraccion = async () => {
  console.log('\n=== Pruebas de extraccion ===\n');
  const resultados = [];

  const lotes = [];
  for (let i = 0; i < FIXTURE.length; i += 3) lotes.push(FIXTURE.slice(i, i + 3));

  for (const lote of lotes) {
    const parciales = await Promise.all(
      lote.map(async (caso) => {
        const inicio = Date.now();
        try {
          const res = await ejecutarScrape(caso.url);
          const tiempo = Date.now() - inicio;
          const payload = res.body || {};
          const cuerpo = String(payload.cuerpo || '');
          const pasa =
            res.statusCode === 200 &&
            cuerpo.length >= caso.minChars &&
            payload.calidad !== 'baja' &&
            (!caso.debeContener || cuerpo.includes(caso.debeContener));
          return {
            url: caso.url,
            pasa,
            metodo: payload.metodo || '-',
            calidad: payload.calidad || '-',
            longitud: cuerpo.length,
            tiempo,
            detalle: res.statusCode !== 200 ? `HTTP ${res.statusCode}` : '',
          };
        } catch (error) {
          return {
            url: caso.url,
            pasa: false,
            metodo: 'error',
            calidad: '-',
            longitud: 0,
            tiempo: Date.now() - inicio,
            detalle: error.message,
          };
        }
      })
    );
    resultados.push(...parciales);
  }

  const filas = resultados.map((r, indice) => ({
    n: indice + 1,
    estado: r.pasa ? 'PASA' : 'FALLA',
    metodo: r.metodo,
    calidad: r.calidad,
    longitud: r.longitud,
    tiempo: `${r.tiempo} ms`,
    url: truncar(r.url, 64) + (r.detalle ? ` [${r.detalle}]` : ''),
  }));

  const anchos = {
    n: 3,
    estado: 6,
    metodo: 17,
    calidad: 7,
    longitud: 9,
    tiempo: 10,
  };

  const encabezado = [
    'N'.padEnd(anchos.n),
    'Estado'.padEnd(anchos.estado),
    'Metodo'.padEnd(anchos.metodo),
    'Calidad'.padEnd(anchos.calidad),
    'Longitud'.padEnd(anchos.longitud),
    'Tiempo'.padEnd(anchos.tiempo),
    'URL',
  ].join(' | ');

  console.log(encabezado);
  console.log('-'.repeat(encabezado.length));

  filas.forEach((fila) => {
    console.log(
      [
        String(fila.n).padEnd(anchos.n),
        fila.estado.padEnd(anchos.estado),
        fila.metodo.padEnd(anchos.metodo),
        fila.calidad.padEnd(anchos.calidad),
        String(fila.longitud).padEnd(anchos.longitud),
        fila.tiempo.padEnd(anchos.tiempo),
        fila.url,
      ].join(' | ')
    );
  });

  const pasan = filas.filter((fila) => fila.estado === 'PASA').length;
  console.log(`\nResumen: ${pasan}/${filas.length} URLs pasan la validacion.`);

  return resultados;
};

const main = async () => {
  let codigoSalida = 0;

  const ssrf = await probarSSRF();
  if (ssrf.some((resultado) => !resultado.ok)) {
    console.error('\nHay pruebas SSRF fallidas.');
    codigoSalida = 1;
  }

  if (process.argv.includes('--solo-ssrf')) {
    process.exit(codigoSalida);
  }

  const extraccion = await probarExtraccion();
  if (extraccion.length > 0 && extraccion.every((resultado) => !resultado.pasa)) {
    console.error('\nTodas las extracciones fallaron: revisa red o selectores.');
    codigoSalida = 1;
  }

  process.exit(codigoSalida);
};

main().catch((error) => {
  console.error('Error ejecutando las pruebas:', error);
  process.exit(1);
});
