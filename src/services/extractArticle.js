/**
 * Extrae el contenido limpio de un artículo vía la serverless function.
 * Si falla, devuelve el description del RSS como fallback.
 */
import cleanArticle from './cleanArticle.js';

export const extractArticle = async (url, descriptionFallback = '') => {
  try {
    const res = await fetch(`/api/extract-article?url=${encodeURIComponent(url)}`);
    if (res && res.ok) {
      const data = await res.json();
      if (data && data.contenido && data.contenido.trim().length > 80) {
        return {
          contenido: cleanArticle(data.contenido),
          autor: data.autor || '',
          titulo: data.titulo || '',
          extraido: true,
        };
      }
    }

    // Fallback: intentar el endpoint /api/scrape que ya existe en el proyecto
    try {
      const res2 = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      if (res2 && res2.ok) {
        const payload = await res2.json();
        if (payload?.fullText && payload.fullText.trim().length > 80) {
          return {
            contenido: cleanArticle(payload.fullText),
            autor: '',
            extraido: true,
          };
        }
      }
    } catch (e) {
      // ignorar
    }

    return {
      contenido: cleanArticle(limpiarDescripcionRSS(descriptionFallback)),
      autor: '',
      extraido: false,
    };
  } catch (e) {
    return {
      contenido: limpiarDescripcionRSS(descriptionFallback),
      autor: '',
      extraido: false,
    };
  }
};

const limpiarDescripcionRSS = (description) => {
  if (!description) return "";
  return description
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
};
