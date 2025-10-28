// 📊 MONITOR DE CACHE EN TIEMPO REAL
// Dashboard optimizado para ver performance, hits/misses, y optimización de egress

import React from 'react';
import useCacheStats from '../hooks/useCacheStats';

const CacheMonitor = () => {
  const { stats, refreshStats, clearCache, formatBytes } = useCacheStats();

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-green-400">Cache Monitor</h3>
        <div className="flex gap-2">
          <button
            onClick={refreshStats}
            className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
            title="Refresh Stats"
          >
            🔄
          </button>
          <button
            onClick={clearCache}
            className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
            title="Clear Cache"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {/* React Query Stats */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-blue-300 mb-1">React Query</div>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Queries:</span>
            <span className="text-green-300">{stats.reactQuery.queries}</span>
          </div>
          <div className="flex justify-between">
            <span>Cached:</span>
            <span className="text-green-300">{stats.reactQuery.cached}</span>
          </div>
          <div className="flex justify-between">
            <span>Fresh:</span>
            <span className="text-green-300">{stats.reactQuery.fresh}</span>
          </div>
        </div>
      </div>

      {/* Hybrid Cache Stats */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-purple-300 mb-1">Hybrid Cache</div>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Memory:</span>
            <span className="text-purple-300">{stats.hybridCache.memory.items}</span>
          </div>
          <div className="flex justify-between">
            <span>Storage:</span>
            <span className="text-purple-300">{stats.hybridCache.localStorage.items}</span>
          </div>
          <div className="flex justify-between">
            <span>Hit Rate:</span>
            <span className="text-green-300">{stats.hybridCache.hitRate}%</span>
          </div>
        </div>
      </div>

      {/* Egress Savings */}
      <div className="pt-2 border-t border-gray-700">
        <div className="text-xs font-semibold text-yellow-300 mb-1">Egress Impact</div>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Saved:</span>
            <span className="text-green-300">{formatBytes(stats.egress.saved)}</span>
          </div>
          <div className="flex justify-between">
            <span>Reduction:</span>
            <span className="text-green-300">{stats.egress.reduction}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheMonitor;
