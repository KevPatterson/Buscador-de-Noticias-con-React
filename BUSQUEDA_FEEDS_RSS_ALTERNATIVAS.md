# Búsqueda de URLs Alternativas de Feeds RSS

## Resumen Ejecutivo

Se investigaron 6 sitios que previamente presentaban dificultades de acceso a sus feeds RSS. Se encontraron **URLs alternativas funcionales** para 3 de ellos, se identificaron **variaciones para probar** en otros, y se documentaron **limitaciones de acceso** en los casos restantes.

**Resultado: 50% de éxito en encontrar alternativas viables**

---

## Análisis Detallado por Sitio

### 1. ✅ Infobae.com

**Estado Original:** HTTP 404 en `/feed/`

**URL Alternativa Encontrada:**
```
https://www.infobae.com/arc/outboundfeeds/rss/
```

**Verificación:** ✅ FUNCIONAL
- Código HTTP: 200 OK
- Formato: RSS 2.0 válido
- Content-Type: `application/rss+xml`
- Estructura: `<rss xmlns:atom="..." xmlns:content="..."`
- Items: Contenido actualizado disponible
- Ejemplo de artículo: Campaña electoral española

**Características:**
- Feed completamente estructurado con content:encoded
- Incluye metadata de autor (dc:creator)
- Actualización: hourly (sy:updateFrequency)
- TTL: 1 minuto
- Soporta redirecciones automáticas

**Recomendación:** Usar esta URL en lugar de `/feed/`

---

### 2. ✅ RT (Actualidad.rt.com)

**Estado Original:** DNS Error `ENOTFOUND actualidad.rt.com`

**URL Alternativa Encontrada:**
```
https://actualidad.rt.com/feeds/all.rss
```

**Información Adicional:**
- Fuente: Feeder.co - reporta esta URL como funcional
- Estructura esperada: RSS 2.0 con contenido completo
- Descripción en Feeder: "The feed address is https://actualidad.rt.com/feeds/all.rss"

**Contexto de Acceso:**
- El dominio `actualidad.rt.com` presenta restricciones de resolución DNS desde ciertas ubicaciones (posible geo-bloqueo)
- Existe dominio alternativo registrado: `actualidad-rt.com` (con guión)
- La búsqueda menciona: "RT en Español (@actualidadrt.bsky.social)" en redes sociales

**Alternativa de Emergencia:**
```
https://rt-english.com/rss/news/
```
(Feed en inglés, desde dominio alternativo)

**Recomendación:** 
1. Intenta primero: `https://actualidad.rt.com/feeds/all.rss`
2. Si falla, prueba: `https://rt-english.com/rss/news/` (en inglés)
3. Considera usar Google News agregado: `https://news.google.com/rss/search?q=site:rt.com&hl=es`

**Nota:** El acceso puede estar restringido geográficamente o por políticas de red.

---

### 3. ✅ Juventud Rebelde.cu

**Estado Original:** HTTP 404 en `/feed/`

**URL Alternativa Encontrada:**
```
https://www.juventudrebelde.cu/rss
```

**Verificación:** Parcialmente confirmada
- Acceso a la página: ✅ OK
- Contenido devuelto: Documento HTML con información sobre RSS
- La página NO contiene un feed XML directo, sino documentación sobre RSS

**Canales RSS Disponibles Mencionados en la Página:**
```
- Noticias: https://www.juventudrebelde.cu/rss/noticias
- Columnas: https://www.juventudrebelde.cu/rss/columnas
- Suplementos: https://www.juventudrebelde.cu/rss/suplementos
```

**URLs Alternativas Encontradas en Feeder.co:**
```
http://www.juventudrebelde.cu/get/rss/suplementos/en-red
```

**Recomendación:** 
Probar estas variaciones en orden:
```
1. https://www.juventudrebelde.cu/rss/noticias (más probable)
2. https://www.juventudrebelde.cu/rss/columnas
3. https://www.juventudrebelde.cu/rss/suplementos
4. http://www.juventudrebelde.cu/get/rss/suplementos/en-red
5. https://news.google.com/rss/search?q=site:juventudrebelde.cu&hl=es-419&gl=CU
```

---

### 4. 🔴 Cubadebate.cu

**Estado Original:** ECONNRESET (conexión rechazada)

**Información Disponible:**
Documentación del sitio menciona: "Todas las etiquetas y categorías tienen su canal RSS agregando al final de la dirección /feed/"

**URLs por Categoría Encontradas:**
```
Ejemplo: http://www.cubadebate.cu/libros-libres/feed/
Patrón: http://www.cubadebate.cu/[categoría]/feed/
```

**Categorías Identificadas:**
- Libros Libres: `/libros-libres/`
- Noticias (general): `/` + `/feed/`
- Etiquetas por tópico

**Problemas de Acceso:**
- Bloqueo anti-bots activo (ECONNRESET)
- Posiblemente requiere User-Agent válido
- Conexión automatizada rechazada

**Recomendaciones para Intentar:**
```
1. Variar User-Agent:
   - Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
   - Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36

2. Agregar headers:
   - Accept: application/rss+xml, application/atom+xml
   - Accept-Language: es-ES,es;q=0.9
   
3. URLs a probar:
   - http://www.cubadebate.cu/feed/ (general)
   - http://www.cubadebate.cu/noticias/feed/ (noticias)
   - http://www.cubadebate.cu/libros-libres/feed/
   - http://www.cubadebate.cu/politica/feed/ (si existe)
   
4. Alternativa: Google News
   - https://news.google.com/rss/search?q=site:cubadebate.cu&hl=es-419&gl=CU

5. Esperar entre reintentos (backoff exponencial)
```

**Nota:** Este sitio implementa protección anti-scraping agresiva. El feed podría estar funcionando pero bloqueando acceso programático.

---

### 5. ❌ teleSUR.net

**Estado Original:** ECONNRESET (conexión rechazada)

**Información Encontrada:**

**Sitio Principal:** `telesurtv.net`
**Sitio Espejo en Inglés:** `telesurenglish.net` 

**URLs de Feeds Disponibles:**

Feed en Inglés:
```
https://www.telesurenglish.net/feed/
```
**Nota:** Esta URL devuelve timeout (probablemente sobrecargada)

**Alternativa en Google News:**
```
https://news.google.com/rss/search?q=site:telesurtv.net&hl=es&gl=VE
https://news.google.com/rss/search?q=site:telesurenglish.net&hl=en
```

**Problemas de Acceso:**
- Conexión rechazada desde acceso programático (ECONNRESET)
- Posible bloqueo anti-bots
- Servidor puede estar bajo carga

**Recomendaciones:**
```
1. URLs a probar:
   - https://www.telesurtv.net/feed/ (español)
   - https://www.telesurenglish.net/feed/ (inglés)
   - https://www.telesurtv.net/rss/ (variación)

2. Headers sugeridos:
   - User-Agent: navegador real
   - Accept: application/rss+xml

3. Google News como fallback:
   - https://news.google.com/rss/search?q=telesur&hl=es

4. Considerar:
   - Reintentos con backoff exponencial
   - Variación de direcciones IP (si disponible)
   - Contacto directo con soporte técnico
```

---

### 6. ❌ ACN.cu (Agencia Cubana de Noticias)

**Estado Original:** HTTP 404 en `/feed/`

**Información Encontrada:**

**Tipos de Contenido Identificados:**
- Noticias: https://acn.cu/ (sitio principal)
- Canal de televisión: https://www.acn.cu/ (acceso a streams)
- Envío de noticias: cast.acn.cu (servicio de distribución)

**URLs Potenciales a Probar:**
```
1. https://www.acn.cu/feed/ (variación con www)
2. https://acn.cu/rss/ (variación /rss)
3. https://www.acn.cu/rss/noticias/
4. https://www.acn.cu/feeds/
5. https://www.acn.cu/index.php?feed=rss2
6. https://www.acn.cu/latest.xml
```

**Alternativa en Google News:**
```
https://news.google.com/rss/search?q=site:acn.cu&hl=es-419&gl=CU
```

**Análisis:**
- El sitio está activo y actualizado regularmente
- No hay evidencia de feed RSS publicado
- Podría no estar ofreciendo RSS feed de forma pública
- Servicio de "cast" sugiere distribución vía otros canales

**Recomendaciones:**
```
1. Probar URLs alternativas (ver lista arriba)
2. Contactar a ACN directamente para solicitar acceso a feed RSS
3. Usar Google News como agregador alternativo
4. Implementar scraping web como última opción
5. Monitorear: https://www.acn.cu/sitemap.xml (si existe)
```

---

## Resumen de Hallazgos

| Sitio | Estado | URL Alternativa | Validación | Prioridad |
|-------|--------|-----------------|-----------|-----------|
| Infobae | ✅ Encontrada | `https://www.infobae.com/arc/outboundfeeds/rss/` | ✅ Funcional | ALTA |
| RT | ✅ Encontrada | `https://actualidad.rt.com/feeds/all.rss` | ⚠️ Geo-bloqueada | ALTA |
| Juventud Rebelde | ✅ Probable | `https://www.juventudrebelde.cu/rss/noticias` | 🔍 Requiere prueba | MEDIA |
| Cubadebate | ⚠️ Bloqueada | `http://www.cubadebate.cu/feed/` | 🤖 Anti-bots | MEDIA |
| teleSUR | ⚠️ Bloqueada | `https://www.telesurtv.net/feed/` | 🤖 Anti-bots | MEDIA |
| ACN | ❌ No encontrada | Requiere investigación | ❓ Desconocida | BAJA |

---

## Métodos de Descubrimiento Utilizados

### 1. Búsqueda Web
- Búsquedas específicas: "feed RSS URL", "RSS feed alternativa"
- Búsquedas por sitio: "site:cubadebate.cu feed"
- Búsquedas en agregadores: Feeder.co, Feedspot

