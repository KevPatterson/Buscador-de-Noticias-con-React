import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { secureFetch, SecureFetchError, validateUrl } from '../src/lib/secureFetch.js';
import { resolverUrlGoogleNews } from './scrape.js';
import { PROXIES, DOMAIN_RULES } from '../config/extractors.js';

// Selectores de elementos a eliminar ANTES de pasarle el DOM a Readability
const SELECTORES_BASURA = [
  "script",
  "style",
  "noscript",
  "iframe",
  "video",
  "audio",
  "canvas",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  ".advertisement",
  ".ads",
  ".ad",
  ".pub",
  ".publicidad",
  ".banner",
  ".sidebar",
  ".side-bar",
  ".widget",
  ".related",
  ".relacionadas",
  ".noticias-relacionadas",
  ".otras-noticias",
  ".more-news",
  ".trending",
  ".popular",
  ".recomendadas",
  ".compartir",
  ".share",
  ".social",
  ".social-share",
  ".social-media",
  ".comments",
  ".comentarios",
  ".author-bio",
  ".autor",
  ".byline",
  ".tags",
  ".etiquetas",
  ".breadcrumb",
  ".newsletter",
  ".suscribete",
  ".subscribe",
  ".popup",
  ".modal",
  ".cookie",
  "[class*='ad-']",
  "[class*='-ad']",
  "[class*='pub-']",
  // match ids that START with ad- to avoid accidental matches like 'tdb-autoload-article'
  "[id^='ad-']",
  "[id*='sidebar']",
  "[id*='banner']",
  "[id*='comment']",
  "[role='complementary']",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
];

