// 🚀 SISTEMA DE CACHE HÍBRIDO AVANZADO
// Optimización extrema de egress con cache inteligente en múltiples capas

import { queryClient } from '../queryClient';

class HybridCache {
  constructor() {
    this.memoryCache = new Map();
    this.compressionEnabled = true;
    this.maxMemorySize = 50 * 1024 * 1024; // 50MB
    this.currentMemorySize = 0;
    
    // Estrategias de cache por tipo de datos
    this.cacheStrategies = {
      // Datos que cambian muy poco - cache agresivo
      STATIC: {
        memoryTTL: 60 * 60 * 1000,    // 1 hora en memoria
        persistentTTL: 24 * 60 * 60 * 1000, // 24 horas en localStorage
        compression: true,
        prefetch: true
      },
      
      // Datos de inventario - cache moderado con invalidación inteligente
      INVENTORY: {
        memoryTTL: 15 * 60 * 1000,    // 15 minutos en memoria
        persistentTTL: 2 * 60 * 60 * 1000, // 2 horas en localStorage
        compression: true,
        prefetch: false
      },
      
      // Datos de ventas - cache corto pero inteligente
      SALES: {
        memoryTTL: 2 * 60 * 1000,     // 2 minutos en memoria
        persistentTTL: 30 * 60 * 1000, // 30 minutos en localStorage
        compression: true,
        prefetch: false
      },
      
      // Dashboard/stats - balance entre frecuencia y performance
      DASHBOARD: {
        memoryTTL: 5 * 60 * 1000,     // 5 minutos en memoria
        persistentTTL: 60 * 60 * 1000, // 1 hora en localStorage
        compression: true,
        prefetch: true
      }
    };
  }

  // Comprimir datos usando algoritmo simple pero efectivo
  compress(data) {
    if (!this.compressionEnabled) return JSON.stringify(data);
    
    try {
      const jsonString = JSON.stringify(data);
      
      // Compresión simple: remover espacios y optimizar repeticiones
      const compressed = jsonString
        .replace(/\s+/g, '') // Quitar espacios
        .replace(/null/g, 'N') // Reemplazar null común
        .replace(/true/g, 'T') // Reemplazar boolean
        .replace(/false/g, 'F'); // Reemplazar boolean
      
      return compressed;
    } catch (error) {
      console.warn('Error comprimiendo datos:', error);
      return JSON.stringify(data);
    }
  }

  // Descomprimir datos
  decompress(compressedString) {
    if (!compressedString) return null;
    
    try {
      // Revertir compresión
      const decompressed = compressedString
        .replace(/N/g, 'null')
        .replace(/T/g, 'true')
        .replace(/F/g, 'false');
      
      return JSON.parse(decompressed);
    } catch (error) {
      console.warn('Error descomprimiendo datos:', error);
      return null;
    }
  }

  // Calcular tamaño estimado de datos
  estimateSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return JSON.stringify(data).length;
    }
  }

  // Gestión inteligente de memoria
  ensureMemorySpace(requiredSize) {
    if (this.currentMemorySize + requiredSize <= this.maxMemorySize) {
      return true;
    }

    // Implementar LRU (Least Recently Used) eviction
    const entries = Array.from(this.memoryCache.entries())
      .map(([key, value]) => ({
        key,
        value,
        lastAccess: value.lastAccess || 0
      }))
      .sort((a, b) => a.lastAccess - b.lastAccess);

    // Remover entradas hasta liberar espacio suficiente
    let freedSpace = 0;
    for (const entry of entries) {
      if (freedSpace >= requiredSize) break;
      
      freedSpace += entry.value.size || 0;
      this.memoryCache.delete(entry.key);
      this.currentMemorySize -= entry.value.size || 0;
    }

    return freedSpace >= requiredSize;
  }

  // Obtener datos del cache (memoria -> localStorage -> null)
  async get(key, strategy = 'INVENTORY') {
    const config = this.cacheStrategies[strategy];
    const now = Date.now();

    // 1. Verificar cache en memoria primero
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      
      if (now - cached.timestamp <= config.memoryTTL) {
        cached.lastAccess = now;
        cached.hits = (cached.hits || 0) + 1;
        
        console.log(`🎯 Cache HIT (memoria): ${key}`);
        return cached.data;
      } else {
        // Expirado en memoria
        this.memoryCache.delete(key);
        this.currentMemorySize -= cached.size || 0;
      }
    }

    // 2. Verificar cache persistente (localStorage)
    try {
      const persistentKey = `imo_cache_${key}`;
      const stored = localStorage.getItem(persistentKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        
        if (now - parsed.timestamp <= config.persistentTTL) {
          const data = this.decompress(parsed.compressedData);
          
          // Promover a memoria cache
          this.set(key, data, strategy, false);
          
          console.log(`🎯 Cache HIT (persistent): ${key}`);
          return data;
        } else {
          // Expirado en persistent
          localStorage.removeItem(persistentKey);
        }
      }
    } catch (error) {
      console.warn('Error accediendo cache persistente:', error);
    }

    console.log(`❌ Cache MISS: ${key}`);
    return null;
  }

  // Guardar datos en el cache
  async set(key, data, strategy = 'INVENTORY', updatePersistent = true) {
    const config = this.cacheStrategies[strategy];
    const now = Date.now();
    const size = this.estimateSize(data);

    // Asegurar espacio en memoria
    if (!this.ensureMemorySpace(size)) {
      console.warn('No se pudo liberar suficiente memoria para cache');
      return false;
    }

    // Guardar en memoria
    this.memoryCache.set(key, {
      data,
      timestamp: now,
      lastAccess: now,
      hits: 0,
      size,
      strategy
    });
    this.currentMemorySize += size;

    // Guardar en cache persistente si está habilitado
    if (updatePersistent && config.persistentTTL > 0) {
      try {
        const persistentKey = `imo_cache_${key}`;
        const compressedData = this.compress(data);
        
        const cacheEntry = {
          compressedData,
          timestamp: now,
          originalSize: size,
          compressedSize: compressedData.length,
          strategy
        };

        localStorage.setItem(persistentKey, JSON.stringify(cacheEntry));
        
        console.log(`💾 Cache SAVE: ${key} (${(size/1024).toFixed(2)}KB -> ${(compressedData.length/1024).toFixed(2)}KB)`);
      } catch (error) {
        console.warn('Error guardando en cache persistente:', error);
      }
    }

    return true;
  }

  // Invalidar cache específico
  invalidate(key) {
    this.memoryCache.delete(key);
    localStorage.removeItem(`imo_cache_${key}`);
    console.log(`🗑️ Cache INVALIDATED: ${key}`);
  }

  // Invalidar por patrón
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    
    // Invalidar memoria
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Invalidar localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('imo_cache_') && regex.test(key.replace('imo_cache_', ''))) {
        localStorage.removeItem(key);
      }
    }
    
    console.log(`🗑️ Cache PATTERN INVALIDATED: ${pattern}`);
  }

  // Obtener estadísticas del cache
  getStats() {
    const memoryEntries = Array.from(this.memoryCache.entries());
    const persistentKeys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('imo_cache_')) {
        persistentKeys.push(key);
      }
    }

    return {
      memory: {
        entries: memoryEntries.length,
        size: this.currentMemorySize,
        maxSize: this.maxMemorySize,
        usage: ((this.currentMemorySize / this.maxMemorySize) * 100).toFixed(2) + '%'
      },
      persistent: {
        entries: persistentKeys.length,
        estimatedSize: persistentKeys.length * 1024 // Estimación
      },
      strategies: this.cacheStrategies
    };
  }

  // Limpiar cache completo
  clear() {
    this.memoryCache.clear();
    this.currentMemorySize = 0;
    
    // Limpiar localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('imo_cache_')) {
        localStorage.removeItem(key);
      }
    }
    
    console.log('🧹 Cache completamente limpiado');
  }
}

// Singleton instance
export const hybridCache = new HybridCache();

// Hook personalizado para React Query con cache híbrido
export const createOptimizedQuery = (queryKey, queryFn, strategy = 'INVENTORY', additionalOptions = {}) => {
  const cacheKey = Array.isArray(queryKey) ? queryKey.join('_') : queryKey;
  
  return {
    queryKey,
    queryFn: async () => {
      // Intentar obtener del cache híbrido primero
      const cached = await hybridCache.get(cacheKey, strategy);
      if (cached !== null) {
        return cached;
      }
      
      // Si no está en cache, ejecutar query
      console.log(`🌐 Fetching from API: ${cacheKey}`);
      const data = await queryFn();
      
      // Guardar en cache híbrido
      await hybridCache.set(cacheKey, data, strategy);
      
      return data;
    },
    staleTime: hybridCache.cacheStrategies[strategy].memoryTTL,
    gcTime: hybridCache.cacheStrategies[strategy].persistentTTL,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...additionalOptions
  };
};

export default hybridCache;
