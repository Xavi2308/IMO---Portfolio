import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const HistorialDespachos = () => {
  const { company } = useAuth();
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    customerName: ''
  });
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    fetchReferences();
  }, [company, filters]);

  const fetchReferences = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          customers!sales_customer_id_fkey(name, phone, email),
          sale_items(*)
        `)
        .eq('company_id', company.id)
        .eq('status', 'confirmed')
        .in('dispatch_type', ['separate', 'consolidated']);

      // Aplicar filtros basados en dispatch_type como status
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'pending_dispatch') {
          query = query.eq('dispatch_type', 'separate');
        } else if (filters.status === 'dispatched') {
          query = query.eq('dispatch_type', 'consolidated');
        }
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      let filteredData = data || [];
      
      // Filtro por nombre de cliente (cliente side)
      if (filters.customerName) {
        filteredData = filteredData.filter(sale => 
          sale.customers?.name?.toLowerCase().includes(filters.customerName.toLowerCase())
        );
      }
      
      setReferences(filteredData);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (dispatch_type) => {
    const statusConfig = {
      separate: { color: 'bg-orange-100 text-orange-800', label: 'Pendiente Despacho' },
      consolidated: { color: 'bg-green-100 text-green-800', label: 'Despachada' }
    };

    const config = statusConfig[dispatch_type] || statusConfig.separate;
    return (
      <span className={`inline-block px-2 py-1 ${config.color} text-xs rounded-full`}>
        {config.label}
      </span>
    );
  };

  const exportToExcel = () => {
    // Preparar datos para exportar
    const exportData = references.map(ref => ({
      'Número Consecutivo': ref.consecutive_number,
      'Cliente': ref.customers?.name || '',
      'Estado': ref.dispatch_type === 'separate' ? 'Pendiente' : 'Despachada',
      'Pares Totales': ref.total_pairs,
      'Valor Total': ref.total_value,
      'Fecha Creación': new Date(ref.created_at).toLocaleDateString(),
      'Tipo Despacho': ref.dispatch_type,
      'Items': ref.sale_items?.length || 0
    }));

    // Crear CSV manualmente
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_referencias_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ReferenceCard = ({ reference }) => {
    const isExpanded = expandedCard === reference.id;
    const totalSales = reference.sales?.length || 0;
    const totalItems = reference.total_items || 0;
    const totalValue = reference.total_value || 0;

    return (
      <div className="bg-card rounded-lg border border-default shadow-sm p-4 mb-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-theme">{reference.reference_code}</h3>
            <p className="text-text-muted text-sm">{reference.customers?.name}</p>
            <p className="text-xs text-text-muted">
              Creado: {new Date(reference.created_at).toLocaleDateString()}
              {reference.dispatched_at && (
                <span className="ml-2">
                  | Despachado: {new Date(reference.dispatched_at).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            {getStatusBadge(reference.dispatch_type)}
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

        {/* Botón para expandir */}
        <button
          onClick={() => setExpandedCard(isExpanded ? null : reference.id)}
          className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
        >
          {isExpanded ? 'Contraer Detalle' : 'Ver Detalle Completo'}
        </button>

        {/* Detalle expandido */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-default">
            <h4 className="font-medium text-text mb-3">Historial de Ventas</h4>
            {reference.sales?.map((sale) => (
              <div key={sale.id} className="bg-muted rounded p-3 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">
                    Consecutivo #{sale.consecutive_number}
                  </span>
                  <div className="text-right">
                    <div className="text-sm text-text-muted">
                      {new Date(sale.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs">
                      {sale.dispatch_type === 'dispatch' ? '📦 Despacho' : '📋 Apartado'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div>Items: {sale.total_pairs}</div>
                  <div>Total: ${sale.total_value?.toLocaleString()}</div>
                </div>
                
                {sale.sale_items && sale.sale_items.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">Productos:</p>
                    <div className="grid grid-cols-1 gap-1">
                      {sale.sale_items.map((item, idx) => (
                        <div key={idx} className="text-xs bg-white rounded p-1">
                          <span className="font-medium">{item.reference}</span>
                          <span className="mx-1">•</span>
                          <span>{item.color}</span>
                          <span className="mx-1">•</span>
                          <span>Talla {item.size}</span>
                          <span className="mx-1">•</span>
                          <span className="font-medium">Cant: {item.quantity}</span>
                          <span className="float-right">${item.subtotal?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
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
        <h1 className="text-2xl font-bold text-text">Historial de Referencias</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            disabled={references.length === 0}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            📊 Exportar CSV
          </button>
          <button
            onClick={fetchReferences}
            className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover transition-colors"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-lg border border-default p-4 mb-6">
        <h3 className="font-medium text-text mb-3">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full p-2 border border-default rounded text-sm"
            >
              <option value="all">Todos</option>
              <option value="active">Activas</option>
              <option value="pending_dispatch">Pendiente Despacho</option>
              <option value="dispatched">Despachadas</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Desde</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full p-2 border border-default rounded text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Hasta</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full p-2 border border-default rounded text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Cliente</label>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={filters.customerName}
              onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))}
              className="w-full p-2 border border-default rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-blue-600 text-sm font-medium">Total Referencias</div>
          <div className="text-2xl font-bold text-blue-800">{references.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-green-600 text-sm font-medium">Despachadas</div>
          <div className="text-2xl font-bold text-green-800">
            {references.filter(r => r.dispatch_type === 'consolidated').length}
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-orange-600 text-sm font-medium">Pendientes</div>
          <div className="text-2xl font-bold text-orange-800">
            {references.filter(r => r.dispatch_type === 'separate').length}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-purple-600 text-sm font-medium">Valor Total</div>
          <div className="text-2xl font-bold text-purple-800">
            ${references.reduce((sum, ref) => sum + (ref.total_value || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Lista de referencias */}
      {references.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-muted mb-2">No se encontraron referencias</h3>
          <p className="text-text-muted">Ajusta los filtros o verifica que existan referencias en el sistema.</p>
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

export default HistorialDespachos;