// El scraper propio es la via principal: extrae parrafos en <div>, resuelve
// enlaces de Google News y respeta los limites de red. Readability queda como
// respaldo cuando devuelve contenido insuficiente.
const ejecutarScrapeLocal = async (url) => {
  try {
    const { default: scrapeHandler } = await import('./scrape.js');
    let capturado = null;
    const mockRes = {
      status() { return this; },
      json(obj) { capturado = obj; return this; },
      setHeader() {},
    };
    await scrapeHandler(
      { query: { url: encodeURIComponent(url) }, headers: {}, method: 'GET' },
      mockRes
    );
    return capturado;
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Falta el parámetro url" });
  }

  let urlObj;
  try {
    // Valida protocolo, credenciales, longitud y allowlist antes de conectar.
    urlObj = validateUrl(url);
  } catch (error) {
    const status = error instanceof SecureFetchError && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode
      : 400;
    return res.status(status).json({ error: "URL inválida" });
  }

  try {
    const destino = await resolverUrlGoogleNews(urlObj.href);
    if (!destino) {
      return res.status(422).json({ error: 'No se pudo resolver el enlace del artículo', fallback: true });
    }
    urlObj = new URL(destino);

    // Primero se intenta el scraper propio, que ya limpia el texto y entiende
    // los parrafos dentro de <div>. Si no alcanza, se usa Readability.
    const scrapeData = await ejecutarScrapeLocal(urlObj.href);
    const scrapeText = String(scrapeData?.cuerpo || '').trim();
    if (scrapeText.length >= 200) {
      res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=60");
      return res.status(200).json({
        titulo: scrapeData?.titulo || '',
        contenido: scrapeText,
        extracto: '',
        autor: scrapeData?.autor || '',
        nombreSitio: urlObj.hostname,
        idioma: 'es',
        longitud: scrapeText.length,
      });
    }

    // secureFetch aplica allowlist, validacion DNS/IP, redirecciones, limites
    // de tamano y timeout; ya no se descarga con fetch directo.
    const { body: html } = await secureFetch(urlObj.href, {
      tiempoEsperaMs: 12000,
      maxBytes: 3 * 1024 * 1024,
    });

    // Sin ejecucion de scripts ni carga de recursos remotos: el HTML del
    // articulo puede contener contenido hostil y JSDOM no debe ejecutarlo.
    const dom = new JSDOM(html, {
      url: urlObj.href,
      contentType: "text/html",
    });

    const document = dom.window.document;

    // Aplicar reglas por dominio si existen
    const host = urlObj.hostname.toLowerCase();
    const domainRule = Object.keys(DOMAIN_RULES).find((d) => host === d || host.endsWith(`.${d}`));
    const domainConfig = domainRule ? DOMAIN_RULES[domainRule] : null;

    // Combine global and domain-specific selectors to remove
    const removeSelectors = [...SELECTORES_BASURA];
    if (domainConfig?.removeSelectors) removeSelectors.push(...domainConfig.removeSelectors);

    removeSelectors.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      } catch {
        // selector inválido, ignorar
      }
    });

    document.querySelectorAll("p, div, span").forEach((el) => {
      if (el.textContent.trim() === "") el.remove();
    });

    // Si hay selectores de contenido preferido para el dominio, intentar usar solo ese fragmento
    let readerDoc = document;
    if (domainConfig?.contentSelectors) {
      for (const sel of domainConfig.contentSelectors) {
        try {
          const node = document.querySelector(sel);
          if (node && node.textContent && node.textContent.trim().length > 80) {
            // Crear nuevo DOM con el fragmento para que Readability enfoque allí
            const fragmentHtml = `<!doctype html><html><body>${node.outerHTML}</body></html>`;
            const fragDom = new JSDOM(fragmentHtml);
            readerDoc = fragDom.window.document;
            break;
          }
        } catch {
          // continuar con siguiente selector
        }
      }
    }

    const reader = new Readability(readerDoc, {
      classesToPreserve: [],
      linkDensityModifier: -0.1,
    });

    const article = reader.parse();

    // Si Readability no devuelve contenido útil, intentar proxies listados en config
    const textoArticulo = article?.textContent?.trim() || '';
    let textoLimpio = '';

    if (textoArticulo.length >= 200) {
      textoLimpio = limpiarTexto(textoArticulo);
    } else {
        // Intentar fallback simple: concatenar los <p> de los selectores de contenido del dominio
        if (domainConfig?.contentSelectors) {
          for (const sel of domainConfig.contentSelectors) {
            try {
              const node = document.querySelector(sel);
              if (node) {
                const ps = Array.from(node.querySelectorAll('p')).map((p) => p.textContent.trim()).filter(Boolean);
                const joined = ps.join('\n\n');
                const cleanedJoined = limpiarTexto(joined);
                if (cleanedJoined.length >= 200) {
                  textoLimpio = cleanedJoined;
                  break;
                }
              }
            } catch {
              // seguir con siguiente selector
            }
          }
        }

      const cleanTarget = urlObj.href.replace(/^https?:\/\//i, '');
      for (const proxy of PROXIES) {
        try {
          if (proxy === 'internal:scrape') {
            const scrapeFallback = await ejecutarScrapeLocal(urlObj.href);
            const cleanedProxy = limpiarTexto(String(scrapeFallback?.cuerpo || ''));
            if (cleanedProxy.length >= 200) {
              textoLimpio = cleanedProxy;
              break;
            }
          } else {
            const proxyUrl = `${proxy}${cleanTarget}`;
            const pResp = await fetch(proxyUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsletterBot/1.0)', Accept: 'text/plain' },
              signal: AbortSignal.timeout(8000),
            });
            if (pResp.ok) {
              const rawText = await pResp.text();
              const cleanedProxy = limpiarTexto(rawText || '');
              if (cleanedProxy.length >= 200) {
                textoLimpio = cleanedProxy;
                break;
              }
            }
          }
        } catch {
          // probar siguiente proxy
        }
      }

      if (!textoLimpio && textoArticulo) {
        textoLimpio = limpiarTexto(textoArticulo);
      }

      if (!textoLimpio) {
        return res.status(422).json({ error: 'No se pudo extraer el contenido del artículo', fallback: true });
      }
    }

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=60");

    return res.status(200).json({
      titulo: article.title?.trim() || "",
      contenido: textoLimpio,
      extracto: article.excerpt?.trim() || "",
      autor: article.byline?.trim() || "",
      nombreSitio: article.siteName?.trim() || urlObj.hostname,
      idioma: article.lang || "es",
      longitud: textoLimpio.length || article.length || 0,
    });
  } catch (error) {
    // No se exponen detalles internos (mensajes de red, stack, allowlist).
    if (error instanceof SecureFetchError) {
      const status = error.statusCode === 504 ? 408 : error.statusCode;
      return res.status(status).json({ error: 'No se pudo acceder al artículo' });
    }
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(408).json({ error: "El sitio tardó demasiado en responder" });
    }
    return res.status(500).json({ error: "No se pudo procesar el artículo" });
  }
}

