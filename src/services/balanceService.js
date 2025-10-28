// ========================================
// SERVICIO DE GESTIÓN DE SALDOS Y BALANCES
// ========================================

import { supabase } from '../supabase';

export class BalanceService {
  
  // Calcular balance de una cuenta
  static async calculateAccountBalance(accountId) {
    try {
      const { data, error } = await supabase.rpc('calculate_account_balance', {
        p_account_id: accountId
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error calculating balance:', err);
      throw err;
    }
  }

  // Verificar si el cliente puede realizar una compra
  static async canAffordPurchase(customerId, companyId, amount) {
    try {
      // Obtener cuenta activa del cliente
      const { data: account, error: accountError } = await supabase
        .from('customer_accounts')
        .select('id, balance, status')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .eq('status', 'open')
        .single();

      if (accountError && accountError.code !== 'PGRST116') {
        throw accountError;
      }

      // Si no hay cuenta activa, puede comprar (se creará nueva cuenta)
      if (!account) {
        return {
          canAfford: true,
          balance: 0,
          remainingAmount: amount,
          needsPayment: true
        };
      }

      const balance = account.balance || 0;
      const canAfford = balance >= amount;
      const remainingAmount = Math.max(0, amount - balance);

      return {
        canAfford,
        balance,
        remainingAmount,
        needsPayment: remainingAmount > 0,
        accountId: account.id
      };
    } catch (err) {
      console.error('Error checking purchase affordability:', err);
      throw err;
    }
  }

  // Procesar uso de saldo a favor
  static async useBalance(accountId, amount, saleId, userId) {
    try {
      // Registrar transacción de uso de saldo
      const { error: transactionError } = await supabase
        .from('account_transactions')
        .insert({
          account_id: accountId,
          company_id: (await this.getAccountCompany(accountId)),
          transaction_type: 'sale',
          amount: -amount, // Negativo porque se está usando el saldo
          description: `Uso de saldo a favor para venta`,
          reference_id: saleId,
          reference_table: 'sales',
          created_by: userId
        });

      if (transactionError) throw transactionError;

      // Recalcular balance
      await this.calculateAccountBalance(accountId);
      
      return true;
    } catch (err) {
      console.error('Error using balance:', err);
      throw err;
    }
  }

  // Procesar pago a cuenta
  static async processPayment(accountId, amount, paymentReceiptId, userId) {
    try {
      const companyId = await this.getAccountCompany(accountId);

      // Registrar transacción de pago
      const { error: transactionError } = await supabase
        .from('account_transactions')
        .insert({
          account_id: accountId,
          company_id: companyId,
          transaction_type: 'payment',
          amount: amount,
          description: `Pago registrado`,
          reference_id: paymentReceiptId,
          reference_table: 'payment_receipts',
          created_by: userId
        });

      if (transactionError) throw transactionError;

      // Recalcular balance
      await this.calculateAccountBalance(accountId);
      
      return true;
    } catch (err) {
      console.error('Error processing payment:', err);
      throw err;
    }
  }

  // Obtener historial de transacciones de una cuenta
  static async getAccountTransactions(accountId) {
    try {
      const { data, error } = await supabase
        .from('account_transactions')
        .select(`
          *,
          created_by_user:users!account_transactions_created_by_fkey(username)
        `)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error getting account transactions:', err);
      throw err;
    }
  }

  // Obtener resumen financiero del cliente
  static async getCustomerFinancialSummary(customerId, companyId) {
    try {
      // Obtener todas las cuentas del cliente
      const { data: accounts, error: accountsError } = await supabase
        .from('customer_accounts')
        .select(`
          id,
          account_number,
          status,
          total_value,
          paid_value,
          balance,
          created_at,
          closed_at
        `)
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      // Calcular totales
      const openAccounts = accounts?.filter(acc => acc.status === 'open') || [];
      const closedAccounts = accounts?.filter(acc => acc.status === 'closed') || [];
      
      const totalBalance = openAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      const totalDebt = openAccounts.reduce((sum, acc) => sum + Math.max(0, -(acc.balance || 0)), 0);
      const totalCredit = openAccounts.reduce((sum, acc) => sum + Math.max(0, acc.balance || 0), 0);

      return {
        accounts: accounts || [],
        openAccounts,
        closedAccounts,
        summary: {
          totalBalance,
          totalDebt,
          totalCredit,
          hasOpenAccounts: openAccounts.length > 0,
          accountsCount: accounts?.length || 0
        }
      };
    } catch (err) {
      console.error('Error getting customer financial summary:', err);
      throw err;
    }
  }

  // Método auxiliar para obtener company_id de una cuenta
  static async getAccountCompany(accountId) {
    try {
      const { data, error } = await supabase
        .from('customer_accounts')
        .select('company_id')
        .eq('id', accountId)
        .single();

      if (error) throw error;
      return data.company_id;
    } catch (err) {
      console.error('Error getting account company:', err);
      throw err;
    }
  }

  // Verificar estado de cuenta (pendientes de pago o verificación)
  static async getAccountStatus(accountId) {
    try {
      // Obtener cuenta
      const { data: account, error: accountError } = await supabase
        .from('customer_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (accountError) throw accountError;

      // Verificar pagos pendientes de verificación
      const { data: pendingPayments, error: paymentsError } = await supabase
        .from('payment_receipts')
        .select('id, amount')
        .eq('account_id', accountId)
        .eq('verified', false);

      if (paymentsError) throw paymentsError;

      // Verificar ventas pendientes de aprobación
      const { data: pendingSales, error: salesError } = await supabase
        .from('sales')
        .select('id, total_value')
        .eq('account_id', accountId)
        .eq('status', 'pending');

      if (salesError) throw salesError;

      return {
        account,
        pendingPayments: pendingPayments || [],
        pendingSales: pendingSales || [],
        hasPendingPayments: (pendingPayments?.length || 0) > 0,
        hasPendingSales: (pendingSales?.length || 0) > 0,
        isFullyApproved: (pendingPayments?.length || 0) === 0 && (pendingSales?.length || 0) === 0
      };
    } catch (err) {
      console.error('Error getting account status:', err);
      throw err;
    }
  }
}

export default BalanceService;
