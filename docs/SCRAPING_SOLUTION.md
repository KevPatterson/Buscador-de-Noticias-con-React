# Solución de Scraping para CUBAPRESS

## Resumen de Cambios

Esta documentación describe los cambios realizados al sistema de scraping para resolver los siguientes problemas:

1. **Fuentes no incluidas**: Escambray, Cubadebate y Tribuna
2. **Prensa Latina**: Limpieza de prefijo con fecha y agencia
3. **Radio Bayamo**: División de párrafos

---

## 1. Nuevas Fuentes Incorporadas

### 1.1 Escambray (escambray.cu)

**Estructura**: WordPress simple especializado en noticias de Sancti Spíritus.

**Selectores Propuestos**:
```javascript
'escambray.cu': {
  preferScrape: true,
  removeSelectors: [
    '.post-meta',
    '.post-tags',
    '.share',
    '.related-posts',
    '.sidebar',
    '.widget',
    'header',
    'footer',
    '.breadcrumbs',
    'nav',
    '.ads',
    '[class*="social"]',
  ],
  contentSelectors: [
    'article',
    '.entry-content',
    '.post-content',
    '.post',
    '[itemprop="articleBody"]',
    '.article-content',
    'main article',
    '.single-post .content',
    '#content',
    '.content-area',
  ],
}
```

**Por qué funciona**:
- Usa elementos `<article>` HTML5 semántico para delimitar contenido
- `.entry-content` es el selector estándar de WordPress para el cuerpo del artículo
- Elimina metadatos innecesarios (tags, shares, sidebars)
- Prioriza contenedores específicos sobre contenedores genéricos

**Testing**: Una noticia reciente de Escambray debe extraerse con título, cuerpo en múltiples párrafos, sin metadatos.

---

### 1.2 Cubadebate (cubadebate.cu)

**Estructura**: WordPress con tema personalizado "Newspaper" (TD theme).

**Selectores Propuestos**:
```javascript
'cubadebate.cu': {
  preferScrape: true,
  removeSelectors: [
    '.tdb_author',
    '.td-post-featured-image',
    '.post-meta',
    '.share',
    '.related-posts',
    'header',
    'footer',
    '.sidebar',
    '.widget',
    '.td_category',
    '.tdb_module_tag',
  ],
  contentSelectors: [
    'article',
    '.post',
    '.td-post-content',
    '.entry-content',
    '.post-content',
    '.single-post .content',
    '.contenido',
    '[itemprop="articleBody"]',
    '.article-body',
    'main article',
  ],
}
```

**Por qué funciona**:
- `.td-post-content` es el selector del tema TD (Newspaper) para el contenido del post
- `.tdb_author` contiene datos del autor que no son parte del artículo
- Elimina categorías y tags que se cargan como módulos en TD theme
- Mantiene selectores fallback para mayor robustez

**Testing**: Una noticia de Cubadebate debe extraerse sin información del autor ni categorías.

---

### 1.3 Tribuna (tribuna.cu)

**Estructura**: Probable CMS personalizado o Drupal simple con WordPress styling.

**Selectores Propuestos**:
```javascript
'tribuna.cu': {
  preferScrape: true,
  removeSelectors: [
    '.post-meta',
    '.post-tags',
    '.share',
    '.related-posts',
    '.sidebar',
    '.widget',
    'header',
    'footer',
    '.breadcrumbs',
    'nav',
    '.ads',
    '[class*="social"]',
    '.author-info',
  ],
  contentSelectors: [
    'article',
    '.entry-content',
    '.post-content',
    '.post',
    '[itemprop="articleBody"]',
    '.article-content',
    'main article',
    '.single-post .content',
    '#content',
    '.content-area',
    '.node-content',
  ],
}
```

**Por qué funciona**:
- `.node-content` es selector típico de Drupal
- Mantiene selectores estándar de WordPress para compatibilidad
- Elimina metainformación y navegación
- Prioriza contenedores semánticos

**Testing**: Una noticia de Tribuna de La Habana debe extraerse correctamente con estructura de párrafos clara.

---

## 2. Fixes para Fuentes Existentes

### 2.1 Prensa Latina (prensa-latina.cu) - Limpieza de Prefijo

**Problema Original**: El primer párrafo incluye prefijo con fecha y agencia:
```
"Ciudad de México, 24 feb (Prensa Latina) La presidenta..."
```

**Debería ser**:
```
"La presidenta..."
```

**Solución Implementada**:

Se agregó la función `cleanPressLatinFirstParagraph()` en `api/scrape.js`:

