import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

function DispatchModule({ user }) {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  // Cargar órdenes listas para despacho
  const fetchDispatches = async () => {
    try {
      setLoading(true);
      const { data: dispatchData, error: dispatchError } = await supabase
        .from('customer_orders')
        .select(`
          *,
          customers(name, document, phone, city, address),
          order_items(
            *,
            products(reference, image_url)
          )
        `)
        .eq('company_id', user.company_id)
        .in('status', ['ready_for_dispatch', 'pending'])
        .order('updated_at', { ascending: false });

      if (dispatchError) throw dispatchError;
      setDispatches(dispatchData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Marcar orden como despachada
  const handleDispatch = async (orderId) => {
    try {
      const { error } = await supabase
        .from('customer_orders')
        .update({
          status: 'dispatched',
          dispatched_at: new Date().toISOString(),
          dispatched_by: user.id
        })
        .eq('id', orderId);

      if (error) throw error;
      
      setSelectedDispatch(null);
      fetchDispatches(); // Recargar datos
    } catch (err) {
      setError(err.message);
    }
  };

  // Marcar orden como pendiente
  const handleSetPending = async (orderId) => {
    try {
      const { error } = await supabase
        .from('customer_orders')
        .update({
          status: 'pending'
        })
        .eq('id', orderId);

      if (error) throw error;
      
      setSelectedDispatch(null);
      fetchDispatches(); // Recargar datos
    } catch (err) {
      setError(err.message);
    }
  };

  // Marcar/desmarcar item como apartado
  const handleToggleItemCheck = async (itemId, isChecked) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({
          is_checked: !isChecked,
          checked_by: !isChecked ? user.id : null,
          checked_at: !isChecked ? new Date().toISOString() : null
        })
        .eq('id', itemId);

      if (error) throw error;
      fetchDispatches(); // Recargar datos
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, [user.company_id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
        <span className="ml-3 text-theme">Cargando despachos...</span>
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
      <h2 className="text-2xl font-bold mb-6 text-theme">Módulo de Despachos</h2>
      
      {dispatches.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <p>No hay órdenes para despacho</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {dispatches.map((dispatch) => (
            <div key={dispatch.id} className="bg-card rounded-lg shadow-default border border-default p-6">
              {/* Header de la tarjeta */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-theme">
                    {dispatch.customers?.name || 'Cliente sin nombre'}
                  </h3>
                  <p className="text-text-muted text-sm">
                    {dispatch.customers?.document && `Doc: ${dispatch.customers.document}`}
                    {dispatch.customers?.phone && ` • Tel: ${dispatch.customers.phone}`}
                  </p>
                  {dispatch.customers?.city && (
                    <p className="text-text-muted text-sm">
                      📍 {dispatch.customers.city}
                      {dispatch.customers?.address && ` - ${dispatch.customers.address}`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dispatch.status === 'ready_for_dispatch' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}>
                    {dispatch.status === 'ready_for_dispatch' ? 'Listo para despacho' : 'Pendiente'}
                  </span>
                  <p className="text-sm text-text-muted mt-1">Total pares: {dispatch.total_pairs}</p>
                  <p className="text-sm font-semibold text-theme">
                    ${dispatch.total_amount?.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>

              {/* Items del despacho */}
              <div className="space-y-3">
                <h4 className="font-medium text-text">Referencias a despachar:</h4>
                {dispatch.order_items?.map((item) => (
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

                    {/* Check apartado (solo para auxiliar logístico) */}
                    {(user.role === 'auxiliar_logistico' || user.role === 'admin') && (
                      <div className="flex items-center space-x-2">
                        {item.is_checked && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            ✓ Apartado
                          </span>
                        )}
                        
                        <button
                          onClick={() => handleToggleItemCheck(item.id, item.is_checked)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            item.is_checked
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
                              : 'bg-theme text-text-inverted hover:bg-theme-hover'
                          }`}
                        >
                          {item.is_checked ? '✓ Apartado' : 'Apartar'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Acciones del despacho */}
              <div className="mt-6 pt-4 border-t border-default">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-text-muted">
                    <p>Actualizado: {new Date(dispatch.updated_at).toLocaleDateString('es-ES')}</p>
                    <p>
                      Items apartados: {dispatch.order_items?.filter(item => item.is_checked).length} / {dispatch.order_items?.length}
                    </p>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleSetPending(dispatch.id)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-sm font-medium"
                    >
                      Dejar Pendiente
                    </button>
                    
                    <button
                      onClick={() => setSelectedDispatch(dispatch)}
                      className="px-4 py-2 bg-theme text-text-inverted rounded-md hover:bg-theme-hover transition-colors text-sm font-medium"
                    >
                      Despachado
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación de despacho */}
      {selectedDispatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-theme">Confirmar Despacho</h3>
            <p className="text-text mb-6">
              ¿Confirmas que has empacado y despachado todos los productos del pedido de{' '}
              <strong>{selectedDispatch.customers?.name}</strong>?
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedDispatch(null)}
                className="px-4 py-2 border border-default rounded-md hover:bg-background-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDispatch(selectedDispatch.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Confirmar Despacho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DispatchModule;