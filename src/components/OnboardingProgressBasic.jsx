/**
 * @file OnboardingProgressBasic.jsx
 * @description Componente básico de progreso sin dependencias de Material-UI
 */

import React, { useState } from 'react';
import { useOnboarding } from '../hooks/useOnboarding';
import './OnboardingProgress.css'; // CSS personalizado

// Iconos SVG simples
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
  </svg>
);

const CircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

const PersonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const BusinessIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
  </svg>
);

const PaymentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
  </svg>
);

// Configuración de pasos
const STEP_CONFIG = {
  registration: {
    title: 'Registro de Usuario',
    description: 'Crea tu cuenta personal',
    icon: PersonIcon
  },
  email_verification: {
    title: 'Verificación de Email',
    description: 'Confirma tu dirección de correo',
    icon: PersonIcon
  },
  company_setup: {
    title: 'Configuración de Empresa',
    description: 'Configura los datos de tu empresa',
    icon: BusinessIcon
  },
  industry_selection: {
    title: 'Selección de Industria',
    description: 'Elige tu sector empresarial',
    icon: BusinessIcon
  },
  plan_selection: {
    title: 'Selección de Plan',
    description: 'Escoge tu plan de suscripción',
    icon: PaymentIcon
  },
  team_invitation: {
    title: 'Invitar Equipo',
    description: 'Invita a tu equipo de trabajo',
    icon: PersonIcon
  },
  first_products: {
    title: 'Primeros Productos',
    description: 'Agrega tus primeros productos',
    icon: BusinessIcon
  },
  welcome_tour: {
    title: 'Tour de Bienvenida',
    description: 'Conoce las funcionalidades',
    icon: PersonIcon
  },
  completed: {
    title: 'Completado',
    description: 'Onboarding finalizado exitosamente',
    icon: CheckIcon
  }
};

const OnboardingProgressBasic = ({ 
  companyId, 
  userId, 
  variant = 'full',
  showActions = false,
  onStepClick = null,
  className = '',
  ...props 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const {
    currentStep,
    progress,
    getAllStepsInfo,
    isLoading,
    moveToNextStep,
    navigateToCurrentStep,
    isTransitioning
  } = useOnboarding(companyId, userId);

  const stepsInfo = getAllStepsInfo();

  if (isLoading) {
    return (
      <div className="onboarding-loading">
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: '50%' }}></div>
        </div>
        <p>Cargando progreso...</p>
      </div>
    );
  }

  // Versión mini - solo barra de progreso
  if (variant === 'mini') {
    return (
      <div className={`onboarding-mini ${className}`} {...props}>
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      </div>
    );
  }

  // Versión compacta
  if (variant === 'compact') {
    return (
      <div className={`onboarding-compact ${className}`} {...props}>
        <div className="header">
          <h3>Progreso del Onboarding</h3>
          <div className="header-actions">
            <span className="progress-percent">{progress}%</span>
            <button 
              className="expand-btn"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        </div>

        <div className="progress-bar">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <p className="current-step">
          Paso actual: {STEP_CONFIG[currentStep]?.title || currentStep}
        </p>

        {expanded && (
          <div className="steps-list">
            {stepsInfo.slice(0, -1).map((stepInfo) => {
              const config = STEP_CONFIG[stepInfo.step] || {};
              const IconComponent = config.icon || CircleIcon;
              
              return (
                <div 
                  key={stepInfo.step}
                  className={`step-item ${stepInfo.isActive ? 'active' : ''} ${stepInfo.isComplete ? 'complete' : ''}`}
                  onClick={() => onStepClick?.(stepInfo.step)}
                >
                  <div className="step-icon">
                    {stepInfo.isComplete ? <CheckIcon /> : <IconComponent />}
                  </div>
                  
                  <div className="step-content">
                    <div className="step-title">{config.title}</div>
                    {stepInfo.isActive && (
                      <span className="step-badge">Actual</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showActions && (
          <div className="actions">
            <button
              className="btn btn-outline"
              onClick={navigateToCurrentStep}
              disabled={isTransitioning}
            >
              Continuar
            </button>
            {currentStep !== 'completed' && (
              <button
                className="btn btn-text"
                onClick={moveToNextStep}
                disabled={isTransitioning}
              >
                Siguiente
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Versión completa
  return (
    <div className={`onboarding-full ${className}`} {...props}>
      <div className="header-section">
        <h2>Configuración Inicial</h2>
        <p>Complete estos pasos para configurar completamente su cuenta</p>
        
        <div className="progress-section">
          <div className="progress-bar large">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-percent large">{progress}%</span>
        </div>
      </div>

      <div className="stepper">
        {stepsInfo.slice(0, -1).map((stepInfo, index) => {
          const config = STEP_CONFIG[stepInfo.step] || {};
          const IconComponent = config.icon || CircleIcon;
          
          return (
            <div key={stepInfo.step} className="step">
              <div className="step-header">
                <div 
                  className={`step-circle ${stepInfo.isComplete ? 'complete' : ''} ${stepInfo.isActive ? 'active' : ''}`}
                  onClick={() => onStepClick?.(stepInfo.step)}
                >
                  {stepInfo.isComplete ? <CheckIcon /> : <IconComponent />}
                </div>
                
                {index < stepsInfo.length - 2 && (
                  <div className={`step-line ${stepInfo.isComplete ? 'complete' : ''}`}></div>
                )}
              </div>
              
              <div className="step-content">
                <h4 className={stepInfo.isActive ? 'active' : stepInfo.isComplete ? 'complete' : ''}>
                  {config.title}
                  {stepInfo.isActive && (
                    <span className="step-badge active">En progreso</span>
                  )}
                  {stepInfo.isComplete && (
                    <span className="step-badge complete">Completado</span>
                  )}
                </h4>
                <p>{config.description}</p>
                
                {stepInfo.data?.completed_at && (
                  <small className="completion-date">
                    Completado: {new Date(stepInfo.data.completed_at).toLocaleDateString()}
                  </small>
                )}
                
                {stepInfo.data?.skipped && (
                  <small className="skipped-info">
                    Omitido: {stepInfo.data.skip_reason || 'Sin razón especificada'}
                  </small>
                )}
              </div>

              {stepInfo.isActive && showActions && (
                <div className="step-actions">
                  <button
                    className="btn btn-primary"
                    onClick={navigateToCurrentStep}
                    disabled={isTransitioning}
                  >
                    Continuar Paso
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={moveToNextStep}
                    disabled={isTransitioning}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {progress === 100 && (
        <div className="completion-message">
          <div className="completion-icon">
            <CheckIcon />
          </div>
          <div className="completion-content">
            <h3>¡Configuración Completada!</h3>
            <p>Su cuenta está lista para usar. ¡Bienvenido a la plataforma!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingProgressBasic;