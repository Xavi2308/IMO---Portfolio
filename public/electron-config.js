// 🚀 CONFIGURACIÓN ELECTRON ANTI-REFRESH
// Script para prevenir refreshes automáticos en la versión de escritorio

// Configuración global para React Query en entorno Electron
if (window.electronAPI) {
  console.log('🖥️ Entorno Electron detectado - Aplicando configuraciones anti-refresh');
  
  // Desactivar todos los refetch automáticos para Electron
  const electronQueryDefaults = {
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    staleTime: 30 * 60 * 1000, // 30 minutos mínimo en Electron
    gcTime: 2 * 60 * 60 * 1000, // 2 horas en memoria
  };

  // Guardar configuración global para hooks
  window.__ELECTRON_QUERY_CONFIG__ = electronQueryDefaults;
  
  // Prevenir recargas por visibilidad
  const originalVisibilityChange = document.addEventListener;
  document.addEventListener = function(type, listener, options) {
    if (type === 'visibilitychange') {
      // Interceptar y no hacer nada en Electron
      console.log('🚫 Visibilitychange interceptado en Electron');
      return;
    }
    return originalVisibilityChange.call(this, type, listener, options);
  };

  // Configurar políticas de cache más agresivas para Electron
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('📱 Service Worker registrado en Electron para cache optimizado');
    }).catch(error => {
      console.log('⚠️ Service Worker no disponible:', error);
    });
  }
}