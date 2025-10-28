// ⚙️ SELECTOR DE CONFIGURACIÓN DE CACHE
// Permite cambiar entre diferentes niveles de tiempo real vs ahorro de egress

import React, { useState } from 'react';
import { useConfigurableCache } from '../hooks/balancedHooks';
import { EGRESS_REDUCTION_ESTIMATION } from '../utils/balancedEgressConfig';

const CacheConfigSelector = () => {
  const [currentConfig, setCurrentConfig] = useState('balanced');
  const [isExpanded, setIsExpanded] = useState(false);
  const { switchConfiguration, getCurrentConfig, availableConfigs } = useConfigurableCache(currentConfig);

  const handleConfigChange = (newConfig) => {
    setCurrentConfig(newConfig);
    switchConfiguration(newConfig);
  };

  const getConfigInfo = (configType) => {
    const info = {
      'ultra-aggressive': {
        name: '🚨 Ultra Agresivo',
        reduction: '85-90%',
        freshness: '1-24 horas',
        color: 'bg-red-600',
        description: 'Máximo ahorro, datos menos frescos'
      },
      'balanced': {
        name: '⚖️ Balanceado',
        reduction: '60-75%',
        freshness: '5-120 min',
        color: 'bg-yellow-600',
        description: 'Equilibrio entre ahorro y frescura'
      },
      'conservative': {
        name: '🔄 Conservador',
        reduction: '40-60%',
        freshness: '2-30 min',
        color: 'bg-blue-600',
        description: 'Datos más frescos, menos ahorro'
      },
      'realtime': {
        name: '⚡ Tiempo Real',
        reduction: '20-40%',
        freshness: '30 seg-1 min',
        color: 'bg-green-600',
        description: 'Datos muy frescos, poco ahorro'
      }
    };
    return info[configType] || info.balanced;
  };

  const currentInfo = getConfigInfo(currentConfig);

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-3 rounded-lg shadow-lg max-w-sm z-50 border border-gray-600">
      {/* Header compacto */}
      <div 
        className="cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 ${currentInfo.color} rounded-full`}></div>
          <span className="font-bold text-sm">⚙️ Config Cache</span>
        </div>
        <div className="text-xs bg-gray-700 px-2 py-1 rounded">
          {currentInfo.reduction}
        </div>
      </div>

      {/* Estado actual compacto */}
      <div className="mt-2 text-xs text-gray-300">
        <div><strong>{currentInfo.name}</strong></div>
        <div>Frescura: {currentInfo.freshness}</div>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Selector de configuración */}
          <div>
            <div className="text-xs font-semibold text-gray-300 mb-2">Cambiar Configuración:</div>
            <div className="space-y-2">
              {availableConfigs.map(config => {
                const info = getConfigInfo(config);
                const isActive = config === currentConfig;
                
                return (
                  <button
                    key={config}
                    onClick={() => handleConfigChange(config)}
                    className={`w-full text-left p-2 rounded text-xs ${
                      isActive 
                        ? `${info.color} text-white` 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{info.name}</span>
                      <span className="text-xs">{info.reduction}</span>
                    </div>
                    <div className="text-xs opacity-80">{info.description}</div>
                    <div className="text-xs opacity-60">Datos: {info.freshness}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Información detallada */}
          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-300">
              <div className="font-semibold mb-1">Configuración Actual:</div>
              <div>• <strong>Reducción Egress:</strong> {currentInfo.reduction}</div>
              <div>• <strong>Frescura Datos:</strong> {currentInfo.freshness}</div>
              <div>• <strong>Uso:</strong> {currentInfo.description}</div>
            </div>
          </div>

          {/* Recomendaciones */}
          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              <div className="font-semibold mb-1">💡 Recomendaciones:</div>
              <div>• <strong>Para costos altos:</strong> Ultra Agresivo</div>
              <div>• <strong>Uso general:</strong> Balanceado</div>
              <div>• <strong>Datos críticos:</strong> Tiempo Real</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheConfigSelector;
