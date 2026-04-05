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
  "telesurtv.net",
  "noticiaslatam.lat",
  "actualidad.rt.com",
  "tvbrics.com",
  "espanol.cgtn.com",
  "infobae.com",
];

export const GRUPOS_DOMINIOS = DOMINIOS_PREFERIDOS.reduce((grupos, dominio, i) => {
  const grupoIndex = Math.floor(i / 5);
  if (!grupos[grupoIndex]) grupos[grupoIndex] = [];
  grupos[grupoIndex].push(dominio);
  return grupos;
}, []);

export const GRUPOS_PRIORITARIOS = GRUPOS_DOMINIOS.slice(0, 3);
