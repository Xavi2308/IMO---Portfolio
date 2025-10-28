// 🎨 UTILIDADES DE COLORES PARA FILTRADO INTELIGENTE

export const commonColors = [
  // Colores básicos en español
  'negro', 'blanco', 'rojo', 'azul', 'verde', 'amarillo', 'rosa', 'morado',
  'naranja', 'gris', 'marrón', 'beige', 'nude', 'coral', 'turquesa', 'violeta',
  'dorado', 'plateado', 'fucsia', 'lima', 'navy', 'burgundy', 'khaki', 'salmon',
  'teal', 'ivory', 'tan', 'olive', 'maroon', 'aqua', 'cyan', 'magenta',
  // Colores básicos en inglés
  'brown', 'gray', 'grey', 'silver', 'gold', 'purple', 'orange', 'pink',
  'red', 'blue', 'green', 'yellow', 'black', 'white',
  // Variaciones y sinónimos comunes
  'azul marino', 'verde lima', 'rosa palo', 'gris plata', 'rojo vino',
  'azul cielo', 'verde agua', 'amarillo oro', 'marrón café', 'beige crema',
  // Términos de color específicos que aparecen en productos
  'wine', 'cream', 'sand', 'stone', 'earth', 'sky', 'mint', 'lemon',
  'cherry', 'plum', 'peach', 'lavender', 'mint', 'honey', 'camel',
  // Colores que pueden aparecer en productos de moda
  'denim', 'khaki', 'camel', 'mostaza', 'vino', 'crema', 'arena', 'piedra',
  // Colores adicionales comunes en bases de datos de productos
  'leopardo', 'animal', 'print', 'estampado', 'flores', 'floral',
  'rayas', 'cuadros', 'lunares', 'metalizado', 'brillante', 'mate',
  'pastel', 'neon', 'fluorescente', 'fosforescente'
];

/**
 * Detecta si una palabra parece ser un color usando estrategia SÚPER AMPLIA (incluye 2+ caracteres)
 * @param {string} word - La palabra a analizar
 * @returns {boolean} - True si podría ser un color
 */
export const isWordLikelyColor = (word) => {
  const term = word.toLowerCase().trim();
  
  // 1. Si está en la lista conocida
  if (commonColors.includes(term)) return true;
  
  // 2. NUEVA ESTRATEGIA ULTRA-AMPLIA: Si NO parece ser referencia/código, asumir que es color
  // Patrones que definitivamente NO son colores (más restrictivo = más colores detectados)
  const definitelyNotColor = [
    /^\d+$/,              // Solo números: "104", "566"
    /^[a-z]\d+$/i,        // Letra + números: "A104", "B566"  
    /^\d+[a-z]$/i,        // Números + letra: "104A", "566B"
    /^(talla|size|xl|xxl|xs|s|m|l)$/i, // Tallas
    /^(cm|mm|kg|gr|unidad|und|el|la|de|en|con|por|para|que|es|no|si)$/i, // Palabras comunes/artículos
  ];
  
  // CAMBIO CRÍTICO: Reducir mínimo a 2 caracteres para búsquedas como "ro", "ag", "mi"
  const isNotReference = !definitelyNotColor.some(pattern => pattern.test(term));
  const hasMinLength = term.length >= 2; // ✅ CAMBIADO DE 3 A 2 CARACTERES
  
  if (isNotReference && hasMinLength) {
    console.log(`🎨 ULTRA-BROAD COLOR DETECTION: "${term}" -> LIKELY COLOR (2+ chars, not a reference)`);
    return true;
  }
  
  // 3. Patrones adicionales que sugieren colores
  const colorPatterns = [
    /^(light|dark|bright|pale|deep|soft|vibrant|intense|pastel)/i,
    /(claro|oscuro|brillante|pastel|intenso|suave)$/i,
    /colored?|colou?red?$/i,
    /^(multi|bi|tri)-/i,
    /print$/i,
    /^metallic/i,
    /(ado|ada|oso|osa|ino|ina|ento|enta)$/i,
  ];
  
  if (colorPatterns.some(pattern => pattern.test(term))) {
    console.log(`🎨 PATTERN COLOR DETECTION: "${term}" -> LIKELY COLOR (matches pattern)`);
    return true;
  }
  
  return false;
};

