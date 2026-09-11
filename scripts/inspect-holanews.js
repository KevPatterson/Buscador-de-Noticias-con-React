import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { DOMAIN_RULES } from '../config/extractors.js';

const url = process.argv[2] || 'https://holanews.com/el-festival-de-cine-de-nueva-york-presentara-el-nuevo-documental-sobre-elizabeth-holmes/';

function short(s, n = 200) { return (s||'').replace(/\s+/g,' ').slice(0,n); }

(async()=>{
  console.log('Fetching', url);
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await resp.text();
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  const host = new URL(url).hostname.toLowerCase();
  const domainRule = Object.keys(DOMAIN_RULES).find((d) => host === d || host.endsWith(`.${d}`));
  const domainConfig = domainRule ? DOMAIN_RULES[domainRule] : null;
  console.log('Domain rule:', domainRule);

  // Apply global remove selectors similar to api/extract-article.js
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

  removeSelectors.forEach((selector) => {
    try { document.querySelectorAll(selector).forEach((el) => el.remove()); } catch {}
  });

  document.querySelectorAll('p, div, span').forEach((el) => { if (el.textContent.trim() === '') el.remove(); });

  // inspect content selectors
  if (domainConfig?.contentSelectors) {
    for (const sel of domainConfig.contentSelectors) {
      try {
        const node = document.querySelector(sel);
        if (!node) { console.log(`Selector ${sel}: NOT FOUND`); continue; }
        const text = node.textContent.trim();
        const pCount = node.querySelectorAll('p').length;
        console.log(`Selector ${sel}: FOUND - textLen=${text.length} pCount=${pCount}`);
        console.log('Preview:', short(text, 400));
        // show first 3 <p>
        const ps = Array.from(node.querySelectorAll('p')).slice(0,5).map(p=>short(p.textContent,200));
        console.log('P samples:', ps);
      } catch(e){ console.log('Selector', sel, 'error', e.message); }
      console.log('---');
    }
  }

  // Run Readability on whole document
  const reader = new Readability(document);
  const article = reader.parse();
  console.log('Readability title:', article?.title);
  console.log('Readability text length:', (article?.textContent||'').trim().length);
  console.log('Readability excerpt preview:', short(article?.textContent, 800));

  // Try extracting using a specific selector that looked promising
  const candidate = document.querySelector('.tdb_single_content') || document.querySelector('article');
  if (candidate) {
    console.log('\nCandidate outerHTML preview:');
    console.log(short(candidate.outerHTML, 2000));
  }

  // Save fragment to disk for manual inspection
  try {
    import('fs').then(fs=>{
      fs.writeFileSync('tmp_holanews_fragment.html', '<!doctype html>\n'+candidate?.outerHTML||document.documentElement.outerHTML);
      console.log('\nWrote tmp_holanews_fragment.html');
    });
  } catch(e){ console.error('write error', e.message); }

})();
