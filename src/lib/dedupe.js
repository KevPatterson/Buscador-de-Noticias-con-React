// Deduplicacion de noticias por URL canonica y hash del titulo normalizado.
//
// - URL: se eliminan parametros de seguimiento (utm_*, fbclid, igsc, ref) y el
//   fragmento, para tratar como iguales variantes de la misma direccion.
// - Titulo: normalizado a minusculas, sin tildes ni puntuacion.
const PARAMETROS_DESCARTAR = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'igsc', 'ref', 'mc_cid', 'mc_eid', 'el_action', 'el_token',
  'gclid', 'gclsrc', 'msclkid', 'rdt_cid', 'utm_id', 'utm_source_platform',
];

const normalizarURL = (url = '') => {
  try {
    const u = new URL(url);
    // Elimina parámetros de seguimiento
    PARAMETROS_DESCARTAR.forEach((parametro) => u.searchParams.delete(parametro));
    // Elimina fragmento y trailing slash
    u.hash = '';
    let href = u.href.toLowerCase();
    // Elimina trailing slash de la ruta (pero no de la raíz)
    if (href.endsWith('/') && !href.endsWith('://')) {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return url.toLowerCase();
  }
};

const normalizarTitulo = (titulo = '') =>
  String(titulo)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .toLowerCase()
    .trim()
    .slice(0, 300); // Limita a 300 caracteres para evitar claves muy largas

export const dedupeNoticias = (resultados = []) => {
  const vistasPorURL = new Set();
  const vistasPorTitulo = new Set();
  const salida = [];

  for (const item of resultados) {
    const urlKey = normalizarURL(item.link || '');
    const tituloKey = normalizarTitulo(item.title || '');

    if (urlKey && vistasPorURL.has(urlKey)) continue;
    if (tituloKey && vistasPorTitulo.has(tituloKey)) continue;

    if (urlKey) vistasPorURL.add(urlKey);
    if (tituloKey) vistasPorTitulo.add(tituloKey);
    salida.push(item);
  }

  return salida;
};
