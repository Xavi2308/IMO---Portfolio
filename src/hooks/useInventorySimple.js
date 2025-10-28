import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabase';

// Caché simple para evitar consultas repetidas
const cache = new Map();
const CACHE_TIME = 5 * 60 * 1000; // 5 minutos

// Circuit breaker para evitar loops infinitos de errores
const errorCount = new Map();
const MAX_ERRORS = 3;
const ERROR_RESET_TIME = 60 * 1000; // 1 minuto

// Hook simple para obtener inventario agrupado (sin React Query)
export const useInventoryGrouped = (userId, options = {}) => {
  const { page = 1, pageSize = 50, filters = {}, sortConfig = {} } = options;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estabilizar objetos para evitar re-renders
  const stableFilters = useMemo(() => filters, [JSON.stringify(filters)]);
  const stableSortConfig = useMemo(() => sortConfig, [JSON.stringify(sortConfig)]);
  
  // Crear clave de caché
  const cacheKey = useMemo(() => 
    `inventory-${userId}-${page}-${pageSize}-${JSON.stringify(stableFilters)}-${JSON.stringify(stableSortConfig)}`,
    [userId, page, pageSize, stableFilters, stableSortConfig]
  );
  
  const fetchData = useCallback(async () => {
    if (!userId) {
      console.log('⚠️ No hay userId, estableciendo datos vacíos');
      setData({ 
        data: [], 
        totalCount: 0, 
        totalPages: 0,
        currentPage: 1,
        hasMore: false 
      });
      setError(null);
      return;
    }

    // Circuit breaker: verificar si hay demasiados errores recientes
    const errorKey = `${userId}-${cacheKey}`;
    const errors = errorCount.get(errorKey) || { count: 0, lastError: 0 };
    
    if (errors.count >= MAX_ERRORS && Date.now() - errors.lastError < ERROR_RESET_TIME) {
      console.warn('🔴 Circuit breaker activado - demasiados errores recientes');
      setError('Demasiados errores recientes. Inténtalo de nuevo en un momento.');
      setIsLoading(false);
      return;
    }

    // Verificar caché primero
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
      console.log('✅ Usando datos desde caché');
      setData(cached.data);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Iniciando consulta de inventario para userId:', userId);
      
      // Consulta simplificada ULTRA SEGURA para obtener inventario
      let query = supabase
        .from('products')
        .select(`
          id,
          reference,
          image_url,
          price_r,
          price_w,
          line,
          variations (
            id,
            color,
            size,
            stock,
            created_at,
            created_by,
            barcode_code
          )
        `, { count: 'exact' });

      // Aplicar filtros
      if (filters.line && filters.line !== 'All') {
        query = query.eq('line', filters.line);
      }
      
      if (filters.search && filters.search.trim()) {
        query = query.ilike('reference', `%${filters.search.trim()}%`);
      }

      // Aplicar ordenamiento
      if (sortConfig.reference) {
        query = query.order('reference', { 
          ascending: sortConfig.reference.direction === 'asc' 
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Aplicar paginación
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      console.log('🔍 Ejecutando consulta con filtros:', { filters, sortConfig, from, to });
      const { data: products, error: queryError, count } = await query;

      if (queryError) {
        console.error('❌ Error en consulta Supabase:', queryError);
        throw queryError;
      }

      console.log('✅ Consulta exitosa, productos obtenidos:', products?.length, 'total:', count);

      if (!products || products.length === 0) {
        console.log('ℹ️ No se encontraron productos');
        setData({ data: [], totalCount: count || 0, hasMore: false });
        return;
      }

      // Agrupar productos por referencia y color
      const grouped = products.reduce((acc, product) => {
        if (!product.variations || !Array.isArray(product.variations) || product.variations.length === 0) return acc;
        
        product.variations.forEach(variation => {
          const key = `${product.reference}-${variation.color}`;
          if (!acc[key]) {
            acc[key] = {
              product_id: product.id,
              reference: product.reference,
              image_url: product.image_url,
              price_r: product.price_r,
              price_w: product.price_w,
              line: product.line || 'Sin línea',
              color: variation.color,
              sizes: {},
              variations: {},
              created_at: variation.created_at,
              created_by: variation.created_by,
            };
          }
          acc[key].sizes[variation.size] = variation.stock || 0;
          acc[key].variations[variation.size] = { 
            variation_id: variation.id, 
            barcode: variation.barcode_code 
          };
        });
        return acc;
      }, {});

      const items = Object.values(grouped);

      const resultData = {
        data: items,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page,
        hasMore: (page * pageSize) < (count || 0)
      };

      // Guardar en caché
      cache.set(cacheKey, {
        data: resultData,
        timestamp: Date.now()
      });

      // Reset del circuit breaker en caso de éxito
      const errorKey = `${userId}-${cacheKey}`;
      errorCount.delete(errorKey);

      setData(resultData);
    } catch (err) {
      console.error('❌ Error completo en useInventoryGrouped:', err);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error stack:', err.stack);
      
      // Actualizar circuit breaker
      const errorKey = `${userId}-${cacheKey}`;
      const errors = errorCount.get(errorKey) || { count: 0, lastError: 0 };
      errorCount.set(errorKey, {
        count: errors.count + 1,
        lastError: Date.now()
      });
      
      setError(err);
      
      // En caso de error, cargar datos vacíos para evitar loops
      setData({ 
        data: [], 
        totalCount: 0, 
        totalPages: 0,
        currentPage: 1,
        hasMore: false 
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, page, pageSize, stableFilters, stableSortConfig, cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    // Exponer datos de paginación
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
    currentPage: data?.currentPage || 1,
    hasMore: data?.hasMore || false
  };
};

// Hook simple para obtener líneas de productos
export const useProductLines = () => {
  const [data, setData] = useState(['All']);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const fetchLines = async () => {
      // Verificar caché primero
      const cached = cache.get('product-lines');
      if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
        console.log('✅ Usando líneas desde caché');
        setData(cached.data);
        return;
      }

      setIsLoading(true);
      try {
        console.log('🔍 Obteniendo líneas de productos...');
        const { data: lines, error } = await supabase
          .from('products')
          .select('line')
          .not('line', 'is', null);
          
        if (error) {
          console.error('❌ Error obteniendo líneas:', error);
          throw error;
        }
        
        console.log('✅ Líneas obtenidas:', lines?.length);
        const uniqueLines = ['All', ...new Set(lines.map(item => item.line).filter(Boolean))];
        
        // Guardar en caché
        cache.set('product-lines', {
          data: uniqueLines,
          timestamp: Date.now()
        });
        
        setData(uniqueLines);
      } catch (err) {
        console.error('❌ Error completo fetching product lines:', err);
        setData(['All']);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLines();
  }, []);
  
  return {
    data,
    isLoading
  };
};

// Hook simple para obtener productos del inventario (para SubInventoryManagement)
export const useInventoryProducts = (userId, options = {}) => {
  const { page = 1, pageSize = 50, filters = {}, sortConfig = {} } = options;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchData = async () => {
    if (!userId) {
      setError(new Error('Usuario no autenticado'));
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('products')
        .select(`
          id,
          reference,
          image_url,
          price_r,
          price_w,
          line,
          variations!inner (
            id,
            color,
            size,
            stock,
            barcode_code
          )
        `, { count: 'exact' });

      // Aplicar filtros
      if (filters.line && filters.line !== 'All') {
        query = query.eq('line', filters.line);
      }
      
      if (filters.search && filters.search.trim()) {
        query = query.ilike('reference', `%${filters.search.trim()}%`);
      }

      // Aplicar ordenamiento
      if (sortConfig.reference) {
        query = query.order('reference', { 
          ascending: sortConfig.reference.direction === 'asc' 
        });
      }

      // Aplicar paginación
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: products, error: queryError, count } = await query;

      if (queryError) throw queryError;

      setData({
        data: products || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasMore: (page * pageSize) < (count || 0)
      });
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, page, pageSize, JSON.stringify(filters), JSON.stringify(sortConfig)]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
};
