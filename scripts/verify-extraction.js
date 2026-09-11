#!/usr/bin/env node
// Script de verificación de extracción contra endpoints locales
const URLS = [
  'https://www.notimerica.com/politica/noticia-milei-anuncia-nuevo-area-dentro-ministerio-exteriores-reclamos-soberania-malvinas-20260911054540.html',
  'https://efe.com/mundo/2026-09-11/trump-discurso-cierre-convencion-republicana/',
  'https://www.prensa-latina.cu/2026/09/10/independiente-domina-pero-flamengo-se-lleva-la-ventaja-en-quito/',
  'https://cnnespanol.cnn.com/2026/09/10/eeuu/video/11s-torres-gemelas-atentados-sobreviviente-aniversario-orix',
  'https://www.juventudrebelde.cu/cuba/2026-09-10/la-feem-crece-en-membresia-y-oportunidades',
  'https://www.acn.cu/economia/que-novedades-trae-la-resolucion-68-en-el-sector-turistico',
  'https://www.escambray.cu/2026/publica-la-gaceta-oficial-nuevas-normas-para-la-gestion-y-asignacion-de-divisas/',
  'https://www.5septiembre.cu/a-un-mes-del-terremoto-en-colombia-una-reconstruccion-entre-dudas-y-esperanzas/',
  'http://www.granma.cu/cuba/2026-09-10/en-un-pueblo-que-no-se-rinde-almeida-vivo-10-09-2026-19-09-04',
  'https://holanews.com/el-festival-de-cine-de-nueva-york-presentara-el-nuevo-documental-sobre-elizabeth-holmes/',
  'https://www.radioreloj.cu/noticias-radio-reloj/vision-pais-es/ministerio-de-justicia-destaca-el-valor-del-asesor-juridico/',
  'https://latam.ign.com/fatal-fury-city-of-the-wolves/114582/fatal-fury-tokyo-revengers-colaboracion',
];

const LOCAL_BASE = 'http://localhost:5173';
const MIN_LENGTH = 300; // umbral para considerar extracción "completa"
const BOILERPLATE_PATTERNS = [/ultimas entradas/i, /todos los derechos reservados/i, /suscrib/i, /contacto/i, /powered by/i, /copyright/i, /holaNews/i];

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal, ...opts });
    clearTimeout(id);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return { ok: res.ok, json: await res.json() };
    const text = await res.text();
    return { ok: res.ok, text };
  } catch (e) {
    clearTimeout(id);
    return { ok: false, error: e.message };
  }
}

function analyzeText(text) {
  if (!text) return { length: 0, paragraphs: 0, hasBoilerplate: true };
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const paragraphs = text.split(/\n{2,}/).filter(Boolean).length;
  const hasBoilerplate = BOILERPLATE_PATTERNS.some((p) => p.test(text));
  return { length: cleaned.length, paragraphs, hasBoilerplate };
}

