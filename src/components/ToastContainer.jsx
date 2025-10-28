import React, { useState, useEffect, useCallback } from 'react';
import Toast from './Toast';

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  // Función para añadir un toast
  const addToast = useCallback((data) => {
    const id = Date.now() + Math.random();
    const newToast = { 
      id, 
      title: data.title || 'Notificación',
      message: data.message || '',
      type: data.type || 'info',
      duration: data.duration || 4000
    };
    
    setToasts(prev => [...prev, newToast]);
  }, []);

  // Función para eliminar un toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Exponemos addToast globalmente para que otros componentes puedan usarlo
  useEffect(() => {
    window.showToast = addToast;
    
    return () => {
      delete window.showToast;
    };
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
        >
          <Toast
            title={toast.title}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
