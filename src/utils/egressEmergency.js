// 🚨 PLAN DE EMERGENCIA PARA REDUCIR EGRESS SUPABASE
// Optimizaciones específicas basadas en el análisis de egress monitor

import { queryClient } from '../queryClient';
import { hybridCache } from './hybridCache';

// 🎯 CONFIGURACIONES ULTRA-AGRESIVAS PARA REDUCIR EGRESS
export const EGRESS_REDUCTION_CONFIG = {
  // Queries más problemáticas identificadas
  CRITICAL_QUERIES: {
    'getSubInventoryData': {
      staleTime: 60 * 60 * 1000, // 1 HORA - Era el query más costoso
      gcTime: 4 * 60 * 60 * 1000, // 4 horas en memoria
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    'getStockViewData': {
      staleTime: 45 * 60 * 1000, // 45 MINUTOS - Segundo más costoso
      gcTime: 3 * 60 * 60 * 1000, // 3 horas en memoria  
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    'getAllReferencesData': {
      staleTime: 24 * 60 * 60 * 1000, // 24 HORAS - Datos casi estáticos
      gcTime: 48 * 60 * 60 * 1000, // 2 días en memoria
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    'getSubInventoryStats': {
      staleTime: 30 * 60 * 1000, // 30 minutos
      gcTime: 2 * 60 * 60 * 1000, // 2 horas
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  }
};

// 🛑 FUNCIÓN DE EMERGENCIA: Aplicar configuración anti-egress
export const applyEgressReductionConfig = () => {
  console.log('🚨 APLICANDO CONFIGURACIÓN DE EMERGENCIA ANTI-EGRESS');
  
  // Configurar React Query con valores ultra-conservadores
  const defaultConfig = {
    staleTime: 30 * 60 * 1000, // 30 minutos mínimo
    gcTime: 2 * 60 * 60 * 1000, // 2 horas mínimo
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: 0, // No reintentos automáticos
  };

  // Aplicar a queries existentes
  Object.entries(EGRESS_REDUCTION_CONFIG.CRITICAL_QUERIES).forEach(([queryKey, config]) => {
    queryClient.setQueryDefaults([queryKey], config);
    console.log(`✅ Configuración anti-egress aplicada a: ${queryKey}`);
  });

  return defaultConfig;
};

// 📊 MONITOR DE EGRESS MEJORADO
export const trackEgressReduction = () => {
  const beforeOptimization = {
    getSubInventoryData: 375.71, // KB
    getStockViewData: 375.71,
    getAllReferencesData: 229.1,
    getSubInventoryStats: 51.7,
    getAvailableLines: 7.07
  };

  const getEgressSavings = () => {
    const queries = queryClient.getQueryCache().getAll();
    const savings = {
      totalQueries: queries.length,
      cachedQueries: queries.filter(q => q.state.data && !q.isStale()).length,
      estimatedSavings: 0
    };

    // Calcular ahorros estimados
    queries.forEach(query => {
      const queryKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
      if (beforeOptimization[queryKey] && !query.isStale()) {
        savings.estimatedSavings += beforeOptimization[queryKey];
      }
    });

    return savings;
  };

  return { getEgressSavings };
};

// 🔧 UTILS PARA GESTIÓN MANUAL DE CACHE
export const emergencyCacheManagement = {
  // Limpiar solo queries específicas problemáticas
  clearProblematicQueries: () => {
    console.log('🧹 Limpiando queries problemáticas...');
    queryClient.removeQueries({ queryKey: ['getSubInventoryData'] });
    queryClient.removeQueries({ queryKey: ['getStockViewData'] });
    console.log('✅ Queries problemáticas limpiadas');
  },

  // Prefetch manual solo cuando sea necesario
  prefetchCriticalData: async (user) => {
    if (!user?.id) return;
    
    console.log('🎯 Prefetch manual de datos críticos...');
    // Solo prefetch de datos realmente necesarios
    const promises = [];
    
    // Solo cargar referencias una vez por sesión
    if (!queryClient.getQueryData(['getAllReferencesData', user.id])) {
      promises.push(
        queryClient.prefetchQuery({
          queryKey: ['getAllReferencesData', user.id],
          staleTime: 24 * 60 * 60 * 1000, // 24 horas
        })
      );
    }

    await Promise.all(promises);
    console.log('✅ Prefetch completado');
  },

  // Invalidación inteligente (solo cuando sea necesario)
  smartInvalidation: (changedData) => {
    console.log('🎯 Invalidación inteligente iniciada...');
    
    // Solo invalidar si los datos realmente cambiaron
    if (changedData.includes('inventory')) {
      queryClient.invalidateQueries({ 
        queryKey: ['getStockViewData'],
        exact: false 
      });
    }
    
    if (changedData.includes('subinventory')) {
      queryClient.invalidateQueries({ 
        queryKey: ['getSubInventoryData'],
        exact: false 
      });
    }

    // NUNCA invalidar getAllReferencesData a menos que sea crítico
    console.log('✅ Invalidación inteligente completada');
  }
};

export default {
  applyEgressReductionConfig,
  trackEgressReduction,
  emergencyCacheManagement,
  EGRESS_REDUCTION_CONFIG
};