async function checkUrl(url) {
  console.log('\n---');
  console.log('URL:', url);

  const enc = encodeURIComponent(url);
  // try extract-article
  const extractUrl = `${LOCAL_BASE}/api/extract-article?url=${enc}`;
  const r1 = await fetchJson(extractUrl);
  if (r1.ok && r1.json) {
    const contenido = r1.json.contenido || '';
    const meta = analyzeText(contenido);
    console.log('[extract-article] status OK, length=', meta.length, 'paras=', meta.paragraphs);
    if (meta.length >= MIN_LENGTH && !meta.hasBoilerplate) {
      console.log('=> PASS: extracción limpia satisfactoria (extract-article)');
      console.log('TITULO:', r1.json.titulo || '(sin título)');
      console.log('EXCERPT:', contenido.slice(0, 400).replace(/\n+/g, ' '));
      return { url, ok: true, method: 'extract-article', meta };
    }
    console.log('extract-article returned corto/boilerplate, length=', meta.length, 'boilerplate=', meta.hasBoilerplate);
  } else {
    console.log('[extract-article] no disponible or error', r1.error || (r1.json && r1.json.error));
  }

  // fallback to /api/scrape
  const scrapeUrl = `${LOCAL_BASE}/api/scrape?url=${enc}`;
  const r2 = await fetchJson(scrapeUrl);
  if (r2.ok && r2.json) {
    const contenido = r2.json.fullText || '';
    const meta = analyzeText(contenido);
    console.log('[scrape] status OK, length=', meta.length, 'paras=', meta.paragraphs);
    if (meta.length >= MIN_LENGTH && !meta.hasBoilerplate) {
      console.log('=> PASS: extracción satisfactoria (scrape)');
      console.log('EXCERPT:', contenido.slice(0, 400).replace(/\n+/g, ' '));
      return { url, ok: true, method: 'scrape', meta };
    }
    console.log('scrape returned corto/boilerplate, length=', meta.length, 'boilerplate=', meta.hasBoilerplate);
  } else {
    console.log('[scrape] no disponible or error', r2.error || (r2.json && r2.json.error));
  }

  // Si los endpoints HTTP no están disponibles (dev server no expone /api),
  // intentar ejecutar los handlers locales importando los módulos de `api/`.
  try {
    const extractModuleUrl = new URL('../api/extract-article.js', import.meta.url).href;
    // eslint-disable-next-line no-console
    const extractMod = await import(extractModuleUrl);
    if (extractMod?.default) {
      const mockReq = { method: 'GET', query: { url } };
      let captured;
      const mockRes = {
        _status: 200,
        status(code) { this._status = code; return this; },
        json(obj) { captured = { status: this._status || 200, body: obj }; },
        setHeader() {},
      };
      await extractMod.default(mockReq, mockRes);
      if (captured && captured.body && captured.body.contenido) {
        const contenido = captured.body.contenido;
        const meta = analyzeText(contenido);
        console.log('[local extract-article] length=', meta.length, 'paras=', meta.paragraphs);
        if (meta.length >= MIN_LENGTH && !meta.hasBoilerplate) {
          console.log('=> PASS: extracción limpia satisfactoria (local extract-article)');
          console.log('TITULO:', captured.body.titulo || '(sin título)');
          console.log('EXCERPT:', contenido.slice(0, 400).replace(/\n+/g, ' '));
          return { url, ok: true, method: 'local-extract', meta };
        }
        console.log('local extract returned corto/boilerplate, length=', meta.length, 'boilerplate=', meta.hasBoilerplate);
      }
    }
  } catch (e) {
    console.log('local extract-article execution failed:', e.message);
  }

  try {
    const scrapeModuleUrl = new URL('../api/scrape.js', import.meta.url).href;
    const scrapeMod = await import(scrapeModuleUrl);
    if (scrapeMod?.default) {
      const mockReq = { query: { url } };
      let captured;
      const mockRes = {
        _status: 200,
        status(code) { this._status = code; return this; },
        json(obj) { captured = { status: this._status || 200, body: obj }; },
        setHeader() {},
      };
      await scrapeMod.default(mockReq, mockRes);
      if (captured && captured.body && captured.body.fullText) {
        const contenido = captured.body.fullText;
        const meta = analyzeText(contenido);
        console.log('[local scrape] length=', meta.length, 'paras=', meta.paragraphs);
        if (meta.length >= MIN_LENGTH && !meta.hasBoilerplate) {
          console.log('=> PASS: extracción satisfactoria (local scrape)');
          console.log('EXCERPT:', contenido.slice(0, 400).replace(/\n+/g, ' '));
          return { url, ok: true, method: 'local-scrape', meta };
        }
        console.log('local scrape returned corto/boilerplate, length=', meta.length, 'boilerplate=', meta.hasBoilerplate);
      }
    }
  } catch (e) {
    console.log('local scrape execution failed:', e.message);
  }

  console.log('=> FAIL: no se extrajo contenido suficiente; usar fallback RSS en la app');
  return { url, ok: false };
}

async function main() {
  if (typeof fetch === 'undefined') {
    console.error('Node no expone fetch. Usa Node 18+ o instala node-fetch.');
    process.exit(1);
  }

  for (const url of URLS) {
    // eslint-disable-next-line no-await-in-loop
    // small delay to avoid sobrecargar endpoints
    await new Promise((r) => setTimeout(r, 300));
    // eslint-disable-next-line no-await-in-loop
    // eslint-disable-next-line no-unused-vars
    const result = await checkUrl(url);
  }

  console.log('\nVerificación completada.');
}

main().catch((e) => {
  console.error('Error en verificación:', e);
  process.exit(2);
});
