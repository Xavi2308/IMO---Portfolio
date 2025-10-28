import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

function OrdersSummary({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar órdenes activas
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('customer_orders')
        .select(`
          *,
          customers(name, document, phone),
          order_items(
            *,
            products(reference, image_url)
          )
        `)
        .eq('company_id', user.company_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Marcar item como apartado
  const handleCheckItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({
          is_checked: true,
          checked_by: user.id,
          checked_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;
      fetchOrders(); // Recargar datos
    } catch (err) {
      setError(err.message);
    }
  };

  // Desmarcar item
  const handleUncheckItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({
          is_checked: false,
          checked_by: null,
          checked_at: null
        })
        .eq('id', itemId);

      if (error) throw error;
      fetchOrders(); // Recargar datos
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user.company_id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
        <span className="ml-3 text-theme">Cargando órdenes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-600 dark:text-red-400">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-theme">Resumen de Órdenes</h2>
      
      {orders.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <p>No hay órdenes activas</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-card rounded-lg shadow-default border border-default p-6">
              {/* Header de la tarjeta */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-theme">
                    {order.customers?.name || 'Cliente sin nombre'}
                  </h3>
                  <p className="text-text-muted text-sm">
                    {order.customers?.document && `Doc: ${order.customers.document}`}
                    {order.customers?.phone && ` • Tel: ${order.customers.phone}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-muted">Total pares: {order.total_pairs}</p>
                  <p className="text-sm font-semibold text-theme">
                    ${order.total_amount?.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>

              {/* Items de la orden */}
              <div className="space-y-3">
                <h4 className="font-medium text-text">Referencias:</h4>
                {order.order_items?.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      item.is_checked 
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' 
                        : 'bg-background-secondary border-default'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Imagen del producto */}
                      {item.products?.image_url && (
                        <img 
                          src={item.products.image_url} 
                          alt={item.reference}
                          className="w-12 h-12 object-cover rounded-md"
                        />
                      )}
                      
                      {/* Información del item */}
                      <div>
                        <p className="font-medium">{item.reference}</p>
                        <p className="text-sm text-text-muted">
                          {item.color} • Talla {item.size} • Cant: {item.quantity}
                        </p>
                        <p className="text-sm text-theme font-medium">
                          ${item.subtotal?.toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>

                    {/* Botón de check */}
                    <div className="flex items-center space-x-2">
                      {item.is_checked && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          ✓ Apartado por {item.checked_by ? 'usuario' : 'sistema'}
                        </span>
                      )}
                      
                      {/* Solo mostrar botones si el usuario es auxiliar logístico o admin */}
                      {(user.role === 'auxiliar_logistico' || user.role === 'admin') && (
                        <button
                          onClick={() => item.is_checked ? handleUncheckItem(item.id) : handleCheckItem(item.id)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            item.is_checked
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
                              : 'bg-theme text-text-inverted hover:bg-theme-hover'
                          }`}
                        >
                          {item.is_checked ? '✓ Apartado' : 'Apartar'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer de la tarjeta */}
              <div className="mt-4 pt-4 border-t border-default">
                <div className="flex justify-between items-center text-sm text-text-muted">
                  <span>Creado: {new Date(order.created_at).toLocaleDateString('es-ES')}</span>
                  <span>
                    Items apartados: {order.order_items?.filter(item => item.is_checked).length} / {order.order_items?.length}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersSummary;