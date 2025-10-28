// 🚀 SISTEMA DE FILTRADO REHECHO DESDE CERO - SIMPLE Y EFICIENTE
// Consultas optimizadas con filtrado inteligente universal

import supabase from '../supabaseClient';
import { trackSupabaseQuery } from '../utils/egressMonitor';

// 📊 CONSULTA UNIVERSAL PARA STOCKVIEW 
export const getStockViewData = async (userId, { page = 1, pageSize = 50, filters = {}, sortConfig = {} }) => {
  console.log('🔍 StockView - Iniciando consulta con filtros:', filters);
  
  // Verificar autenticación
  if (!userId) {
    console.warn('Usuario no autenticado, continuando con consulta pública');
  }

  // 🎯 CONSULTA BASE - Traer TODOS los datos necesarios sin filtros complejos en backend
  let query = supabase
    .from('products')
    .select(`
      id,
      reference,
      image_url,
      line,
      created_at,
      variations!inner (
        id,
        color,
        size,
        stock,
        barcode_code
      )
    `, { count: 'exact' });

  // ✅ FILTRO SIMPLE POR LÍNEA (único filtro backend que funciona bien)
  if (filters.line && filters.line !== 'All') {
    query = query.eq('line', filters.line);
    console.log('🏷️ StockView - Filtro por línea aplicado:', filters.line);
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
  const result = await trackSupabaseQuery(query, 'getStockViewData');
  const { data, error } = result;
  
  if (error) {
    console.error('❌ StockView - Error en consulta:', error);
    throw error;
  }

  console.log('📊 StockView - Datos obtenidos:', {
    totalProducts: data?.length || 0,
    firstProduct: data?.[0]?.reference,
    variationsPerProduct: data?.[0]?.variations?.length || 0
  });

  if (!data || data.length === 0) {
    return {
      data: [],
      totalCount: 0,
      hasMore: false,
      currentPage: page,
      totalPages: 0
    };
  }

  // 🔄 PROCESAR Y AGRUPAR DATOS
  const groupedItems = [];
  
  data.forEach(product => {
    if (!product.variations || product.variations.length === 0) return;
    
    product.variations.forEach(variation => {
      groupedItems.push({
        product_id: product.id,
        reference: product.reference,
        image_url: product.image_url,
        line: product.line || 'Sin línea',
        color: variation.color,
        size: variation.size,
        stock: variation.stock || 0,
        variation_id: variation.id,
        barcode: variation.barcode_code,
        created_at: product.created_at
      });
    });
  });

  console.log('🔄 StockView - Items procesados:', groupedItems.length);

  // 🎯 FILTRADO INTELIGENTE EN FRONTEND
  let filteredItems = groupedItems;
  
  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.trim().toLowerCase();
    console.log('🔍 StockView - Aplicando filtro de búsqueda:', searchTerm);
    
    filteredItems = groupedItems.filter(item => {
      // Buscar en referencia
      const matchReference = item.reference && item.reference.toLowerCase().includes(searchTerm);
      
      // Buscar en color  
      const matchColor = item.color && item.color.toLowerCase().includes(searchTerm);
      
      // Buscar en línea
      const matchLine = item.line && item.line.toLowerCase().includes(searchTerm);
      
      // Buscar en código de barras
      const matchBarcode = item.barcode && item.barcode.toLowerCase().includes(searchTerm);
      
      const found = matchReference || matchColor || matchLine || matchBarcode;
      
      if (found) {
        console.log(`✅ StockView - Match encontrado: ${item.reference} ${item.color} para "${searchTerm}"`);
      }
      
      return found;
    });
    
    console.log(`🎯 StockView - Filtrado completado: ${filteredItems.length}/${groupedItems.length} items`);
  }

  // 🔢 APLICAR ORDENAMIENTO FRONTEND (si es necesario)
  if (sortConfig.color && sortConfig.color.direction) {
    filteredItems.sort((a, b) => {
      const comparison = (a.color || '').localeCompare(b.color || '');
      return sortConfig.color.direction === 'asc' ? comparison : -comparison;
    });
  }

  // 📄 PAGINACIÓN
  const totalFilteredCount = filteredItems.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  console.log(`📄 StockView - Paginación: página ${page}/${totalPages}, mostrando ${paginatedItems.length} items`);

  return {
    data: paginatedItems,
    totalCount: totalFilteredCount,
    hasMore: page < totalPages,
    currentPage: page,
    totalPages: totalPages
  };
};

