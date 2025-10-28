// 🧪 TEST RÁPIDO DE DETECCIÓN DE COLORES
import { isColorSearch } from '../utils/colorUtils.js';

// Casos de prueba
const testCases = [
  'rojo',
  'Rojo', 
  'ROJO',
  'azul',
  'negro',
  'verde',
  'naranja',
  '104', // no debería ser color
  'agave', // no debería ser color
  'rosa',
  'morado'
];

console.log('🧪 TESTING COLOR DETECTION:');
testCases.forEach(test => {
  const result = isColorSearch(test);
  console.log(`${test} -> ${result ? '✅ ES COLOR' : '❌ NO ES COLOR'}`);
});
