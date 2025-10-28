// ========================================
// COMPONENTE DE ESTADÍSTICAS DE CUENTAS PARA HOME
// ========================================

import React, { useState, useEffect } from 'react';
import useCustomerAccounts from '../hooks/useCustomerAccounts';
import { useAuth } from '../contexts/AuthContext';

const AccountsStatsCard = () => {
  const [stats, setStats] = useState({
    totalAccounts: 0,
    openAccounts: 0,
    totalCredit: 0,
    totalDebt: 0,
    pendingDispatches: 0
  });
  const [loading, setLoading] = useState(true);
  
  const { accounts, loading: accountsLoading } = useCustomerAccounts();
  const { company } = useAuth();

  useEffect(() => {
    if (!accountsLoading && accounts.length >= 0) {
      calculateStats();
    }
  }, [accounts, accountsLoading]);

  const calculateStats = () => {
    setLoading(true);
    
    try {
      const openAccounts = accounts.filter(acc => acc.status === 'open');
      const pendingDispatches = accounts.filter(acc => acc.dispatch_requested);
      
      const totalCredit = accounts.reduce((sum, acc) => 
        sum + (acc.balance > 0 ? acc.balance : 0), 0
      );
      
      const totalDebt = accounts.reduce((sum, acc) => 
        sum + (acc.balance < 0 ? Math.abs(acc.balance) : 0), 0
      );

      setStats({
        totalAccounts: accounts.length,
        openAccounts: openAccounts.length,
        totalCredit,
        totalDebt,
        pendingDispatches: pendingDispatches.length
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || accountsLoading) {
    return (
      <div className="bg-card rounded-lg border border-default p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <div className="w-6 h-6 bg-purple-300 rounded animate-pulse"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-default p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text">Cuentas de Clientes</h3>
      </div>

      {/* Estadísticas */}
      <div className="space-y-4">
        {/* Cuentas Totales y Abiertas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-background rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{stats.totalAccounts}</p>
            <p className="text-sm text-text-muted">Total cuentas</p>
          </div>
          <div className="text-center p-3 bg-background rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.openAccounts}</p>
            <p className="text-sm text-text-muted">Cuentas abiertas</p>
          </div>
        </div>

        {/* Saldos */}
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <div>
              <p className="text-sm text-green-700 font-medium">Saldo a favor clientes</p>
              <p className="text-xs text-green-600">Pagos adelantados</p>
            </div>
            <p className="text-lg font-bold text-green-700">
              ${stats.totalCredit.toLocaleString('es-CO')}
            </p>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
            <div>
              <p className="text-sm text-red-700 font-medium">Saldo pendiente</p>
              <p className="text-xs text-red-600">Por cobrar</p>
            </div>
            <p className="text-lg font-bold text-red-700">
              ${stats.totalDebt.toLocaleString('es-CO')}
            </p>
          </div>
        </div>

        {/* Despachos Pendientes */}
        {stats.pendingDispatches > 0 && (
          <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
            <div>
              <p className="text-sm text-yellow-700 font-medium">Despachos pendientes</p>
              <p className="text-xs text-yellow-600">Cuentas listas para envío</p>
            </div>
            <p className="text-lg font-bold text-yellow-700">
              {stats.pendingDispatches}
            </p>
          </div>
        )}

        {/* Balance Neto */}
        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-text">Balance neto:</span>
            <span className={`text-lg font-bold ${
              (stats.totalCredit - stats.totalDebt) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(stats.totalCredit - stats.totalDebt) > 0 ? '+' : ''}
              ${(stats.totalCredit - stats.totalDebt).toLocaleString('es-CO')}
            </span>
          </div>
        </div>
      </div>

      {/* Mensaje cuando no hay cuentas */}
      {stats.totalAccounts === 0 && (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-text-muted text-sm">No hay cuentas de clientes</p>
          <p className="text-text-muted text-xs mt-1">
            Las cuentas aparecerán cuando los clientes hagan compras
          </p>
        </div>
      )}
    </div>
  );
};

export default AccountsStatsCard;
