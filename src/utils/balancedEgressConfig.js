// ⚖️ CONFIGURACIÓN BALANCEADA ANTI-EGRESS
// Reducir egress pero mantener datos relativamente frescos

export const BALANCED_EGRESS_CONFIG = {
  // 🎯 CONFIGURACIÓN BALANCEADA - Reduce egress pero mantiene datos frescos
  BALANCED_QUERIES: {
    'getStockViewData': {
      staleTime: 15 * 60 * 1000, // 15 MINUTOS (vs 1 hora)
      gcTime: 2 * 60 * 60 * 1000, // 2 horas en memoria
      refetchOnMount: false,      // No refetch al cargar página
      refetchOnWindowFocus: false, // No refetch al cambiar ventana
      refetchOnReconnect: true,   // SÍ refetch al reconectar internet
      refetchInterval: false,     // No refetch automático por tiempo
    },
    'getSubInventoryData': {
      staleTime: 10 * 60 * 1000, // 10 MINUTOS (vs 1 hora) - Más crítico
      gcTime: 2 * 60 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false,
    },
    'getAllReferencesData': {
      staleTime: 2 * 60 * 60 * 1000, // 2 HORAS (vs 24 horas) - Referencias cambian poco
      gcTime: 8 * 60 * 60 * 1000, // 8 horas en memoria
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false,
    },
    'getSubInventoryStats': {
      staleTime: 5 * 60 * 1000, // 5 MINUTOS (vs 30 minutos) - Stats más dinámicas
      gcTime: 30 * 60 * 1000, // 30 minutos
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false,
    }
  },

  // 🎯 CONFIGURACIÓN CONSERVADORA - Menos reducción pero datos más frescos
  CONSERVATIVE_QUERIES: {
    'getStockViewData': {
      staleTime: 5 * 60 * 1000, // 5 MINUTOS
      gcTime: 30 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false,
    },
    'getSubInventoryData': {
      staleTime: 3 * 60 * 1000, // 3 MINUTOS
      gcTime: 30 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false,
    },
    'getAllReferencesData': {
      staleTime: 30 * 60 * 1000, // 30 MINUTOS
      gcTime: 2 * 60 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false,
    },
    'getSubInventoryStats': {
      staleTime: 2 * 60 * 1000, // 2 MINUTOS
      gcTime: 15 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false,
    }
  },

  // 🚨 CONFIGURACIÓN TIEMPO REAL - Para datos críticos
  REALTIME_QUERIES: {
    'getStockViewData': {
      staleTime: 30 * 1000, // 30 SEGUNDOS
      gcTime: 5 * 60 * 1000,
      refetchOnMount: true,   // SÍ refetch al cargar
      refetchOnWindowFocus: false, // Desactivado para evitar refresh en Electron
      refetchOnReconnect: true,
      refetchInterval: 60 * 1000, // Refetch cada minuto
    }
  }
};

// 📊 ESTIMACIÓN DE REDUCCIÓN POR CONFIGURACIÓN
export const EGRESS_REDUCTION_ESTIMATION = {
  ULTRA_AGGRESSIVE: {
    reduction: '85-90%',
    freshness: 'Datos pueden tener hasta 1-24 horas',
    useCase: 'Máximo ahorro de costos'
  },
  BALANCED: {
    reduction: '60-75%',
    freshness: 'Datos de 5-120 minutos',
    useCase: 'Equilibrio entre ahorro y frescura'
  },
  CONSERVATIVE: {
    reduction: '40-60%',
    freshness: 'Datos de 2-30 minutos',
    useCase: 'Datos relativamente frescos'
  },
  REALTIME: {
    reduction: '20-40%',
    freshness: 'Datos de 30 segundos a 1 minuto',
    useCase: 'Para operaciones críticas'
  }
};

export default {
  BALANCED_EGRESS_CONFIG,
  EGRESS_REDUCTION_ESTIMATION
};
