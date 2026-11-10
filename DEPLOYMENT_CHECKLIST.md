# 🚀 Checklist de Deployment - Solución de Scraping

## Pre-Deployment (5 min)

- [ ] **Revisión de código**
  ```bash
  git diff config/extractors.js
  git diff api/scrape.js
  git diff src/config/fuentes-rss.js
  ```

- [ ] **Ejecutar tests locales**
  ```bash
  node scripts/test-scraping-fixes.js
  ```
  Esperado: ✓ 3 tests pasando

- [ ] **Verificar sintaxis**
  ```bash
  npm run lint  # Si existe
  ```

---

## Deployment a Staging (15 min)

- [ ] **Hacer commit (si usa Git)**
  ```bash
  git add config/extractors.js api/scrape.js src/config/fuentes-rss.js
  git commit -m "fix: Agregar selectores para Escambray, Cubadebate, Tribuna; limpiar Prensa Latina; dividir párrafos Radio Bayamo"
  git push origin develop  # O la rama de staging
  ```

- [ ] **Build del proyecto**
  ```bash
  npm install  # Si hay cambios en dependencias
  npm run build
  ```

- [ ] **Desplegar a staging**
  ```bash
  # Comando específico de tu proyecto (Vercel, Docker, etc.)
  # Ejemplo para Vercel:
  vercel --prod --target staging
  ```

---

## Validation en Staging (20 min)

### Test con URLs Reales

**1. Escambray**
```bash
curl "http://staging-url/api/scrape?url=https://www.escambray.cu/2026/"
```
✓ Verificar: Contenido extraído, múltiples párrafos, limpio

**2. Cubadebate**
```bash
curl "http://staging-url/api/scrape?url=http://www.cubadebate.cu/"
```
✓ Verificar: Contenido extraído, sin datos de autor

**3. Tribuna**
```bash
curl "http://staging-url/api/scrape?url=https://www.tribuna.cu/"
```
✓ Verificar: Contenido extraído correctamente

**4. Prensa Latina (Limpieza)**
```bash
curl "http://staging-url/api/scrape?url=https://www.prensa-latina.cu/2025/05/"
```
✓ Verificar: Primer párrafo NO tiene "Ciudad de X, fecha (Prensa Latina)"

**5. Radio Bayamo (División)**
```bash
curl "http://staging-url/api/scrape?url=https://www.radiobayamo.icrt.cu/"
```
✓ Verificar: Múltiples párrafos en el resultado

### Validación de RSS Feeds
- [ ] Verificar que Escambray aparece en la lista de fuentes
- [ ] Verificar que Cubadebate aparece en la lista de fuentes
- [ ] Consumir feed de Escambray: `https://www.escambray.cu/feed/`
- [ ] Consumir feed de Cubadebate: `http://www.cubadebate.cu/feed/`

### Monitores/Logs
- [ ] No hay errores de JavaScript en console
- [ ] No hay errores en logs del servidor
- [ ] No hay timeouts en llamadas de scraping

---

## Production Deployment (10 min)

- [ ] **Merge a main/master (si usa Git)**
  ```bash
  git checkout main
  git pull origin main
  git merge develop  # O tu rama de staging
  git push origin main
  ```

- [ ] **Desplegar a producción**
  ```bash
  # Comando específico de tu proyecto
  # Ejemplo para Vercel:
  vercel --prod
  ```

- [ ] **Verificar deployment**
  - [ ] Build completó exitosamente
  - [ ] No hay errores en logs
  - [ ] DNS está correcto

---

## Post-Deployment (15 min)

### Validación en Producción
- [ ] URLs reales funcionan (mismo testing que staging)
- [ ] Feeds RSS están siendo consumidos
- [ ] Noticias nuevas aparecen en la interfaz
- [ ] No hay regresiones en otras fuentes

### Monitoreo
- [ ] Configurar alertas si disponible:
  - [ ] Tasa de error de scraping > 5%
  - [ ] Latencia de scraping > 5s
  - [ ] Fallos en feeds RSS

- [ ] Revisar logs periódicamente:
  ```bash
  # Ver últimas 100 líneas de logs
  tail -100 logs/scraping.log
  ```

### Comunicación
- [ ] Notificar al equipo que los cambios están en producción
- [ ] Documentar en el sistema de tickets/issues que se completó
- [ ] Compartir enlace a `docs/SCRAPING_SOLUTION.md` con el equipo

---

## Rollback (Si es Necesario)

Si algo sale mal en producción:

```bash
# Opción 1: Revert commit
git revert HEAD
git push origin main

# Opción 2: Restaurar versión anterior
git checkout HEAD~1 -- config/extractors.js api/scrape.js src/config/fuentes-rss.js
git commit -m "revert: Revert scraping fixes"
git push origin main

# Opción 3: Re-desplegar versión anterior
vercel --prod --target production --version [commit-hash]
```

---

## Troubleshooting Rápido

| Problema | Causa Probable | Solución |
|----------|---|---|
| "No hay noticias de Escambray" | Feed inactivo | Verificar: `curl https://www.escambray.cu/feed/` |
| "Prensa Latina sigue sucio" | Regex no coincide | Revisar formato actual en el sitio |
| "Radio Bayamo todo en 1 párrafo" | Estructura HTML cambió | Inspeccionar HTML, ajustar selectores |
| Error de sintaxis | Typo en código | Ejecutar `npm run lint`, revisar diff |
| Timeout en scraping | Red lenta | Aumentar timeout en config (si aplica) |

---

## Verificación Final

### Checklist de Validación
- [ ] Todas las 5 fuentes problemas están resueltas
- [ ] Tests unitarios pasando: `✓ 3/3`
- [ ] Build sin errores
- [ ] Staging validado
- [ ] Producción validada
- [ ] Logs sin errores críticos
- [ ] Documentación actualizada

### Sign-off
- [ ] Code Review completado
- [ ] QA completado
- [ ] Product Owner aprueba

---

## Documentación de Referencia

- **Detalles técnicos**: `docs/SCRAPING_SOLUTION.md`
- **Guía de implementación**: `docs/IMPLEMENTATION_GUIDE.md`
- **Resumen ejecutivo**: `docs/SUMMARY.md`
- **Tests unitarios**: `scripts/test-scraping-fixes.js`

---

## Contacto de Soporte

Si necesitas ayuda durante el deployment:
1. Revisar logs del servidor
2. Ejecutar tests locales: `node scripts/test-scraping-fixes.js`
3. Consultar documentación en `/docs`
4. Contactar al equipo de desarrollo

---

**Tiempo Estimado Total**: ~1 hora  
**Complejidad**: Media (ajustes simples si es necesario)  
**Riesgo**: Bajo (cambios no-invasivos, compatible hacia atrás)

✅ **Listo para deployment**
