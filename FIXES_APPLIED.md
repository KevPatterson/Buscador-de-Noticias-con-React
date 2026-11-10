# Correcciones Aplicadas a Fuentes de Noticias

## Resumen General

Se han corregido 6 problemas principales en la extracción y visualización de noticias de diferentes fuentes.

---

## 1. Problema: Tribuna y Escambray muestran páginas de error

### Síntomas
- Aparecen noticias de páginas no encontradas (404, 403)
- URLs como `https://www.tribuna.cu/pagina-ejemplo/`, `https://www.tribuna.cu/sin-acceso/`

### Causa
El scraper no validaba si la página obtenida era realmente un artículo o una página de error.

### Solución Implementada
- **Archivo**: `api/scrape.js`
- **Cambios**: 
  - Se agregó función `isErrorPage()` que detecta páginas de error basándose en patrones HTML específicos
  - Patrones más específicos para evitar falsos positivos (solo 404/403 explícitos)
  - Se agregan excepciones para palabras clave que indican contenido válido

---

## 2. Problema: Prensa Latina muestra el prefijo de agencia al inicio

### Síntomas
La noticia comienza con: `"Buenos Aires, 10 nov (Prensa Latina) Argentina presentó..."`
Debería mostrar solo: `"Argentina presentó..."`

### Causa
El patrón regex original era demasiado específico

### Solución Implementada
- **Archivo**: `api/scrape.js`
- **Función**: `cleanPressLatinFirstParagraph()` mejorada con patrón más flexible

---

## 3. Problema: Radio Bayamo extrae todo en un único párrafo

### Síntomas
- La noticia aparece como un bloque monolítico sin separación

### Causa
El HTML de Radio Bayamo no tiene párrafos bien estructurados

### Solución Implementada
- **Archivo**: `api/scrape.js`
- **Función**: `splitRadioBayamoParagraphs()` mejorada
- Divide el texto basándose en patrones naturales (punto seguido de mayúscula)

---

## 4. Problema: Escambray, Tribuna y otras fuentes muestran páginas 404/403

### Síntomas
- Aparecen artículos con contenido que claramente es error page

### Causa
La detección inicial era demasiado agresiva y bloqueaba contenido válido

### Solución Implementada
- **Archivo**: `api/scrape.js`
- Refinar `isErrorPage()` para ser más específica
- Solo rechaza 404/403 explícitos y shortcodes Drupal

---

## 5. Problema: Fuentes faltantes (ACN, Granma, Juventud Rebelde, etc.)

### Síntomas
- Noticias de ACN, Granma, Juventud Rebelde, JIT Deporte, Radio Reloj, 5 de Septiembre, Giron no cargan
- Estas fuentes están en `DOMINIOS_NO_NEWDATA` pero no tenían feeds RSS configurados

### Solución Implementada
- **Archivo**: `src/config/fuentes-rss.js`
- Agregar feeds RSS para:
  - granma.cu (https://www.granma.cu/feed/)
  - juventudrebelde.cu (https://www.juventudrebelde.cu/feed/)
  - acn.cu (https://www.acn.cu/feed/)
  - radioreloj.cu (https://www.radioreloj.cu/feed/)
  - 5septiembre.cu (https://www.5septiembre.cu/feed/)
  - jit.cu (https://www.jit.cu/feed/)

---

## 6. Problema: URLs no-noticia en Tribuna (pagina-ejemplo, sin-acceso, etc.)

### Síntomas
- Tribuna sigue mostrando "Página de ejemplo", "Sin acceso", "Ediciones impresas", etc.
- Estas no son noticias reales sino páginas de mantenimiento/estructura

### Causa
El feed RSS de Tribuna incluye estas URLs y no había sistema de filtrado

### Solución Implementada
- **Archivo**: `src/config/fuentes-rss.js`
- Agregar `excludePatterns` a Tribuna:
  - `/pagina-ejemplo/`, `/sin-acceso/`, `/ediciones-impresas/`, `/contacto/`, `/politica-privacidad/`, `/avisos-legales/`

- **Archivo**: `api/rss.js`
- Actualizar `fetchFeed()` para aceptar parámetro `config`
- Agregar lógica `shouldExcludeUrl()` que filtra items según patrones

- **Archivo**: `api/news.js`
- Pasar `excludePatterns` a `fetchFeed()` al llamarlo

---

## Cambios en Archivos

| Archivo | Cambios |
|---------|---------|
| `api/scrape.js` | Mejora detección de error pages, patrones regex, división de párrafos |
| `config/extractors.js` | Selectores refinados para tribuna.cu, escambray.cu y radiobayamo.icrt.cu |
| `src/config/fuentes-rss.js` | Feeds RSS faltantes + excludePatterns para Tribuna |
| `api/rss.js` | Sistema de filtrado de URLs por patrones |
| `api/news.js` | Pasar configuración de exclusión a fetchFeed |
| `scripts/test-scraping-fixes.js` | Pruebas actualizadas |
| `scripts/test-rss-feeds.js` | Validación de disponibilidad de feeds |

---

## Validación

### Pruebas de Scraping
```
✓ TEST 1: Limpieza de prefijo Prensa Latina
✓ TEST 2: División de párrafos Radio Bayamo
✓ TEST 3: Detección de páginas de error (casos reales)
✓ TEST 4: Casos de no-aplicación (fallback safety)
```

### Validación de Feeds RSS
```
scripts/test-rss-feeds.js - Valida disponibilidad y contenido de todos los feeds
```

---

## Commits Realizados

1. **a5a7b04**: Soluciones iniciales de scraping
2. **d542e4d**: Mejorar detección de error pages
3. **d807f18**: Documentación actualizada
4. **1490521**: Agregar fuentes RSS faltantes y filtrado de URLs en Tribuna ⭐

---

## Impacto Final

| Fuente | Problema | Estado |
|--------|----------|--------|
| Tribuna | Páginas no-noticia | ✓ Corregido (doble filtrado) |
| Escambray | Páginas de error | ✓ Corregido |
| Prensa Latina | Prefijo de agencia | ✓ Corregido |
| Radio Bayamo | Párrafos monolíticos | ✓ Corregido |
| Granma | No cargaba | ✓ Agregado RSS |
| Juventud Rebelde | No cargaba | ✓ Agregado RSS |
| ACN | No cargaba | ✓ Agregado RSS |
| Radio Reloj | No cargaba | ✓ Agregado RSS |
| 5 de Septiembre | No cargaba | ✓ Agregado RSS |
| JIT Deporte | No cargaba | ✓ Agregado RSS |
| Giron | No cargaba | ✓ Ya estaba RSS |

---

## Pasos Siguientes

Para ejecutar validaciones:

```bash
# Probar scraping
node scripts/test-scraping-fixes.js

# Probar feeds RSS (puede tardar)
node scripts/test-rss-feeds.js
```
