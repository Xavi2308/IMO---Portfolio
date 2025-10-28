import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const ResumenOrdenes = () => {
  const { company } = useAuth();
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReference, setSelectedReference] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    fetchActiveReferences();
  }, [company]);

  const fetchActiveReferences = async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferences(data || []);
    } catch (error) {
      console.error('Error fetching active references:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDispatch = async (saleId) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ 
          dispatch_type: 'consolidated'
        })
        .eq('id', saleId)
        .eq('company_id', company.id);

      if (error) throw error;

      fetchActiveReferences();
      alert('Venta marcada como lista para despacho');
    } catch (error) {
      console.error('Error requesting dispatch:', error);
      alert('Error al solicitar despacho');
    }
  };

  const ReferenceCard = ({ reference }) => {
    const isExpanded = expandedCard === reference.id;
    const totalSales = reference.sales?.length || 0;
    const totalItems = reference.total_items || 0;
    const totalValue = reference.total_value || 0;

    return (
      <div className="bg-card rounded-lg border border-default shadow-sm p-4 mb-4">
        {/* Header de la tarjeta */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-theme">{reference.reference_code}</h3>
            <p className="text-text-muted text-sm">{reference.customers?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-muted">Estado</p>
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Activa
            </span>
          </div>
        </div>

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

        {/* Botones */}
        <div className="flex gap-2">
          <button
            onClick={() => setExpandedCard(isExpanded ? null : reference.id)}
            className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
          >
            {isExpanded ? 'Contraer' : 'Ver Detalle'}
          </button>
          <button
            onClick={() => handleRequestDispatch(reference.reference_code)}
            className="bg-theme text-text-inverted px-4 py-2 rounded text-sm hover:bg-theme-hover transition-colors"
          >
            Solicitar Despacho
          </button>
        </div>

        {/* Detalle expandido */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-default">
            <h4 className="font-medium text-text mb-3">Detalle de Ventas</h4>
            {reference.sales?.map((sale) => (
              <div key={sale.id} className="bg-muted rounded p-3 mb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Consecutivo #{sale.consecutive_number}</span>
                  <span className="text-sm text-text-muted">
                    {new Date(sale.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Items: {sale.total_pairs}</div>
                  <div>Total: ${sale.total_value?.toLocaleString()}</div>
                </div>
                {sale.sale_items && (
                  <div className="mt-2">
                    <p className="text-xs text-text-muted mb-1">Productos:</p>
                    {sale.sale_items.map((item, idx) => (
                      <div key={idx} className="text-xs text-text-muted">
                        {item.reference} - {item.color} - Talla {item.size} (x{item.quantity})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text">Resumen de Órdenes</h1>
        <button
          onClick={fetchActiveReferences}
          className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover transition-colors"
        >
          🔄 Actualizar
        </button>
      </div>

      {references.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-muted mb-2">No hay referencias activas</h3>
          <p className="text-text-muted">Las referencias aparecerán aquí cuando se realicen ventas pendientes de despacho.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {references.map((reference) => (
            <ReferenceCard key={reference.id} reference={reference} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumenOrdenes;