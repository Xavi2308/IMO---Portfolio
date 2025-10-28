import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SyncConfigurationSection = ({ user }) => {
  const { company } = useAuth();
  const [config, setConfig] = useState({
    mappingMethod: 'sku',
    customField: 'meta._custom_id',
    syncInterval: 15,
    syncDirection: 'both',
    syncAllProducts: true,
    productCategories: [],
    stockThreshold: 0,
    outOfStockStatus: 'outofstock',
    syncPrices: true,
    priceMultiplier: 1.0,
    stockMultiplier: 1.0,
    autoCreateProducts: true
  });
  const [syncStats, setSyncStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (company?.id) {
      loadConfig();
      loadSyncStats();
    }
  }, [company?.id]);

  const loadConfig = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/sync-config/${company.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Asegurar que todos los valores estén definidos
        const loadedConfig = {
          mappingMethod: data.data.mappingMethod || 'sku',
          customField: data.data.customField || 'meta._custom_id',
          syncInterval: data.data.syncInterval || 15,
          syncDirection: data.data.syncDirection || 'both',
          syncAllProducts: data.data.syncAllProducts !== false,
          productCategories: data.data.productCategories || [],
          stockThreshold: data.data.stockThreshold || 0,
          outOfStockStatus: data.data.outOfStockStatus || 'outofstock',
          syncPrices: data.data.syncPrices !== false,
          priceMultiplier: data.data.priceMultiplier || 1.0,
          autoCreateProducts: data.data.autoCreateProducts !== false
        };
        setConfig(loadedConfig);
      }
    } catch (error) {
      console.error('Error cargando configuración de sync:', error);
    }
  };

  const loadSyncStats = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/sync-stats/${company.id}`);
      const data = await response.json();
      
      if (data.success) {
        setSyncStats(data.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas de sync:', error);
    }
  };

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch(`http://localhost:5000/api/sync-config/${company.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Configuración guardada y sincronización reiniciada');
        await loadSyncStats();
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('❌ Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`http://localhost:5000/api/sync-now/${company.id}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('🔄 Sincronización iniciada en segundo plano');
        
        // Recargar estadísticas después de un momento
        setTimeout(() => {
          loadSyncStats();
        }, 5000);
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error iniciando sincronización:', error);
      alert('❌ Error iniciando sincronización');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'partial_success': return 'text-yellow-600';
      case 'running': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'partial_success': return '⚠️';
      case 'running': return '🔄';
      default: return '❓';
    }
  };

  return (
    <div className="bg-card rounded-xl border border-default p-6 sm:p-8 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">Configuración de Sincronización Automática</h2>
            <p className="text-text-muted text-sm">
              Configura cómo se sincronizan tus productos con WooCommerce
            </p>
          </div>
        </div>
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="bg-theme text-text-inverted hover:bg-theme-hover px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {syncing ? '🔄 Sincronizando...' : '🔄 Sincronizar Ahora'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuración */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-text">Configuración</h3>
          
          {/* Método de Mapeo */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Método de Mapeo de Productos
            </label>
            <select
              value={config.mappingMethod || 'sku'}
              onChange={(e) => handleConfigChange('mappingMethod', e.target.value)}
              className="w-full px-3 py-2 border border-default rounded-lg focus:ring-2 focus:ring-theme focus:border-theme bg-background text-text"
            >
              <option value="sku">Por SKU (Código de Producto)</option>
              <option value="name">Por Nombre de Producto</option>
              <option value="custom_id">Por Campo Personalizado</option>
            </select>
            <p className="text-xs text-text-muted mt-1">
              {config.mappingMethod === 'sku' && 'Los productos se relacionan por su código SKU'}
              {config.mappingMethod === 'name' && 'Los productos se relacionan por nombre exacto'}
              {config.mappingMethod === 'custom_id' && 'Los productos se relacionan por un campo personalizado de WooCommerce'}
            </p>
          </div>

          {/* Campo personalizado si se selecciona */}
          {config.mappingMethod === 'custom_id' && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Campo Personalizado de WooCommerce
              </label>
              <input
                type="text"
                value={config.customField || 'meta._custom_id'}
                onChange={(e) => handleConfigChange('customField', e.target.value)}
                placeholder="meta._custom_id"
                className="w-full px-3 py-2 border border-default rounded-lg focus:ring-2 focus:ring-theme focus:border-theme bg-background text-text"
              />
              <p className="text-xs text-text-muted mt-1">
                Nombre del meta field en WooCommerce que contiene el ID del producto de IMO
              </p>
            </div>
          )}

          {/* Intervalo de Sincronización */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Intervalo de Sincronización (minutos)
            </label>
            <input
              type="number"
              min="5"
              max="1440"
              value={config.syncInterval || 15}
              onChange={(e) => handleConfigChange('syncInterval', parseInt(e.target.value) || 15)}
              className="w-full px-3 py-2 border border-default rounded-lg focus:ring-2 focus:ring-theme focus:border-theme bg-background text-text"
            />
            <p className="text-xs text-text-muted mt-1">
              Cada cuántos minutos se ejecuta la sincronización automática
            </p>
          </div>

          {/* Dirección de Sincronización */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Dirección de Sincronización
            </label>
            <select
              value={config.syncDirection || 'both'}
              onChange={(e) => handleConfigChange('syncDirection', e.target.value)}
              className="w-full px-3 py-2 border border-default rounded-lg focus:ring-2 focus:ring-theme focus:border-theme bg-background text-text"
            >
              <option value="both">Bidireccional (IMO ↔ WooCommerce)</option>
              <option value="imo_to_woo">Solo IMO → WooCommerce</option>
              <option value="woo_to_imo">Solo WooCommerce → IMO</option>
            </select>
          </div>

          {/* Configuraciones adicionales */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.syncAllProducts === true}
                onChange={(e) => handleConfigChange('syncAllProducts', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-text">Sincronizar todos los productos</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.autoCreateProducts === true}
                onChange={(e) => handleConfigChange('autoCreateProducts', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-text">Crear productos automáticamente en WooCommerce</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.syncPrices === true}
                onChange={(e) => handleConfigChange('syncPrices', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-text">Sincronizar precios</span>
            </label>
          </div>

          {/* Multiplicador de precios */}
          {config.syncPrices && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Multiplicador de Precios
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={config.priceMultiplier || 1.0}
                onChange={(e) => handleConfigChange('priceMultiplier', parseFloat(e.target.value) || 1.0)}
                className="w-full px-3 py-2 border border-default rounded-lg focus:ring-2 focus:ring-theme focus:border-theme bg-background text-text"
              />
              <p className="text-xs text-text-muted mt-1">
                Factor por el que se multiplican los precios de IMO (ej: 1.2 para 20% más)
              </p>
            </div>
          )}

          {/* Multiplicador de stock */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Multiplicador de Stock
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={config.stockMultiplier || 1.0}
              onChange={(e) => handleConfigChange('stockMultiplier', parseFloat(e.target.value) || 1.0)}
              className="w-full px-3 py-2 border border-default rounded-lg focus:ring-2 focus:ring-theme focus:border-theme bg-background text-text"
            />
            <p className="text-xs text-text-muted mt-1">
              Factor por el que se multiplica el stock de IMO (ej: 0.8 para reservar 20%)
            </p>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="w-full bg-theme text-text-inverted hover:bg-theme-hover px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>

        {/* Estadísticas de Sincronización */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-text">Historial de Sincronizaciones</h3>
          
          {syncStats.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <div className="text-4xl mb-2">📊</div>
              <p>No hay sincronizaciones registradas aún</p>
              <p className="text-sm">Ejecuta tu primera sincronización para ver estadísticas</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {syncStats.map((sync, index) => (
                <div key={sync.id} className="bg-background border border-default rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getStatusIcon(sync.status)}</span>
                      <span className={`font-medium ${getStatusColor(sync.status)}`}>
                        {sync.status === 'success' && 'Completado'}
                        {sync.status === 'error' && 'Error'}
                        {sync.status === 'partial_success' && 'Parcial'}
                        {sync.status === 'running' && 'Ejecutando'}
                      </span>
                    </div>
                    <span className="text-sm text-text-muted">
                      {formatDate(sync.started_at)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{sync.products_processed}</div>
                      <div className="text-text-muted">Procesados</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{sync.products_updated}</div>
                      <div className="text-text-muted">Actualizados</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-purple-600">{sync.products_created}</div>
                      <div className="text-text-muted">Creados</div>
                    </div>
                  </div>
                  
                  {sync.errors && sync.errors.length > 0 && (
                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-700">
                      <div className="text-sm text-red-700 dark:text-red-300">
                        <strong>{sync.errors.length} errores:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {sync.errors.slice(0, 3).map((error, i) => (
                            <li key={i} className="truncate">{error.error || error}</li>
                          ))}
                          {sync.errors.length > 3 && <li>... y {sync.errors.length - 3} más</li>}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncConfigurationSection;
