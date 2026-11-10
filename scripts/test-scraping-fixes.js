#!/usr/bin/env node

/**
 * Script de testing para validar los fixes de scraping
 * Prueba las funciones de limpieza y división de párrafos
 */

// Simulamos las funciones de limpieza que se agregaron

const cleanPressLatinFirstParagraph = (text = '') => {
  const presensLatinPattern = /^[A-ZÁ][a-záéíóú\s'.-]*,\s*\d{1,2}\s+[A-Za-záéíóú]+\s*\([^)]*Prensa Latina[^)]*\)\s*/i;
  
  const paragraphs = text.split('\n\n');
  if (paragraphs.length === 0) return text;
  
  const firstParagraph = paragraphs[0];
  const cleanedFirst = firstParagraph.replace(presensLatinPattern, '').trim();
  
  if (cleanedFirst === firstParagraph.trim()) {
    return text;
  }
  
  const result = [cleanedFirst, ...paragraphs.slice(1)].join('\n\n');
  return result;
};

const splitRadioBayamoParagraphs = (text = '') => {
  const paragraphs = text.split('\n\n');
  
  if (paragraphs.length > 2) return text;
  if (text.length < 500) return text;
  
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÁ])/);
  
  const groupedParagraphs = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const paragraph = sentences.slice(i, i + 2).join(' ').trim();
    if (paragraph.length > 30) {
      groupedParagraphs.push(paragraph);
    }
  }
  
  if (groupedParagraphs.length > 1) {
    return groupedParagraphs.join('\n\n');
  }
  
  return text;
};

// Tests
console.log('\n========== PRUEBAS DE SCRAPING FIXES ==========\n');

// Test 1: Limpieza de Prensa Latina
console.log('TEST 1: Limpieza de prefijo Prensa Latina');
console.log('-'.repeat(50));

const presensLatinTest = `Ciudad de México, 24 feb (Prensa Latina) La presidenta de México, Claudia Sheinbaum, afirmó que...

El segundo párrafo continúa aquí con información adicional.

Tercer párrafo con más detalles del artículo.`;

const cleanedPresensLatin = cleanPressLatinFirstParagraph(presensLatinTest);
console.log('ENTRADA:\n', presensLatinTest.substring(0, 100) + '...\n');
console.log('SALIDA:\n', cleanedPresensLatin.substring(0, 100) + '...\n');

const hasDatePrefix = /^[A-ZÁ][a-záéíóú\s'.-]*,\s*\d{1,2}\s+[A-Za-záéíóú]+\s*\([^)]*Prensa Latina[^)]*\)/.test(cleanedPresensLatin);
console.log('✓ RESULTADO:', hasDatePrefix ? '❌ FALLO - Aún tiene prefijo' : '✓ ÉXITO - Prefijo removido\n');

// Test 2: División de párrafos Radio Bayamo
console.log('TEST 2: División de párrafos Radio Bayamo');
console.log('-'.repeat(50));

const radioBayamoTest = `El domingo, el primer ministro israelí, Benjamín Netanyahu, declaró abruptamente el fin del acuerdo de alto el fuego. Además, anunció la suspensión inmediata de toda la ayuda humanitaria para los 2,3 millones de habitantes del territorio palestino asediado, desatando una ola de indignación y condena a nivel mundial. El plan, que Israel afirma haber sido propuesto por el enviado especial de Estados Unidos, Steve Witkoff, busca presionar a HAMAS para que acepte una revisión del acuerdo. En respuesta, HAMAS condenó el domingo la suspensión de la ayuda humanitaria, calificándola de "crimen de guerra" y de violación flagrante del acuerdo. La decisión de Netanyahu de suspender la ayuda humanitaria es un chantaje despreciable, un crimen de guerra y un golpe flagrante contra el acuerdo de tregua.`;

const splitParagraphs = splitRadioBayamoParagraphs(radioBayamoTest);
const numParagraphs = splitParagraphs.split('\n\n').length;

console.log('ENTRADA: Texto monolítico de ' + radioBayamoTest.length + ' caracteres\n');
console.log('SALIDA: ' + numParagraphs + ' párrafos\n');
console.log('PRIMEROS PÁRRAFOS:\n');
splitParagraphs.split('\n\n').slice(0, 3).forEach((p, i) => {
  console.log(`  Párrafo ${i + 1}: ${p.substring(0, 80)}...`);
});

console.log('\n✓ RESULTADO:', numParagraphs > 1 ? '✓ ÉXITO - Dividido en ' + numParagraphs + ' párrafos' : '❌ FALLO - No se dividió\n');

// Test 3: Casos de no-aplicación
console.log('TEST 3: Casos de no-aplicación (fallback safety)');
console.log('-'.repeat(50));

const noChangeTest = `Este es un párrafo normal sin ningún prefijo especial.

Segundo párrafo del artículo.`;

const resultNoChange = cleanPressLatinFirstParagraph(noChangeTest);
console.log('Entrada sin prefijo Prensa Latina:');
console.log('  Input === Output:', noChangeTest === resultNoChange ? '✓ ÉXITO - Sin cambios' : '❌ FALLO - Modificado innecesariamente');

console.log('\nTexto muy corto para Radio Bayamo:');
const shortText = 'Este es un texto muy corto.';
const resultShort = splitRadioBayamoParagraphs(shortText);
console.log('  Input === Output:', shortText === resultShort ? '✓ ÉXITO - Sin cambios' : '❌ FALLO - Modificado innecesariamente');

console.log('\n========== FIN DE PRUEBAS ==========\n');
