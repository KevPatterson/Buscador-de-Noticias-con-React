# Guía de Implementación - Fixes de Scraping CUBAPRESS

## Cambios Realizados

Este documento es una lista de verificación para implementar la solución completa de scraping.

---

## ✓ Archivos Modificados

### 1. `config/extractors.js`
**Cambios**: Agregados y mejorados selectores para nuevas fuentes y fixes de limpieza

**Nuevas entradas de dominio**:
- `escambray.cu` - Selectores de WordPress simple
- `tribuna.cu` - Selectores de Drupal/WordPress
- Mejorados: `cubadebate.cu`, `prensa-latina.cu`, `radiobayamo.icrt.cu`

**Flags agregados**:
- `cleanFirstParagraph: true` en prensa-latina.cu
- `splitParagraphs: true` en radiobayamo.icrt.cu

### 2. `api/scrape.js`
**Cambios**: Agregadas dos funciones de post-procesamiento

**Nuevas funciones**:
- `cleanPressLatinFirstParagraph()` - Elimina prefijo "Ciudad, fecha (Agencia)"
- `splitRadioBayamoParagraphs()` - Divide texto monolítico en párrafos lógicos

**Modificadas**:
- `cleanupProxyText()` - Llama a las nuevas funciones cuando aplica el dominio

### 3. `src/config/fuentes-rss.js`
**Cambios**: Agregadas dos nuevas fuentes RSS

**Nuevas entradas**:
- Escambray: `https://www.escambray.cu/feed/`
- Cubadebate: `http://www.cubadebate.cu/feed/`

### 4. Scripts de Testing
**Nuevos archivos**:
- `scripts/test-scraping-fixes.js` - Suite de pruebas unitarias para las nuevas funciones

### 5. Documentación
**Nuevos archivos**:
- `docs/SCRAPING_SOLUTION.md` - Documentación técnica detallada de la solución
- `docs/IMPLEMENTATION_GUIDE.md` - Este archivo (guía de implementación)

---

## 📋 Checklist de Verificación

### Pre-implementación
- [ ] Hacer backup de los archivos originales
- [ ] Revisar cambios: `git diff` (si usa Git)
- [ ] Verificar sintaxis JavaScript

### Post-implementación (Local)
- [ ] Ejecutar tests: `node scripts/test-scraping-fixes.js`
- [ ] Verificar linting: `npm run lint` (si existe)
- [ ] Ejecutar build: `npm run build` (si existe)

### Pruebas de Funcionalidad

#### 1. Escambray
- [ ] URL de prueba: https://www.escambray.cu/2026/
- [ ] Verificar: Título extraído ✓
- [ ] Verificar: Cuerpo en múltiples párrafos ✓
- [ ] Verificar: Sin metadatos ✓

#### 2. Cubadebate
- [ ] URL de prueba: http://www.cubadebate.cu/
- [ ] Verificar: Título limpio ✓
- [ ] Verificar: Contenido del artículo ✓
- [ ] Verificar: Sin datos de autor ✓

#### 3. Tribuna
- [ ] URL de prueba: https://www.tribuna.cu/historia-del-logotipo-y-el-lema-de-los-cdr/
- [ ] Verificar: Contenido extraído ✓
- [ ] Verificar: Párrafos bien divididos ✓

#### 4. Prensa Latina (Limpieza de Prefijo)
- [ ] URL de prueba: https://www.prensa-latina.cu/2025/05/
- [ ] Verificar: Primer párrafo NO contiene "Ciudad de X, fecha (Prensa Latina)" ✓
- [ ] Verificar: Comienza con contenido real ✓

#### 5. Radio Bayamo (División de Párrafos)
- [ ] URL de prueba: https://www.radiobayamo.icrt.cu/
- [ ] Verificar: Contenido dividido en múltiples párrafos ✓
- [ ] Verificar: Transiciones naturales ✓

---

## 🚀 Pasos de Despliegue

