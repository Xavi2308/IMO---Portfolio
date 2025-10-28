/**
 * @file index.jsx
 * @description Punto de entrada principal de la aplicación React. Este archivo inicializa la aplicación renderizando el componente raíz `<App />` en el elemento DOM con el ID 'root'. Configura el entorno de React para la renderización en el cliente.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { generatePalette } from './utils/generatePalette';

// Aplica la paleta antes de renderizar React si hay un color guardado
try {
  const themeColor = localStorage.getItem('themeColor');
  if (themeColor) {
    const palette = generatePalette(themeColor);
    const root = document.documentElement;
    root.style.setProperty('--theme-color', palette.main);
    root.style.setProperty('--theme-main', palette.main);
    root.style.setProperty('--theme-c1', palette.c1);
    root.style.setProperty('--theme-c2', palette.c2);
    root.style.setProperty('--theme-c3', palette.c3);
    root.style.setProperty('--theme-c4', palette.c4);
    root.style.setProperty('--theme-c5', palette.c5);
    root.style.setProperty('--theme-matching-gradient', `linear-gradient(90deg, ${palette.c1}, ${palette.c2}, ${palette.main}, ${palette.c3}, ${palette.c4}, ${palette.c5})`);
    root.style.setProperty('--theme-color-hover', palette.themeColorHover);
    root.style.setProperty('--theme-secondary-1', palette.c3);
    root.style.setProperty('--theme-secondary-2', palette.c4);
    root.style.setProperty('--theme-secondary-3', palette.c5);
    root.style.setProperty('--theme-secondary-4', palette.c2);
  }
  // Aplica el modo oscuro/claro guardado
  const themeMode = localStorage.getItem('themeMode');
  if (themeMode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch (e) { /* ignore */ }

// --- CONFIGURACIÓN DE REACT QUERY ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
    },
  },
});

// --- INICIALIZACIÓN DEL ROOT ---
/**
 * @description Crea un nodo raíz para la aplicación.
 * @type {ReactDOM.Root}
 */
const root = ReactDOM.createRoot(document.getElementById('root')); // Obtiene el elemento DOM con ID 'root'

// --- RENDERIZADO DEL COMPONENTE RAÍZ ---
/**
 * @description Renderiza el componente principal `<App />` en el nodo raíz.
 */
root.render(
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </AuthProvider>
);
