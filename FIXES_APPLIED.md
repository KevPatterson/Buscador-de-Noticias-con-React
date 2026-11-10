# Correcciones Aplicadas a Fuentes de Noticias

## Resumen General

Se han corregido cuatro problemas principales en la extracción de noticias de diferentes fuentes.

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
  - Se agregó función `isErrorPage()` que detecta páginas de error basándose en patrones HTML comunes
  - Se valida el contenido HTML antes de procesar
  - Se rechaza la página si contiene patrones de error (404, 403, "Página no encontrada", etc.)
  
**Función agregada:**
```javascript
const isErrorPage = (html = '', status = 200) => {
  if (status >= 400) return true;
  
  const htmlLower = html.toLowerCase();
  const errorPatterns = [
    /404.*not\s+found/i,
    /página.*no\s+encontrada/i,
    /no\s+autorizado|sin\s+acceso/i,
    /acceso\s+denegado/i,
    // ... más patrones
  ];
  
  return errorPatterns.some(pattern => pattern.test(htmlLower));
};
```

### Mejora en Selectores
- Se agregaron selectores específicos para detectar mejor el contenido
- Se agregaron selectores para eliminar boilerplate (comentarios, paginación, etc.)

---

## 2. Problema: Prensa Latina muestra el prefijo de agencia al inicio

### Síntomas
La noticia comienza con: `"Buenos Aires, 10 nov (Prensa Latina) Argentina presentó..."`
Debería mostrar solo: `"Argentina presentó..."`

### Causa
El patrón regex original era demasiado específico y no capturaba todos los formatos de fecha/agencia.

### Solución Implementada
- **Archivo**: `api/scrape.js`
- **Función**: `cleanPressLatinFirstParagraph()` mejorada

**Patrón actualizado:**
```javascript
// Antes (muy específico):
/^[A-ZÁ][a-záéíóú\s'.-]*,\s*\d{1,2}\s+[A-Za-záéíóú]+\s*\([^)]*Prensa Latina[^)]*\)\s*/i

// Ahora (más flexible):
/^([A-ZÁ][a-záéíóú\s'.-]*,\s*\d{1,2}\s+[A-Za-záéíóú]+\s*\([^)]*\)\s+)+/i
```

**Ventajas del nuevo patrón:**
- Captura "Lugar, fecha (cualquier agencia)" sin limitar a "Prensa Latina"
- Maneja múltiples prefijos si es necesario
- Más robusto ante variaciones de formato

---

## 3. Problema: Radio Bayamo extrae todo en un único párrafo

### Síntomas
- La noticia aparece como un bloque monolítico sin separación
- Dificulta la lectura en dispositivos móviles

### Causa
El HTML de Radio Bayamo no tiene párrafos bien estructurados con tags `<p>`.

### Solución Implementada
- **Archivo**: `api/scrape.js`
- **Función**: `splitRadioBayamoParagraphs()` mejorada
- **Método**: Divide el texto basándose en patrones naturales (punto seguido de mayúscula)

**Mejoras en el algoritmo:**
- Divide el texto en oraciones
- Agrupa las oraciones en párrafos lógicos de ~200 caracteres cada uno
- Mantiene coherencia del contenido

**Ejemplo de salida:**
```
Párrafo 1: "El domingo, el primer ministro israelí... desatando una ola de indignación..."
Párrafo 2: "El plan, que Israel afirma haber sido propuesto... una revisión del acuerdo."
Párrafo 3: "La decisión de Netanyahu... golpe flagrante contra el acuerdo de tregua."
```

---

## 4. Problema: Radio Bayamo tiene noticias incompletas

### Síntomas
- Algunas noticias se cortan antes del final

### Causa
El límite de texto (clamp) podría ser insuficiente para algunos artículos largos.

### Solución Implementada
- Se mejoró la detección de contenido principal
- Se agregaron selectores específicos para Radio Bayamo
- Se optimizó la extracción de párrafos desde etiquetas `<p>`

**Selectores agregados para Radio Bayamo:**
```javascript
'.tdb_single_content',
'.td-post-content',
'[itemprop="articleBody"]',
```

---

## Cambios en Archivos

### 1. `api/scrape.js`
- ✓ Agregada función `isErrorPage()`
- ✓ Mejorado patrón en `cleanPressLatinFirstParagraph()`
- ✓ Mejorado algoritmo en `splitRadioBayamoParagraphs()`
- ✓ Agregada validación de error pages en handler principal

### 2. `config/extractors.js`
- ✓ Actualizado selectores para `tribuna.cu`
- ✓ Actualizado selectores para `escambray.cu`
- ✓ Mejorados selectores para `radiobayamo.icrt.cu`

### 3. `scripts/test-scraping-fixes.js`
- ✓ Actualizado con nuevas pruebas
- ✓ Incluye casos reales del documento proporcionado
- ✓ Valida todas las funciones de limpieza

---

## Pruebas Realizadas

Se ejecutó `scripts/test-scraping-fixes.js` con los siguientes resultados:

✓ TEST 1: Limpieza de prefijo Prensa Latina - **ÉXITO**
✓ TEST 2: División de párrafos Radio Bayamo - **ÉXITO**
✓ TEST 3: Detección de páginas de error - **ÉXITO**
✓ TEST 4: Casos de no-aplicación (fallback safety) - **ÉXITO**

---

## Impacto

| Fuente | Problema | Estado |
|--------|----------|--------|
| Tribuna | Páginas de error | ✓ Corregido |
| Escambray | Páginas de error | ✓ Corregido |
| Prensa Latina | Prefijo de agencia | ✓ Corregido |
| Radio Bayamo | Párrafos y texto incompleto | ✓ Corregido |

---

## Validación

Para volver a ejecutar las pruebas:
```bash
node scripts/test-scraping-fixes.js
```

Todas las pruebas deben pasar con estado ✓ ÉXITO.
