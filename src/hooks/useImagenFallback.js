import { useEffect, useRef, useState } from 'react';

// Cache de modulo: evita repetir la consulta cuando la misma noticia aparece
// en varias vistas (grid/lista) o vuelve al viewport.
const cacheImagenes = new Map(); // link -> imagen
const enVuelo = new Set();

const resolverImagen = async (link) => {
  if (cacheImagenes.has(link)) return cacheImagenes.get(link);
  if (enVuelo.has(link)) return '';

  enVuelo.add(link);
  try {
    const response = await fetch(`/api/imagen?url=${encodeURIComponent(link)}`);
    if (!response.ok) return '';
    const data = await response.json();
    const imagen = data?.imagen || '';
    cacheImagenes.set(link, imagen);
    return imagen;
  } catch {
    return '';
  } finally {
    enVuelo.delete(link);
  }
};

// Solicita la imagen destacada solo cuando la card entra en el viewport:
// evita lanzar un scrapeo por cada noticia del listado.
const useImagenFallback = ({ link, imageUrl }) => {
  const ref = useRef(null);
  const [imagen, setImagen] = useState(() => (link && cacheImagenes.get(link)) || '');

  useEffect(() => {
    if (imageUrl || !link || cacheImagenes.has(link)) return;

    const nodo = ref.current;
    if (!nodo) return;

    let activo = true;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        observer.disconnect();
        resolverImagen(link).then((valor) => {
          if (activo && valor) setImagen(valor);
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(nodo);

    return () => {
      activo = false;
      observer.disconnect();
    };
  }, [imageUrl, link]);

  return [imagen, ref];
};

export default useImagenFallback;
