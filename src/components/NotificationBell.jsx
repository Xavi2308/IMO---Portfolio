import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import Notifications from './Notifications';

const NotificationBell = ({ user, setError, setActiveModule }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    fetchUnreadCount();

    // Suscripción a cambios en notificaciones
    const subscription = supabase
      .channel(`notifications:user:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Incrementar contador cuando llega una nueva notificación
          setUnreadCount(prev => prev + 1);
          
          // Mostrar toast de notificación
          if (window.showToast) {
            const notificationTypeMap = {
              'sale_pending': 'Nueva venta pendiente de aprobación',
              'sale_confirmed': 'Venta confirmada',
              'sale_rejected': 'Venta rechazada',
              'order_created': 'Nuevo pedido creado'
            };
            
            const toastMessage = notificationTypeMap[payload.new.type] || 'Nueva notificación';
            window.showToast(toastMessage, 'notification', 4000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Decrementar contador cuando se elimina una notificación
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const fetchUnreadCount = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (err) {
      console.error('Error al obtener contador de notificaciones:', err);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleNotifications}
        className="relative p-3 rounded-xl hover:bg-secondary-2/20 transition-all duration-300 border border-transparent hover:border-secondary-2/30 group"
      >
        {/* Icono de campana con efecto hover */}
        <svg 
          className="w-6 h-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-5-5.917V5a2 2 0 10-2 0v.083A6.002 6.002 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Badge con contador mejorado */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-secondary-4 to-secondary-4/80 text-white text-xs font-bold rounded-full min-w-6 h-6 flex items-center justify-center animate-bounce border-2 border-background shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Anillo de pulso para notificaciones activas */}
        {unreadCount > 0 && (
          <div className="absolute inset-0 rounded-xl border-2 border-theme/30 animate-ping"></div>
        )}
        
        {/* Indicador de pulso cuando está abierto */}
        {showNotifications && unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-theme rounded-full animate-pulse"></span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {showNotifications && (
        <>
          {/* Overlay para cerrar al hacer clic afuera */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowNotifications(false)}
          />
          
          {/* Panel de notificaciones mejorado */}
          <div className="absolute right-0 mt-3 z-40 animate-slide-in">
            <div className="relative">
              {/* Flecha apuntando hacia arriba */}
              <div className="absolute -top-2 right-6 w-4 h-4 bg-gradient-to-r from-theme to-secondary-1 transform rotate-45 border-l border-t border-secondary-2"></div>
              
              {/* Contenedor principal */}
              <div className="shadow-2xl border border-secondary-2/50 rounded-2xl overflow-hidden">
                <Notifications 
                  user={user} 
                  setError={setError} 
                  setActiveModule={setActiveModule}
                  onNotificationUpdate={fetchUnreadCount}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
