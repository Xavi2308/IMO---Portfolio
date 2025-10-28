// 🚀 HOOKS ULTRA-OPTIMIZADOS CON CACHE HÍBRIDO
// Reducción drástica de egress manteniendo performance y seguridad

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hybridCache, createOptimizedQuery } from '../utils/hybridCache';
import { 
  getStockViewData, 
  getSubInventoryData, 
  getSubInventoryStats,
  getHomeDashboardData,
  getSalesData,
  getProductionData,
  getProductLines,
  getAvailableLines,
  getAllReferencesData
} from './optimizedQueries';

// 🎯 HOOK ULTRA-OPTIMIZADO PARA STOCKVIEW
export const useUltraOptimizedStockView = (user, page = 1, pageSize = 50, filters = {}, sortConfig = {}) => {
  const queryKey = ['stockView', user?.id, page, pageSize, filters, sortConfig];
  const cacheKey = `stockView_${user?.id}_${page}_${pageSize}_${JSON.stringify(filters)}_${JSON.stringify(sortConfig)}`;
  
  return useQuery(
    createOptimizedQuery(
      queryKey,
      () => getStockViewData(user?.id, { page, pageSize, filters, sortConfig }),
      'INVENTORY',
      {
        enabled: !!user?.id,
        retry: 1,
        retryDelay: 2000,
        // Cache específico: más tiempo para datos de inventario
        staleTime: 15 * 60 * 1000, // 15 minutos
        gcTime: 45 * 60 * 1000,   // 45 minutos
      }
    )
  );
};

// 🔍 HOOK ULTRA-OPTIMIZADO PARA TODAS LAS REFERENCIAS (CACHE AGRESIVO)
export const useUltraOptimizedAllReferences = (user) => {
  const queryKey = ['allReferences', user?.id];
  
  return useQuery(
    createOptimizedQuery(
      queryKey,
      () => getAllReferencesData(user?.id),
      'STATIC', // Referencias cambian poco - cache más agresivo
      {
        enabled: !!user?.id,
        retry: 2,
        // Cache muy agresivo: las referencias no cambian frecuentemente
        staleTime: 60 * 60 * 1000, // 1 hora
        gcTime: 4 * 60 * 60 * 1000, // 4 horas
      }
    )
  );
};

// 🎯 HOOK ULTRA-OPTIMIZADO PARA SUBINVENTORY
export const useUltraOptimizedSubInventory = (user, page = 1, pageSize = 50, filters = {}, sortConfig = {}) => {
  const queryKey = ['subInventory', user?.id, page, pageSize, filters, sortConfig];
  
  return useQuery(
    createOptimizedQuery(
      queryKey,
      () => getSubInventoryData(user?.id, { page, pageSize, filters, sortConfig }),
      'INVENTORY',
      {
        enabled: !!user?.id,
        retry: 1
      }
    )
  );
};

// 📊 HOOK ULTRA-OPTIMIZADO PARA ESTADÍSTICAS (CACHE PREDICTIVO)
export const useUltraOptimizedSubInventoryStats = (user) => {
  const queryKey = ['subInventoryStats', user?.id];
  
  return useQuery(
    createOptimizedQuery(
      queryKey,
      () => getSubInventoryStats(user?.id),
      'DASHBOARD', // Estadísticas para dashboard
      {
        enabled: !!user?.id,
        retry: 2
      }
    )
  );
};

// 🏠 HOOK ULTRA-OPTIMIZADO PARA HOME DASHBOARD (CACHE PREDICTIVO)
export const useUltraOptimizedHomeDashboard = (user) => {
  const queryKey = ['homeDashboard', user?.id];
  
  return useQuery(
    createOptimizedQuery(
      queryKey,
      () => getHomeDashboardData(user?.id),
      'DASHBOARD',
      {
        enabled: !!user?.id,
        retry: 2,
        // Desactivado para evitar refresh en Electron
        refetchOnWindowFocus: false
      }
    )
  );
};

// 💰 HOOK ULTRA-OPTIMIZADO PARA SALES (BALANCE ENTRE FRESHNESS Y CACHE)
export const useUltraOptimizedSales = (user, startDate, endDate, page = 1, pageSize = 50) => {
  const queryKey = ['sales', user?.id, startDate, endDate, page, pageSize];
  
  return useQuery(
    createOptimizedQuery(
      queryKey,
      () => getSalesData(user?.id, { startDate, endDate, page, pageSize }),
      'SALES',
      {
        enabled: !!user?.id,
        retry: 3,
        // Desactivado para evitar refresh en Electron
        refetchOnWindowFocus: false
      }
    )
  );
};

