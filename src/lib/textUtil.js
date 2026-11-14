// Utilidades de texto compartidas entre las serverless functions.
export const normalizeText = (value = '') =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const clampText = (value = '', max = 10000) => value.slice(0, max);

export const normalizeForCompare = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim();

// Convierte HTML de feeds RSS a texto plano legible para las cards,
// decodificando entidades comunes y colapsando espacios.
const ENTIDADES_HTML = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&hellip;': '…',
  '&mdash;': '—',
  '&ndash;': '–',
  '&laquo;': '«',
  '&raquo;': '»',
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&ldquo;': '“',
  '&rdquo;': '”',
};

export const htmlToPlainText = (value = '') => {
  if (!value) return '';

  let texto = String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|\u00a0/g, ' ');

  texto = texto.replace(/&(amp|lt|gt|quot|#39|apos|hellip|mdash|ndash|laquo|raquo|lsquo|rsquo|ldquo|rdquo);/g, (entidad) => ENTIDADES_HTML[entidad] || entidad);
  texto = texto.replace(/&#(\d+);/g, (_, codigo) => String.fromCodePoint(Number(codigo)));
  texto = texto.replace(/&#x([0-9a-f]+);/gi, (_, codigo) => String.fromCodePoint(parseInt(codigo, 16)));

  return normalizeText(texto);
};

export const dedupeParagraphs = (value = '') => {
  const seen = new Set();
  const result = [];

  value.split(/\n{2,}/).forEach((paragraph) => {
    const cleanParagraph = normalizeText(paragraph);
    if (!cleanParagraph) return;

    const key = normalizeForCompare(cleanParagraph);
    if (!key || seen.has(key)) return;

    seen.add(key);
    result.push(cleanParagraph);
  });

  return result.join('\n\n');
};
