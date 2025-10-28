// ========================================
// COMPONENTE DE GESTIÓN DE CUENTAS DE CLIENTES
// ========================================

import React, { useState, useEffect } from 'react';
import { useCustomerAccounts } from '../hooks/useCustomerAccounts';
import { usePaymentReceipts } from '../hooks/usePaymentReceipts';
import BalanceService from '../services/balanceService';
import { useAuth } from '../contexts/AuthContext';

const CustomerAccountsManager = ({ user }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { company } = useAuth();
  const { accounts, loading: accountsLoading, fetchAccounts } = useCustomerAccounts();
  const { receipts, loading: receiptsLoading, verifyReceipt } = usePaymentReceipts();

  // Cargar cuentas cuando se monte el componente o cambie la empresa
  useEffect(() => {
    if (company?.id) {
      console.log('🔄 CustomerAccountsManager: Cargando cuentas para empresa:', company.name);
      fetchAccounts();
    }
  }, [company?.id, fetchAccounts]);

  // Obtener resumen financiero de un cliente
  const loadCustomerSummary = async (customerId) => {
    if (!customerId || !company?.id) return;
    
    setLoading(true);
    try {
      const summary = await BalanceService.getCustomerFinancialSummary(customerId, company.id);
      setCustomerSummary(summary);
    } catch (err) {
      console.error('Error loading customer summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verificar comprobante de pago
  const handleVerifyReceipt = async (receiptId, isVerified) => {
    try {
      await verifyReceipt(receiptId, user.id, isVerified);
      // Recargar datos después de verificar
      if (selectedCustomer) {
        await loadCustomerSummary(selectedCustomer.id);
      }
      await fetchAccounts();
    } catch (err) {
      console.error('Error verifying receipt:', err);
    }
  };

  return (
    <div className="bg-background p-6 space-y-6">
      {/* Debug info */}
      {console.log('🔍 CustomerAccountsManager render:', {
        company: company?.name,
        accountsCount: accounts?.length,
        accountsLoading,
        accounts: accounts
      })}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text flex items-center gap-3">
          <div className="p-2 bg-theme rounded-lg">
            <svg className="w-8 h-8 text-text-inverted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          Gestión de Cuentas de Clientes
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Cuentas */}
        <div className="bg-card rounded-lg border border-default p-6">
          <h2 className="text-xl font-semibold text-text mb-4">Cuentas Activas</h2>
          
          {accountsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {console.log('🔍 Accounts to display:', accounts)}
              {console.log('🔍 Open accounts:', accounts.filter(acc => acc.status === 'open'))}
              
              {accounts.length === 0 ? (
                <p className="text-text-secondary text-center py-8">No hay cuentas registradas</p>
              ) : accounts.filter(acc => acc.status === 'open').length === 0 ? (
                <div>
                  <p className="text-text-secondary text-center py-4">No hay cuentas activas</p>
                  <div className="mt-4 p-4 bg-background rounded border">
                    <p className="text-sm text-text-secondary mb-2">Cuentas existentes (todos los status):</p>
                    {accounts.map(account => (
                      <div key={account.id} className="text-xs text-text-secondary">
                        {account.customers?.name || 'Sin nombre'} - Status: {account.status || 'Sin status'} - Balance: ${account.balance}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                accounts.filter(acc => acc.status === 'open').map(account => (
                <div 
                  key={account.id} 
                  className="p-4 border border-default rounded-lg hover:bg-background-secondary transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedCustomer(account.customers);
                    loadCustomerSummary(account.customer_id);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-text">{account.customers.name}</h3>
                      <p className="text-sm text-text-muted">Cuenta: {account.account_number}</p>
                      <p className="text-sm text-text-muted">Documento: {account.customers.document}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        account.balance > 0 ? 'text-green-600' : 
                        account.balance < 0 ? 'text-red-600' : 'text-text'
                      }`}>
                        {account.balance > 0 ? '+' : ''}${account.balance?.toLocaleString('es-CO') || '0'}
                      </p>
                      <p className="text-sm text-text-muted">
                        {account.balance > 0 ? 'Saldo a favor' : 
                         account.balance < 0 ? 'Saldo pendiente' : 'Sin saldo'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Estado de la cuenta */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      account.status === 'open' ? 'bg-green-100 text-green-800' :
                      account.status === 'pending_dispatch' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {account.status === 'open' ? 'Abierta' :
                       account.status === 'pending_dispatch' ? 'Pendiente despacho' : 'Cerrada'}
                    </span>
                    
                    {account.dispatch_requested && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Despacho solicitado
                      </span>
                    )}
                  </div>
                </div>
              ))
              )}
              
              {accounts.filter(acc => acc.status === 'open').length === 0 && (
                <p className="text-center text-text-muted py-8">No hay cuentas activas</p>
              )}
            </div>
          )}
        </div>

        {/* Panel de Detalles del Cliente */}
        <div className="bg-card rounded-lg border border-default p-6">
          <h2 className="text-xl font-semibold text-text mb-4">
            {selectedCustomer ? `Detalles de ${selectedCustomer.name}` : 'Selecciona un cliente'}
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
            </div>
          ) : selectedCustomer && customerSummary ? (
            <div className="space-y-4">
              {/* Resumen Financiero */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    ${customerSummary.summary.totalCredit.toLocaleString('es-CO')}
                  </p>
                  <p className="text-sm text-text-muted">Saldo a favor</p>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    ${customerSummary.summary.totalDebt.toLocaleString('es-CO')}
                  </p>
                  <p className="text-sm text-text-muted">Saldo pendiente</p>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-text">
                    {customerSummary.summary.accountsCount}
                  </p>
                  <p className="text-sm text-text-muted">Total cuentas</p>
                </div>
              </div>

              {/* Cuentas del Cliente */}
              <div>
                <h3 className="font-medium text-text mb-2">Historial de Cuentas</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {customerSummary.accounts.map(account => (
                    <div key={account.id} className="p-3 border border-default rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{account.account_number}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          account.status === 'open' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {account.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </span>
                      </div>
                      <div className="text-sm text-text-muted mt-1">
                        Total: ${account.total_value?.toLocaleString('es-CO') || '0'} | 
                        Pagado: ${account.paid_value?.toLocaleString('es-CO') || '0'} | 
                        Balance: ${account.balance?.toLocaleString('es-CO') || '0'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-text-muted py-8">
              Selecciona un cliente para ver sus detalles
            </p>
          )}
        </div>
      </div>

      {/* Panel de Comprobantes Pendientes (Solo para Admin) */}
      {user?.role === 'admin' && (
        <div className="bg-card rounded-lg border border-default p-6">
          <h2 className="text-xl font-semibold text-text mb-4">Comprobantes Pendientes de Verificación</h2>
          
          {receiptsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {receipts.filter(receipt => !receipt.verified).map(receipt => (
                <div key={receipt.id} className="p-4 border border-default rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-text">
                        {receipt.customer_accounts.customers.name}
                      </h3>
                      <p className="text-sm text-text-muted">
                        Cuenta: {receipt.customer_accounts.account_number}
                      </p>
                      <p className="text-sm text-text-muted">
                        Monto: ${receipt.amount.toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyReceipt(receipt.id, true)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleVerifyReceipt(receipt.id, false)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                  
                  {receipt.file_url && (
                    <div className="mt-2">
                      <a
                        href={receipt.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-theme hover:text-theme-hover text-sm"
                      >
                        Ver comprobante →
                      </a>
                    </div>
                  )}
                </div>
              ))}
              
              {receipts.filter(receipt => !receipt.verified).length === 0 && (
                <p className="text-center text-text-muted py-8">
                  No hay comprobantes pendientes de verificación
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerAccountsManager;
