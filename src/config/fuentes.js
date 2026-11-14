export const DOMINIOS_PREFERIDOS = [
  "cubadebate.cu",
  "granma.cu",
  "juventudrebelde.cu",
  "cubasi.cu",
  "acn.cu",
  "tribuna.cu",
  "radioreloj.cu",
  "prensalatina.cu",
  "jit.cu",
  "5septiembre.cu",
  "giron.cu",
  "escambray.cu",
  "radio26.icrt.cu",
  "radiobayamo.icrt.cu",
  "cubagob.cu",
  "minrex.gob.cu",
  "bc.gob.cu",
  "tvbrics.com",
  "espanol.cgtn.com",
  "noticiaslatam.lat",
  "venceremos.cu",
  "infobae.com",
  "actualidad.rt.com",
  "telesurtv.net",
  "hispantv.com",
];

// Dominios adicionales que sirven contenido de fuentes configuradas pero no son
// subdominios del dominio del feed (p. ej. radio26.icrt.cu enlaza a radio26.cu).
export const DOMINIOS_ADICIONALES = ['radio26.cu'];

export const NOMBRES_FUENTES = {
  'cubadebate.cu': 'Cubadebate',
  'granma.cu': 'Granma',
  'juventudrebelde.cu': 'Juventud Rebelde',
  'cubasi.cu': 'CubaSi',
  'acn.cu': 'ACN',
  'tribuna.cu': 'Tribuna de La Habana',
  'radioreloj.cu': 'Radio Reloj',
  'prensalatina.cu': 'Prensa Latina',
  'jit.cu': 'JIT Deporte',
  '5septiembre.cu': '5 de Septiembre',
  'giron.cu': 'Giron',
  'escambray.cu': 'Escambray',
  'radio26.icrt.cu': 'Radio 26',
  'radiobayamo.icrt.cu': 'Radio Bayamo (CMKX)',
  'cubagob.cu': 'Portal del Gobierno de Cuba',
  'minrex.gob.cu': 'MINREX',
  'bc.gob.cu': 'Banco Central de Cuba',
  'tvbrics.com': 'TV BRICS',
  'espanol.cgtn.com': 'CGTN Espanol',
  'noticiaslatam.lat': 'Sputnik Mundo',
  'venceremos.cu': 'Venceremos',
  'infobae.com': 'Infobae',
  'actualidad.rt.com': 'RT en Español',
  'telesurtv.net': 'teleSUR',
  'hispantv.com': 'HispanTV',
};

export const DOMINIOS_NO_NEWDATA = [
  'bc.gob.cu',
  'cubagob.cu',
  'espanol.cgtn.com',
  'giron.cu',
  'jit.cu',
  'minrex.gob.cu',
  'noticiaslatam.lat',
  'prensalatina.cu',
  'radio26.icrt.cu',
  'radiobayamo.icrt.cu',
  'tribuna.cu',
  'tvbrics.com',
  'hispantv.com',
];

export const DOMINIOS_NEWDATA = DOMINIOS_PREFERIDOS.filter((dominio) => !DOMINIOS_NO_NEWDATA.includes(dominio));

export const GRUPOS_DOMINIOS = DOMINIOS_NEWDATA.reduce((grupos, dominio, i) => {
  const grupoIndex = Math.floor(i / 5);
  if (!grupos[grupoIndex]) grupos[grupoIndex] = [];
  grupos[grupoIndex].push(dominio);
  return grupos;
}, []);

export const GRUPOS_PRIORITARIOS = GRUPOS_DOMINIOS.slice(0, 3);
