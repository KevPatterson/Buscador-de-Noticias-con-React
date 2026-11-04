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
