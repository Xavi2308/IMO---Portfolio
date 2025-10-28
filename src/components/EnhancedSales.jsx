// ========================================
// COMPONENTE SALES MEJORADO CON TODAS LAS FUNCIONALIDADES
// ========================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import ImprovedSalesForm from './ImprovedSalesForm';
import AdvancedCustomerAccountsManager from './AdvancedCustomerAccountsManager';
import * as XLSX from 'xlsx';

const EnhancedSales = ({ user, setError, errorMessage }) => {
  const { company } = useAuth();
  const [activeTab, setActiveTab] = useState('new-sale'); // 'new-sale', 'history', 'accounts'
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    customer: '',
    startDate: '',
    endDate: '',
    status: 'all',
    dispatchType: 'all'
  });

  useEffect(() => {
    fetchCustomers();
    if (activeTab === 'history') {
      fetchSales();
    }
  }, [activeTab, filters]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, document')
        .eq('company_id', company.id)
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          customer:customers(id, name, document),
          sale_items(id, reference, color, size, quantity, unit_price, total_price),
          customer_account:customer_accounts(id, account_number)
        `)
        .eq('company_id', company.id);

      // Aplicar filtros
      if (filters.customer) {
        query = query.eq('customer_id', filters.customer);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59');
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.dispatchType !== 'all') {
        query = query.eq('dispatch_type', filters.dispatchType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      alert('Error al cargar las ventas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaleCreated = () => {
    if (activeTab === 'history') {
      fetchSales();
    }
    alert('✅ Venta creada exitosamente');
  };

  const exportToExcel = () => {
    if (sales.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const exportData = sales.map(sale => ({
      'Número': sale.consecutive_number,
      'Fecha': new Date(sale.created_at).toLocaleDateString(),
      'Cliente': sale.customer?.name,
      'Documento': sale.customer?.document,
      'Cuenta': sale.customer_account?.account_number,
      'Total': sale.total_value,
      'Pago': sale.payment_amount,
      'Pendiente': sale.remaining_payment,
      'Tipo': sale.dispatch_type === 'separate' ? 'Separar' : 'Despachar',
      'Estado': sale.status,
      'Items': sale.sale_items?.length || 0,
      'Notas': sale.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    
    const fileName = `ventas_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const TabButton = ({ id, label, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 font-medium rounded-lg transition-colors ${
        active
          ? 'bg-theme text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Ventas</h1>
        
        {/* Navegación por tabs */}
        <div className="flex space-x-2">
          <TabButton
            id="new-sale"
            label="Nueva Venta"
            active={activeTab === 'new-sale'}
            onClick={setActiveTab}
          />
          <TabButton
            id="history"
            label="Historial"
            active={activeTab === 'history'}
            onClick={setActiveTab}
          />
          <TabButton
            id="accounts"
            label="Cuentas de Clientes"
            active={activeTab === 'accounts'}
            onClick={setActiveTab}
          />
        </div>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === 'new-sale' && (
        <div className="max-w-4xl mx-auto">
          <ImprovedSalesForm onSaleCreated={handleSaleCreated} />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filtros */}
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-3">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cliente</label>
                <select
                  value={filters.customer}
                  onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Todos los clientes</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.document}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Desde</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Hasta</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="dispatched">Despachado</option>
                  <option value="completed">Completado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={filters.dispatchType}
                  onChange={(e) => setFilters(prev => ({ ...prev, dispatchType: e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="all">Todos</option>
                  <option value="separate">Separar</option>
                  <option value="dispatch">Despachar</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={fetchSales}
                className="bg-theme text-white px-4 py-2 rounded hover:bg-theme-hover"
              >
                🔄 Actualizar
              </button>
              <button
                onClick={exportToExcel}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                disabled={sales.length === 0}
              >
                📊 Exportar Excel
              </button>
            </div>
          </div>

          {/* Lista de ventas */}
          <div className="bg-card rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="font-medium">Historial de Ventas ({sales.length})</h3>
            </div>

            {loading ? (
              <div className="p-8 text-center">Cargando...</div>
            ) : sales.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No hay ventas registradas</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">Venta</th>
                      <th className="p-3 text-left">Cliente</th>
                      <th className="p-3 text-left">Cuenta</th>
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Pagado</th>
                      <th className="p-3 text-left">Pendiente</th>
                      <th className="p-3 text-left">Tipo</th>
                      <th className="p-3 text-left">Estado</th>
                      <th className="p-3 text-left">Fecha</th>
                      <th className="p-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id} className="border-b hover:bg-muted">
                        <td className="p-3">
                          <div>
                            <span className="font-medium">#{sale.consecutive_number}</span>
                            <div className="text-xs text-muted-foreground">
                              {sale.sale_items?.length || 0} items
                            </div>
                          </div>
                        </td>
                        
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{sale.customer?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {sale.customer?.document}
                            </div>
                          </div>
                        </td>
                        
                        <td className="p-3">
                          #{sale.customer_account?.account_number}
                        </td>
                        
                        <td className="p-3 font-medium">
                          ${sale.total_value?.toLocaleString()}
                        </td>
                        
                        <td className="p-3 text-green-600">
                          ${sale.payment_amount?.toLocaleString() || '0'}
                        </td>
                        
                        <td className="p-3">
                          <span className={sale.remaining_payment > 0 ? 'text-red-600' : 'text-gray-500'}>
                            ${sale.remaining_payment?.toLocaleString() || '0'}
                          </span>
                        </td>
                        
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sale.dispatch_type === 'separate' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {sale.dispatch_type === 'separate' ? 'Separar' : 'Despachar'}
                          </span>
                        </td>
                        
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                            sale.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sale.status === 'completed' ? 'Completado' :
                             sale.status === 'confirmed' ? 'Confirmado' :
                             sale.status === 'pending' ? 'Pendiente' : sale.status}
                          </span>
                        </td>
                        
                        <td className="p-3 text-sm">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </td>
                        
                        <td className="p-3">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => {
                                // Mostrar modal con detalles de la venta
                                alert(`Detalles de venta #${sale.consecutive_number}\n\nItems:\n${
                                  sale.sale_items?.map(item => 
                                    `- ${item.reference} ${item.color} ${item.size} x${item.quantity} = $${item.total_price}`
                                  ).join('\n')
                                }`);
                              }}
                              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                            >
                              Ver
                            </button>
                            
                            {sale.payment_proof_url && (
                              <a
                                href={sale.payment_proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                              >
                                Comprobante
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'accounts' && (
        <AdvancedCustomerAccountsManager />
      )}
    </div>
  );
};

export default EnhancedSales;
