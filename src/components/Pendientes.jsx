import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const Pendientes = ({ user }) => {
  const { company } = useAuth();
  const [pendingReferences, setPendingReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPendingReferences();
  }, [company]);

  const fetchPendingReferences = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers!sales_customer_id_fkey(name, phone, email),
          sale_items(*)
        `)
        .eq('company_id', company.id)
        .eq('status', 'confirmed')
        .eq('dispatch_type', 'separate')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingReferences(data || []);
    } catch (error) {
      console.error('Error fetching pending references:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProcessing = async (saleId, action) => {
    setProcessingId(saleId);
    try {
      const newDispatchType = action === 'dispatch' ? 'consolidated' : 'separate';
      
      const { error } = await supabase
        .from('sales')
        .update({ 
          dispatch_type: newDispatchType
        })
        .eq('id', saleId)
        .eq('company_id', company.id);

      if (error) throw error;

      fetchPendingReferences();
      
      const message = action === 'dispatch' 
        ? 'Venta marcada como despachada correctamente'
        : 'Venta devuelta a estado pendiente';
      alert(message);
    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Error al procesar la venta');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBarcodeConfirm = (referenceCode) => {
    // Simular confirmación por código de barras
    const confirmed = window.confirm(
      `¿Confirmar despacho de la referencia ${referenceCode} por código de barras?`
    );
    if (confirmed) {
      handleConfirmProcessing(referenceCode, 'dispatch');
    }
  };

  const PendingCard = ({ reference }) => {
    const totalSales = reference.sales?.length || 0;
    const totalItems = reference.total_items || 0;
    const totalValue = reference.total_value || 0;
    const isProcessing = processingId === reference.reference_code;

    return (
      <div className="bg-card rounded-lg border border-default shadow-sm p-4 mb-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-theme">{reference.reference_code}</h3>
            <p className="text-text-muted text-sm">{reference.customers?.name}</p>
            <p className="text-xs text-text-muted">
              Solicitado: {new Date(reference.dispatched_at).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
              Pendiente Gestión
            </span>
          </div>
        </div>

        {/* Datos del cliente */}
        {reference.customers && (
          <div className="bg-muted rounded p-2 mb-3">
            <div className="text-xs">
              <span className="font-medium">Cliente:</span> {reference.customers.name}
              {reference.customers.phone && (
                <span className="ml-3"><span className="font-medium">Tel:</span> {reference.customers.phone}</span>
              )}
              {reference.customers.email && (
                <span className="ml-3"><span className="font-medium">Email:</span> {reference.customers.email}</span>
              )}
            </div>
          </div>
        )}

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <p className="text-xs text-text-muted">Ventas</p>
            <p className="text-lg font-semibold text-text">{totalSales}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Items</p>
            <p className="text-lg font-semibold text-text">{totalItems}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Total</p>
            <p className="text-lg font-semibold text-theme">${totalValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Productos */}
        <div className="mb-4">
          <p className="text-sm font-medium text-text mb-2">Productos a despachar:</p>
          <div className="max-h-32 overflow-y-auto">
            {reference.sales?.map((sale) => (
              sale.sale_items?.map((item, idx) => (
                <div key={`${sale.id}-${idx}`} className="text-sm text-text-muted bg-muted rounded p-1 mb-1">
                  <span className="font-medium">{item.reference}</span> - 
                  <span className="ml-1">{item.color}</span> - 
                  <span className="ml-1">Talla {item.size}</span> - 
                  <span className="ml-1 font-medium">Cant: {item.quantity}</span>
                </div>
              ))
            ))}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <button
            onClick={() => handleBarcodeConfirm(reference.reference_code)}
            disabled={isProcessing}
            className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            📱 Confirmar con Código
          </button>
          <button
            onClick={() => handleConfirmProcessing(reference.reference_code, 'dispatch')}
            disabled={isProcessing}
            className="flex-1 bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            ✅ Confirmar Despacho
          </button>
          <button
            onClick={() => handleConfirmProcessing(reference.reference_code, 'return')}
            disabled={isProcessing}
            className="bg-yellow-500 text-white px-3 py-2 rounded text-sm hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            ↩️ Devolver
          </button>
        </div>

        {isProcessing && (
          <div className="mt-2 text-center">
            <span className="text-sm text-text-muted">Procesando...</span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-40 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Referencias Pendientes</h1>
          <p className="text-text-muted text-sm">Gestión de despachos solicitados</p>
        </div>
        <button
          onClick={fetchPendingReferences}
          className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover transition-colors"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Instrucciones para el usuario de despachos */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-800 mb-2">Instrucciones de Gestión</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Confirmar con Código:</strong> Escanea el código de barras del producto para confirmar</li>
          <li>• <strong>Confirmar Despacho:</strong> Marca la referencia como despachada manualmente</li>
          <li>• <strong>Devolver:</strong> Regresa la referencia a estado activo si no se puede despachar</li>
        </ul>
      </div>

      {pendingReferences.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-muted mb-2">No hay referencias pendientes</h3>
          <p className="text-text-muted">Las referencias pendientes de gestión aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingReferences.map((reference) => (
            <PendingCard key={reference.id} reference={reference} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Pendientes;