### 1. Desarrollo Local
```bash
# Clonar/actualizar el repositorio
git pull origin main

# Instalar dependencias (si es necesario)
npm install

# Ejecutar tests
node scripts/test-scraping-fixes.js

# Ejecutar build (si existe)
npm run build
```

### 2. Staging/Pre-producción
```bash
# Desplegar a servidor de staging
# (comando específico del proyecto)

# Ejecutar pruebas con URLs reales de los sitios
node scripts/verify-extraction.js "https://www.escambray.cu/..."
node scripts/verify-extraction.js "https://www.cubadebate.cu/..."
node scripts/verify-extraction.js "https://www.tribuna.cu/..."
```

### 3. Producción
```bash
# Desplegar a servidor de producción
# (comando específico del proyecto)

# Monitorear logs para errores de scraping
# Ver si los RSS feeds de nuevas fuentes se populan correctamente
```

---

## 📊 Métricas de Éxito

### Antes de los cambios
- Escambray: 0 noticias
- Cubadebate: 0 noticias
- Tribuna: Parcial/incompleto
- Prensa Latina: Primer párrafo con basura
- Radio Bayamo: Todo en un párrafo

### Después de los cambios (Esperado)
- Escambray: ✓ Noticias extraídas correctamente
- Cubadebate: ✓ Noticias extraídas correctamente
- Tribuna: ✓ Mejora en completitud y claridad
- Prensa Latina: ✓ Primer párrafo limpio
- Radio Bayamo: ✓ Múltiples párrafos distinguibles

---

## 🔧 Troubleshooting

### "Las noticias de Escambray/Cubadebate no aparecen"
**Posibles causas**:
1. Los RSS feeds no están activos en esos sitios
2. El scraper no está siendo llamado (verificar flujo en la app)
3. Error en los selectores CSS

**Soluciones**:
- [ ] Verificar que los feeds existen: curl https://www.escambray.cu/feed/
- [ ] Verificar que los dominios están en `extractors.js`
- [ ] Inspeccionar HTML del sitio con navegador (F12)
- [ ] Ajustar selectores si la estructura cambió

### "Prensa Latina sigue teniendo el prefijo"
**Posibles causas**:
1. El patrón regex no coincide con el formato actual
2. El dominio en la URL no contiene "prensa-latina.cu"

**Soluciones**:
- [ ] Verificar la URL completa y el formato del prefijo
- [ ] Revisar el regex en `cleanPressLatinFirstParagraph()`
- [ ] Consultar la documentación de Prensa Latina

### "Radio Bayamo no se divide en párrafos"
**Posibles causas**:
1. El texto ya viene pre-dividido en párrafos
2. El texto es muy corto (<500 caracteres)
3. Las oraciones no terminan con `.`, `!` o `?`

**Soluciones**:
- [ ] Inspeccionar el HTML: ¿hay múltiples `<p>` tags?
- [ ] Verificar longitud del contenido extraído
- [ ] Revisar puntuación en el HTML original

---

## 📝 Notas Importantes

1. **Compatibilidad hacia atrás**: Los cambios no rompen funcionalidad existente. Los dominios que ya funcionaban seguirán funcionando.

2. **Fallback seguro**: Si los nuevos selectores no encuentran contenido, el scraper caerá de vuelta a los selectores genéricos.

3. **Funciones de limpieza**: Solo se aplican cuando el dominio coincide. No afectan otros sitios.

4. **Testing**: El archivo `test-scraping-fixes.js` proporciona pruebas unitarias básicas. Para testing completo de integración, usar URLs reales.

5. **Mantenimiento**: Si algún sitio cambia su estructura HTML, los selectores pueden necesitar actualización en `extractors.js`.

---

## 📞 Soporte

Para reportar problemas o sugerencias:
1. Verificar que se siguieron todos los pasos de esta guía
2. Consultar `docs/SCRAPING_SOLUTION.md` para detalles técnicos
3. Revisar logs de la aplicación para mensajes de error
4. Contactar al equipo de desarrollo

---

**Última actualización**: Noviembre 2026  
**Versión**: 1.0  
**Estado**: Listo para implementación
