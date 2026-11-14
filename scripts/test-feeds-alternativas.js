/**
 * Script de prueba de feeds RSS alternativos
 * Valida URLs alternativas encontradas y proporciona recomendaciones
 * 
 * Uso: node scripts/test-feeds-alternativas.js
 */

import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

// Feeds alternativos encontrados
const feedsAlternativos = {
  infobae: {
    nombre: 'Infobae',
    urls: [
      {
        url: 'https://www.infobae.com/arc/outboundfeeds/rss/',
        estado: 'CONFIRMADA - Use esta',
        prioridad: 1,
      },
    ],
  },
  rt: {
    nombre: 'RT - Actualidad',
    urls: [
      {
        url: 'https://actualidad.rt.com/feeds/all.rss',
        estado: 'Encontrada en Feeder.co - Requiere prueba',
        prioridad: 1,
      },
      {
        url: 'https://rt-english.com/rss/news/',
        estado: 'Alternativa en inglés',
        prioridad: 2,
      },
    ],
  },
  juventudRebelde: {
    nombre: 'Juventud Rebelde',
    urls: [
      {
        url: 'https://www.juventudrebelde.cu/rss/noticias',
        estado: 'Sugerida - Requiere prueba',
        prioridad: 1,
      },
      {
        url: 'https://www.juventudrebelde.cu/rss/columnas',
        estado: 'Sugerida - Requiere prueba',
        prioridad: 2,
      },
      {
        url: 'https://www.juventudrebelde.cu/rss/suplementos',
        estado: 'Sugerida - Requiere prueba',
        prioridad: 3,
      },
    ],
  },
  cubadebate: {
    nombre: 'Cubadebate',
    urls: [
      {
        url: 'http://www.cubadebate.cu/feed/',
        estado: 'Bloqueada por anti-bots',
        prioridad: 1,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, application/atom+xml',
        },
        estrategia: 'backoff exponencial',
      },
    ],
  },
  telesur: {
    nombre: 'teleSUR',
    urls: [
      {
        url: 'https://www.telesurtv.net/feed/',
        estado: 'Bloqueada por anti-bots',
        prioridad: 1,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
      {
        url: 'https://www.telesurenglish.net/feed/',
        estado: 'Alternativa en inglés',
        prioridad: 2,
        idioma: 'en',
      },
    ],
  },
  acn: {
    nombre: 'ACN - Agencia Cubana de Noticias',
    urls: [
      {
        url: 'https://www.acn.cu/feed/',
        estado: 'No encontrado',
        prioridad: 0,
        notas: 'Probar variaciones: /rss/, /feeds/, /?feed=rss2',
      },
    ],
  },
};

// Función para probar fetch con timeout
async function testFeed(url, headers = {}, timeout = 10000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/rss+xml, application/atom+xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 200) {
      const contentType = response.headers.get('content-type');
      const text = await response.text();

      // Validar si es XML/RSS
      if (text.includes('<?xml') || text.includes('<rss') || text.includes('<feed')) {
        return {
          status: 'OK',
          httpCode: 200,
          contentType,
          isValidRSS: true,
          preview: text.substring(0, 200),
        };
      } else {
        return {
          status: 'ERROR',
          httpCode: 200,
          contentType,
          isValidRSS: false,
          error: 'No es un feed RSS válido',
        };
      }
    } else if (response.status === 404) {
      return {
        status: 'ERROR',
        httpCode: 404,
        error: 'Not Found',
      };
    } else if (response.status === 403) {
      return {
        status: 'ERROR',
        httpCode: 403,
        error: 'Acceso prohibido (posible bloqueo)',
      };
    } else {
      return {
        status: 'ERROR',
        httpCode: response.status,
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        status: 'ERROR',
        error: 'Timeout - Conexión muy lenta o bloqueada',
      };
    } else if (error.code === 'ECONNRESET') {
      return {
        status: 'ERROR',
        error: 'ECONNRESET - Conexión rechazada (posible anti-bots)',
      };
    } else if (error.code === 'ENOTFOUND') {
      return {
        status: 'ERROR',
        error: 'ENOTFOUND - Dominio no resolvible (posible geo-bloqueo)',
      };
    } else {
      return {
        status: 'ERROR',
        error: `${error.code || error.message}`,
      };
    }
  }
}

// Función para probar todas las URLs
async function testAllFeeds() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  PRUEBA DE FEEDS RSS ALTERNATIVOS                             ║');
  console.log('║  Validación de URLs encontradas                               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  for (const [key, feed] of Object.entries(feedsAlternativos)) {
    console.log(`\n📰 ${feed.nombre}`);
    console.log('─'.repeat(60));

    for (const feedUrl of feed.urls) {
      const priority = '⭐'.repeat(feedUrl.prioridad || 1);
      console.log(`\n${priority} ${feedUrl.estado}`);
      console.log(`   URL: ${feedUrl.url}`);

      if (feedUrl.estrategia) {
        console.log(`   Estrategia: ${feedUrl.estrategia}`);
      }

      if (feedUrl.headers) {
        console.log(`   Headers especiales: Sí`);
      }

      // Prueba solo las primeras (para no saturar)
      if (feedUrl.prioridad === 1) {
        console.log('   Probando...');
        const resultado = await testFeed(feedUrl.url, feedUrl.headers || {});

        if (resultado.status === 'OK') {
          console.log(`   ✅ FUNCIONAL - ${resultado.httpCode}`);
          console.log(`   Content-Type: ${resultado.contentType}`);
        } else {
          console.log(`   ❌ ERROR - ${resultado.error}`);
        }
      } else {
        console.log('   (Sin probar en esta ejecución)');
      }
    }
  }

  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  RECOMENDACIONES                                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('✅ IMPLEMENTAR INMEDIATAMENTE:');
  console.log('   - Infobae: https://www.infobae.com/arc/outboundfeeds/rss/');
  console.log('   - Juventud Rebelde: https://www.juventudrebelde.cu/rss/noticias');

  console.log('\n⚠️ REQUIERE ESTRATEGIA ESPECIAL:');
  console.log('   - Cubadebate: Implementar User-Agent y backoff exponencial');
  console.log('   - teleSUR: Intentar con dominio en inglés o Google News');
  console.log('   - RT: Podría estar geo-bloqueado');

  console.log('\n🔍 REQUIERE INVESTIGACIÓN:');
  console.log('   - ACN: Probar variaciones de URL');

  console.log('\n📚 USAR COMO FALLBACK:');
  console.log('   - Google News: https://news.google.com/rss/search?q=site:[dominio]');

  console.log('\n');
}

// Ejecutar pruebas
testAllFeeds().catch(error => {
  console.error('Error durante las pruebas:', error);
  process.exit(1);
});
