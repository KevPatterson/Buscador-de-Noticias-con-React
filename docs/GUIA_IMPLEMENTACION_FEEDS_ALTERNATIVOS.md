# Guía de Implementación - Feeds RSS Alternativos

## Introducción

Este documento proporciona instrucciones paso a paso para implementar las URLs alternativas de feeds RSS encontradas durante la investigación.

---

## 1. Feeds Listos para Implementar Inmediatamente

### 1.1 Infobae - IMPLEMENTAR YA

**Estado:** ✅ Confirmado como funcional

**Cambio Requerido:**
```javascript
// ANTES:
{
  dominio: 'infobae.com',
  feed: 'https://www.infobae.com/feed/',  // ❌ 404
}

// DESPUÉS:
{
  dominio: 'infobae.com',
  feed: 'https://www.infobae.com/arc/outboundfeeds/rss/',  // ✅ 200 OK
}
```

**Ubicación:** `src/config/fuentes-rss.js`

**Pasos:**
1. Abre el archivo `src/config/fuentes-rss.js`
2. Busca la entrada de Infobae (si está en tu lista)
3. Reemplaza la URL antigua con la nueva
4. Ejecuta: `npm run test:feeds` (si existe)
5. Valida que el feed funciona

**Validación:**
```bash
curl https://www.infobae.com/arc/outboundfeeds/rss/
# Deberías ver un documento XML válido, no un HTML 404
```

---

## 2. Feeds a Probar

### 2.1 Juventud Rebelde - PROBAR PRONTO

**Estado:** ✓ Probable (requiere validación)

**URLs a Probar (en orden de prioridad):**
```javascript
// PRIMERO probar:
'https://www.juventudrebelde.cu/rss/noticias'

// Si la anterior no funciona, probar:
'https://www.juventudrebelde.cu/rss/columnas'
'https://www.juventudrebelde.cu/rss/suplementos'

// Última opción:
'http://www.juventudrebelde.cu/get/rss/suplementos/en-red'
```

**Validación Manual:**
```bash
# Prueba en el navegador o con curl:
curl -I https://www.juventudrebelde.cu/rss/noticias

# Deberías obtener:
# HTTP/2 200
# Content-Type: application/rss+xml
```

**Implementación:**
```javascript
{
  dominio: 'juventudrebelde.cu',
  nombre: 'Juventud Rebelde',
  feed: 'https://www.juventudrebelde.cu/rss/noticias',
  tieneContentEncoded: false,
  descripcion: 'Feed de noticias - URL alternativa encontrada',
}
```

---

### 2.2 RT (Actualidad.rt.com) - PROBAR PRONTO

**Estado:** ⚠️ Posible geo-bloqueo

**Información:**
- Dominio original: `actualidad.rt.com` (DNS error desde algunas ubicaciones)
- URL alternativa encontrada: `https://actualidad.rt.com/feeds/all.rss`
- Feed en inglés: `https://rt-english.com/rss/news/`

**Validación:**
```bash
# Intenta resolver el dominio:
nslookup actualidad.rt.com

# Si no resuelve: es un problema de geo-bloqueo
# Intenta desde otro país o con VPN
```

**Implementación con Fallback:**
```javascript
{
  dominio: 'actualidad.rt.com',
  nombre: 'RT - Actualidad',
  feed: 'https://actualidad.rt.com/feeds/all.rss',
  fallback: 'https://rt-english.com/rss/news/', // Si URL principal falla
  tieneContentEncoded: true,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  descripcion: 'Feed con posible geo-bloqueo',
}
```

---

## 3. Feeds con Bloqueos Anti-Bots

### 3.1 Cubadebate - REQUIERE ESTRATEGIA ESPECIAL

**Problema:** ECONNRESET - Bloqueo anti-bots activo

**Estrategia de Desbloqueo:**

**Opción A: User-Agent Variado (Recomendado primero)**
```javascript
{
  dominio: 'cubadebate.cu',
  nombre: 'Cubadebate',
  feed: 'http://www.cubadebate.cu/feed/',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/atom+xml, */*;q=0.1',
    'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.cubadebate.cu/',
  },
  tieneContentEncoded: false,
}
```

**Opción B: Backoff Exponencial**
```javascript
// En tu código de fetch, implementa reintentos:
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: { /* headers del navegador */ },
      });
      if (response.ok) return response;
    } catch (error) {
      if (i < maxRetries - 1) {
        // Esperar: 1s, 2s, 4s, ...
        const delay = Math.pow(2, i) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}
```

**Opción C: Google News como Fallback**
```javascript
{
  dominio: 'cubadebate.cu',
  nombre: 'Cubadebate',
  feed: 'http://www.cubadebate.cu/feed/',
  fallback: 'https://news.google.com/rss/search?q=site:cubadebate.cu&hl=es-419&gl=CU',
  requiresRetry: true,
  tieneContentEncoded: false,
}
```

---