// 📋 CONSULTA UNIVERSAL PARA SUBINVENTORY
export const getSubInventoryData = async (userId, { page = 1, pageSize = 50, filters = {}, sortConfig = {} }) => {
  console.log('🔍 SubInventory - Iniciando consulta con filtros:', filters);
  
  // Verificar autenticación
  if (!userId) {
    console.warn('Usuario no autenticado, continuando con consulta pública');
  }

  // 🎯 CONSULTA BASE - Traer TODOS los datos necesarios
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
    `, { count: 'exact' });

  // ✅ FILTRO SIMPLE POR LÍNEA
  if (filters.line && filters.line !== 'All') {
    query = query.eq('line', filters.line);
    console.log('🏷️ SubInventory - Filtro por línea aplicado:', filters.line);
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
  const result = await trackSupabaseQuery(query, 'getSubInventoryData');
  const { data, error } = result;
  
  if (error) {
    console.error('❌ SubInventory - Error en consulta:', error);
    throw error;
  }

  console.log('📊 SubInventory - Datos obtenidos:', {
    totalProducts: data?.length || 0,
    firstProduct: data?.[0]?.reference,
    variationsPerProduct: data?.[0]?.variations?.length || 0
  });

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
  console.log('🔄 SubInventory - Items agrupados:', groupedItems.length);

  // 🎯 FILTRADO INTELIGENTE EN FRONTEND
  let filteredItems = groupedItems;
  
  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.trim().toLowerCase();
    console.log('🔍 SubInventory - Aplicando filtro de búsqueda:', searchTerm);
    
    filteredItems = groupedItems.filter(item => {
      // Buscar en referencia
      const matchReference = item.reference && item.reference.toLowerCase().includes(searchTerm);
      
      // Buscar en color
      const matchColor = item.color && item.color.toLowerCase().includes(searchTerm);
      
      // Buscar en línea
      const matchLine = item.line && item.line.toLowerCase().includes(searchTerm);
      
      const found = matchReference || matchColor || matchLine;
      
      if (found) {
        console.log(`✅ SubInventory - Match encontrado: ${item.reference} ${item.color} para "${searchTerm}"`);
      }
      
      return found;
    });
    
    console.log(`🎯 SubInventory - Filtrado completado: ${filteredItems.length}/${groupedItems.length} items`);
  }

  // 🔢 APLICAR ORDENAMIENTO FRONTEND
  if (sortConfig.color && sortConfig.color.direction) {
    filteredItems.sort((a, b) => {
      const comparison = (a.color || '').localeCompare(b.color || '');
      return sortConfig.color.direction === 'asc' ? comparison : -comparison;
    });
  }

  // 📄 PAGINACIÓN
  const totalFilteredCount = filteredItems.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  console.log(`📄 SubInventory - Paginación: página ${page}/${totalPages}, mostrando ${paginatedItems.length} items`);

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
    return null;
  }

  try {
    const result = await trackSupabaseQuery(
      supabase
        .from('products')
        .select(`
          id,
          variations!inner (
            stock
          )
        `),
      'getSubInventoryStats'
    );

    const { data, error } = result;
    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        totalProducts: 0,
        totalStock: 0,
        lowStockProducts: 0
      };
    }

    let totalProducts = data.length;
    let totalStock = 0;
    let lowStockProducts = 0;

    data.forEach(product => {
      if (product.variations && Array.isArray(product.variations)) {
        const productStock = product.variations.reduce((sum, variation) => 
          sum + (variation.stock || 0), 0
        );
        totalStock += productStock;
        if (productStock <= 5) lowStockProducts++;
      }
    });

    return {
      totalProducts,
      totalStock,
      lowStockProducts
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas SubInventory:', error);
    return null;
  }
};

// 📊 CONSULTA PARA LÍNEAS DISPONIBLES (para filtros)
export const getAvailableLines = async () => {
  try {
    const result = await trackSupabaseQuery(
      supabase
        .from('products')
        .select('line')
        .not('line', 'is', null),
      'getAvailableLines'
    );

    const { data, error } = result;
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
