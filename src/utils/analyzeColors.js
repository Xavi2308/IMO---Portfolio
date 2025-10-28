// 🔍 DEBUG: Analizador de colores en datos reales
// Este archivo te ayudará a ver qué colores están presentes en tu base de datos

import supabase from '../supabaseClient.js';

const analyzeColorsInDatabase = async () => {
  console.log('🔍 Analizando colores en la base de datos...');
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        reference,
        variations!inner (
          color
        )
      `)
      .limit(100); // Tomar una muestra
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    const colorsFound = new Set();
    const colorPatterns = new Map(); // Para contar frecuencias
    
    data.forEach(product => {
      if (product.variations) {
        product.variations.forEach(variation => {
          if (variation.color) {
            const color = variation.color.toLowerCase().trim();
            colorsFound.add(color);
            
            // Contar frecuencia
            colorPatterns.set(color, (colorPatterns.get(color) || 0) + 1);
          }
        });
      }
    });
    
    console.log('🎨 COLORES ENCONTRADOS EN LA BASE DE DATOS:');
    console.log('Total de colores únicos:', colorsFound.size);
    console.log('\n📊 COLORES MÁS COMUNES:');
    
    // Ordenar por frecuencia
    const sortedColors = Array.from(colorPatterns.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20);
    
    sortedColors.forEach(([color, count]) => {
      console.log(`${color} (${count} veces)`);
    });
    
    console.log('\n🔤 TODOS LOS COLORES ÚNICOS:');
    Array.from(colorsFound).sort().forEach(color => {
      console.log(`"${color}",`);
    });
    
    return Array.from(colorsFound);
    
  } catch (error) {
    console.error('❌ Error al analizar colores:', error);
  }
};

// Ejecutar análisis
// analyzeColorsInDatabase();

export default analyzeColorsInDatabase;