### 3.2 teleSUR - REQUIERE ESTRATEGIA ESPECIAL

**Problema:** ECONNRESET - Bloqueo anti-bots activo

**Estrategia de Desbloqueo:**

**Opción A: Dominio en Inglés**
```javascript
{
  dominio: 'telesurtv.net',
  nombre: 'teleSUR',
  feed: 'https://www.telesurenglish.net/feed/', // Intenta en inglés primero
  fallback: 'https://www.telesurtv.net/feed/',  // Si no funciona, intenta español
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  requiresRetry: true,
  tieneContentEncoded: false,
}
```

**Opción B: Google News como Fallback**
```javascript
{
  dominio: 'telesurtv.net',
  nombre: 'teleSUR',
  feed: 'https://www.telesurtv.net/feed/',
  fallback: 'https://news.google.com/rss/search?q=telesur&hl=es',
  requiresRetry: true,
  tieneContentEncoded: false,
}
```

---

## 4. Feeds No Disponibles

### 4.1 ACN - CONTACTAR O USAR GOOGLE NEWS

**Estado:** ❌ No encontrado

**Acciones:**

**Opción A: Google News (Inmediata)**
```javascript
{
  dominio: 'acn.cu',
  nombre: 'ACN - Agencia Cubana de Noticias',
  feed: 'https://news.google.com/rss/search?q=site:acn.cu&hl=es-419&gl=CU',
  tipo: 'google_news_fallback',
  tieneContentEncoded: false,
  descripcion: 'Feed RSS no disponible - usando agregador Google News',
}
```

**Opción B: Contacto Directo (A Largo Plazo)**
```
Email: Contactar a ACN
Asunto: Solicitud de acceso a feed RSS de noticias
Mensaje: Solicitar URL del feed RSS oficial de ACN.cu
```

**Opción C: Probar Variaciones**
Si quieres investigar más antes de usar Google News:
```bash
curl https://www.acn.cu/feed/         # Probado - No funciona
curl https://www.acn.cu/rss/          # A probar
curl https://www.acn.cu/feeds/        # A probar
curl https://www.acn.cu/latest.xml    # A probar
```

---

## 5. Ejecución de Cambios

### 5.1 Actualizar Configuración

```javascript
// src/config/fuentes-rss.js

export const FUENTES_RSS = [
  // ... feeds anteriores ...

  // ACTUALIZADO - Infobae
  {
    dominio: 'infobae.com',
    nombre: 'Infobae',
    feed: 'https://www.infobae.com/arc/outboundfeeds/rss/',
    tieneContentEncoded: true,
    descripcion: 'Feed alternativo - actualizado',
  },

  // NUEVO - Juventud Rebelde URL alternativa
  {
    dominio: 'juventudrebelde.cu',
    nombre: 'Juventud Rebelde',
    feed: 'https://www.juventudrebelde.cu/rss/noticias',
    tieneContentEncoded: false,
    descripcion: 'Feed de noticias - URL alternativa',
  },

  // ACTUALIZADO - RT con fallback
  {
    dominio: 'rt.com',
    nombre: 'RT - Actualidad',
    feed: 'https://actualidad.rt.com/feeds/all.rss',
    fallback: 'https://rt-english.com/rss/news/',
    tieneContentEncoded: true,
    descripcion: 'Feed con posible geo-bloqueo',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },

  // ACTUALIZADO - Cubadebate con estrategia anti-bloqueo
  {
    dominio: 'cubadebate.cu',
    nombre: 'Cubadebate',
    feed: 'http://www.cubadebate.cu/feed/',
    fallback: 'https://news.google.com/rss/search?q=site:cubadebate.cu&hl=es-419&gl=CU',
    tieneContentEncoded: false,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    requiresRetry: true,
  },

  // ACTUALIZADO - teleSUR con estrategia anti-bloqueo
  {
    dominio: 'telesurtv.net',
    nombre: 'teleSUR',
    feed: 'https://www.telesurenglish.net/feed/',
    fallback: 'https://news.google.com/rss/search?q=telesur&hl=es',
    tieneContentEncoded: false,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    requiresRetry: true,
  },

  // NUEVO - ACN usando Google News
  {
    dominio: 'acn.cu',
    nombre: 'ACN - Agencia Cubana de Noticias',
    feed: 'https://news.google.com/rss/search?q=site:acn.cu&hl=es-419&gl=CU',
    tieneContentEncoded: false,
    descripcion: 'Feed RSS no disponible - usando Google News',
  },

  // ... feeds siguientes ...
];
```

### 5.2 Actualizar Lógica de Fetch (si es necesaria)