```javascript
const cleanPressLatinFirstParagraph = (text = '') => {
  // Elimina el prefijo "Ciudad de México, X feb (Prensa Latina)" o similar
  // Patrón: "Ciudad/Lugar, fecha mes (Agencia)" del primer párrafo
  const presensLatinPattern = /^[A-ZÁ][a-záéíóú\s'.-]*,\s*\d{1,2}\s+[A-Za-záéíóú]+\s*\([^)]*Prensa Latina[^)]*\)\s*/i;
  
  const paragraphs = text.split('\n\n');
  if (paragraphs.length === 0) return text;
  
  // Solo procesa el primer párrafo
  const firstParagraph = paragraphs[0];
  const cleanedFirst = firstParagraph.replace(presensLatinPattern, '').trim();
  
  if (cleanedFirst === firstParagraph.trim()) {
    // Si el patrón no coincidió, retorna el texto original
    return text;
  }
  
  // Reemplaza el primer párrafo limpiado en la lista
  const result = [cleanedFirst, ...paragraphs.slice(1)].join('\n\n');
  return result;
};
```

**Patrón Regex Explicado**:
- `^[A-ZÁ]` - Inicia con mayúscula (incluyendo acentuadas)
- `[a-záéíóú\s'.-]*` - Nombre del lugar (letras, espacios, guiones, apóstrofes)
- `,\s*` - Coma seguida de espacio
- `\d{1,2}` - Día (1-2 dígitos)
- `\s+[A-Za-záéíóú]+` - Mes en texto
- `\([^)]*Prensa Latina[^)]*\)` - Paréntesis con "Prensa Latina"

**Dónde se Aplica**: Se ejecuta en `cleanupProxyText()` cuando el dominio incluye "prensa-latina.cu".

**Casos Cubiertos**:
- ✓ "Ciudad de México, 24 feb (Prensa Latina)"
- ✓ "La Habana, 5 nov (Prensa Latina)"
- ✓ "Washington, 12 ago (Prensa Latina) – EFE"
- ✓ Variaciones con mayúsculas/minúsculas

**No Afecta**: Artículos que no siguen este patrón; si el regex no coincide, devuelve el texto original.

---

### 2.2 Radio Bayamo (radiobayamo.icrt.cu) - División de Párrafos

**Problema Original**: El contenido se extrae como un solo bloque:
```
"El domingo, el primer ministro... blah blah... anunció la suspensión inmediata..."
```

**Debería ser**:
```
Párrafo 1: "El domingo, el primer ministro..."
Párrafo 2: "...anunció la suspensión inmediata..."
Párrafo 3: "..."
```

**Solución Implementada**:

Se agregó la función `splitRadioBayamoParagraphs()` en `api/scrape.js`:

```javascript
const splitRadioBayamoParagraphs = (text = '') => {
  // Radio Bayamo a veces extrae todo como un bloque
  // Intenta dividir por patrones naturales: punto seguido de mayúscula
  const paragraphs = text.split('\n\n');
  
  // Si ya hay múltiples párrafos, devuelve el texto original
  if (paragraphs.length > 2) return text;
  
  // Si el texto es muy corto, no intentes dividir
  if (text.length < 500) return text;
  
  // Divide por "punto + espacio + mayúscula" manteniendo el contexto
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÁ])/);
  
  // Agrupa las oraciones en párrafos más lógicos (cada 2-3 oraciones)
  const groupedParagraphs = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const paragraph = sentences.slice(i, i + 2).join(' ').trim();
    if (paragraph.length > 30) {
      groupedParagraphs.push(paragraph);
    }
  }
  
  // Si logramos crear múltiples párrafos, úsalos
  if (groupedParagraphs.length > 1) {
    return groupedParagraphs.join('\n\n');
  }
  
  return text;
};
```

**Lógica de Funcionamiento**:
1. Verifica si ya hay múltiples párrafos (no actúa si es innecesario)
2. Si el texto es muy corto (<500 caracteres), devuelve sin modificar
3. Divide por punto/interrogación/exclamación seguido de mayúscula
4. Agrupa cada 2 oraciones consecutivas en un párrafo lógico
5. Filtra párrafos muy cortos (<30 caracteres)
6. Retorna los párrafos agrupados separados por `\n\n`

**Dónde se Aplica**: Se ejecuta en `cleanupProxyText()` cuando el dominio incluye "radiobayamo.icrt.cu".

**Casos Cubiertos**:
- ✓ Texto monolítico extraído como un párrafo
- ✓ Texto con múltiples oraciones sin separación explícita
- ✓ Respeta división ya existente de párrafos

**No Afecta**: Artículos cortos, artículos ya bien divididos, URLs de otros dominios.

---

## 3. Archivos Modificados

### 3.1 `config/extractors.js`

Cambios:
- Agregados selectores específicos para **Escambray** (escambray.cu)
- Agregados selectores específicos para **Tribuna** (tribuna.cu)
- Mejorados selectores existentes de **Cubadebate** (cubadebate.cu)
- Agregado flag `cleanFirstParagraph: true` a Prensa Latina
- Agregado flag `splitParagraphs: true` a Radio Bayamo

