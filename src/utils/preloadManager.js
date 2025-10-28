// 🚀 PRELOAD MANAGER - Precarga de componentes críticos
// Este archivo gestiona la precarga inteligente de componentes para mejorar la experiencia del usuario

import { lazy } from 'react';

// 📊 COMPONENTES CRÍTICOS - Se precargan automáticamente
export const preloadCriticalComponents = () => {
  // Precargar componentes más utilizados
  const criticalComponents = [
    () => import('../components/MainInterface'),
    () => import('../components/StockView'),
    () => import('../components/SubInventoryManagement'),
    () => import('../components/Home'),
  ];

  // Ejecutar precarga en idle time
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      criticalComponents.forEach(componentLoader => {
        componentLoader().catch(() => {
          // Silencioso - no bloquear si falla la precarga
        });
      });
    });
  } else {
    // Fallback para navegadores sin requestIdleCallback
    setTimeout(() => {
      criticalComponents.forEach(componentLoader => {
        componentLoader().catch(() => {
          // Silencioso - no bloquear si falla la precarga
        });
      });
    }, 2000);
  }
};

// 🎯 PRELOAD HOOKS - Para precargar componentes específicos según el contexto del usuario
export const preloadByRole = (userRole) => {
  const roleBasedComponents = {
    admin: [
      () => import('../components/UserManagement'),
      () => import('../components/Settings'),
      () => import('../components/Production'),
    ],
    vendedor: [
      () => import('../components/Sales'),
      () => import('../components/Orders'),
    ],
    produccion: [
      () => import('../components/Production'),
      () => import('../components/SubInventoryManagement'),
    ],
    lector: [
      () => import('../components/MovementsNew'),
      () => import('../components/StockView'),
    ],
  };

  const componentsToPreload = roleBasedComponents[userRole] || [];
  
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      componentsToPreload.forEach(componentLoader => {
        componentLoader().catch(() => {
          // Silencioso - no bloquear si falla la precarga
        });
      });
    });
  }
};

// 📱 PRELOAD ON HOVER - Precarga componentes cuando el usuario hace hover en botones de navegación
export const preloadOnHover = (componentName) => {
  const componentMap = {
    'inventory': () => import('../components/SubInventoryManagement'),
    'stock': () => import('../components/StockView'),
    'production': () => import('../components/Production'),
    'sales': () => import('../components/Sales'),
    'orders': () => import('../components/Orders'),
    'users': () => import('../components/UserManagement'),
    'movements': () => import('../components/MovementsNew'),
    'settings': () => import('../components/Settings'),
  };

  const componentLoader = componentMap[componentName];
  if (componentLoader) {
    componentLoader().catch(() => {
      // Silencioso - no bloquear si falla la precarga
    });
  }
};
