import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

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
  "[id*='ad-']",
  "[id*='sidebar']",
  "[id*='banner']",
  "[id*='comment']",
  "[role='complementary']",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
];

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
    urlObj = new URL(decodeURIComponent(url));
  } catch {
    return res.status(400).json({ error: "URL inválida" });
  }

  try {
    const response = await fetch(urlObj.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NewsletterBot/1.0; +https://example.org)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `El sitio devolvió error ${response.status}`,
      });
    }

    const html = await response.text();

    const dom = new JSDOM(html, {
      url: urlObj.href,
      contentType: "text/html",
      runScripts: "outside-only",
      resources: "usable",
    });

    const document = dom.window.document;

    SELECTORES_BASURA.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      } catch {
        // selector inválido, ignorar
      }
    });

    document.querySelectorAll("p, div, span").forEach((el) => {
      if (el.textContent.trim() === "") el.remove();
    });

    const reader = new Readability(document, {
      classesToPreserve: [],
      linkDensityModifier: -0.1,
    });

    const article = reader.parse();

    // Si Readability no devuelve contenido útil, intentar proxy de texto plano
    const textoArticulo = article?.textContent?.trim() || '';
    let textoLimpio = '';

    if (textoArticulo.length >= 200) {
      textoLimpio = limpiarTexto(textoArticulo);
    } else {
      // intentar proxy r.jina.ai para obtener versión en texto plano
      try {
        const cleanTarget = urlObj.href.replace(/^https?:\/\//i, '');
        const proxyUrl = `https://r.jina.ai/http://${cleanTarget}`;
        const pResp = await fetch(proxyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsletterBot/1.0)',
            Accept: 'text/plain',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (pResp.ok) {
          const rawText = await pResp.text();
          const cleanedProxy = limpiarTexto(rawText || '');
          if (cleanedProxy.length >= 200) {
            textoLimpio = cleanedProxy;
          }
        }
      } catch {
        // fallback silencioso
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
    if (error.name === "TimeoutError") {
      return res.status(408).json({ error: "El sitio tardó demasiado en responder" });
    }
    return res.status(500).json({ error: error.message });
  }
}

function limpiarTexto(texto) {
  return texto
    .split("\n")
    .map((linea) => linea.trim())
    .filter((linea) => {
      if (linea.length === 0) return false;
      if (linea.length < 25 && !linea.endsWith(".")) {
        const esSubtitulo = /^[A-ZÁÉÍÓÚ][^.]{10,}$/.test(linea);
        return esSubtitulo;
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
        /leer (más|tambien)/,
        /continúa (leyendo|después)/,
      ];
      return !patronesBasura.some((patron) => patron.test(lineaMin));
    })
    .reduce((acc, linea) => {
      const ultimo = acc[acc.length - 1];
      if (linea === "" && ultimo === "") return acc;
      return [...acc, linea];
    }, [])
    .join("\n")
    .trim();
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
