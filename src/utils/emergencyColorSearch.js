// 🚨 FUNCIÓN DE EMERGENCIA PARA COLORES NO RECONOCIDOS
// Esta función se ejecuta cuando el filtrado normal no encuentra resultados

import supabase from '../supabaseClient.js';
import { analyzeSearchTerm } from './colorUtils.js';

/**
 * Búsqueda de emergencia para colores que no fueron encontrados con el filtro normal
 * @param {string} searchTerm - El término de búsqueda original
 * @param {string} userId - ID del usuario (para mantener consistencia)
 * @returns {Array} - Resultados encontrados o array vacío
 */
export const emergencyColorSearch = async (searchTerm, userId = null) => {
  const analysis = analyzeSearchTerm(searchTerm);
  
  console.log('🚨 EMERGENCY COLOR SEARCH activated for:', searchTerm, analysis);
  
  // Solo para búsquedas que parecen ser colores O búsquedas cortas de 2+ caracteres
  if (!analysis.hasColor && searchTerm.trim().length < 2) {
    console.log('❌ Emergency search: Too short and not detected as color, aborting');
    return [];
  }
  
  try {
    console.log('🔄 Emergency search: Fetching ALL data for color analysis...');
    
    // Traer TODOS los productos (limitado para rendimiento) para análisis frontend
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        reference,
        image_url,
        price_w,
        line,
        variations!inner (
          id,
          color,
          size,
          stock,
          barcode_code
        )
      `)
      .limit(500); // Limitar para rendimiento pero traer muchos más datos
    
    if (error) {
      console.error('❌ Emergency search error:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('❌ Emergency search: No data found');
      return [];
    }
    
    console.log(`🔄 Emergency search: Analyzing ${data.length} products...`);
    
    // Procesar y agrupar como hace la función normal
    const grouped = data.reduce((acc, product) => {
      if (!product.variations || !Array.isArray(product.variations) || product.variations.length === 0) return acc;

      product.variations.forEach(variation => {
        const key = `${product.reference}-${variation.color}`;
        if (!acc[key]) {
          acc[key] = {
            product_id: product.id,
            reference: product.reference,
            image_url: product.image_url,
            price_w: product.price_w,
            line: product.line || 'Sin línea',
            color: variation.color,
            sizes: {},
            created_at: variation.created_at,
          };
        }
        acc[key].sizes[variation.size] = variation.stock || 0;
      });
      return acc;
    }, {});

    const items = Object.values(grouped);
    
    console.log(`🔄 Emergency search: Grouped into ${items.length} items, now filtering...`);
    
    // Filtrado MUY AMPLIO para el término de búsqueda
    const term = searchTerm.toLowerCase().trim();
    const matches = items.filter(item => {
      const reference = (item.reference || '').toLowerCase();
      const color = (item.color || '').toLowerCase().trim();
      const fullItem = `${reference} ${color}`;
      
      // Estrategias súper amplias
      return color.includes(term) || 
             term.includes(color) ||
             color.split(' ').some(part => part.includes(term)) ||
             color.split(' ').some(part => term.includes(part)) ||
             fullItem.includes(term) ||
             // Matching difuso para términos similares
             (term.length >= 4 && color.length >= 4 && (
               color.includes(term.substring(0, term.length - 1)) ||
               color.includes(term.substring(1)) ||
               term.includes(color.substring(0, color.length - 1)) ||
               term.includes(color.substring(1))
             ));
    });
    
    console.log(`✅ Emergency search: Found ${matches.length} matches`);
    console.log('🎯 Emergency search sample results:', 
      matches.slice(0, 5).map(item => ({ reference: item.reference, color: item.color }))
    );
    
    return matches;
    
  } catch (error) {
    console.error('❌ Emergency search failed:', error);
    return [];
  }
};

export default emergencyColorSearch;
