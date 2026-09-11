// Reglas de extracción por dominio: selectores para eliminar y selectores
// para elegir el contenedor principal del artículo antes de pasar a Readability.
export const DOMAIN_RULES = {
  'holanews.com': {
    selectorsToRemove: [
      'header',
      'footer',
      '.powered-by',
      '.site-footer',
      '.share',
      '.social',
      '.cookie',
      '.newsletter',
      '.contact',
      '.ad',
      '.ads',
      '.promo',
    ],
    // intentar seleccionar contenedores típicos de posts
    contentSelectors: ['article', '.post-content', '.entry-content', '.post', '.article'],
  },
  'holanews.com:443': {
    selectorsToRemove: ['header', 'footer'],
    contentSelectors: ['article', '.post-content', '.entry-content'],
  },
  // Añadir reglas por dominio problemático aquí.
};

// Proxies de texto plano para intentar cuando Readability no entregue suficiente
// contenido. Lista ordenada por prioridad.
export const PROXY_TEXT_SERVICES = [
  'https://r.jina.ai/http://',
  // Puedes añadir más proxies aquí, p.ej. 'https://otro-proxy.example/http://'
];
