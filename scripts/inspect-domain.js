import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';

const url = process.argv[2];
if (!url) { console.error('Usage: node scripts/inspect-domain.js <url>'); process.exit(2); }

function short(s,n=300){ return (s||'').replace(/\s+/g,' ').slice(0,n); }

(async()=>{
  console.log('Inspecting', url);
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
    console.log('Direct fetch status', resp.status);
    const html = await resp.text();
    const $ = cheerio.load(html);
    console.log('Title tag:', $('title').text());
    const candidates = ['article', '.entry-content', '.post-content', '#content', '.noticia', '.article-content', '.news-content', '.post', '.single-post', '.tdb_single_content'];
    for(const sel of candidates){
      const node = $(sel).first();
      console.log(`Selector ${sel}: found=${!!node.length} textLen=${(node.text()||'').trim().length} pCount=${node.find('p').length}`);
      if (node.length){ console.log('Preview:', short(node.text(),400)); }
    }

    // Try proxy via r.jina.ai
    try{
      const cleanTarget = url.replace(/^https?:\/\//i, '');
      const proxy = `https://r.jina.ai/http://${cleanTarget}`;
      const pResp = await fetch(proxy, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      console.log('Proxy fetch status', pResp.status);
      const plain = await pResp.text();
      console.log('Proxy text sample:\n', short(plain,1200));
    } catch(e){ console.log('Proxy fetch error', e.message); }

  } catch(e){
    console.error('Direct fetch error', e.message);
  }
})();
