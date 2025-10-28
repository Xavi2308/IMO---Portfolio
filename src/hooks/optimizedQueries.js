// 🚀 SISTEMA DE FILTRADO REHECHO DESDE CERO - SIMPLE Y EFICIENTE v2
// Consultas optimizadas con filtrado inteligente universal

import supabase from '../supabaseClient';

// 📊 CONSULTA UNIVERSAL PARA STOCKVIEW 
export const getStockViewData = async (userId, companyId, { page = 1, pageSize = 50, filters = {}, sortConfig = {} }) => {
  // 🛡️ SEGURIDAD: Verificar que hay company_id
  if (!companyId) {
    throw new Error('company_id es requerido para consultas de productos');
  }

  // 🎯 CONSULTA BASE - Traer TODOS los datos necesarios CON FILTRO DE EMPRESA
  let query = supabase
    .from('products')
    .select(`
      id,
      reference,
      image_url,
      line,
      price_r,
      price_w,
      created_at,
      variations!inner (
        id,
        color,
        size,
        stock,
        barcode_code
      )
    `, { count: 'exact' })
    .eq('company_id', companyId); // 🛡️ FILTRO CRÍTICO POR EMPRESA

  // ✅ FILTRO SIMPLE POR LÍNEA (único filtro backend que funciona bien)
  if (filters.line && filters.line !== 'All') {
    query = query.eq('line', filters.line);
  }

  // 🔄 ORDENAMIENTO BACKEND
  if (sortConfig.reference && sortConfig.reference.direction) {
    query = query.order('reference', { 
      ascending: sortConfig.reference.direction === 'asc' 
    });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // 🚀 EJECUTAR CONSULTA
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ StockView - Error en consulta:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return {
      data: [],
      totalCount: 0,
      hasMore: false,
      currentPage: page,
      totalPages: 0
    };
  }

  // 🔄 PROCESAR Y AGRUPAR DATOS PARA STOCKVIEW
  const grouped = {};
  
  data.forEach(product => {
    if (!product.variations || product.variations.length === 0) return;
    
    product.variations.forEach(variation => {
      const key = `${product.reference}-${variation.color}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          product_id: product.id,
          reference: product.reference,
          image_url: product.image_url,
          line: product.line || 'Sin línea',
          color: variation.color,
          price_r: product.price_r,
          price_w: product.price_w,
          sizes: {},
          created_at: product.created_at
        };
      }
      
      // Agregar talla y stock al objeto sizes
      grouped[key].sizes[variation.size] = variation.stock || 0;
    });
  });

  const groupedItems = Object.values(grouped);

  // 🔍 FILTRO SIMPLE Y EFECTIVO - PALABRAS SEPARADAS  
  let filteredItems = groupedItems;
  
  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.trim().toLowerCase();
    
    // Dividir el término de búsqueda en palabras individuales
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);
    
    filteredItems = groupedItems.filter(item => {
      // Obtener los campos donde buscar (solo referencia y color)
      const reference = (item.reference || '').toLowerCase();
      const color = (item.color || '').toLowerCase();
      
      // Crear texto combinado para búsqueda
      const searchableText = `${reference} ${color}`;
      
      // Verificar que TODAS las palabras estén presentes
      const allWordsFound = searchWords.every(word => 
        searchableText.includes(word)
      );
      
      return allWordsFound;
    });
  }

  // 📄 PAGINACIÓN
  const totalFilteredCount = filteredItems.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  return {
    data: paginatedItems,
    totalCount: totalFilteredCount,
    hasMore: page < totalPages,
    currentPage: page,
    totalPages: totalPages
  };
};

// 📋 CONSULTA UNIVERSAL PARA SUBINVENTORY
export const getSubInventoryData = async (userId, companyId, { page = 1, pageSize = 50, filters = {}, sortConfig = {} }) => {
  // 🛡️ SEGURIDAD: Verificar que hay company_id
  if (!companyId) {
    throw new Error('company_id es requerido para consultas de subinventario');
  }

  // 🎯 CONSULTA BASE - Traer TODOS los datos necesarios CON FILTRO DE EMPRESA
  let query = supabase
    .from('products')
    .select(`
      id,
      reference,
      image_url,
      line,
      price_r,
      price_w,
      created_at,
      variations!inner (
        id,
        color,
        size,
        stock,
        barcode_code
      )
    `, { count: 'exact' })
    .eq('company_id', companyId); // 🛡️ FILTRO CRÍTICO POR EMPRESA

  // ✅ FILTRO SIMPLE POR LÍNEA
  if (filters.line && filters.line !== 'All') {
    query = query.eq('line', filters.line);
  }

  // 🔄 ORDENAMIENTO BACKEND
  if (sortConfig.reference && sortConfig.reference.direction) {
    query = query.order('reference', { 
      ascending: sortConfig.reference.direction === 'asc' 
    });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // 🚀 EJECUTAR CONSULTA
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ SubInventory - Error en consulta:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return {
      data: [],
      totalCount: 0,
      hasMore: false,
      currentPage: page,
      totalPages: 0
    };
  }

  // 🔄 PROCESAR Y AGRUPAR DATOS POR REFERENCIA-COLOR
  const grouped = {};
  
  data.forEach(product => {
    if (!product.variations || product.variations.length === 0) return;
    
    product.variations.forEach(variation => {
      const key = `${product.reference}-${variation.color}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          product_id: product.id,
          reference: product.reference,
          image_url: product.image_url,
          line: product.line || 'Sin línea',
          color: variation.color,
          price_r: product.price_r,
          price_w: product.price_w,
          sizes: {},
          variations: {},
          created_at: product.created_at
        };
      }
      
      // Agregar talla y stock
      grouped[key].sizes[variation.size] = variation.stock || 0;
      grouped[key].variations[variation.size] = {
        variation_id: variation.id,
        barcode: variation.barcode_code
      };
    });
  });

  const groupedItems = Object.values(grouped);

  // 🔍 FILTRO SIMPLE Y EFECTIVO - PALABRAS SEPARADAS
  let filteredItems = groupedItems;
  
  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.trim().toLowerCase();
    
    // Dividir el término de búsqueda en palabras individuales
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);
    
    filteredItems = groupedItems.filter(item => {
      // Obtener los campos donde buscar (solo referencia y color)
      const reference = (item.reference || '').toLowerCase();
      const color = (item.color || '').toLowerCase();
      
      // Crear texto combinado para búsqueda
      const searchableText = `${reference} ${color}`;
      
      // Verificar que TODAS las palabras estén presentes
      const allWordsFound = searchWords.every(word => 
        searchableText.includes(word)
      );
      
      return allWordsFound;
    });
  }

  // 📄 PAGINACIÓN
  const totalFilteredCount = filteredItems.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  return {
    data: paginatedItems,
    totalCount: totalFilteredCount,
    hasMore: page < totalPages,
    currentPage: page,
    totalPages: totalPages
  };
};

