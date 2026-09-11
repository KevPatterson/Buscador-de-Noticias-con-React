#!/usr/bin/env node
import fs from 'fs';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { DOMINIOS_PREFERIDOS, NOMBRES_FUENTES } from '../src/config/fuentes.js';
import { FUENTES_RSS } from '../src/config/fuentes-rss.js';

const LOCAL_EXTRACTOR = new URL('../api/extract-article.js', import.meta.url).href;
const LOCAL_SCRAPER = new URL('../api/scrape.js', import.meta.url).href;

async function fetchFirstFromRss(feedUrl) {
  try {
    const res = await fetch(feedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
    if (!res.ok) return null;
    const txt = await res.text();
    const match = txt.match(/<item>[\s\S]*?<link>(.*?)<\/link>/i);
    if (match) return match[1].trim();
    const alt = txt.match(/<entry>[\s\S]*?<link href=\"(.*?)\"/i);
    if (alt) return alt[1].trim();
    return null;
  } catch (e) {
    return null;
  }
}

async function findArticleUrlForDomain(domain) {
  // try RSS config
  const rssEntry = FUENTES_RSS.find((f) => f.dominio && f.dominio.includes(domain));
  if (rssEntry) {
    const url = await fetchFirstFromRss(rssEntry.feed);
    if (url) return url;
  }

  // try News Google RSS search
  try {
    const search = `https://news.google.com/rss/search?q=site:${domain}&hl=es-419&gl=CU&ceid=CU:es-419`;
    const url = await fetchFirstFromRss(search);
    if (url) return url;
  } catch {}

  return null;
}

async function extractWithLocalHandlers(url) {
  // try extract-article local handler
  try {
    const mod = await import(LOCAL_EXTRACTOR);
    const mockReq = { method: 'GET', query: { url } };
    let captured;
    const mockRes = { _status: 200, status(code) { this._status = code; return this; }, json(obj) { captured = obj; }, setHeader() {} };
    await mod.default(mockReq, mockRes);
    if (captured?.contenido && captured.contenido.length > 150) {
      return { method: 'extract-article', title: captured.titulo || '', content: captured.contenido };
    }
  } catch (e) {}

  // try scrape
  try {
    const mod2 = await import(LOCAL_SCRAPER);
    const mockReq2 = { query: { url } };
    let captured2;
    const mockRes2 = { _status: 200, status(code) { this._status = code; return this; }, json(obj) { captured2 = obj; }, setHeader() {} };
    await mod2.default(mockReq2, mockRes2);
    if (captured2?.fullText && captured2.fullText.length > 150) {
      return { method: 'scrape', title: '', content: captured2.fullText };
    }
  } catch (e) {}

  return null;
}

(async function main(){
  console.log('Generando boletin de prueba para', DOMINIOS_PREFERIDOS.length, 'dominios');
  const allChildren = [];
  const results = [];

  for (const dominio of DOMINIOS_PREFERIDOS) {
    process.stdout.write(`- Procesando ${dominio}... `);
    const nombre = NOMBRES_FUENTES[dominio] || dominio;
    let articleUrl = await findArticleUrlForDomain(dominio);
    if (!articleUrl) {
      console.log('NO URL encontrada');
      results.push({ dominio, ok: false, reason: 'no-url' });
      continue;
    }
    // small delay
    await new Promise((r) => setTimeout(r, 300));
    const extracted = await extractWithLocalHandlers(articleUrl);
    if (!extracted) {
      console.log('EXTRACTION FAIL for', dominio, articleUrl);
      results.push({ dominio, ok: false, reason: 'no-extract', url: articleUrl });
      continue;
    }
    console.log('OK');
    results.push({ dominio, ok: true, title: extracted.title || nombre, url: articleUrl, length: extracted.content.length, method: extracted.method });

    // add to document children
    allChildren.push(new Paragraph({ children: [new TextRun({ text: `Fuente: ${nombre}`, bold: true }), new TextRun({ text: ` — ${articleUrl}`, break: 1 })] }));
    allChildren.push(new Paragraph({ children: [new TextRun({ text: extracted.title || nombre, bold: true })] }));
    allChildren.push(...extracted.content.split('\n\n').slice(0,200).map(p => new Paragraph({ children: [new TextRun({ text: p })] })));
  }

  const outFile = 'boletin_test.docx';
  const doc = new Document({ creator: 'Boletin Test', sections: [{ children: allChildren }] });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outFile, buffer);
  console.log('\nBoletin escrito en', outFile);
  console.log('\nResumen:');
  results.forEach(r => console.log(r.dominio, r.ok ? `OK len=${r.length} method=${r.method}` : `FAIL ${r.reason}${r.url ? ' url='+r.url : ''}`));
})();
