// Utilidad para limpiar textos de artículos antes de incluirlos en el boletín
export default function cleanArticle(text = '') {
  if (!text) return '';

  let t = text
    .replace(/\r\n|\r/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>|<p\s*>/gi, '\n\n')
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"');

  const skipPatterns = [
    /todos los derechos reservados/i,
    /prohibida la reproducci[oó]n/i,
    /powered by/i,
    /\bcontáctanos\b|^contacto[:\s]/i,
    /suscr[ií]b(e|ete)/i,
    /este sitio web utiliza cookies/i,
    /lea tambi[eé]n/i,
    /descargue gaceta/i,
    /©|copyright/i,
    /^\s*#/,
    /^\s*\*{3,}/,
  ];

  const splitParagraphs = (candidate = '') => {
    const lines = candidate
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    if (lines.length <= 1) return [candidate.trim()];

    const result = [];
    let current = lines[0];

    for (let i = 1; i < lines.length; i += 1) {
      const prev = lines[i - 1];
      const next = lines[i];
      const prevEndsSentence = /[.!?]$/.test(prev);
      const nextStartsSentence = /^[A-ZÁÉÍÓÚÑ0-9\("\[]/.test(next);
      const likelyParagraphBreak = prevEndsSentence && nextStartsSentence;

      if (likelyParagraphBreak) {
        result.push(current.trim());
        current = next;
      } else {
        current = `${current} ${next}`.trim();
      }
    }

    if (current.trim()) result.push(current.trim());
    return result.filter(Boolean);
  };

  const paragraphs = t
    .split(/\n\s*\n+/)
    .flatMap((block) => splitParagraphs(block))
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter((paragraph) => {
      if (!paragraph) return false;
      if (skipPatterns.some((pattern) => pattern.test(paragraph))) return false;
      if (/suscr[íi]bete|suscribete|suscr[ií]bete gratis/i.test(paragraph)) return false;
      return true;
    });

  let out = paragraphs.join('\n\n');

  const endMarkers = ['Previous article', 'Next article', 'Historias Relacionadas', 'Latest stories', 'Subscribe', 'All Rights Reserved', 'Suscríbete', 'Suscribete', 'Leer más', 'Leer mas'];
  for (const marker of endMarkers) {
    const idx = out.toLowerCase().indexOf(marker.toLowerCase());
    if (idx > 100) {
      out = out.slice(0, idx).trim();
      break;
    }
  }

  return out.replace(/\n{3,}/g, '\n\n').trim();
}
