// ========================================
// HOOK PARA GESTIÓN DE COMPROBANTES DE PAGO
// ========================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

export const usePaymentReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { company } = useAuth();

  // Obtener comprobantes de pago
  const fetchReceipts = useCallback(async (accountId = null) => {
    if (!company?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('payment_receipts')
        .select(`
          *,
          customer_accounts!inner(
            id,
            account_number,
            customers!inner(name, document)
          ),
          uploaded_by_user:users!payment_receipts_uploaded_by_fkey(username),
          verified_by_user:users!payment_receipts_verified_by_fkey(username)
        `)
        .eq('company_id', company.id)
        .order('uploaded_at', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReceipts(data || []);
    } catch (err) {
      setError(err.message);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  // Subir comprobante de pago
  const uploadReceipt = useCallback(async (receiptData, file) => {
    if (!company?.id) throw new Error('No hay empresa seleccionada');
    
    try {
      let fileUrl = null;
      
      // Subir archivo si se proporciona
      if (file) {
        const fileName = `receipts/${company.id}/${Date.now()}_${file.name}`;
        const { data: fileData, error: uploadError } = await supabase.storage
          .from('payment-receipts')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        // Obtener URL pública del archivo
        const { data: urlData } = supabase.storage
          .from('payment-receipts')
          .getPublicUrl(fileName);
        
        fileUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('payment_receipts')
        .insert({
          account_id: receiptData.account_id,
          company_id: company.id,
          file_url: fileUrl || receiptData.file_url,
          file_name: file?.name || receiptData.file_name,
          amount: parseFloat(receiptData.amount),
          payment_method: receiptData.payment_method,
          receipt_date: receiptData.receipt_date,
          uploaded_by: receiptData.uploaded_by
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchReceipts();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [company?.id, fetchReceipts]);

  // Verificar comprobante de pago
  const verifyReceipt = useCallback(async (receiptId, verifiedBy, isVerified = true) => {
    try {
      const { error } = await supabase
        .from('payment_receipts')
        .update({
          verified: isVerified,
          verified_by: verifiedBy,
          verified_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) throw error;
      
      await fetchReceipts();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchReceipts]);

  // Eliminar comprobante de pago
  const deleteReceipt = useCallback(async (receiptId) => {
    try {
      // Obtener información del archivo para eliminarlo del storage
      const { data: receipt } = await supabase
        .from('payment_receipts')
        .select('file_url')
        .eq('id', receiptId)
        .single();

      // Eliminar de la base de datos
      const { error } = await supabase
        .from('payment_receipts')
        .delete()
        .eq('id', receiptId);

      if (error) throw error;

      // Eliminar archivo del storage si existe
      if (receipt?.file_url) {
        const fileName = receipt.file_url.split('/').pop();
        await supabase.storage
          .from('payment-receipts')
          .remove([`receipts/${company.id}/${fileName}`]);
      }
      
      await fetchReceipts();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [company?.id, fetchReceipts]);

  // Obtener comprobantes pendientes de verificación
  const getPendingReceipts = useCallback(async () => {
    if (!company?.id) return [];
    
    try {
      const { data, error } = await supabase
        .from('payment_receipts')
        .select(`
          *,
          customer_accounts!inner(
            id,
            account_number,
            customers!inner(name, document)
          ),
          uploaded_by_user:users!payment_receipts_uploaded_by_fkey(username)
        `)
        .eq('company_id', company.id)
        .eq('verified', false)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [company?.id]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  return {
    receipts,
    loading,
    error,
    fetchReceipts,
    uploadReceipt,
    verifyReceipt,
    deleteReceipt,
    getPendingReceipts,
    setError
  };
};

export default usePaymentReceipts;