// 📊 CONSULTA PARA ESTADÍSTICAS GLOBALES DE SUBINVENTORY
export const getSubInventoryStats = async (userId) => {
  if (!userId) {
    console.warn('Usuario no autenticado para estadísticas');
    return {
      totalReferences: 0,
      totalPairs: 0,
      totalVariations: 0,
      avgPairsPerReference: 0
    };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        reference,
        variations!inner (
          stock
        )
      `);
    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        totalReferences: 0,
        totalPairs: 0,
        totalVariations: 0,
        avgPairsPerReference: 0
      };
    }

    let totalReferences = data.length;
    let totalPairs = 0;
    let totalVariations = 0;

    data.forEach(product => {
      if (product.variations && Array.isArray(product.variations)) {
        totalVariations += product.variations.length;
        const productStock = product.variations.reduce((sum, variation) => 
          sum + (variation.stock || 0), 0
        );
        totalPairs += productStock;
      }
    });

    const avgPairsPerReference = totalReferences > 0 
      ? Math.round(totalPairs / totalReferences) 
      : 0;

    return {
      totalReferences,
      totalPairs,
      totalVariations,
      avgPairsPerReference
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas SubInventory:', error);
    return {
      totalReferences: 0,
      totalPairs: 0,
      totalVariations: 0,
      avgPairsPerReference: 0
    };
  }
};

// 📊 CONSULTA PARA LÍNEAS DISPONIBLES (para filtros)
export const getAvailableLines = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('line')
      .not('line', 'is', null);
    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    // Obtener líneas únicas y filtrar valores válidos
    const uniqueLines = [...new Set(data.map(item => item.line))].filter(line => 
      line && line.trim() !== '' && line !== 'Sin línea'
    );

    return uniqueLines.sort();
  } catch (error) {
    console.error('Error obteniendo líneas disponibles:', error);
    return [];
  }
};

// 🏷️ ALIAS PARA COMPATIBILIDAD CON HOOKS EXISTENTES
export { getAvailableLines as getProductLines };

// 🏠 CONSULTA PARA HOME DASHBOARD DATA
export const getHomeDashboardData = async (userId, companyId) => {
  // 🛡️ SEGURIDAD: Verificar que hay company_id
  if (!companyId) {
    throw new Error('company_id es requerido para consultas de dashboard');
  }

  try {
    // 🎯 CONSULTAS PARALELAS PARA MÉTRICAS DEL DASHBOARD CON FILTRO DE EMPRESA
    const [productsCount, variationsCount, lowStockCount] = await Promise.all([
      // Total productos
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      
      // Total variaciones
      supabase.from('variations').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      
      // Stock bajo (menos de 5 unidades) TAMBIÉN CON FILTRO DE EMPRESA
      supabase.from('variations').select('id', { count: 'exact', head: true }).eq('company_id', companyId).lt('stock', 5)
    ]);

    return {
      totalProducts: productsCount.data?.length || productsCount.count || 0,
      totalVariations: variationsCount.data?.length || variationsCount.count || 0,
      lowStockItems: lowStockCount.data?.length || lowStockCount.count || 0
    };
  } catch (error) {
    console.error('Error obteniendo datos del dashboard:', error);
    return {
      totalProducts: 0,
      totalVariations: 0,
      lowStockItems: 0
    };
  }
};

// 🛒 CONSULTA PARA SALES DATA
export const getSalesData = async (userId, { startDate, endDate, page = 1, pageSize = 50 }) => {
  if (!userId) {
    throw new Error('Usuario no autenticado');
  }

  try {
    // 🎯 CONSULTA OPTIMIZADA PARA VENTAS
    let query = supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        discount,
        payment_method,
        created_at,
        customer_id,
        customers (
          name,
          document,
          phone
        ),
        sale_items (
          sizes,
          variations (
            color,
            size,
            products (
              reference
            )
          )
        )
      `, { count: 'exact' });

    // Filtros de fecha
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Ordenar por fecha más reciente
    query = query.order('created_at', { ascending: false });

    // Paginación
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    
    if (error) throw error;

    // Procesar datos para agregar columna de detalles de productos
    const processedData = data?.map(sale => {
      const productDetails = sale.sale_items?.map(item => {
        const variation = item.variations;
        const product = variation?.products;
        const sizes = item.sizes ? JSON.parse(item.sizes) : {};
        
        // Crear string de tallas: "36:2, 38:1"
        const sizesString = Object.entries(sizes)
          .filter(([size, qty]) => qty > 0)
          .map(([size, qty]) => `${size}:${qty}`)
          .join(', ');
        
        return `${product?.reference || 'N/A'}-${variation?.color || 'N/A'}${sizesString ? ' [' + sizesString + ']' : ''}`;
      }).join(' | ') || 'Sin productos';

      // Calcular total de pares
      const totalPares = sale.sale_items?.reduce((total, item) => {
        const sizes = item.sizes ? JSON.parse(item.sizes) : {};
        return total + Object.values(sizes).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
      }, 0) || 0;

      return {
        ...sale,
        productos_detalle: productDetails,
        total_pares: totalPares
      };
    }) || [];

    return {
      data: processedData,
      count: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
      currentPage: page
    };
  } catch (error) {
    console.error('Error obteniendo datos de ventas:', error);
    return {
      data: [],
      count: 0,
      totalPages: 0,
      currentPage: page
    };
  }
};

// 📦 CONSULTA PARA PRODUCTION DATA
export const getProductionData = async (userId, { page = 1, pageSize = 50 }) => {
  if (!userId) {
    throw new Error('Usuario no autenticado');
  }

  try {
    // 🎯 CONSULTA OPTIMIZADA PARA PRODUCCIÓN
    let query = supabase
      .from('movements')
      .select(`
        id,
        movement_type,
        quantity,
        created_at,
        variations (
          color,
          size,
          stock,
          products (
            reference,
            line
          )
        )
      `, { count: 'exact' });

    // Solo movimientos de producción
    query = query.in('movement_type', ['entrada', 'produccion']);

    // Ordenar por fecha más reciente
    query = query.order('created_at', { ascending: false });

    // Paginación
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    
    if (error) throw error;

    return {
      data: data || [],
      totalCount: count || 0,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('Error obteniendo datos de producción:', error);
    return {
      data: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 0
    };
  }
};