// 🏭 HOOK ULTRA-OPTIMIZADO PARA PRODUCTION
export const useUltraOptimizedProduction = (user, page = 1, pageSize = 50) => {
  const queryKey = ['production', user?.id, page, pageSize];
  
  return useQuery(
    createOptimizedQuery(
      queryKey,
      () => getProductionData(user?.id, { page, pageSize }),
      'INVENTORY',
      {
        enabled: !!user?.id,
        retry: 3
      }
    )
  );
};

// 📋 HOOK ULTRA-OPTIMIZADO PARA PRODUCT LINES (CACHE MUY AGRESIVO)
export const useUltraOptimizedProductLines = () => {
  const queryKey = ['productLines'];
  
  return useQuery(
    createOptimizedQuery(
      queryKey,
      () => getProductLines(),
      'STATIC', // Las líneas de productos casi nunca cambian
      {
        retry: 2,
        // Cache extremadamente agresivo
        staleTime: 24 * 60 * 60 * 1000, // 24 horas
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 días
      }
    )
  );
};

// 🚀 SISTEMA DE PREFETCH INTELIGENTE
export const usePrefetchManager = () => {
  const queryClient = useQueryClient();
  
  const prefetchStockView = async (user, filters = {}, sortConfig = {}) => {
    const queryKey = ['stockView', user?.id, 1, 50, filters, sortConfig];
    
    // Solo prefetch si no está en cache
    const cached = await hybridCache.get(`stockView_${user?.id}_1_50_${JSON.stringify(filters)}_${JSON.stringify(sortConfig)}`, 'INVENTORY');
    if (cached === null) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn: () => getStockViewData(user?.id, { page: 1, pageSize: 50, filters, sortConfig }),
        staleTime: 15 * 60 * 1000
      });
    }
  };

  const prefetchHomeDashboard = async (user) => {
    const queryKey = ['homeDashboard', user?.id];
    
    const cached = await hybridCache.get(`homeDashboard_${user?.id}`, 'DASHBOARD');
    if (cached === null) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn: () => getHomeDashboardData(user?.id),
        staleTime: 5 * 60 * 1000
      });
    }
  };

  const prefetchProductLines = async () => {
    const queryKey = ['productLines'];
    
    const cached = await hybridCache.get('productLines', 'STATIC');
    if (cached === null) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn: () => getProductLines(),
        staleTime: 24 * 60 * 60 * 1000
      });
    }
  };

  const prefetchAllReferences = async (user) => {
    const queryKey = ['allReferences', user?.id];
    
    const cached = await hybridCache.get(`allReferences_${user?.id}`, 'STATIC');
    if (cached === null) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn: () => getAllReferencesData(user?.id),
        staleTime: 60 * 60 * 1000
      });
    }
  };

  return {
    prefetchStockView,
    prefetchHomeDashboard,
    prefetchProductLines,
    prefetchAllReferences
  };
};

// 🧹 HOOK PARA GESTIÓN DE CACHE
export const useCacheManager = () => {
  const queryClient = useQueryClient();

  const clearAllCache = () => {
    hybridCache.clear();
    queryClient.clear();
    console.log('🧹 Todo el cache ha sido limpiado');
  };

  const invalidateInventory = () => {
    hybridCache.invalidatePattern('stockView|inventory|allReferences');
    queryClient.invalidateQueries({ queryKey: ['stockView'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['allReferences'] });
  };

  const invalidateSales = () => {
    hybridCache.invalidatePattern('sales');
    queryClient.invalidateQueries({ queryKey: ['sales'] });
  };

  const invalidateDashboard = () => {
    hybridCache.invalidatePattern('dashboard|stats');
    queryClient.invalidateQueries({ queryKey: ['homeDashboard'] });
    queryClient.invalidateQueries({ queryKey: ['subInventoryStats'] });
  };

  const getCacheStats = () => {
    return hybridCache.getStats();
  };

  return {
    clearAllCache,
    invalidateInventory,
    invalidateSales,
    invalidateDashboard,
    getCacheStats
  };
};