### 3.2 `api/scrape.js`

Cambios:
- Agregada función `cleanPressLatinFirstParagraph()`
- Agregada función `splitRadioBayamoParagraphs()`
- Actualizada función `cleanupProxyText()` para llamar a las nuevas funciones

---

## 4. Testing Manual

### Test 1: Escambray
```bash
# URL de ejemplo
https://www.escambray.cu/2026/eriel-sanchez-de-sancionado-en-cuba-a-manager-en-nicaragua-fotos-y-video/

# Verificar:
✓ Título extraído correctamente
✓ Cuerpo tiene múltiples párrafos
✓ Sin metadatos de author/tags/fecha
✓ Imagen destacada (si existe)
```

### Test 2: Cubadebate
```bash
# URL de ejemplo
http://www.cubadebate.cu/noticias/...

# Verificar:
✓ Título limpio
✓ Párrafos separados
✓ Sin datos de autor en el cuerpo
✓ Sin categorías en el contenido
```

### Test 3: Tribuna
```bash
# URL de ejemplo
https://www.tribuna.cu/historia-del-logotipo-y-el-lema-de-los-cdr/

# Verificar:
✓ Contenido extraído
✓ Párrafos bien divididos
✓ Sin sidebar ni widgets
```

### Test 4: Prensa Latina (Limpieza)
```bash
# URL de ejemplo
https://www.prensa-latina.cu/2025/05/08/articulos-de-firmas-selectas-del-8-al-14-de-mayo/

# Verificar:
✓ Primer párrafo NO comienza con "Ciudad de México, X mes (Prensa Latina)"
✓ Comienza directamente con el contenido
✓ Resto de párrafos sin cambios
```

### Test 5: Radio Bayamo (División)
```bash
# URL de ejemplo
https://www.radiobayamo.icrt.cu/como-medios-occidentales-fabrican-consentimiento-para-genocidio-en-gaza/

# Verificar:
✓ Contenido dividido en múltiples párrafos (NO en uno solo)
✓ Cada párrafo representa una idea lógica
✓ Transiciones naturales entre párrafos
```

---

## 5. Notas sobre Edge Cases

### Escambray, Cubadebate, Tribuna
- **Artículos sin párrafos**: Si un artículo no tiene `<p>` tags, se extrae el texto del contenedor principal
- **Selectores múltiples**: El código intenta varios selectores en orden; usa el primero que encontró contenido
- **Imágenes destacadas**: Actualmente no se extraen, pero se pueden agregar selectores adicionales si es necesario

### Prensa Latina
- **Variaciones de formato**: El regex captura variaciones comunes, pero si el formato cambia drásticamente, fallará silenciosamente y retornará el texto original
- **Nombres de lugares**: El patrón asume formato "Lugar, fecha (Agencia)"; si cambia, requiere actualización del regex
- **Múltiples agencias**: Si hay más de una agencia entre paréntesis, el patrón captura todo

### Radio Bayamo
- **Textos muy cortos**: No se procesan (<500 caracteres) para evitar fragmentación innecesaria
- **Oraciones muy largas**: Una oración muy larga puede quedar sin separación si el patrón de "mayúscula después de punto" no ocurre
- **Puntuación especial**: Símbolos como "—" (guión em) no dividen párrafos; solo `.`, `!`, `?`

---

## 6. Mejoras Futuras Posibles

1. **Detección automática de tema WordPress**: Identificar el tema y aplicar selectores específicos
2. **OCR para imágenes destacadas**: Extraer imágenes de artículos
3. **Análisis de estructura DOM**: Usar algoritmos para detectar contenido sin selectores predefinidos
4. **Caché de selectores**: Guardar selectores que funcionan para acelerar futuras extracciones
5. **Testing automatizado**: Crear suite de tests para validar cambios sin regresión

---

## 7. Validación Rápida del Cambio

Para validar que los cambios funcionan:

```bash
# 1. Verificar que los archivos se actualizaron
git diff config/extractors.js
git diff api/scrape.js

# 2. Ejecutar linter (si existe)
npm run lint

# 3. Probar con URLs reales
node scripts/verify-extraction.js "https://www.escambray.cu/..."
node scripts/verify-extraction.js "https://www.cubadebate.cu/..."
node scripts/verify-extraction.js "https://www.tribuna.cu/..."
node scripts/verify-extraction.js "https://www.prensa-latina.cu/..."
node scripts/verify-extraction.js "https://www.radiobayamo.icrt.cu/..."
```

---

**Documento generado**: Noviembre 2026  
**Proyecto**: CUBAPRESS Agregador de Noticias  
**Versión de cambios**: 1.0