```javascript
// src/lib/secureFetch.js (o tu archivo equivalente)

async function fetchRSSFeed(feedConfig) {
  let lastError;

  // Intenta con la URL principal
  try {
    const response = await fetchWithRetry(feedConfig.feed, feedConfig.headers);
    return response;
  } catch (error) {
    lastError = error;
    console.warn(`Feed principal falló: ${feedConfig.feed}`, error.message);
  }

  // Si hay fallback, intenta con la URL alternativa
  if (feedConfig.fallback) {
    try {
      console.log(`Intentando fallback: ${feedConfig.fallback}`);
      const response = await fetchWithRetry(feedConfig.fallback, feedConfig.headers);
      return response;
    } catch (error) {
      console.warn(`Fallback también falló: ${feedConfig.fallback}`, error.message);
      lastError = error;
    }
  }

  throw lastError;
}

async function fetchWithRetry(url, headers, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/rss+xml, application/atom+xml',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...headers,
        },
        timeout: 15000,
      });

      if (response.ok) return response;

      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (error) {
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
}
```

---

## 6. Pruebas

### 6.1 Probar Feeds Actualizados

```bash
# Ejecutar script de validación
node scripts/test-feeds-alternativas.js

# Deberías ver:
# ✅ INFOBAE - Funcional
# ✅ JUVENTUD REBELDE - Probable (prueba manual)
# ⚠️ CUBADEBATE - Requiere estrategia
# ⚠️ TELESUR - Requiere estrategia
```

### 6.2 Prueba Manual de URLs

```bash
# Probar Infobae (debe devolver 200 OK con XML)
curl -I https://www.infobae.com/arc/outboundfeeds/rss/

# Probar Juventud Rebelde
curl -I https://www.juventudrebelde.cu/rss/noticias

# Probar RT
curl -I https://actualidad.rt.com/feeds/all.rss

# Probar Cubadebate con User-Agent
curl -H "User-Agent: Mozilla/5.0" -I http://www.cubadebate.cu/feed/
```

### 6.3 Prueba en la Aplicación

```bash
# Ejecutar tests de tu aplicación
npm run test

# O si tienes tests específicos de feeds:
npm run test:feeds

# Verificar en la UI que los feeds se cargan correctamente
npm run dev
```

---

## 7. Monitoreo

### 7.1 Crear Alerta de Feeds Rotos

```javascript
// scripts/monitor-feeds.js
async function monitorFeeds() {
  const results = {
    working: [],
    broken: [],
    slow: [],
  };

  for (const feed of FUENTES_RSS) {
    try {
      const start = Date.now();
      const response = await fetch(feed.feed, { timeout: 10000 });
      const duration = Date.now() - start;

      if (response.ok) {
        if (duration > 5000) {
          results.slow.push(feed.dominio);
        } else {
          results.working.push(feed.dominio);
        }
      } else {
        results.broken.push(feed.dominio);
      }
    } catch (error) {
      results.broken.push(feed.dominio);
    }
  }

  // Enviar reporte
  console.log('✅ Funcionando:', results.working);
  console.log('⚠️ Lentos:', results.slow);
  console.log('❌ Rotos:', results.broken);

  if (results.broken.length > 0) {
    // Enviar alerta
    sendAlert(`Feeds rotos: ${results.broken.join(', ')}`);
  }
}

// Ejecutar diariamente
scheduleJob('0 0 * * *', monitorFeeds);
```

---

## 8. Cronograma Recomendado

| Fecha | Acción | Responsable |
|-------|--------|-------------|
| Hoy | Implementar Infobae | Dev |
| Hoy+1 | Probar Juventud Rebelde | QA |
| Hoy+2 | Probar RT | QA |
| Hoy+3 | Implementar estrategias anti-bloqueo | Dev |
| Hoy+5 | Implementar monitoreo | DevOps |
| Hoy+7 | Contactar ACN para feed oficial | PM |
| Hoy+30 | Revisar todos los feeds | QA |

---

## 9. Preguntas Frecuentes

**P: ¿Qué pasa si una URL alternativa falla?**
R: Usa el `fallback` configurado. Si no hay fallback, la aplicación debería degradarse gracefully sin romper.

**P: ¿Cómo manejo las restricciones geográficas?**
R: Usa Google News como fallback universal. Es accesible desde cualquier ubicación.

**P: ¿Es legal usar un User-Agent diferente?**
R: Sí, es práctica estándar. Los navegadores modernos hacen lo mismo. Solo respeta `robots.txt`.

**P: ¿Qué pasa con los feeds bloqueados por anti-bots?**
R: Intenta: User-Agent real → Backoff exponencial → Google News → Contacto directo.

**P: ¿Necesito cambiar el código de extracción?**
R: No, si los nuevos feeds mantienen el mismo formato XML. Solo actualiza las URLs.

---

## 10. Soporte

Si encuentras problemas:

1. **Verifica la URL** directamente en el navegador
2. **Usa curl** para probar sin JavaScript
3. **Revisa los headers** de la respuesta
4. **Consulta el archivo de logs** de la aplicación
5. **Revisa BUSQUEDA_FEEDS_RSS_ALTERNATIVAS.md** para más detalles

---

**Última actualización:** 2026-11-14  
**Próxima revisión:** 2026-12-14

