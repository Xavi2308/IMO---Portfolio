// ========================================
// GESTIÓN AVANZADA DE CUENTAS DE CLIENTES
// ========================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const AdvancedCustomerAccountsManager = () => {
  const { company } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountHistory, setAccountHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    customerName: '',
    balanceType: 'all' // 'all', 'favor', 'pending', 'balanced'
  });

  useEffect(() => {
    fetchAccounts();
  }, [filters]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('customer_accounts')
        .select(`
          *,
          customer:customers(id, name, document, phone),
          _count_sales:sales(count),
          _count_payments:payment_only_sales(count)
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

      // Calcular balances para cada cuenta
      const accountsWithBalances = await Promise.all(
        data.map(async (account) => {
          try {
            const { data: balance } = await supabase
              .rpc('calculate_account_balance', { account_id_param: account.id });
            
            return {
              ...account,
              balance_info: balance?.[0] || { balance: 0, status: 'balanced' }
            };
          } catch (error) {
            console.error('Error calculating balance for account:', account.id, error);
            return {
              ...account,
              balance_info: { balance: 0, status: 'balanced' }
            };
          }
        })
      );

      // Filtrar por tipo de balance
      let filteredAccounts = accountsWithBalances;
      if (filters.balanceType !== 'all') {
        filteredAccounts = accountsWithBalances.filter(
          account => account.balance_info.status === filters.balanceType
        );
      }

      // Filtrar por nombre de cliente
      if (filters.customerName) {
        filteredAccounts = filteredAccounts.filter(
          account => account.customer?.name.toLowerCase().includes(filters.customerName.toLowerCase())
        );
      }

      setAccounts(filteredAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      alert('Error al cargar las cuentas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountHistory = async (accountId) => {
    try {
      setLoading(true);

      // Obtener ventas
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items(reference, color, size, quantity, unit_price, total_price)
        `)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Obtener pagos sin referencia
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_only_sales')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Obtener transacciones manuales
      const { data: transactions, error: transactionsError } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Combinar y ordenar todas las transacciones
      const allTransactions = [
        ...sales.map(sale => ({
          ...sale,
          type: 'sale',
          amount: sale.total_value,
          description: `Venta #${sale.consecutive_number}`,
          date: sale.created_at
        })),
        ...payments.map(payment => ({
          ...payment,
          type: 'payment',
          amount: -payment.amount, // Negativo porque es un pago
          description: payment.description || 'Pago sin referencia',
          date: payment.created_at
        })),
        ...transactions.map(transaction => ({
          ...transaction,
          type: 'transaction',
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.created_at
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setAccountHistory(allTransactions);
    } catch (error) {
      console.error('Error fetching account history:', error);
      alert('Error al cargar el historial: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const closeAccount = async (accountId) => {
    if (!confirm('¿Está seguro de cerrar esta cuenta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_accounts')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (error) throw error;

      alert('✅ Cuenta cerrada exitosamente');
      fetchAccounts();
      setSelectedAccount(null);
    } catch (error) {
      console.error('Error closing account:', error);
      alert('❌ Error al cerrar la cuenta: ' + error.message);
    }
  };

  const addManualTransaction = async (accountId, amount, description, type = 'adjustment') => {
    try {
      const { error } = await supabase
        .from('account_transactions')
        .insert({
          account_id: accountId,
          company_id: company.id,
          amount: amount,
          description: description,
          transaction_type: type,
          created_by: 'manual' // En una implementación real, usar el ID del usuario
        });

      if (error) throw error;

      alert('✅ Transacción agregada exitosamente');
      fetchAccountHistory(accountId);
      fetchAccounts(); // Refrescar balances
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('❌ Error al agregar transacción: ' + error.message);
    }
  };

  const ManualTransactionForm = ({ accountId, onClose }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('payment');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!amount || !description) {
        alert('Debe completar todos los campos');
        return;
      }

      const transactionAmount = type === 'payment' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));
      addManualTransaction(accountId, transactionAmount, description, type);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Agregar Transacción Manual</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="payment">Pago</option>
                <option value="charge">Cargo</option>
                <option value="adjustment">Ajuste</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Monto</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                className="w-full p-2 border rounded"
                required
                placeholder="Descripción de la transacción..."
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="flex-1 bg-theme text-white py-2 px-4 rounded hover:bg-theme-hover"
              >
                Agregar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const [showManualTransaction, setShowManualTransaction] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestión de Cuentas de Clientes</h2>
        <button
          onClick={fetchAccounts}
          className="bg-theme text-white px-4 py-2 rounded hover:bg-theme-hover"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-card p-4 rounded-lg border">
        <h3 className="font-medium mb-3">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full p-2 border rounded"
            >
              <option value="all">Todos</option>
              <option value="open">Abiertas</option>
              <option value="closed">Cerradas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Balance</label>
            <select
              value={filters.balanceType}
              onChange={(e) => setFilters(prev => ({ ...prev, balanceType: e.target.value }))}
              className="w-full p-2 border rounded"
            >
              <option value="all">Todos</option>
              <option value="favor">A favor</option>
              <option value="pending">Pendiente</option>
              <option value="balanced">Balanceado</option>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de cuentas */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-medium">Cuentas ({accounts.length})</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">Cargando...</div>
            ) : accounts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No hay cuentas</div>
            ) : (
              accounts.map(account => (
                <div
                  key={account.id}
                  className={`p-4 border-b cursor-pointer hover:bg-muted ${
                    selectedAccount?.id === account.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => {
                    setSelectedAccount(account);
                    fetchAccountHistory(account.id);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{account.customer?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Cuenta #{account.account_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.customer?.document} • {account.customer?.phone}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        account.balance_info?.status === 'favor' ? 'text-green-600' :
                        account.balance_info?.status === 'pending' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        ${Math.abs(account.balance_info?.balance || 0).toLocaleString()}
                        {account.balance_info?.status === 'favor' ? ' ✓' :
                         account.balance_info?.status === 'pending' ? ' ⚠' : ''}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        account.status === 'open' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {account.status === 'open' ? 'Abierta' : 'Cerrada'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detalle de cuenta seleccionada */}
        <div className="bg-card rounded-lg border">
          {selectedAccount ? (
            <>
              <div className="p-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{selectedAccount.customer?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Cuenta #{selectedAccount.account_number}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowManualTransaction(selectedAccount.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    >
                      + Transacción
                    </button>
                    
                    {selectedAccount.status === 'open' && (
                      <button
                        onClick={() => closeAccount(selectedAccount.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Cerrar
                      </button>
                    )}
                  </div>
                </div>

                {/* Balance actual */}
                <div className={`mt-3 p-3 rounded ${
                  selectedAccount.balance_info?.status === 'favor' ? 'bg-green-50 border border-green-200' :
                  selectedAccount.balance_info?.status === 'pending' ? 'bg-red-50 border border-red-200' :
                  'bg-gray-50 border border-gray-200'
                }`}>
                  <p className="text-sm">
                    <strong>Balance actual: </strong>
                    <span className={
                      selectedAccount.balance_info?.status === 'favor' ? 'text-green-600' :
                      selectedAccount.balance_info?.status === 'pending' ? 'text-red-600' :
                      'text-gray-600'
                    }>
                      ${Math.abs(selectedAccount.balance_info?.balance || 0).toLocaleString()} 
                      {selectedAccount.balance_info?.status === 'favor' ? ' a favor del cliente' :
                       selectedAccount.balance_info?.status === 'pending' ? ' pendiente de pago' : ' balanceado'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Historial */}
              <div className="p-4">
                <h4 className="font-medium mb-3">Historial de Transacciones</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {accountHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay transacciones</p>
                  ) : (
                    accountHistory.map((transaction, index) => (
                      <div key={index} className="p-3 border rounded text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()} {new Date(transaction.date).toLocaleTimeString()}
                            </p>
                            {transaction.type === 'sale' && transaction.sale_items && (
                              <div className="mt-1 text-xs">
                                {transaction.sale_items.map((item, i) => (
                                  <span key={i} className="inline-block mr-2 bg-gray-100 px-1 rounded">
                                    {item.reference} {item.color} {item.size} x{item.quantity}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className={`font-medium ${
                            transaction.amount > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Seleccione una cuenta para ver los detalles
            </div>
          )}
        </div>
      </div>

      {/* Modal de transacción manual */}
      {showManualTransaction && (
        <ManualTransactionForm
          accountId={showManualTransaction}
          onClose={() => setShowManualTransaction(null)}
        />
      )}
    </div>
  );
};

export default AdvancedCustomerAccountsManager;
