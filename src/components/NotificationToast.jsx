import React, { useState, useEffect } from 'react';

const NotificationToast = ({ notification, onClose, onAction }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Animación de entrada
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-cerrar después de 10 segundos si no es crítica
    const autoCloseTimer = setTimeout(() => {
      if (!['sale_pending', 'order_created'].includes(notification.type)) {
        handleClose();
      }
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoCloseTimer);
    };
  }, [notification.type]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  };

  const handleAction = (action) => {
    onAction(notification, action);
    handleClose();
  };

  // Configuración por tipo de notificación
  const getNotificationConfig = () => {
    switch (notification.type) {
      case 'sale_pending':
        return {
          icon: (
            <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
            </svg>
          ),
          iconBg: 'bg-warning-light',
          borderColor: 'border-warning',
          title: 'Nueva Venta Pendiente',
          priority: 'high',
          sound: true,
          actions: [
            { id: 'accept', label: 'Aceptar', color: 'bg-success text-white', icon: '✓' },
            { id: 'reject', label: 'Rechazar', color: 'bg-error text-white', icon: '✗' }
          ]
        };
      case 'sale_confirmed':
        return {
          icon: (
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ),
          iconBg: 'bg-success-light',
          borderColor: 'border-success',
          title: 'Venta Confirmada',
          priority: 'medium',
          sound: false,
          actions: [
            { id: 'view', label: 'Ver Detalles', color: 'bg-theme text-white', icon: '👁' }
          ]
        };
      case 'sale_rejected':
        return {
          icon: (
            <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          iconBg: 'bg-error-light',
          borderColor: 'border-error',
          title: 'Venta Rechazada',
          priority: 'medium',
          sound: false,
          actions: [
            { id: 'view', label: 'Ver Detalles', color: 'bg-theme text-white', icon: '👁' }
          ]
        };
      case 'order_created':
        return {
          icon: (
            <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
          iconBg: 'bg-info-light',
          borderColor: 'border-info',
          title: 'Nuevo Pedido',
          priority: 'high',
          sound: true,
          actions: [
            { id: 'view', label: 'Ver Pedido', color: 'bg-theme text-white', icon: '📋' }
          ]
        };
      default:
        return {
          icon: (
            <svg className="w-6 h-6 text-theme" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          iconBg: 'bg-theme-light',
          borderColor: 'border-theme',
          title: 'Notificación',
          priority: 'low',
          sound: false,
          actions: [
            { id: 'dismiss', label: 'Cerrar', color: 'bg-background-secondary text-text', icon: '✕' }
          ]
        };
    }
  };

  const config = getNotificationConfig();

  return (
    <div
      className={`fixed top-20 right-4 z-[9999] max-w-md transition-all duration-300 transform ${
        isVisible && !isClosing
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className={`bg-card rounded-lg shadow-lg border-l-4 ${config.borderColor} p-4 backdrop-blur-md`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.iconBg} flex items-center justify-center`}>
              {config.icon}
            </div>
            <div>
              <h4 className="font-semibold text-text">{config.title}</h4>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  config.priority === 'high' ? 'bg-error text-white' :
                  config.priority === 'medium' ? 'bg-warning text-white' :
                  'bg-background-secondary text-text'
                }`}>
                  {config.priority === 'high' ? '🔴 Urgente' :
                   config.priority === 'medium' ? '🟡 Importante' :
                   '🟢 Info'}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(notification.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-text-muted hover:text-text transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        <div className="mb-4">
          <p className="text-text text-sm leading-relaxed">{notification.message}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {config.actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105 ${action.color} shadow-sm`}
            >
              <span className="mr-1">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>

        {/* Progress bar for auto-close */}
        {!['sale_pending', 'order_created'].includes(notification.type) && (
          <div className="mt-3 w-full bg-background-secondary rounded-full h-1">
            <div 
              className="bg-theme h-1 rounded-full transition-all duration-[10000ms] ease-linear"
              style={{ width: isVisible ? '0%' : '100%' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationToast;
