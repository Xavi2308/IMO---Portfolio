// ========================================
// HOOK PARA GESTIÓN DE CUENTAS DE CLIENTES
// ========================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

export const useCustomerAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { company } = useAuth();

  // Obtener todas las cuentas de la empresa
  const fetchAccounts = useCallback(async (filters = {}) => {
    console.log('🔍 Iniciando fetchAccounts...');
    console.log('📊 Company context:', company);
    
    if (!company?.id) {
      console.log('⚠️ No hay empresa seleccionada, saltando consulta');
      setAccounts([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('customer_accounts')
        .select(`
          *,
          customers!inner(id, name, document, phone, company_id)
        `)
        .eq('customers.company_id', company.id)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      console.log('🔍 Ejecutando query para empresa:', company.id, company.name);
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error en consulta de cuentas:', error);
        throw error;
      }

      console.log('✅ Cuentas obtenidas:', data?.length || 0);
      console.log('📋 Datos completos de cuentas:', data);
      setAccounts(data || []);
    } catch (err) {
      console.error('❌ Error en fetchAccounts:', err);
      setError(err.message);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  // Crear una nueva cuenta para un cliente
  const createAccount = useCallback(async (customerId) => {
    if (!company?.id) throw new Error('No hay empresa seleccionada');
    
    try {
      // Obtener el siguiente número consecutivo
      const { data: consecutive } = await supabase.rpc('get_next_consecutive', {
        p_company_id: company.id,
        p_type: 'account'
      });

      const { data, error } = await supabase
        .from('customer_accounts')
        .insert({
          customer_id: customerId,
          company_id: company.id,
          account_number: consecutive,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchAccounts();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [company?.id, fetchAccounts]);

  // Obtener cuenta activa de un cliente o crear una nueva
  const getOrCreateActiveAccount = useCallback(async (customerId) => {
    if (!company?.id) throw new Error('No hay empresa seleccionada');
    
    try {
      // Buscar cuenta abierta existente
      const { data: existingAccount, error: searchError } = await supabase
        .from('customer_accounts')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', company.id)
        .eq('status', 'open')
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      if (existingAccount) {
        return existingAccount;
      }

      // Crear nueva cuenta si no existe
      return await createAccount(customerId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [company?.id, createAccount]);

  // Cerrar una cuenta
  const closeAccount = useCallback(async (accountId, userId) => {
    try {
      const { error } = await supabase
        .from('customer_accounts')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: userId
        })
        .eq('id', accountId);

      if (error) throw error;
      
      await fetchAccounts();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchAccounts]);

  // Marcar cuenta como pendiente de despacho
  const markForDispatch = useCallback(async (accountId) => {
    try {
      const { error } = await supabase
        .from('customer_accounts')
        .update({
          status: 'pending_dispatch',
          dispatch_requested: true
        })
        .eq('id', accountId);

      if (error) throw error;
      
      await fetchAccounts();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchAccounts]);

  // Calcular balance de una cuenta
  const calculateBalance = useCallback(async (accountId) => {
    try {
      const { data, error } = await supabase.rpc('calculate_account_balance', {
        p_account_id: accountId
      });

      if (error) throw error;
      
      await fetchAccounts();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchAccounts]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    createAccount,
    getOrCreateActiveAccount,
    closeAccount,
    markForDispatch,
    calculateBalance,
    setError
  };
};

export default useCustomerAccounts;