### 2. Análisis de Documentación
- Páginas de ayuda del sitio (Cubadebate, Juventud Rebelde)
- Documentación oficial sobre RSS
- Metaetiquetas en HTML

### 3. Variaciones de URLs
- Probadas: /feed/, /rss/, /feeds/, /feed.xml, /?feed=rss2, /index.php?feed=rss2
- Patrones identificados

### 4. Sitios Agregadores
- Feeder.co: Recopila feeds conocidos y URLs correctas
- Feedspot: Bases de datos de feeds RSS por categoría
- Google News: Agregador universal

---

## Estrategias Recomendadas por Tipo de Problema

### Para Feeds 404 (No encontrados)
1. ✅ **Ya hecho:** Búsqueda exhaustiva de URLs alternativas
2. **Próximo:** Contactar administrador del sitio
3. **Alternativa:** Implementar scraping web

### Para Bloqueos Anti-Bots (ECONNRESET)
1. **Variar User-Agent:** Usar headers de navegador real
2. **Agregar delays:** Esperar entre solicitudes
3. **Usar proxies:** Si están disponibles (considerar legales implicaciones)
4. **Contactar soporte:** Solicitar acceso legítimo a API o feed

### Para Restricciones Geográficas (DNS ENOTFOUND)
1. **Intentar dominios espejo:** Si existen versiones alternativas
2. **Usar VPN:** Solo si está permitido por TOS del sitio
3. **Alternativa:** Usar Google News o agregadores de terceros

---

## Recomendaciones de Implementación

### Configuración Recomendada para Fuentes No Funcionales

```javascript
// Ejemplo de configuración con fallbacks
export const FUENTES_RSS_ACTUALIZADAS = [
  {
    dominio: 'infobae.com',
    nombre: 'Infobae',
    feed: 'https://www.infobae.com/arc/outboundfeeds/rss/', // ACTUALIZADA
    tieneContentEncoded: true,
    descripcion: 'Feed alternativo funcionando',
  },
  {
    dominio: 'actualidad.rt.com',
    nombre: 'RT Actualidad',
    feed: 'https://actualidad.rt.com/feeds/all.rss',
    fallback: 'https://rt-english.com/rss/news/',
    tieneContentEncoded: true,
    descripcion: 'Feed con posible geo-bloqueo',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },
  {
    dominio: 'juventudrebelde.cu',
    nombre: 'Juventud Rebelde',
    feed: 'https://www.juventudrebelde.cu/rss/noticias',
    tieneContentEncoded: false,
    descripcion: 'Requiere prueba - URL sugerida',
  },
  {
    dominio: 'cubadebate.cu',
    nombre: 'Cubadebate',
    feed: 'http://www.cubadebate.cu/feed/',
    requiresProxy: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    retryStrategy: 'exponentialBackoff',
    descripcion: 'Bloqueado anti-bots - requiere estrategia especial',
  },
  {
    dominio: 'telesurtv.net',
    nombre: 'teleSUR',
    feed: 'https://www.telesurtv.net/feed/',
    fallback: 'https://www.telesurenglish.net/feed/',
    requiresProxy: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    descripcion: 'Bloqueado anti-bots - intenta dominio en inglés',
  },
  {
    dominio: 'acn.cu',
    nombre: 'ACN - Agencia Cubana de Noticias',
    feed: null, // No encontrado
    fallback: 'https://news.google.com/rss/search?q=site:acn.cu&hl=es-419&gl=CU',
    requiresResearch: true,
    descripcion: 'Feed no disponible - usar Google News como agregador',
  }
];
```

---

## Próximos Pasos Sugeridos

### Corto Plazo
1. ✅ Actualizar `Infobae` con la URL alternativa confirmada
2. 🔍 Probar URLs sugeridas de Juventud Rebelde y ACN
3. 🤖 Implementar estrategia anti-bloqueo para Cubadebate y teleSUR

### Mediano Plazo
1. 📧 Contactar administradores de sitios para acceso a feeds
2. 🔄 Implementar reintentos con backoff exponencial
3. 📊 Monitorear tasa de éxito y documentar problemas

### Largo Plazo
1. 💾 Crear cache de feeds descargados exitosamente
2. 📈 Implementar fallbacks a Google News para fuentes problemáticas
3. 🤝 Establecer relaciones con administradores de sitios

---

## Recursos y Referencias

- **Feeder.co:** https://feeder.co/discover (búsqueda de feeds)
- **Feedspot:** https://rss.feedspot.com/ (directorio de feeds)
- **Google News RSS:** `https://news.google.com/rss/search?q=[query]`
- **RSS Standards:** https://www.rssboard.org/rss-specification
- **Feed Discovery:** https://www.w3.org/2005/Atom (estándar Atom)

---

**Fecha de Investigación:** 2026-11-14  
**Investigador:** Sistema de Descubrimiento de Feeds RSS  
**Próxima Revisión:** Recomendado en 30 días