/**
 * Detecta si un término de búsqueda parece ser un color puro o mixto (VERSIÓN SÚPER AMPLIA)
 * @param {string} searchTerm - El término de búsqueda
 * @returns {object} - Resultado de la detección con detalles
 */
export const analyzeSearchTerm = (searchTerm) => {
  const term = searchTerm.toLowerCase().trim();
  const words = term.split(/\s+/).filter(word => word.length > 0);
  
  console.log('🎨 Analyzing search term (BROAD MODE):', { searchTerm, term, words });
  
  // ESTRATEGIA SÚPER AMPLIA: Cualquier palabra que no sea claramente una referencia
  // se considera potencial color
  const colorWords = [];
  const nonColorWords = [];
  
  words.forEach(word => {
    // Patrones de referencias/códigos claros
    const isClearlyReference = /^\d+$/.test(word) ||           // Solo números
                              /^[a-z]\d+$/i.test(word) ||      // Letra + números  
                              /^\d+[a-z]$/i.test(word) ||      // Números + letra
                              /^(talla|size|xl|xxl|xs|s|m|l)$/i.test(word); // Tallas
    
    const isLikelyColor = isWordLikelyColor(word);
    
    // REGLA PRINCIPAL: Si no es claramente una referencia Y tiene 2+ chars, podría ser color
    if (!isClearlyReference && word.length >= 2) { // ✅ CAMBIADO DE 3 A 2 CARACTERES
      console.log(`🎨 ULTRA-BROAD ANALYSIS: "${word}" -> POTENTIAL COLOR (2+ chars, not a clear reference)`);
      colorWords.push(word);
    } else if (isClearlyReference) {
      console.log(`🔢 ULTRA-BROAD ANALYSIS: "${word}" -> REFERENCE (clear pattern match)`);
      nonColorWords.push(word);
    } else {
      // Solo palabras de 1 carácter van a non-color
      console.log(`❓ ULTRA-BROAD ANALYSIS: "${word}" -> NON-COLOR (1 char only)`);
      nonColorWords.push(word);
    }
  });
  
  const result = {
    isPureColor: colorWords.length > 0 && nonColorWords.length === 0,
    isMixedSearch: colorWords.length > 0 && nonColorWords.length > 0,
    hasColor: colorWords.length > 0,
    colorWords,
    nonColorWords,
    isReference: nonColorWords.some(word => /^\d/.test(word)) // Empieza con número
  };
  
  console.log('🎨 BROAD search analysis result:', result);
  return result;
};

/**
 * Detecta si un término de búsqueda parece ser un color (legacy para compatibilidad)
 * @param {string} searchTerm - El término de búsqueda
 * @returns {boolean} - True si parece ser una búsqueda de color puro
 */
export const isColorSearch = (searchTerm) => {
  const analysis = analyzeSearchTerm(searchTerm);
  return analysis.isPureColor;
};

/**
 * Función de análisis en tiempo real para aprender colores desconocidos
 * @param {Array} items - Lista de items disponibles
 * @param {string} searchTerm - Término buscado que no devolvió resultados
 * @returns {object} - Sugerencias de colores similares
 */
export const analyzeFailedColorSearch = (items, searchTerm) => {
  const term = searchTerm.toLowerCase().trim();
  
  console.log('🔍 Analyzing failed color search:', term);
  
  // Extraer todos los colores únicos de los items
  const allColors = [...new Set(items.map(item => (item.color || '').toLowerCase().trim()))]
    .filter(color => color.length > 0);
  
  console.log('📊 Available colors in dataset:', allColors);
  
  // Buscar colores similares (que contengan parte del término o viceversa)
  const similarColors = allColors.filter(color => {
    return color.includes(term) || 
           term.includes(color) ||
           color.split(' ').some(part => part.includes(term)) ||
           term.split(' ').some(part => color.includes(part));
  });
  
  console.log('🎯 Similar colors found:', similarColors);
  
  // Si no encontramos similares, buscar por distancia de caracteres (aproximación)
  const approximateColors = allColors.filter(color => {
    if (Math.abs(color.length - term.length) <= 2) {
      // Contar caracteres comunes
      let commonChars = 0;
      const minLength = Math.min(color.length, term.length);
      for (let i = 0; i < minLength; i++) {
        if (color[i] === term[i]) commonChars++;
      }
      return commonChars >= minLength * 0.6; // 60% de similitud
    }
    return false;
  });
  
  console.log('🔄 Approximate colors found:', approximateColors);
  
  return {
    searchTerm: term,
    allColors,
    similarColors,
    approximateColors,
    suggestions: [...new Set([...similarColors, ...approximateColors])].slice(0, 5)
  };
};

/**
 * Aplica filtrado inteligente con análisis avanzado de términos y detección dinámica
 * @param {Array} items - Lista de items a filtrar
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Array} - Items filtrados
 */
export const applyColorAwareFilter = (items, searchTerm) => {
  const term = searchTerm.toLowerCase().trim();
  const analysis = analyzeSearchTerm(term);
  
  console.log('🎨 applyColorAwareFilter - START (Enhanced):', {
    searchTerm,
    term,
    analysis,
    itemCount: items.length,
    sampleItems: items.slice(0, 3).map(item => ({ reference: item.reference, color: item.color }))
  });
  
  // NUEVA ESTRATEGIA: Si no detectamos colores con la lista estática,
  // intentemos detección dinámica basada en los datos actuales
  if (!analysis.hasColor && term.length >= 3) {
    const potentialColorMatches = items.filter(item => {
      const color = (item.color || '').toLowerCase();
      return color.includes(term) || term.includes(color);
    });
    
    // Si encontramos matches que sugieren que es un color, reclasificar
    if (potentialColorMatches.length > 0) {
      console.log('🎨 DYNAMIC COLOR DETECTION: Term might be a color based on data matches:', {
        term,
        matchesFound: potentialColorMatches.length,
        sampleMatches: potentialColorMatches.slice(0, 3).map(item => ({ reference: item.reference, color: item.color }))
      });
      
      // Reclasificar como búsqueda de color puro
      analysis.isPureColor = true;
      analysis.hasColor = true;
      analysis.colorWords = [term];
      analysis.isMixedSearch = false;
    }
  }
  
  const filteredItems = items.filter(item => {
    const reference = (item.reference || '').toLowerCase();
    const color = (item.color || '').toLowerCase().trim();
    const fullItem = `${reference} ${color}`;
    const fullItemReverse = `${color} ${reference}`;
    
    // CASO 1: Búsqueda mixta (ej: "104 rojo")
    if (analysis.isMixedSearch) {
      console.log('🔄 Processing mixed search for item:', { reference: item.reference, color: item.color });
      
      // Para búsquedas mixtas, verificar que TODAS las partes coincidan
      const referenceMatches = analysis.nonColorWords.every(word => reference.includes(word));
      const colorMatches = analysis.colorWords.every(colorWord => 
        color.includes(colorWord) || 
        color.split(' ').some(colorPart => colorPart.includes(colorWord)) ||
        colorWord.includes(color) // Para colores parciales
      );
      
      // También verificar matching en el item completo (más flexible)
      const fullItemMatch = fullItem.includes(term) || fullItemReverse.includes(term);
      
      const match = (referenceMatches && colorMatches) || fullItemMatch;
      
      if (match) {
        console.log('🎨 MIXED SEARCH MATCH:', {
          reference: item.reference,
          color: item.color,
          term,
          referenceMatches,
          colorMatches,
          fullItemMatch,
          analysis
        });
      }
      
      return match;
    }
    
    // CASO 2: Búsqueda de color puro (ej: "rojo", "ro", "ag") - ULTRA-MEJORADA
    if (analysis.isPureColor) {
      const strategies = {
        directColorMatch: color.includes(term),
        colorContainsTerm: term.includes(color) && color.length >= 2, // ✅ REDUCIDO DE 3 A 2
        colorPartsMatch: color.split(' ').some(colorPart => colorPart.includes(term)),
        termInColorParts: color.split(' ').some(colorPart => term.includes(colorPart) && colorPart.length >= 2),
        // Estrategias más agresivas para colores no reconocidos y búsquedas cortas
        partialColorMatch: term.length >= 2 && ( // ✅ REDUCIDO DE 4 A 2
          color.includes(term.substring(0, Math.max(2, term.length - 1))) ||
          color.includes(term.substring(1))
        ),
        reversePartialMatch: color.length >= 2 && ( // ✅ REDUCIDO DE 4 A 2
          term.includes(color.substring(0, Math.max(2, color.length - 1))) ||
          term.includes(color.substring(1))
        ),
        // NUEVA: Matching súper agresivo para búsquedas de 2 caracteres
        twoCharMatch: term.length === 2 && (
          color.startsWith(term) ||
          color.includes(term) ||
          color.split(' ').some(part => part.startsWith(term))
        ),
        referenceMatch: reference.includes(term),
        fullItemMatch: fullItem.includes(term),
        reverseItemMatch: fullItemReverse.includes(term),
        colorNoSpaces: color.replace(/\s+/g, '').includes(term.replace(/\s+/g, '')),
        termNoSpaces: term.replace(/\s+/g, '').includes(color.replace(/\s+/g, ''))
      };
      
      const match = Object.values(strategies).some(s => s);
      
      if (match) {
        console.log('🎨 ULTRA-ENHANCED COLOR MATCH FOUND:', {
          reference: item.reference,
          color: item.color,
          term,
          termLength: term.length,
          strategies,
          whichMatched: Object.entries(strategies).filter(([key, value]) => value).map(([key]) => key)
        });
      }
      
      return match;
    }
    
    // CASO 3: Búsqueda normal (sin colores detectados)
    // Usar la lógica existente para búsquedas regulares
    const searchWords = term.split(/\s+/).filter(word => word.length > 0);
    
    // Si es una sola palabra, buscar en referencia, color, o combinación completa
    if (searchWords.length === 1) {
      const word = searchWords[0];
      return reference.includes(word) || 
             color.includes(word) || 
             fullItem.includes(word);
    }
    
    // Si son múltiples palabras, verificar diferentes patrones
    if (searchWords.length > 1) {
      // Patrón 1: Todas las palabras deben estar presentes en el item completo
      const allWordsInFullItem = searchWords.every(word => fullItem.includes(word));
      
      // Patrón 2: Todas las palabras deben estar presentes en el item completo (orden inverso)
      const allWordsInReverseItem = searchWords.every(word => fullItemReverse.includes(word));
      
      // Patrón 3: Primera palabra en referencia, resto en color
      const firstInRef = reference.includes(searchWords[0]);
      const restInColor = searchWords.slice(1).every(word => color.includes(word));
      
      // Patrón 4: Primera palabra en color, resto en referencia
      const firstInColor = color.includes(searchWords[0]);
      const restInRef = searchWords.slice(1).every(word => reference.includes(word));
      
      // Patrón 5: Coincidencia exacta de la búsqueda completa
      const exactMatch = fullItem.includes(term) || fullItemReverse.includes(term);
      
      return allWordsInFullItem || allWordsInReverseItem || 
             (firstInRef && restInColor) || (firstInColor && restInRef) || 
             exactMatch;
    }
    
    return false;
  });
  
  console.log('🎨 applyColorAwareFilter - ENHANCED RESULT:', {
    originalCount: items.length,
    filteredCount: filteredItems.length,
    sampleResults: filteredItems.slice(0, 5).map(item => ({ reference: item.reference, color: item.color }))
  });
  
  // Si no hay resultados y parece ser una búsqueda de color O es una búsqueda corta (2+ chars), analizar colores disponibles
  if (filteredItems.length === 0 && (analysis.hasColor || term.length >= 2)) { // ✅ CAMBIADO DE 3 A 2 CARACTERES
    const colorAnalysis = analyzeFailedColorSearch(items, searchTerm);
    console.log('🚨 NO RESULTS - Color analysis suggests:', colorAnalysis.suggestions);
    
    // Reintentar con colores sugeridos si hay similares
    if (colorAnalysis.suggestions.length > 0) {
      console.log('🔄 RETRYING with similar colors...');
      
      const retryResults = items.filter(item => {
        const color = (item.color || '').toLowerCase().trim();
        const reference = (item.reference || '').toLowerCase();
        
        return colorAnalysis.suggestions.some(suggestion => 
          color.includes(suggestion) || 
          reference.includes(term) // Mantener coincidencias de referencia
        );
      });
      
      if (retryResults.length > 0) {
        console.log('✅ RETRY SUCCESSFUL - Found results with similar colors:', retryResults.length);
        return retryResults;
      }
    }
  }
  
  return filteredItems;
};
