// Utilidad para limpiar textos de artículos antes de incluirlos en el boletín
export default function cleanArticle(text = '') {
  if (!text) return '';
  let t = text;

  // Normalizar espacios y saltos
  t = t.replace(/\r\n|\r/g, '\n');
  t = t.replace(/&nbsp;|\u00a0/g, ' ');
  t = t.replace(/\s{2,}/g, ' ');

  // Quitar líneas de copyright, powered by, suscripciones y avisos de cookies
  const lines = t.split('\n');
  const cleaned = [];
  const skipPatterns = [
    /todos los derechos reservados/i,
    /prohibida la reproducci[oó]n/i,
    /powered by/i,
    /power by/i,
    /contacta?n?os?:?/i,
    /suscr[ií]b(e|ete)/i,
    /este sitio web utiliza cookies/i,
    /lea tambi[eé]n/i,
    /descargue gaceta/i,
    /©|copyright/i,
    /^\s*#/,
    /^\s*\*{3,}/,
  ];

  for (let line of lines) {
    const s = line.trim();
    if (!s) continue;
    if (skipPatterns.some((p) => p.test(s))) continue;
    // eliminar bloques repetidos con 'Suscríbete' u 'Opinión' al final
    if (/suscr[íi]bete|suscribete|suscr[ií]bete gratis/i.test(s)) continue;
    cleaned.push(s);
  }

  let out = cleaned.join('\n\n');

  // Recortar secciones largas de navegación al final (marcadores comunes)
  const endMarkers = ['Previous article', 'Next article', 'Historias Relacionadas', 'Latest stories', 'Subscribe', 'All Rights Reserved', 'Suscríbete', 'Suscribete', 'Leer más', 'Leer mas'];
  for (const m of endMarkers) {
    const idx = out.toLowerCase().indexOf(m.toLowerCase());
    if (idx > 100) {
      out = out.slice(0, idx).trim();
    }
  }

  // Limpiar exceso de espacios en líneas y devolver
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out;
}