function limpiarTexto(texto) {
  const normalizado = String(texto || '')
    .replace(/\r\n|\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalizado) return '';

  // Readability a veces devuelve un unico bloque sin saltos de linea. En ese
  // caso se divide por oraciones para no descartar el articulo entero cuando
  // una sola frase coincide con un patron de boilerplate.
  const vinoEnBloques = normalizado.includes('\n');
  const bloques = vinoEnBloques
    ? normalizado.split(/\n+/)
    : normalizado.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ0-9"¿¡])/);

  const lineasLimpias = bloques
    .map((linea) => linea.trim())
    .filter((linea) => {
      if (!linea) return false;
      if (linea.length < 25 && !linea.endsWith(".")) {
        // Conserva subtitulos cortos, descarta migas y etiquetas.
        return /^[A-ZÁÉÍÓÚ][^.]{10,}$/.test(linea);
      }
      return true;
    })
    .filter((linea) => {
      const lineaMin = linea.toLowerCase();
      const patronesBasura = [
        /^compartir/,
        /^publicado (el|por)/,
        /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo),?\s+\d/,
        /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d/,
        /noticias relacionadas/,
        /también (te )?(puede|pueden) interesar/,
        /suscríbet[ea]/,
        /recibe (nuestras|las) noticias/,
        /síguenos en/,
        /ver (más|tambien)/,
        /^tags?:/,
        /^etiquetas?:/,
        /^fuente:/,
        /^foto:/,
        /^crédito:/,
        /^\d+ (comentarios?|vistas?|shares?)/,
        /copyright|todos los derechos/,
        /\bprov?ided? by\b|powered by|power by|norsan media/i,
        /prohibida la reproducci[oó]n|prohibida la reproducci[oó]n parcial|prohibida la reproducci[oó]n total/i,
        /descargue gaceta/i,
        /suscr[ií]b(e|ete|ete gratis)|suscr[ií]bete al bolet[ií]n|suscr[ií]bete gratis/i,
        /este sitio web utiliza cookies|aceptar las cookies|configurar aceptar/i,
        /lea tambi[eé]n|lea tambien/i,
        /contacta(nos|r)|cont[aá]ctanos|contacto:/i,
        /power by|powered by/i,
        /leer (más|tambien)/,
        /continúa (leyendo|después)/,
      ];
      return !patronesBasura.some((patron) => patron.test(lineaMin));
    });

  // Si se partio un bloque unico, se vuelve a unir con espacios.
  return (vinoEnBloques ? lineasLimpias.join("\n\n") : lineasLimpias.join(" ")).trim();
}

/*
 * LIMITACIONES DE LA EXTRACCIÓN:
 *
 * 1. Sitios con JavaScript obligatorio (SPAs): algunos sitios cargan
 *    su contenido via JS. Readability no ejecuta JS, así que en estos
 *    casos devuelve fallback=true y se usa el description del RSS.
 *
 * 2. Sitios con paywall o login: devolverán el muro de pago, no el artículo.
 *    Readability detectará poco contenido y activará el fallback.
 *
 * 3. Sitios .cu con conectividad intermitente: el timeout de 10s manejará
 *    esto devolviendo el fallback graciosamente.
 *
 * 4. Vercel free plan: las serverless functions tienen límite de 10s de
 *    ejecución. El AbortSignal.timeout(10000) está calibrado para esto.
 */
