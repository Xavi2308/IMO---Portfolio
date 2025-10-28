import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

// Componentes lazy loading
const ResumenOrdenes = React.lazy(() => import('./ResumenOrdenes'));
const Pendientes = React.lazy(() => import('./Pendientes'));
const HistorialDespachos = React.lazy(() => import('./HistorialDespachos'));

function SalesSimple({ user, setError, errorMessage }) {
  const [activeView, setActiveView] = useState('dashboard');
  const { company } = useAuth();

  // Dashboard con tarjetas
  const DashboardCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Historial de Ventas */}
      <div 
        onClick={() => setActiveView('sales-history')}
        className="bg-card p-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 cursor-pointer border border-default"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-theme bg-opacity-20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-theme" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">Historial de Ventas</h3>
          <p className="text-text-muted text-sm">Consultar todas las ventas realizadas</p>
        </div>
      </div>

      {/* Resumen de Órdenes */}
      <div 
        onClick={() => setActiveView('resumen-ordenes')}
        className="bg-card p-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 cursor-pointer border border-default"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-theme bg-opacity-20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-theme" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">Resumen de Órdenes</h3>
          <p className="text-text-muted text-sm">Estado de todas las órdenes</p>
        </div>
      </div>

      {/* Pendientes */}
      <div 
        onClick={() => setActiveView('pendientes')}
        className="bg-card p-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 cursor-pointer border border-default"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-theme bg-opacity-20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-theme" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">Pendientes</h3>
          <p className="text-text-muted text-sm">Órdenes y ventas pendientes</p>
        </div>
      </div>

      {/* Historial de Despachos */}
      <div 
        onClick={() => setActiveView('historial-despachos')}
        className="bg-card p-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 cursor-pointer border border-default"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-theme bg-opacity-20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-theme" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">Historial de Despachos</h3>
          <p className="text-text-muted text-sm">Seguimiento de despachos realizados</p>
        </div>
      </div>
    </div>
  );

  // Función para renderizar la vista seleccionada
  const renderView = () => {
    switch (activeView) {
      case 'sales-history':
        return <SalesHistory />;
      case 'resumen-ordenes':
        return (
          <React.Suspense fallback={<div className="text-center">Cargando...</div>}>
            <ResumenOrdenes />
          </React.Suspense>
        );
      case 'pendientes':
        return (
          <React.Suspense fallback={<div className="text-center">Cargando...</div>}>
            <Pendientes user={user} />
          </React.Suspense>
        );
      case 'historial-despachos':
        return (
          <React.Suspense fallback={<div className="text-center">Cargando...</div>}>
            <HistorialDespachos />
          </React.Suspense>
        );
      default:
        return <DashboardCards />;
    }
  };

  // Componente simple para historial de ventas
  const SalesHistory = () => (
    <div className="bg-card p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-text mb-4">Historial de Ventas</h2>
      <p className="text-text-muted">Esta funcionalidad está en desarrollo.</p>
      <p className="text-text-muted mt-2">Aquí se mostrará el historial completo de ventas.</p>
    </div>
  );

  return (
    <div className="bg-background p-6">
      {/* Header con botón de regreso */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          {activeView !== 'dashboard' && (
            <button
              onClick={() => setActiveView('dashboard')}
              className="p-2 rounded-lg hover:bg-card transition-colors"
              title="Volver al dashboard"
            >
              <svg className="w-6 h-6 text-theme" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="w-8 h-8 text-theme inline-block align-middle flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
            </svg>
          </span>
          {activeView === 'dashboard' && 'Módulo de Ventas'}
          {activeView === 'sales-history' && 'Historial de Ventas'}
          {activeView === 'resumen-ordenes' && 'Resumen de Órdenes'}
          {activeView === 'pendientes' && 'Pendientes'}
          {activeView === 'historial-despachos' && 'Historial de Despachos'}
        </h1>
      </div>

      {/* Render dashboard o vista específica */}
      {renderView()}
    </div>
  );
}

export default SalesSimple;