// Reglas de extraccion de contenido por fuente.
// Cada clave es un dominio (o sufijo de dominio) de src/config/fuentes.js.
// Todos los campos son opcionales:
//   - selectorCuerpo: selectores CSS donde buscar el cuerpo del articulo.
//   - selectorFecha: selectores CSS para la fecha de publicacion.
//   - selectorAutor: selectores CSS para el autor.
//   - quitar: selectores adicionales a eliminar antes de extraer.
// Los sitios WordPress usan como punto de partida .entry-content, .post-content y .td-post-content.
// Marcado "por verificar" en los selectores que no se han confirmado contra el sitio en vivo.
export const REGLAS_POR_FUENTE = {
  'cubadebate.cu': {
    selectorCuerpo: '.entry-content, .td-post-content, .post-content, article', // por verificar (WordPress/td-theme)
    selectorFecha: '.entry-date, time[datetime], [itemprop="datePublished"]', // por verificar
    selectorAutor: '.td-post-author-name, .author, [itemprop="author"]', // por verificar
    quitar: [
      '.share', '.social', '.share-buttons', '.related-posts', '.related-articles',
      'nav', 'footer', '.sidebar', '.widget', '.ads', '.advertisement', '.banner',
    ],
  },
  'granma.cu': {
    selectorCuerpo: '.entry-content, .post-content, .article-body, article', // por verificar
    selectorFecha: 'time[datetime], .fecha, [itemprop="datePublished"]', // por verificar
    selectorAutor: '.autor, .author, [itemprop="author"]', // por verificar
    quitar: ['.share', '.social', '.related', 'nav', 'footer', '.sidebar', '.ads'],
  },
  'juventudrebelde.cu': {
    selectorCuerpo: '.entry-content, .post-content, .article-content, article', // por verificar
    selectorFecha: 'time[datetime], [itemprop="datePublished"]', // por verificar
    selectorAutor: '.author, [itemprop="author"]', // por verificar
    quitar: ['.share', '.social', '.related-posts', 'nav', 'footer', '.sidebar', '.ads'],
  },
  'cubasi.cu': {
    selectorCuerpo: '.entry-content, .post-content, article', // por verificar
    selectorFecha: 'time[datetime], [itemprop="datePublished"]', // por verificar
    selectorAutor: '.author, [itemprop="author"]', // por verificar
    quitar: ['.share', '.social', '.related-posts', 'nav', 'footer', '.sidebar', '.ads'],
  },
  'acn.cu': {
    selectorCuerpo: '.entry-content, .post-content, .article-body, article', // por verificar
    selectorFecha: 'time[datetime], [itemprop="datePublished"]', // por verificar
    selectorAutor: '.author, [itemprop="author"]', // por verificar
    quitar: ['.share', '.social', '.related', 'nav', 'footer', '.sidebar', '.ads'],
  },
  'tribuna.cu': {
    selectorCuerpo: '.entry-content, .post-content, .td-post-content, article', // por verificar (WordPress)
    selectorFecha: '.entry-date, time[datetime], [itemprop="datePublished"]', // por verificar
    selectorAutor: '.td-post-author-name, .author, [itemprop="author"]', // por verificar
    quitar: [
      '.share', '.social', '.share-buttons', '.related-posts', 'nav', 'footer',
      '.sidebar', '.widget', '.ads', '.advertisement',
    ],
  },
  'radioreloj.cu': {
    selectorCuerpo: 'article, .entry-content, .post-content, #main, .article-body, .noticia, .news-content',
    selectorFecha: 'time[datetime], .fecha, [itemprop="datePublished"]',
    selectorAutor: '.autor, .author, [itemprop="author"]',
    quitar: ['.site-footer', '.cookie', '.share', '.social', '.ads', '.banner', '.suscribete', 'header', 'footer'],
  },
  'prensalatina.cu': {
    selectorCuerpo: 'article, .entry-content, .post-content, #main',
    selectorFecha: 'time[datetime], .fecha, [itemprop="datePublished"]',
    selectorAutor: '.autor, .author, [itemprop="author"]',
    quitar: ['.pl-ad', '.related-posts', 'nav', 'footer', '.sidebar', '.ads'],
  },
  'jit.cu': {
    selectorCuerpo: '.entry-content, .post-content, .td-post-content, article', // por verificar
    selectorFecha: 'time[datetime], [itemprop="datePublished"]', // por verificar
    selectorAutor: '.author, [itemprop="author"]', // por verificar
    quitar: ['.share', '.social', '.related-posts', 'nav', 'footer', '.sidebar', '.ads'],
  },
};

export const obtenerReglas = (hostname) => {
  const host = String(hostname || '').toLowerCase();
  const exacto = REGLAS_POR_FUENTE[host];
  if (exacto) return exacto;
  const coincidencia = Object.entries(REGLAS_POR_FUENTE).find(([dominio]) => host.endsWith(`.${dominio}`));
  return coincidencia ? coincidencia[1] : null;
};
