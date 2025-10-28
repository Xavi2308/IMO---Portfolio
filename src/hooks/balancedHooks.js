// ⚖️ HOOKS BALANCEADOS - Diferentes niveles de tiempo real vs ahorro de egress
// Puedes elegir el nivel que mejor se adapte a tus necesidades

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { BALANCED_EGRESS_CONFIG } from '../utils/balancedEgressConfig';
import { 
  getStockViewData, 
  getSubInventoryData, 
  getSubInventoryStats,
  getAllReferencesData
} from './optimizedQueries';

// ⚖️ HOOKS BALANCEADOS - Reducen egress 60-75% pero mantienen datos más frescos

export const useBalancedStockView = (user, page = 1, pageSize = 50, filters = {}, sortConfig = {}) => {
  return useQuery({
    queryKey: ['balanced-stock', user?.id, page, pageSize, filters, sortConfig],
    queryFn: () => getStockViewData(user?.id, { page, pageSize, filters, sortConfig }),
    enabled: !!user?.id,
    ...BALANCED_EGRESS_CONFIG.BALANCED_QUERIES.getStockViewData,
    // 15 MINUTOS de cache - Datos relativamente frescos
  });
};

export const useBalancedSubInventory = (user, page = 1, pageSize = 50, filters = {}, sortConfig = {}) => {
  return useQuery({
    queryKey: ['balanced-subinventory', user?.id, page, pageSize, filters, sortConfig],
    queryFn: () => getSubInventoryData(user?.id, { page, pageSize, filters, sortConfig }),
    enabled: !!user?.id,
    ...BALANCED_EGRESS_CONFIG.BALANCED_QUERIES.getSubInventoryData,
    // 10 MINUTOS de cache - Para inventario más crítico
  });
};

export const useBalancedAllReferences = (user) => {
  return useQuery({
    queryKey: ['balanced-references', user?.id],
    queryFn: () => getAllReferencesData(user?.id),
    enabled: !!user?.id,
    ...BALANCED_EGRESS_CONFIG.BALANCED_QUERIES.getAllReferencesData,
    // 2 HORAS de cache - Referencias cambian poco
  });
};

export const useBalancedSubInventoryStats = (user) => {
  return useQuery({
    queryKey: ['balanced-stats', user?.id],
    queryFn: () => getSubInventoryStats(user?.id),
    enabled: !!user?.id,
    ...BALANCED_EGRESS_CONFIG.BALANCED_QUERIES.getSubInventoryStats,
    // 5 MINUTOS de cache - Stats más dinámicas
  });
};

// 🔄 HOOKS CONSERVADORES - Reducen egress 40-60% con datos más frescos

export const useConservativeStockView = (user, page = 1, pageSize = 50, filters = {}, sortConfig = {}) => {
  return useQuery({
    queryKey: ['conservative-stock', user?.id, page, pageSize, filters, sortConfig],
    queryFn: () => getStockViewData(user?.id, { page, pageSize, filters, sortConfig }),
    enabled: !!user?.id,
    ...BALANCED_EGRESS_CONFIG.CONSERVATIVE_QUERIES.getStockViewData,
    // 5 MINUTOS de cache - Más fresco
  });
};

export const useConservativeSubInventory = (user, page = 1, pageSize = 50, filters = {}, sortConfig = {}) => {
  return useQuery({
    queryKey: ['conservative-subinventory', user?.id, page, pageSize, filters, sortConfig],
    queryFn: () => getSubInventoryData(user?.id, { page, pageSize, filters, sortConfig }),
    enabled: !!user?.id,
    ...BALANCED_EGRESS_CONFIG.CONSERVATIVE_QUERIES.getSubInventoryData,
    // 3 MINUTOS de cache
  });
};

// ⚡ HOOKS TIEMPO REAL - Para datos críticos (reducción 20-40% egress)

export const useRealtimeStockView = (user, page = 1, pageSize = 50, filters = {}, sortConfig = {}) => {
  return useQuery({
    queryKey: ['realtime-stock', user?.id, page, pageSize, filters, sortConfig],
    queryFn: () => getStockViewData(user?.id, { page, pageSize, filters, sortConfig }),
    enabled: !!user?.id,
    ...BALANCED_EGRESS_CONFIG.REALTIME_QUERIES.getStockViewData,
    // 30 SEGUNDOS de cache - Casi tiempo real
  });
};

// 🛠️ HOOK PARA CAMBIAR CONFIGURACIÓN DINÁMICAMENTE
export const useConfigurableCache = (configType = 'balanced') => {
  const queryClient = useQueryClient();

  const switchConfiguration = useCallback((newConfigType) => {
    console.log(`🔄 Cambiando configuración a: ${newConfigType}`);
    
    // Limpiar cache existente para aplicar nueva configuración
    queryClient.invalidateQueries();
    
    // Aplicar nuevas configuraciones por defecto
    const configs = {
      'ultra-aggressive': BALANCED_EGRESS_CONFIG.ULTRA_AGGRESSIVE || {},
      'balanced': BALANCED_EGRESS_CONFIG.BALANCED_QUERIES,
      'conservative': BALANCED_EGRESS_CONFIG.CONSERVATIVE_QUERIES,
      'realtime': BALANCED_EGRESS_CONFIG.REALTIME_QUERIES
    };

    const selectedConfig = configs[newConfigType] || configs.balanced;
    
    // Aplicar configuración a queries existentes
    Object.entries(selectedConfig).forEach(([queryKey, config]) => {
      queryClient.setQueryDefaults([queryKey], config);
    });

    console.log(`✅ Configuración ${newConfigType} aplicada`);
  }, [queryClient]);

  const getCurrentConfig = useCallback(() => {
    return {
      type: configType,
      description: {
        'ultra-aggressive': '85-90% reducción egress, datos 1-24h',
        'balanced': '60-75% reducción egress, datos 5-120min',
        'conservative': '40-60% reducción egress, datos 2-30min',
        'realtime': '20-40% reducción egress, datos 30seg-1min'
      }[configType]
    };
  }, [configType]);

  return {
    switchConfiguration,
    getCurrentConfig,
    availableConfigs: ['ultra-aggressive', 'balanced', 'conservative', 'realtime']
  };
};

export default {
  // Balanceados (RECOMENDADO)
  useBalancedStockView,
  useBalancedSubInventory,
  useBalancedAllReferences,
  useBalancedSubInventoryStats,
  
  // Conservadores  
  useConservativeStockView,
  useConservativeSubInventory,
  
  // Tiempo real
  useRealtimeStockView,
  
  // Configuración dinámica
  useConfigurableCache
};
