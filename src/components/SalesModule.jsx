import React from 'react';
import StockView from './StockView';
import Sales from './Sales';

// Componente para tarjetas de navegación
const SalesCard = ({ title, description, icon, onClick, bgColor, isActive }) => (
  <div 
    className={`relative group cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
      isActive ? 'ring-2 ring-theme-main' : ''
    }`}
    onClick={onClick}
  >
    <div className={`bg-card rounded-xl p-6 shadow-md border border-default h-full`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-theme-c3 rounded-lg flex items-center justify-center shadow-sm">
            {icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-2 text-text">{title}</h3>
          <p className="text-sm leading-relaxed text-text-muted">{description}</p>
        </div>
        <div className="flex-shrink-0">
          <svg 
            className="w-5 h-5 transition-colors duration-300 text-text-muted group-hover:text-text"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

const SalesModule = ({ setActiveModule: setMainActiveModule, user, setError, errorMessage }) => {
  // Función helper para verificar permisos
  const hasAccess = (requiredRoles) => {
    return requiredRoles.includes(user?.role);
  };

  // Vista principal con tarjetas
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-default px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-text">Módulo de Ventas</h1>
          <p className="text-text-muted">Gestiona todas las operaciones relacionadas con ventas</p>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Tarjeta Stock */}
          <SalesCard
            title="Stock"
            description="Gestiona el inventario de productos, registra nuevas ventas, controla existencias y actualiza el estado del stock en tiempo real."
            icon={
              <svg className="w-6 h-6 text-theme-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
            onClick={() => {
              if (setMainActiveModule) {
                setMainActiveModule('stock');
              }
            }}
          />

          {/* Tarjeta Historial de Ventas */}
          <SalesCard
            title="Historial de Ventas"
            description="Consulta el historial completo de ventas, filtra por fechas y clientes, y exporta reportes detallados en Excel."
            icon={
              <svg className="w-6 h-6 text-theme-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            onClick={() => {
              if (setMainActiveModule) {
                setMainActiveModule('sales-history');
              }
            }}
          />

          {/* Tarjeta Reportes y Análisis */}
          <SalesCard
            title="Reportes y Análisis"
            description="Genera reportes detallados de ventas, análisis de rendimiento y estadísticas para la toma de decisiones."
            icon={
              <svg className="w-6 h-6 text-theme-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
              </svg>
            }
            onClick={() => {
              // Funcionalidad pendiente de implementar
              alert('Próximamente: Módulo de reportes y análisis en desarrollo');
            }}
          />

          {/* Tarjeta Clientes */}
          <SalesCard
            title="Gestión de Clientes"
            description="Administra información de clientes, historial de compras y datos de contacto para mejorar el servicio."
            icon={
              <svg className="w-6 h-6 text-theme-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            }
            onClick={() => {
              if (setMainActiveModule) {
                setMainActiveModule('clientes');
              }
            }}
          />

        </div>

        {/* Sección de estadísticas rápidas */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6 text-text">Resumen del día</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg p-4 shadow-sm border border-default">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-muted">Ventas del día</p>
                  <p className="text-2xl font-bold text-text">--</p>
                </div>
                <div className="w-8 h-8 bg-theme-c3 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-theme-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-lg p-4 shadow-sm border border-default">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-muted">Productos apartados</p>
                  <p className="text-2xl font-bold text-text">--</p>
                </div>
                <div className="w-8 h-8 bg-theme-c3 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-theme-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-lg p-4 shadow-sm border border-default">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-muted">Despachos</p>
                  <p className="text-2xl font-bold text-text">--</p>
                </div>
                <div className="w-8 h-8 bg-theme-c3 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-theme-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-lg p-4 shadow-sm border border-default">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-muted">Total ventas</p>
                  <p className="text-2xl font-bold text-text">$ --</p>
                </div>
                <div className="w-8 h-8 bg-theme-c3 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-theme-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesModule;