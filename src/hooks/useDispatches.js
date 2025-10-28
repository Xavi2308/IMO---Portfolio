// ========================================
// HOOK PARA GESTIÓN DE DESPACHOS
// ========================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

export const useDispatches = () => {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { company } = useAuth();

  // Obtener todos los despachos
  const fetchDispatches = useCallback(async (filters = {}) => {
    if (!company?.id) {
      console.log('No hay empresa seleccionada');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('dispatches')
        .select(`
          *,
          customer_accounts!inner(
            id,
            account_number,
            customers!inner(name, document, phone)
          ),
          created_by_user:users!dispatches_created_by_fkey(username),
          dispatch_user:users!dispatches_dispatch_user_id_fkey(username),
          dispatch_items(
            id,
            reference,
            color,
            size,
            quantity,
            confirmed,
            confirmed_at,
            confirmation_method,
            sales!inner(id, consecutive_number, total_value)
          )
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.dispatch_user_id) {
        query = query.eq('dispatch_user_id', filters.dispatch_user_id);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error en fetchDispatches:', error);
        
        // Error de recursión infinita en políticas RLS
        if (error.message.includes('infinite recursion') || error.message.includes('policy')) {
          setError('❌ Error de configuración en base de datos (recursión en políticas RLS). Ejecutar script: FIX_RLS_RECURSION.sql');
          setDispatches([]);
          return;
        }
        
        // Si las tablas no existen, mostrar mensaje específico
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          setError('❌ Sistema de despachos no configurado. Las tablas necesarias no existen en la base de datos.');
          setDispatches([]);
          return;
        }
        
        // Error de permisos
        if (error.message.includes('permission denied')) {
          setError('❌ Sin permisos para acceder al sistema de despachos. Contacta al administrador.');
          setDispatches([]);
          return;
        }
        
        // Otros errores
        setError(`❌ Error al cargar despachos: ${error.message}`);
        throw error;
      }

      console.log('✅ Despachos cargados exitosamente:', data?.length || 0);
      setDispatches(data || []);
    } catch (err) {
      setError(err.message);
      setDispatches([]);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  // Crear despacho para una cuenta
  const createDispatch = useCallback(async (accountId, userId) => {
    if (!company?.id) throw new Error('No hay empresa seleccionada');
    
    try {
      // Obtener el siguiente número consecutivo
      const { data: consecutive } = await supabase.rpc('get_next_consecutive', {
        p_company_id: company.id,
        p_type: 'dispatch'
      });

      // Obtener todas las ventas de la cuenta para crear items de despacho
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          sale_items(reference, color, size, quantity)
        `)
        .eq('account_id', accountId)
        .eq('status', 'approved');

      if (salesError) throw salesError;

      // Crear el despacho
      const { data: dispatch, error: dispatchError } = await supabase
        .from('dispatches')
        .insert({
          account_id: accountId,
          company_id: company.id,
          dispatch_number: consecutive,
          status: 'pending',
          created_by: userId
        })
        .select()
        .single();

      if (dispatchError) throw dispatchError;

      // Crear items de despacho
      const dispatchItems = [];
      sales.forEach(sale => {
        sale.sale_items.forEach(item => {
          dispatchItems.push({
            dispatch_id: dispatch.id,
            sale_id: sale.id,
            reference: item.reference,
            color: item.color,
            size: item.size,
            quantity: item.quantity
          });
        });
      });

      if (dispatchItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('dispatch_items')
          .insert(dispatchItems);

        if (itemsError) throw itemsError;

        // Actualizar contador de items totales
        const { error: updateError } = await supabase
          .from('dispatches')
          .update({ total_items: dispatchItems.length })
          .eq('id', dispatch.id);

        if (updateError) throw updateError;
      }

      await fetchDispatches();
      return dispatch;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [company?.id, fetchDispatches]);

  // Confirmar item de despacho
  const confirmDispatchItem = useCallback(async (itemId, userId, method = 'manual') => {
    try {
      const { error } = await supabase
        .from('dispatch_items')
        .update({
          confirmed: true,
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
          confirmation_method: method
        })
        .eq('id', itemId);

      if (error) throw error;

      // Actualizar contador de items confirmados en el despacho
      await updateDispatchProgress(itemId);
      
      await fetchDispatches();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchDispatches]);

  // Actualizar progreso del despacho
  const updateDispatchProgress = useCallback(async (itemId) => {
    try {
      // Obtener el despacho del item
      const { data: item } = await supabase
        .from('dispatch_items')
        .select('dispatch_id')
        .eq('id', itemId)
        .single();

      if (!item) return;

      // Contar items confirmados
      const { data: confirmed } = await supabase
        .from('dispatch_items')
        .select('id')
        .eq('dispatch_id', item.dispatch_id)
        .eq('confirmed', true);

      // Contar items totales
      const { data: total } = await supabase
        .from('dispatch_items')
        .select('id')
        .eq('dispatch_id', item.dispatch_id);

      const confirmedCount = confirmed?.length || 0;
      const totalCount = total?.length || 0;

      // Determinar estado del despacho
      let status = 'pending';
      if (confirmedCount > 0 && confirmedCount < totalCount) {
        status = 'in_progress';
      } else if (confirmedCount === totalCount && totalCount > 0) {
        status = 'completed';
      }

      // Actualizar despacho
      const updateData = {
        confirmed_items: confirmedCount,
        status: status
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('dispatches')
        .update(updateData)
        .eq('id', item.dispatch_id);

      if (error) throw error;

      // Si se completó el despacho, cerrar la cuenta
      if (status === 'completed') {
        const { data: dispatch } = await supabase
          .from('dispatches')
          .select('account_id')
          .eq('id', item.dispatch_id)
          .single();

        if (dispatch) {
          await supabase
            .from('customer_accounts')
            .update({
              status: 'closed',
              closed_at: new Date().toISOString(),
              dispatch_confirmed: true
            })
            .eq('id', dispatch.account_id);
        }
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Asignar usuario de despacho
  const assignDispatchUser = useCallback(async (dispatchId, userId) => {
    try {
      const { error } = await supabase
        .from('dispatches')
        .update({ dispatch_user_id: userId })
        .eq('id', dispatchId);

      if (error) throw error;
      
      await fetchDispatches();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchDispatches]);

  // Obtener despachos pendientes para usuario de despacho
  const getPendingDispatches = useCallback(async (userId = null) => {
    if (!company?.id) return [];
    
    try {
      let query = supabase
        .from('dispatches')
        .select(`
          *,
          customer_accounts!inner(
            account_number,
            customers!inner(name, document)
          ),
          dispatch_items(
            id,
            reference,
            color,
            size,
            quantity,
            confirmed
          )
        `)
        .eq('company_id', company.id)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: true });

      if (userId) {
        query = query.eq('dispatch_user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [company?.id]);

  useEffect(() => {
    fetchDispatches();
  }, [fetchDispatches]);

  return {
    dispatches,
    loading,
    error,
    fetchDispatches,
    createDispatch,
    confirmDispatchItem,
    assignDispatchUser,
    getPendingDispatches,
    setError
  };
};

export default useDispatches;
