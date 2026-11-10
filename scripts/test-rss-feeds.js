#!/usr/bin/env node

/**
 * Script para validar que los feeds RSS están disponibles y retornan contenido
 */

import { FUENTES_RSS } from '../src/config/fuentes-rss.js';
import { fetchFeed } from '../api/rss.js';

console.log('\n========== VALIDACIÓN DE FEEDS RSS ==========\n');

const validarFeed = async (fuente) => {
  try {
    console.log(`\nValidando: ${fuente.nombre} (${fuente.dominio})`);
    console.log(`Feed: ${fuente.feed.substring(0, 60)}...`);
    
    const resultado = await fetchFeed(fuente.feed, {
      excludePatterns: fuente.excludePatterns || [],
    });
    
    const numResultados = (resultado.results || []).length;
    
    if (numResultados === 0) {
      console.log(`❌ SIN RESULTADOS - El feed no retorna contenido`);
      return false;
    }
    
    // Mostrar primeras noticias
    console.log(`✓ ÉXITO - ${numResultados} artículos encontrados`);
    
    resultado.results.slice(0, 2).forEach((art, i) => {
      console.log(`  ${i + 1}. ${art.title.substring(0, 70)}...`);
      console.log(`     URL: ${art.link.substring(0, 70)}...`);
    });
    
    return true;
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}`);
    return false;
  }
};

const ejecutar = async () => {
  let exitosos = 0;
  let fallos = 0;
  
  for (const fuente of FUENTES_RSS) {
    const resultado = await validarFeed(fuente);
    if (resultado) {
      exitosos++;
    } else {
      fallos++;
    }
    // Pequeño delay para no sobrecargar servidores
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n========== RESUMEN ==========');
  console.log(`✓ Exitosos: ${exitosos}`);
  console.log(`❌ Fallidos: ${fallos}`);
  console.log(`Total: ${FUENTES_RSS.length}\n`);
  
  process.exit(fallos > 0 ? 1 : 0);
};

ejecutar();
