#!/usr/bin/env node

/**
 * Script de verificación: Probar que los feeds RSS nuevos estén disponibles
 * Verifica: Cubadebate, Juventud Rebelde, ACN, Infobae, RT y teleSUR
 */

import { XMLParser } from 'fast-xml-parser';
import { FUENTES_RSS } from '../src/config/fuentes-rss.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

const fuentesAVerificar = [
  'cubadebate.cu',
  'juventudrebelde.cu',
  'acn.cu',
  'infobae.com',
  'actualidad.rt.com',
  'telesurtv.net',
  'tribuna.cu',
];

async function verificarFeed(fuente) {
  try {
    const response = await fetch(fuente.feed, { timeout: 8000 });
    
    if (!response.ok) {
      return {
        dominio: fuente.dominio,
        nombre: fuente.nombre,
        status: 'error',
        statusCode: response.status,
        mensaje: `HTTP ${response.status}`,
      };
    }

    const texto = await response.text();
    const parsed = parser.parse(texto);
    const channel = parsed?.rss?.channel || parsed?.feed;
    
    if (!channel) {
      return {
        dominio: fuente.dominio,
        nombre: fuente.nombre,
        status: 'error',
        mensaje: 'No se reconoce formato RSS',
      };
    }

    const items = channel?.item || channel?.entry || [];
    const itemArray = Array.isArray(items) ? items : [items];
    
    return {
      dominio: fuente.dominio,
      nombre: fuente.nombre,
      status: 'ok',
      articulos: itemArray.length,
      titulo: typeof channel?.title === 'string' ? channel.title : '(sin título)',
    };
  } catch (error) {
    return {
      dominio: fuente.dominio,
      nombre: fuente.nombre,
      status: 'error',
      mensaje: error.message,
    };
  }
}

async function main() {
  console.log('\n=== Verificacion de Feeds RSS ===\n');
  
  const fuentes = FUENTES_RSS.filter((f) => fuentesAVerificar.includes(f.dominio));
  
  if (fuentes.length === 0) {
    console.error('No se encontraron fuentes para verificar');
    process.exit(1);
  }

  const resultados = await Promise.all(fuentes.map(verificarFeed));
  
  const exitosos = resultados.filter((r) => r.status === 'ok');
  const errores = resultados.filter((r) => r.status === 'error');

  console.log('RESULTADOS:');
  console.log('-----------\n');

  exitosos.forEach((r) => {
    console.log(`✓ ${r.nombre}`);
    console.log(`  Dominio: ${r.dominio}`);
    console.log(`  Artículos: ${r.articulos}`);
    console.log(`  Fuente: ${r.titulo}\n`);
  });

  if (errores.length > 0) {
    console.log('\nERRORES:');
    console.log('--------\n');
    errores.forEach((r) => {
      console.log(`✗ ${r.nombre}`);
      console.log(`  Dominio: ${r.dominio}`);
      console.log(`  Razón: ${r.mensaje}\n`);
    });
  }

  console.log('\nRESUMEN:');
  console.log(`Exitosos: ${exitosos.length}/${resultados.length}`);
  
  if (errores.length > 0) {
    console.log(`Errores: ${errores.length}`);
    process.exit(1);
  } else {
    console.log('\nTodos los feeds están disponibles!\n');
    process.exit(0);
  }
}

main();
