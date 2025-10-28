
import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function Notifications({ user, setError, setActiveModule }) {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

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
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      setError(`Error al obtener notificaciones: ${err.message}`);
    }
  };

  const markAsRead = async (id) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    } catch (err) {
      setError(`Error al eliminar notificación: ${err.message}`);
    }
  };

  const handleAcceptSale = async (notification) => {
    try {
      const { error: saleError } = await supabase
        .from('sales')
        .update({ status: 'confirmed', approved_by: user.id, approved_at: new Date().toISOString() })
        .eq('id', notification.sale_id);
      if (saleError) throw saleError;

      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', notification.sale_id);
      if (itemsError) throw itemsError;

      const movementsToInsert = saleItems.map(item => ({
        user_id: user.id,
        movement_type: 'salida',
        quantity: item.quantity,
        method: 'manual',
        details: JSON.stringify({
          reference: item.reference,
          color: item.color,
          size: item.size,
          sale_id: notification.sale_id,
          reason: 'venta'
        }),
        timestamp: new Date().toISOString(),
      }));

      if (movementsToInsert.length > 0) {
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert(movementsToInsert);
        if (movementError) throw movementError;
      }

      const { data: sale, error: saleFetchError } = await supabase
        .from('sales')
        .select('id, created_by, customers(name)')
        .eq('id', notification.sale_id)
        .single();
      if (saleFetchError || !sale) throw new Error('Venta no encontrada.');

      const { data: creator, error: creatorError } = await supabase
        .from('users')
        .select('username')
        .eq('id', sale.created_by)
        .single();
      if (creatorError || !creator) throw new Error('Usuario creador no encontrado.');

      const { error: notifyCreatorError } = await supabase
        .from('notifications')
        .insert({
          user_id: sale.created_by,
          message: `La venta de ${sale.customers.name} ya fue confirmada por ${user.username}.`,
          created_at: new Date().toISOString(),
          read: false,
          sale_id: notification.sale_id,
          type: 'sale_confirmed',
        });
      if (notifyCreatorError) throw notifyCreatorError;

      await supabase.from('notifications').delete().eq('id', notification.id);
      fetchNotifications();
    } catch (err) {
      setError(`Error al aceptar venta: ${err.message}`);
      console.error('Error in handleAcceptSale:', err);
    }
  };

  const handleRejectSale = async (notification) => {
    try {
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', notification.sale_id);
      if (itemsError) throw itemsError;
      if (!saleItems || saleItems.length === 0) throw new Error('No se encontraron ítems para la venta.');

      for (const item of saleItems) {
        const { data: products, error: productError } = await supabase
          .from('products')
          .select('id')
          .eq('reference', item.reference);
        if (productError) throw productError;
        if (!products || products.length === 0) {
          console.warn(`Producto no encontrado para referencia: ${item.reference}`);
          continue;
        }
        if (products.length > 1) console.warn(`Múltiples productos encontrados para referencia ${item.reference}. Buscando variación en todos.`);

        let variationFound = false;
        for (const product of products) {
          const { data: variation, error: variationError } = await supabase
            .from('variations')
            .select('id, stock')
            .eq('product_id', product.id)
            .eq('color', item.color)
            .eq('size', item.size)
            .single();
          if (variationError) {
            if (variationError.code === 'PGRST116') {
              console.warn(`No se encontró variación para product_id: ${product.id}, color: ${item.color}, size: ${item.size}`);
              continue;
            }
            throw variationError;
          }
          if (variation) {
            variationFound = true;
            const { error: stockError } = await supabase
              .from('variations')
              .update({ stock: variation.stock + item.quantity })
              .eq('id', variation.id);
            if (stockError) throw stockError;
            break;
          }
        }

        if (!variationFound) {
          console.warn(`No se encontró variación válida para referencia: ${item.reference}, color: ${item.color}, size: ${item.size}. Saltando actualización de stock.`);
          continue;
        }
      }

      const movementsToInsert = saleItems.map(item => ({
        user_id: user.id,
        movement_type: 'entrada',
        quantity: item.quantity,
        method: 'manual',
        details: JSON.stringify({
          reference: item.reference,
          color: item.color,
          size: item.size,
          sale_id: notification.sale_id,
          reason: 'devolucion_venta_rechazada'
        }),
        timestamp: new Date().toISOString(),
      }));

      if (movementsToInsert.length > 0) {
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert(movementsToInsert);
        if (movementError) throw movementError;
      }

      const { data: saleUpdate, error: saleUpdateError } = await supabase
        .from('sales')
        .update({ status: 'rejected', approved_by: user.id, approved_at: new Date().toISOString() })
        .eq('id', notification.sale_id)
        .select('id')
        .single();
      if (saleUpdateError || !saleUpdate) throw new Error('Venta no encontrada o no se pudo actualizar.');

      const { data: sale, error: saleFetchError } = await supabase
        .from('sales')
        .select('id, created_by, customers(name)')
        .eq('id', notification.sale_id)
        .single();
      if (saleFetchError || !sale) throw new Error('Venta no encontrada.');

      const { data: creator, error: creatorError } = await supabase
        .from('users')
        .select('username')
        .eq('id', sale.created_by)
        .single();
      if (creatorError || !creator) throw new Error('Usuario creador no encontrado.');

      const { error: notifyCreatorError } = await supabase
        .from('notifications')
        .insert({
          user_id: sale.created_by,
          message: `La venta de ${sale.customers.name} fue rechazada por ${user.username}.`,
          created_at: new Date().toISOString(),
          read: false,
          sale_id: notification.sale_id,
          type: 'sale_rejected',
        });
      if (notifyCreatorError) throw notifyCreatorError;

      await supabase.from('notifications').delete().eq('id', notification.id);
      fetchNotifications();
    } catch (err) {
      setError(`Error al rechazar venta: ${err.message}`);
      console.error('Error in handleRejectSale:', err);
    }
  };

  const handleOrderNotificationClick = async (notification) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', notification.id);
      setActiveModule('orders');
      navigate('/');
      fetchNotifications();
    } catch (err) {
      setError(`Error al manejar notificación: ${err.message}`);
    }
  };

  return (
    <div
      className="backdrop-blur-xl bg-background/80 border border-secondary-2 rounded-2xl shadow-2xl p-4 max-h-[28rem] overflow-y-auto custom-scrollbar"
      style={{ minWidth: 340 }}
    >
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-6 h-6 text-theme inline-block align-middle flex-shrink-0">
          {/* Notifications icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
          </svg>
        </span>
        <span className="flex-shrink-0 text-theme">Notificaciones</span>
      </h3>
      {notifications.length === 0 ? (
        <p className="text-text">No hay notificaciones.</p>
      ) : (
        notifications.map((notification) => {
          // Icono y color según tipo
          let icon, iconBg, badge, borderColor;
          switch (notification.type) {
            case 'sale_pending':
              icon = (
                <svg className="w-6 h-6 text-theme" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3" /></svg>
              );
              iconBg = 'bg-theme/10';
              badge = <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-theme text-text-inverted">Nueva</span>;
              borderColor = 'border-theme';
              break;
            case 'sale_confirmed':
              icon = (
                <svg className="w-6 h-6 text-secondary-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              );
              iconBg = 'bg-secondary-2/10';
              badge = <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary-2 text-text-inverted">Confirmada</span>;
              borderColor = 'border-secondary-2';
              break;
            case 'sale_rejected':
              icon = (
                <svg className="w-6 h-6 text-secondary-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              );
              iconBg = 'bg-secondary-4/10';
              badge = <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary-4 text-text-inverted">Rechazada</span>;
              borderColor = 'border-secondary-4';
              break;
            case 'order_created':
              icon = (
                <svg className="w-6 h-6 text-secondary-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18" /></svg>
              );
              iconBg = 'bg-secondary-1/10';
              badge = <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary-1 text-text">Pedido</span>;
              borderColor = 'border-secondary-1';
              break;
            default:
              icon = (
                <svg className="w-6 h-6 text-theme" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" /></svg>
              );
              iconBg = 'bg-theme/10';
              badge = null;
              borderColor = 'border-theme';
          }
          return (
            <div
              key={notification.id}
              className={`flex items-start gap-3 p-4 mb-3 rounded-xl shadow border-l-4 ${borderColor} bg-card animate-fade-in`}
              style={{ minHeight: 64, backdropFilter: 'blur(8px)', background: 'var(--card, #222c)' }}
            >
              <div className={`flex-shrink-0 rounded-full p-2 ${iconBg} flex items-center justify-center shadow`} style={{backdropFilter:'blur(2px)'}}>{icon}</div>
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <span className="font-semibold text-text text-base">{notification.message}</span>
                  {badge}
                  {!notification.read && <span className="ml-2 w-2 h-2 rounded-full bg-theme animate-pulse"></span>}
                </div>
                <div className="flex items-center text-xs text-text-muted">
                  <svg className="w-4 h-4 mr-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {new Date(notification.created_at).toLocaleString()}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {!notification.read && notification.type === 'sale_pending' && ['admin', 'produccion'].includes(user?.role) && (
                    <>
                      <button
                        onClick={() => handleAcceptSale(notification)}
                        className="bg-theme text-text-inverted px-3 py-1 rounded-lg text-sm font-medium shadow-sm hover:bg-theme-hover transition-all"
                      >
                        ✓ Aceptar
                      </button>
                      <button
                        onClick={() => handleRejectSale(notification)}
                        className="bg-secondary-4 text-text-inverted px-3 py-1 rounded-lg text-sm font-medium shadow-sm hover:bg-theme-hover transition-all"
                      >
                        ✗ Rechazar
                      </button>
                    </>
                  )}
                  {!notification.read && notification.type === 'order_created' && (
                    <button
                      onClick={() => handleOrderNotificationClick(notification)}
                      className="bg-theme text-text-inverted px-3 py-1 rounded-lg text-sm font-medium shadow-sm hover:bg-theme-hover transition-all"
                    >
                      Ver Pedido
                    </button>
                  )}
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="bg-theme text-text-inverted px-3 py-1 rounded-lg text-sm font-medium shadow-sm hover:bg-theme-hover transition-all"
                    >
                      Marcar como leído
                    </button>
                  )}
                  {notification.sale_id && notification.type !== 'sale_pending' && (
                    <button
                      onClick={() => {
                        setActiveModule('sales');
                        navigate('/');
                      }}
                      className="bg-theme text-text-inverted px-3 py-1 rounded-lg text-sm font-medium shadow-sm hover:bg-theme-hover transition-all"
                    >
                      Ver Venta
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Notifications;