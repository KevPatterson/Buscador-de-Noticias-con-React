/**
 * Extrae el contenido limpio de un artículo vía la serverless function.
 * Si falla, devuelve el description del RSS como fallback.
 */
export const extractArticle = async (url, descriptionFallback = "") => {
  try {
    const res = await fetch(`/api/extract-article?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (!res.ok || data.fallback) {
      return {
        contenido: limpiarDescripcionRSS(descriptionFallback),
        autor: "",
        extraido: false,
      };
    }

    return {
      contenido: data.contenido || "",
      autor: data.autor || "",
      titulo: data.titulo || "",
      extraido: true,
    };
  } catch {
    return {
      contenido: limpiarDescripcionRSS(descriptionFallback),
      autor: "",
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
