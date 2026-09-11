// Configuración de extractores por dominio y proxies de texto plano
export const PROXIES = [
  // Servicio público que devuelve versión en texto plano
  'https://r.jina.ai/http://',
  // 'internal:scrape' indica usar el handler local /api/scrape como proxy alternativo
  'internal:scrape',
];

export const DOMAIN_RULES = {
  // Ejemplo: HolaNews suele tener estructuras con plantillas que dejan poco contenido
  'holanews.com': {
    // selectores a eliminar además de los globales
    removeSelectors: [
      '.post-meta',
      '.site-footer',
      '.share',
      '.powered-by',
      '.widget',
      '.newsletter',
      '.related-posts',
      '.related-articles',
      '.td-ad',
      '.ads',
      '.advertisement',
      '.post-tags',
      '.post-share',
      '.share-buttons',
      '.social-share',
      'header',
      'footer',
      'nav',
      '.breadcrumbs',
    ],
    // selectores donde buscar el contenido principal en orden (más exhaustivo)
    contentSelectors: [
      'article',
      'main article',
      'main .post',
      '.post',
      '.post-inner',
      // selectores específicos para Newspaper/td-theme
      '.tdb_single_content',
      'article .tdb_single_content',
      '.td_block_wrap.tdb_single_content',
      '.tdb_single_content p',
      '.entry-content',
      '.post-content',
      '.article-content',
      '.single-post .content',
      '.td-post-content',
      '#content',
      '.content-area',
    ],
  },
  // Regla genérica para prensa-latina (WordPress/Elementor sites)
  'prensa-latina.cu': {
    removeSelectors: ['.pl-ad', '.related-posts', '.elementor-widget-container .social'],
    contentSelectors: ['article', '.entry-content', '.post-content', '#main'],
  },
  // Sitios que redirigen o usan plantillas de agencias
  'noticiargentina.com.ar': {
    preferScrape: true,
    removeSelectors: [
      '.contenido-patrocinado',
      '.contenido-patrocinado ',
      '.Contenido patrocinado',
      '.contenido-patrocinado',
      '.pixel',
      '.advertisement',
      '.ads',
      '.share',
      '.site-footer',
      'header',
      'footer',
      '.breadcrumb',
    ],
    contentSelectors: ['article', '.entry-content', '.post-content', '#main', '.article-body', '.article-content'],
  },
  '5septiembre.cu': {
    preferScrape: true,
    removeSelectors: ['.widget', '.sidebar', '.related-posts', '.post-meta', '.author-box', '.share', 'header', 'footer'],
    contentSelectors: [
      'article',
      '.entry-content',
      '.post-content',
      '#content',
      '.article-content',
      '.single-post .content',
      '.post',
      '.contenido',
      '.post-inner',
      '.td-post-content',
      '[itemprop="articleBody"]',
    ],
  },
  'cubadebate.cu': {
    preferScrape: true,
    removeSelectors: ['.tdb_author', '.td-post-featured-image', '.post-meta', '.share', '.related-posts', 'header', 'footer', '.sidebar', '.widget'],
    contentSelectors: [
      'article',
      '.post',
      '.entry-content',
      '.post-content',
      '.single-post .content',
      '.td-post-content',
      '.contenido',
      '[itemprop="articleBody"]',
      '.article-body',
    ],
  },
  'radioreloj.cu': {
    preferScrape: true,
    removeSelectors: ['.site-footer', '.cookie', '.share', '.social', '.ads', '.banner', 'header', 'footer', '.suscribete'],
    contentSelectors: [
      'article',
      '.entry-content',
      '.post-content',
      '#main',
      '.article-body',
      '.noticia',
      '.news-content',
      '.nota',
      '.nota-contenido',
      '.content-article',
      '[itemprop="articleBody"]',
    ],
  },
  // Otros dominios problemáticos pueden añadirse aquí con selectores afinados
};

export default {
  PROXIES,
  DOMAIN_RULES,
};
