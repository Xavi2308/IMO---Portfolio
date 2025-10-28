// ========================================
// GENERADOR DE REMISIONES DE DESPACHO
// ========================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const DispatchRemissionGenerator = () => {
  const { company } = useAuth();
  const [dispatches, setDispatches] = useState([]);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [remissionData, setRemissionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'confirmed',
    dateFrom: '',
    dateTo: '',
    customerName: ''
  });

  useEffect(() => {
    fetchDispatches();
  }, [filters]);

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('dispatches')
        .select(`
          *,
          customer_account:customer_accounts(
            id,
            account_number,
            customer:customers(name, document, phone, address)
          ),
          dispatch_items(
            id,
            reference,
            color,
            size,
            quantity,
            confirmed,
            confirmed_at
          )
        `)
        .eq('company_id', company.id);

      // Aplicar filtros
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrar por nombre de cliente si se especifica
      let filteredDispatches = data || [];
      if (filters.customerName) {
        filteredDispatches = filteredDispatches.filter(
          dispatch => dispatch.customer_account?.customer?.name
            .toLowerCase().includes(filters.customerName.toLowerCase())
        );
      }

      setDispatches(filteredDispatches);
    } catch (error) {
      console.error('Error fetching dispatches:', error);
      alert('Error al cargar los despachos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRemission = async (dispatchId) => {
    setLoading(true);
    try {
      // Obtener número consecutivo para la remisión
      const { data: consecutiveNumber, error: consecutiveError } = await supabase
        .rpc('get_next_consecutive', {
          p_type: 'remission',
          p_company_id: company.id
        });

      if (consecutiveError) throw consecutiveError;

      // Obtener datos completos del despacho
      const { data: dispatch, error: dispatchError } = await supabase
        .from('dispatches')
        .select(`
          *,
          customer_account:customer_accounts(
            id,
            account_number,
            customer:customers(name, document, phone, address)
          ),
          dispatch_items(
            id,
            reference,
            color,
            size,
            quantity,
            confirmed,
            confirmed_at
          )
        `)
        .eq('id', dispatchId)
        .single();

      if (dispatchError) throw dispatchError;

      // Crear registro de remisión
      const { data: remission, error: remissionError } = await supabase
        .from('dispatch_remissions')
        .insert({
          dispatch_id: dispatchId,
          company_id: company.id,
          remission_number: consecutiveNumber,
          customer_name: dispatch.customer_account.customer.name,
          customer_document: dispatch.customer_account.customer.document,
          customer_address: dispatch.customer_account.customer.address,
          total_items: dispatch.dispatch_items.length,
          confirmed_items: dispatch.dispatch_items.filter(item => item.confirmed).length,
          generated_by: 'current_user', // En implementación real, usar ID del usuario actual
          status: 'generated'
        })
        .select()
        .single();

      if (remissionError) throw remissionError;

      // Actualizar estado del despacho
      const { error: updateError } = await supabase
        .from('dispatches')
        .update({
          status: 'dispatched',
          remission_generated: true,
          remission_number: consecutiveNumber,
          remission_generated_at: new Date().toISOString()
        })
        .eq('id', dispatchId);

      if (updateError) throw updateError;

      // Preparar datos para mostrar la remisión
      const remissionData = {
        remission,
        dispatch,
        company: company,
        generatedAt: new Date()
      };

      setRemissionData(remissionData);
      fetchDispatches(); // Refrescar lista

      alert('✅ Remisión generada exitosamente');

    } catch (error) {
      console.error('Error generating remission:', error);
      alert('❌ Error al generar remisión: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const printRemission = () => {
    if (!remissionData) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(generateRemissionHTML(remissionData));
    printWindow.document.close();
    printWindow.print();
  };

  const generateRemissionHTML = (data) => {
    const { remission, dispatch, company, generatedAt } = data;
    const customer = dispatch.customer_account.customer;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Remisión ${remission.remission_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .company-info { text-align: center; margin-bottom: 20px; }
          .remission-info { display: flex; justify-content: space-between; margin: 20px 0; }
          .customer-info { margin: 20px 0; border: 1px solid #ccc; padding: 10px; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th, .items-table td { border: 1px solid #000; padding: 8px; text-align: left; }
          .items-table th { background-color: #f0f0f0; }
          .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 50px; }
          .signature-box { width: 200px; text-align: center; border-top: 1px solid #000; padding-top: 5px; }
          .confirmed { background-color: #d4edda; }
          .pending { background-color: #f8d7da; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REMISIÓN DE DESPACHO</h1>
          <h2>N° ${remission.remission_number}</h2>
        </div>

        <div class="company-info">
          <h3>${company.name}</h3>
          <p>NIT: ${company.nit || 'N/A'}</p>
          <p>${company.address || ''}</p>
          <p>Tel: ${company.phone || ''}</p>
        </div>

        <div class="remission-info">
          <div>
            <strong>Fecha de Generación:</strong><br>
            ${generatedAt.toLocaleDateString()} ${generatedAt.toLocaleTimeString()}
          </div>
          <div>
            <strong>Cuenta:</strong> #${dispatch.customer_account.account_number}<br>
            <strong>Despacho:</strong> #${dispatch.dispatch_number}
          </div>
        </div>

        <div class="customer-info">
          <h4>DATOS DEL CLIENTE</h4>
          <p><strong>Nombre:</strong> ${customer.name}</p>
          <p><strong>Documento:</strong> ${customer.document}</p>
          <p><strong>Teléfono:</strong> ${customer.phone || 'N/A'}</p>
          <p><strong>Dirección:</strong> ${customer.address || 'N/A'}</p>
        </div>

        <h4>PRODUCTOS A DESPACHAR</h4>
        <table class="items-table">
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Color</th>
              <th>Talla</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th>Confirmado</th>
            </tr>
          </thead>
          <tbody>
            ${dispatch.dispatch_items.map(item => `
              <tr class="${item.confirmed ? 'confirmed' : 'pending'}">
                <td>${item.reference}</td>
                <td>${item.color || '-'}</td>
                <td>${item.size || '-'}</td>
                <td>${item.quantity}</td>
                <td>${item.confirmed ? '✅ Confirmado' : '⏳ Pendiente'}</td>
                <td>${item.confirmed_at ? new Date(item.confirmed_at).toLocaleDateString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin: 20px 0;">
          <p><strong>Total de Items:</strong> ${dispatch.dispatch_items.length}</p>
          <p><strong>Items Confirmados:</strong> ${dispatch.dispatch_items.filter(item => item.confirmed).length}</p>
          <p><strong>Items Pendientes:</strong> ${dispatch.dispatch_items.filter(item => !item.confirmed).length}</p>
        </div>

        <div class="footer">
          <p><strong>Observaciones:</strong> ${dispatch.notes || 'Ninguna'}</p>
          <p><strong>Estado del Despacho:</strong> ${dispatch.status}</p>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <p>Firma del Cliente</p>
            <p>CC: ${customer.document}</p>
          </div>
          <div class="signature-box">
            <p>Firma del Despachador</p>
            <p>Fecha: ___________</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
          <p>Este documento fue generado automáticamente por el sistema IMO</p>
          <p>Generado el ${generatedAt.toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Generación de Remisiones</h2>
        <button
          onClick={fetchDispatches}
          className="bg-theme text-white px-4 py-2 rounded hover:bg-theme-hover"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-card p-4 rounded-lg border">
        <h3 className="font-medium mb-3">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full p-2 border rounded"
            >
              <option value="all">Todos</option>
              <option value="confirmed">Confirmados</option>
              <option value="pending">Pendientes</option>
              <option value="dispatched">Despachados</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Desde</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Hasta</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cliente</label>
            <input
              type="text"
              value={filters.customerName}
              onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Buscar por nombre..."
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Lista de despachos */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-medium">Despachos Disponibles ({dispatches.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">Despacho</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">Cuenta</th>
                <th className="p-3 text-left">Items</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center">Cargando...</td>
                </tr>
              ) : dispatches.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">No hay despachos disponibles</td>
                </tr>
              ) : (
                dispatches.map(dispatch => {
                  const confirmedItems = dispatch.dispatch_items.filter(item => item.confirmed).length;
                  const totalItems = dispatch.dispatch_items.length;
                  
                  return (
                    <tr key={dispatch.id} className="border-b hover:bg-muted">
                      <td className="p-3">
                        <div>
                          <span className="font-medium">#{dispatch.dispatch_number}</span>
                          {dispatch.remission_number && (
                            <div className="text-xs text-green-600">
                              Remisión: {dispatch.remission_number}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{dispatch.customer_account?.customer?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {dispatch.customer_account?.customer?.document}
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-3">
                        #{dispatch.customer_account?.account_number}
                      </td>
                      
                      <td className="p-3">
                        <div className="text-sm">
                          <div>{confirmedItems}/{totalItems} confirmados</div>
                          <div className={`text-xs ${
                            confirmedItems === totalItems ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {confirmedItems === totalItems ? 'Completo' : 'Pendiente'}
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          dispatch.status === 'dispatched' ? 'bg-green-100 text-green-800' :
                          dispatch.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {dispatch.status === 'dispatched' ? 'Despachado' :
                           dispatch.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                        </span>
                      </td>
                      
                      <td className="p-3 text-sm">
                        {new Date(dispatch.created_at).toLocaleDateString()}
                      </td>
                      
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedDispatch(dispatch)}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                          >
                            Ver
                          </button>
                          
                          {(dispatch.status === 'confirmed' || dispatch.status === 'pending') && (
                            <button
                              onClick={() => generateRemission(dispatch.id)}
                              disabled={loading}
                              className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 disabled:opacity-50"
                            >
                              Generar Remisión
                            </button>
                          )}
                          
                          {dispatch.remission_number && (
                            <button
                              onClick={() => {
                                // Recrear datos de remisión para impresión
                                const remissionData = {
                                  remission: { remission_number: dispatch.remission_number },
                                  dispatch: dispatch,
                                  company: company,
                                  generatedAt: new Date(dispatch.remission_generated_at)
                                };
                                setRemissionData(remissionData);
                                setTimeout(printRemission, 100);
                              }}
                              className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                            >
                              Imprimir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalle del despacho */}
      {selectedDispatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Despacho #{selectedDispatch.dispatch_number}
              </h3>
              <button
                onClick={() => setSelectedDispatch(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-medium mb-2">Cliente</h4>
                <p>{selectedDispatch.customer_account?.customer?.name}</p>
                <p className="text-sm text-gray-600">
                  {selectedDispatch.customer_account?.customer?.document}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Estado</h4>
                <span className={`px-2 py-1 rounded text-sm ${
                  selectedDispatch.status === 'dispatched' ? 'bg-green-100 text-green-800' :
                  selectedDispatch.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedDispatch.status === 'dispatched' ? 'Despachado' :
                   selectedDispatch.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                </span>
              </div>
            </div>

            <h4 className="font-medium mb-2">Items del Despacho</h4>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Referencia</th>
                    <th className="p-2 text-left">Color</th>
                    <th className="p-2 text-left">Talla</th>
                    <th className="p-2 text-left">Cantidad</th>
                    <th className="p-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDispatch.dispatch_items.map(item => (
                    <tr key={item.id} className={`border-b ${item.confirmed ? 'bg-green-50' : 'bg-red-50'}`}>
                      <td className="p-2">{item.reference}</td>
                      <td className="p-2">{item.color || '-'}</td>
                      <td className="p-2">{item.size || '-'}</td>
                      <td className="p-2">{item.quantity}</td>
                      <td className="p-2">
                        {item.confirmed ? (
                          <span className="text-green-600">✅ Confirmado</span>
                        ) : (
                          <span className="text-red-600">⏳ Pendiente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedDispatch(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de remisión generada */}
      {remissionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">✅ Remisión Generada</h3>
            
            <p className="mb-4">
              Se ha generado exitosamente la remisión N° <strong>{remissionData.remission.remission_number}</strong>
            </p>

            <div className="flex space-x-2">
              <button
                onClick={printRemission}
                className="flex-1 bg-theme text-white py-2 px-4 rounded hover:bg-theme-hover"
              >
                🖨️ Imprimir
              </button>
              
              <button
                onClick={() => setRemissionData(null)}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchRemissionGenerator;
