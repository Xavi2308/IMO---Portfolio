/**
 * @file OnboardingDashboardBasic.jsx
 * @description Dashboard básico sin dependencias de Material-UI
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding, useOnboardingStatus } from '../hooks/useOnboarding';
import OnboardingProgressBasic from './OnboardingProgressBasic';
import './OnboardingDashboard.css';

const OnboardingDashboardBasic = () => {
  const { user, company } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const {
    currentStep,
    isCompleted,
    progress,
    needsOnboarding,
    isLoading
  } = useOnboardingStatus();

  const {
    navigateToCurrentStep
  } = useOnboarding(company?.id, user?.id);

  // Quick actions para usuarios nuevos
  const quickActions = [
    {
      id: 'products',
      title: 'Agregar Productos',
      description: 'Comienza agregando tus primeros productos al inventario',
      icon: '📦',
      color: 'primary',
      route: '/products/new'
    },
    {
      id: 'team',
      title: 'Invitar Equipo',
      description: 'Invita a tu equipo para colaborar en el inventario',
      icon: '👥',
      color: 'secondary',
      route: '/team/invite'
    },
    {
      id: 'settings',
      title: 'Configurar Sistema',
      description: 'Personaliza la configuración según tu negocio',
      icon: '⚙️',
      color: 'info',
      route: '/settings'
    },
    {
      id: 'reports',
      title: 'Ver Reportes',
      description: 'Explora los reportes y analytics disponibles',
      icon: '📊',
      color: 'success',
      route: '/reports'
    }
  ];

  const handleStartOnboarding = () => {
    if (currentStep && currentStep !== 'completed') {
      navigateToCurrentStep();
    }
  };

  const handleQuickAction = (action) => {
    console.log('Navegando a:', action.route);
    // Aquí implementarías la navegación real
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header de bienvenida */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">¡Bienvenido a IMO! 👋</h1>
        <p className="dashboard-subtitle">
          Hola {user?.first_name}, estás en {company?.name || 'tu empresa'}
        </p>
      </div>

      {/* Alerta de onboarding si no está completado */}
      {needsOnboarding && !isCompleted && (
        <div className="onboarding-alert">
          <div className="alert-content">
            <div className="alert-info">
              <h3>Configuración Pendiente ({progress}% completado)</h3>
              <p>Completa la configuración inicial para aprovechar al máximo todas las funcionalidades.</p>
            </div>
            <div className="alert-actions">
              <button 
                className="btn btn-primary"
                onClick={handleStartOnboarding}
              >
                ▶️ Continuar
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => setShowOnboarding(true)}
              >
                Ver Progreso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progreso mini si no está completado */}
      {needsOnboarding && !showOnboarding && (
        <div className="progress-mini-container">
          <OnboardingProgressBasic
            companyId={company?.id}
            userId={user?.id}
            variant="mini"
          />
        </div>
      )}

      <div className="dashboard-content">
        {/* Stats principales */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Productos</p>
                <h3 className="stat-value">0</h3>
              </div>
              <div className="stat-icon">📦</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Usuarios</p>
                <h3 className="stat-value">1</h3>
              </div>
              <div className="stat-icon">👥</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Ventas</p>
                <h3 className="stat-value">$0</h3>
              </div>
              <div className="stat-icon">💰</div>
            </div>
          </div>
        </div>

        {/* Panel de acciones rápidas */}
        <div className="quick-actions-panel">
          <div className="panel-header">
            <h2>Acciones Rápidas</h2>
            <p>Configuraciones recomendadas para comenzar</p>
          </div>
          
          <div className="actions-grid">
            {quickActions.map((action) => (
              <button
                key={action.id}
                className={`action-card ${action.color}`}
                onClick={() => handleQuickAction(action)}
              >
                <div className="action-icon">{action.icon}</div>
                <div className="action-content">
                  <h4>{action.title}</h4>
                  <p>{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mensaje de completado */}
        {isCompleted && (
          <div className="completion-banner">
            <div className="completion-icon">✅</div>
            <div className="completion-content">
              <h3>¡Configuración Completada! 🎉</h3>
              <p>Tu cuenta está completamente configurada. ¡Ya puedes comenzar a usar todas las funcionalidades de IMO!</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de progreso de onboarding */}
      {showOnboarding && (
        <div className="modal-overlay" onClick={() => setShowOnboarding(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Progreso de Configuración</h2>
              <button 
                className="modal-close"
                onClick={() => setShowOnboarding(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <OnboardingProgressBasic
                companyId={company?.id}
                userId={user?.id}
                variant="full"
                showActions={true}
                onStepClick={(step) => {
                  console.log('Navegando a paso:', step);
                  setShowOnboarding(false);
                }}
              />
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline"
                onClick={() => setShowOnboarding(false)}
              >
                Cerrar
              </button>
              {!isCompleted && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    handleStartOnboarding();
                    setShowOnboarding(false);
                  }}
                >
                  Continuar Configuración
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingDashboardBasic;