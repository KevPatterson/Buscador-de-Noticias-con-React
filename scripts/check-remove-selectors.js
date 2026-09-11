import { JSDOM } from 'jsdom';
import { DOMAIN_RULES } from '../config/extractors.js';

const url = process.argv[2] || 'https://holanews.com/el-festival-de-cine-de-nueva-york-presentara-el-nuevo-documental-sobre-elizabeth-holmes/';

(async()=>{
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await resp.text();
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  const host = new URL(url).hostname.toLowerCase();
  const domainRule = Object.keys(DOMAIN_RULES).find((d) => host === d || host.endsWith(`.${d}`));
  const domainConfig = domainRule ? DOMAIN_RULES[domainRule] : null;

  const SELECTORES_BASURA = [
    "script","style","noscript","iframe","video","audio","canvas","nav","header","footer","aside","form",
    ".advertisement",".ads",".ad",".pub",".publicidad",".banner",".sidebar",".side-bar",".widget",".related",".relacionadas",
    ".noticias-relacionadas",".otras-noticias",".more-news",".trending",".popular",".recomendadas",".compartir",".share",".social",".social-share",
    ".social-media",".comments",".comentarios",".author-bio",".autor",".byline",".tags",".etiquetas",".breadcrumb",".newsletter",".suscribete",".subscribe",
    ".popup",".modal",".cookie","[class*='ad-']","[class*='-ad']","[class*='pub-']","[id*='ad-']","[id*='sidebar']","[id*='banner']","[id*='comment']",
    "[role='complementary']","[role='navigation']","[role='banner']","[role='contentinfo']",
  ];

  const removeSelectors = [...SELECTORES_BASURA];
  if (domainConfig?.removeSelectors) removeSelectors.push(...domainConfig.removeSelectors);

  const articleEl = document.querySelector('article');
  console.log('Article found?', !!articleEl);

  for (const sel of removeSelectors) {
    try {
      const nodes = Array.from(document.querySelectorAll(sel));
      if (nodes.length === 0) continue;
      const anyIsArticle = nodes.some(n => n.isSameNode(articleEl));
      const anyContains = nodes.some(n => articleEl && n.contains(articleEl));
      if (anyIsArticle || anyContains) {
          console.log('Selector that would remove article:', sel, 'nodes:', nodes.length, 'anyIsArticle:', anyIsArticle, 'anyContains:', anyContains);
          nodes.filter(n=> articleEl && n.contains(articleEl)).forEach((n,i)=>{
           const id = n.id || ''; const cls = n.className || '';
           const outer = (n.outerHTML||'').replace(/\s+/g,' ').slice(0,200);
           console.log(`  MATCH ${i}: tag=${n.tagName} id=${id} class=${cls} outer=${outer}`);
          });
      }
    } catch(e) {
      // ignore invalid selectors
    }
  }
})();
