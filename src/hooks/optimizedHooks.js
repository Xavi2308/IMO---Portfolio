// 🚀 HOOKS OPTIMIZADOS CON REACT QUERY
// Hooks específicos que usan las consultas optimizadas

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getStockViewData, 
  getSubInventoryData, 
  getSubInventoryStats,
  getHomeDashboardData,
  getSalesData,
  getProductionData,
  getProductLines,
  getAvailableLines
} from './optimizedQueries';

// 🎯 HOOK OPTIMIZADO PARA STOCKVIEW
export const useOptimizedStockView = (user, page = 1, pageSize = 50, filters = {}, sortConfig = {}) => {
  return useQuery({
    queryKey: ['stockView', user?.id, page, pageSize, filters, sortConfig],
    queryFn: () => getStockViewData(user?.id, { page, pageSize, filters, sortConfig }),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos - muy agresivo para reducir requests
    cacheTime: 30 * 60 * 1000, // 30 minutos en cache - máxima persistencia
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // No refetch al montar si hay cache
    retry: 1, // Solo 1 reintento
    retryDelay: 2000
  });
};

// 🎯 HOOK OPTIMIZADO PARA SUBINVENTORY  
export const useOptimizedSubInventory = (user, page = 1, pageSize = 50, filters = {}, sortConfig = {}) => {
  return useQuery({
    queryKey: ['subInventory', user?.id, page, pageSize, filters, sortConfig],
    queryFn: () => getSubInventoryData(user?.id, { page, pageSize, filters, sortConfig }),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos - muy agresivo
    cacheTime: 30 * 60 * 1000, // 30 minutos en cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // No refetch al montar si hay cache
    retry: 1 // Solo 1 reintento
  });
};

// 📊 HOOK OPTIMIZADO PARA ESTADÍSTICAS GLOBALES DE SUBINVENTORY  
export const useOptimizedSubInventoryStats = (user) => {
  return useQuery({
    queryKey: ['subInventoryStats', user?.id],
    queryFn: () => getSubInventoryStats(user?.id),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos - estadísticas son menos críticas
    cacheTime: 30 * 60 * 1000, // 30 minutos en cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2
  });
};

// 🎯 HOOK OPTIMIZADO PARA HOME DASHBOARD
export const useOptimizedHomeDashboard = (user) => {
  return useQuery({
    queryKey: ['homeDashboard', user?.id],
    queryFn: () => getHomeDashboardData(user?.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos - métricas no cambian tan rápido
    cacheTime: 10 * 60 * 1000, // 10 minutos en cache
    refetchOnWindowFocus: false, // Desactivado para evitar refresh en Electron
    retry: 2
  });
};

// 🎯 HOOK OPTIMIZADO PARA SALES
export const useOptimizedSales = (user, startDate, endDate, page = 1, pageSize = 50) => {
  return useQuery({
    queryKey: ['sales', user?.id, startDate, endDate, page, pageSize],
    queryFn: () => getSalesData(user?.id, { startDate, endDate, page, pageSize }),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 segundos - ventas cambian frecuentemente
    cacheTime: 2 * 60 * 1000, // 2 minutos en cache
    refetchOnWindowFocus: false, // Desactivado para evitar refresh en Electron
    retry: 3
  });
};

// 🎯 HOOK OPTIMIZADO PARA PRODUCTION
export const useOptimizedProduction = (user, page = 1, pageSize = 50) => {
  return useQuery({
    queryKey: ['production', user?.id, page, pageSize],
    queryFn: () => getProductionData(user?.id, { page, pageSize }),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
    cacheTime: 5 * 60 * 1000, // 5 minutos en cache
    refetchOnWindowFocus: false,
    retry: 3
  });
};

// 🎯 HOOK OPTIMIZADO PARA PRODUCT LINES (CON CACHE)
export const useOptimizedProductLines = () => {
  return useQuery({
    queryKey: ['productLines'],
    queryFn: getProductLines,
    staleTime: 10 * 60 * 1000, // 10 minutos - líneas no cambian frecuentemente
    cacheTime: 30 * 60 * 1000, // 30 minutos en cache
    refetchOnWindowFocus: false,
    retry: 2
  });
};

// 🔄 HOOK PARA INVALIDAR CACHES RELACIONADOS
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  
  const invalidateStockData = () => {
    queryClient.invalidateQueries({ queryKey: ['stockView'] });
    queryClient.invalidateQueries({ queryKey: ['subInventory'] });
    queryClient.invalidateQueries({ queryKey: ['homeDashboard'] });
  };

  const invalidateSalesData = () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['homeDashboard'] });
  };

  const invalidateProductionData = () => {
    queryClient.invalidateQueries({ queryKey: ['production'] });
    queryClient.invalidateQueries({ queryKey: ['stockView'] });
    queryClient.invalidateQueries({ queryKey: ['homeDashboard'] });
  };

  const invalidateAllData = () => {
    queryClient.invalidateQueries();
  };

  return {
    invalidateStockData,
    invalidateSalesData,
    invalidateProductionData,
    invalidateAllData
  };
};

// 🎯 HOOK PARA PREFETCH DE DATOS CRÍTICOS
export const usePrefetchCriticalData = (user) => {
  const queryClient = useQueryClient();

  const prefetchHomeDashboard = () => {
    if (user?.id) {
      queryClient.prefetchQuery({
        queryKey: ['homeDashboard', user.id],
        queryFn: () => getHomeDashboardData(user.id),
        staleTime: 5 * 60 * 1000
      });
    }
  };

  const prefetchProductLines = () => {
    queryClient.prefetchQuery({
      queryKey: ['productLines'],
      queryFn: getProductLines,
      staleTime: 10 * 60 * 1000
    });
  };

  const prefetchStockView = (filters = {}) => {
    if (user?.id) {
      queryClient.prefetchQuery({
        queryKey: ['stockView', user.id, 1, 50, filters, {}],
        queryFn: () => getStockViewData(user.id, { page: 1, pageSize: 50, filters, sortConfig: {} }),
        staleTime: 2 * 60 * 1000
      });
    }
  };

  return {
    prefetchHomeDashboard,
    prefetchProductLines,
    prefetchStockView
  };
};
