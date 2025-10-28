import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { hybridCache } from '../utils/hybridCache';

/**
 * Hook optimizado para obtener estadísticas del cache
 * Sin dependencias que causen loops infinitos
 */
export const useCacheStats = () => {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState({
    reactQuery: {
      queries: 0,
      cached: 0,
      stale: 0,
      fresh: 0
    },
    hybridCache: {
      memory: { size: 0, items: 0 },
      localStorage: { size: 0, items: 0 },
      hits: 0,
      misses: 0,
      hitRate: 0
    },
    egress: {
      estimated: 0,
      saved: 0,
      reduction: 0
    }
  });

  // Función estable para obtener estadísticas
  const getStats = useCallback(() => {
    try {
      // React Query stats
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      const rqStats = {
        queries: queries.length,
        cached: queries.filter(q => q.state.data).length,
        stale: queries.filter(q => q.isStale()).length,
        fresh: queries.filter(q => !q.isStale()).length
      };

      // Hybrid Cache stats
      const hcStats = hybridCache.getStats();

      // Estimación de egress (bytes aproximados)
      const avgQuerySize = 2048; // 2KB promedio por query
      const egressEstimated = rqStats.fresh * avgQuerySize;
      const egressSaved = hcStats.hits * avgQuerySize;
      const egressReduction = egressSaved > 0 ? 
        Math.round((egressSaved / (egressEstimated + egressSaved)) * 100) : 0;

      return {
        reactQuery: rqStats,
        hybridCache: hcStats,
        egress: {
          estimated: egressEstimated,
          saved: egressSaved,
          reduction: egressReduction
        }
      };
    } catch (error) {
      console.warn('Error getting cache stats:', error);
      return stats; // Return current stats on error
    }
  }, [queryClient, stats]);

  // Effect para actualizar stats periódicamente
  useEffect(() => {
    // Obtener stats iniciales
    setStats(getStats());

    // Actualizar cada 5 segundos
    const interval = setInterval(() => {
      setStats(getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array - solo se ejecuta una vez

  // Funciones de utilidad
  const refreshStats = useCallback(() => {
    setStats(getStats());
  }, [getStats]);

  const clearCache = useCallback(async () => {
    try {
      await queryClient.clear();
      hybridCache.clear();
      setStats(getStats());
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, [queryClient, getStats]);

  return {
    stats,
    refreshStats,
    clearCache,
    // Helpers
    formatBytes: (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  };
};

export default useCacheStats;
