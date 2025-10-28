// ========================================
// FUNCIONES RPC PARA EL SISTEMA DE CUENTAS
// ========================================

import { supabase } from '../supabase';

export class DatabaseFunctions {

  // ============================================================================
  // CREAR FUNCIONES RPC EN LA BASE DE DATOS
  // ============================================================================
  
  static async setupDatabaseFunctions() {
    try {
      console.log('🔧 Configurando funciones de base de datos...');
      
      // Función para procesar pagos verificados
      const processPaymentFunction = `
        CREATE OR REPLACE FUNCTION process_verified_payment(receipt_id UUID)
        RETURNS JSON
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          receipt_record payment_receipts%ROWTYPE;
          account_record customer_accounts%ROWTYPE;
          transaction_id UUID;
          result JSON;
        BEGIN
          -- Obtener el comprobante
          SELECT * INTO receipt_record
          FROM payment_receipts
          WHERE id = receipt_id AND verified = true;
          
          IF NOT FOUND THEN
            RAISE EXCEPTION 'Comprobante no encontrado o no verificado';
          END IF;
          
          -- Obtener la cuenta
          SELECT * INTO account_record
          FROM customer_accounts
          WHERE id = receipt_record.account_id;
          
          IF NOT FOUND THEN
            RAISE EXCEPTION 'Cuenta no encontrada';
          END IF;
          
          -- Crear transacción de pago
          INSERT INTO account_transactions (
            account_id,
            type,
            amount,
            description,
            reference_id,
            reference_type,
            created_by
          ) VALUES (
            receipt_record.account_id,
            'payment',
            receipt_record.amount,
            COALESCE(receipt_record.description, 'Pago verificado'),
            receipt_record.id,
            'payment_receipt',
            receipt_record.created_by
          ) RETURNING id INTO transaction_id;
          
          -- Actualizar balance de la cuenta
          UPDATE customer_accounts
          SET 
            paid_value = paid_value + receipt_record.amount,
            balance = total_value - (paid_value + receipt_record.amount),
            updated_at = NOW()
          WHERE id = receipt_record.account_id;
          
          -- Preparar resultado
          result := json_build_object(
            'transaction_id', transaction_id,
            'account_id', receipt_record.account_id,
            'amount', receipt_record.amount,
            'new_balance', (account_record.total_value - (account_record.paid_value + receipt_record.amount))
          );
          
          RETURN result;
        END;
        $$;
      `;
      
      await supabase.rpc('exec_sql', { sql: processPaymentFunction }).catch(() => {
        console.log('⚠️ No se pudo crear la función process_verified_payment');
      });
      
      // Función para crear despachos
      const createDispatchFunction = `
        CREATE OR REPLACE FUNCTION create_dispatch_from_account(
          p_account_id UUID,
          p_delivery_address TEXT,
          p_notes TEXT DEFAULT NULL,
          p_scheduled_date DATE DEFAULT NULL
        )
        RETURNS JSON
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          account_record customer_accounts%ROWTYPE;
          dispatch_id UUID;
          dispatch_number TEXT;
          sale_record RECORD;
          result JSON;
          company_id_var UUID;
        BEGIN
          -- Obtener la cuenta y verificar que esté lista para despacho
          SELECT ca.*, c.company_id INTO account_record, company_id_var
          FROM customer_accounts ca
          JOIN customers c ON ca.customer_id = c.id
          WHERE ca.id = p_account_id 
            AND ca.status = 'pending_dispatch' 
            AND ca.dispatch_requested = true;
          
          IF NOT FOUND THEN
            RAISE EXCEPTION 'Cuenta no encontrada o no está lista para despacho';
          END IF;
          
          -- Generar número de despacho
          SELECT 'DISP-' || LPAD(EXTRACT(EPOCH FROM NOW())::text, 10, '0') INTO dispatch_number;
          
          -- Crear el despacho
          INSERT INTO dispatches (
            account_id,
            dispatch_number,
            status,
            dispatch_date,
            delivery_address,
            notes
          ) VALUES (
            p_account_id,
            dispatch_number,
            'pending',
            COALESCE(p_scheduled_date, CURRENT_DATE),
            p_delivery_address,
            p_notes
          ) RETURNING id INTO dispatch_id;
          
          -- Crear items del despacho basados en las ventas de la cuenta
          FOR sale_record IN
            SELECT s.id, s.design, s.talla, s.color, s.price, 
                   sm.quantity
            FROM sales s
            JOIN stock_movements sm ON s.id = sm.sale_id
            WHERE s.account_id = p_account_id
          LOOP
            INSERT INTO dispatch_items (
              dispatch_id,
              sale_id,
              quantity,
              unit_price
            ) VALUES (
              dispatch_id,
              sale_record.id,
              sale_record.quantity,
              sale_record.price
            );
          END LOOP;
          
          -- Actualizar estado de la cuenta
          UPDATE customer_accounts
          SET 
            status = 'closed',
            dispatch_requested = false,
            updated_at = NOW()
          WHERE id = p_account_id;
          
          -- Preparar resultado
          result := json_build_object(
            'dispatch_id', dispatch_id,
            'dispatch_number', dispatch_number,
            'account_id', p_account_id,
            'delivery_address', p_delivery_address
          );
          
          RETURN result;
        END;
        $$;
      `;
      
      await supabase.rpc('exec_sql', { sql: createDispatchFunction }).catch(() => {
        console.log('⚠️ No se pudo crear la función create_dispatch_from_account');
      });
      
      console.log('✅ Funciones de base de datos configuradas');
      return true;
    } catch (error) {
      console.error('❌ Error configurando funciones:', error);
      return false;
    }
  }

  // ============================================================================
  // PROCESAR PAGO VERIFICADO (ALTERNATIVO)
  // ============================================================================
  
  static async processVerifiedPayment(receiptId) {
    try {
      // Primero intentar usar la función RPC
      const { data, error } = await supabase.rpc('process_verified_payment', {
        receipt_id: receiptId
      });
      
      if (!error && data) {
        return data;
      }
      
      // Si falla, hacer manualmente
      console.log('⚠️ Función RPC no disponible, procesando manualmente...');
      
      // Obtener el comprobante
      const { data: receipt, error: receiptError } = await supabase
        .from('payment_receipts')
        .select('*, customer_accounts(*)')
        .eq('id', receiptId)
        .eq('verified', true)
        .single();
      
      if (receiptError || !receipt) {
        throw new Error('Comprobante no encontrado o no verificado');
      }
      
      // Crear transacción
      const { data: transaction, error: transactionError } = await supabase
        .from('account_transactions')
        .insert({
          account_id: receipt.account_id,
          type: 'payment',
          amount: receipt.amount,
          description: receipt.description || 'Pago verificado',
          reference_id: receipt.id,
          reference_type: 'payment_receipt',
          created_by: receipt.created_by
        })
        .select()
        .single();
      
      if (transactionError) throw transactionError;
      
      // Actualizar balance de la cuenta
      const newPaidValue = receipt.customer_accounts.paid_value + receipt.amount;
      const newBalance = receipt.customer_accounts.total_value - newPaidValue;
      
      const { error: updateError } = await supabase
        .from('customer_accounts')
        .update({
          paid_value: newPaidValue,
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', receipt.account_id);
      
      if (updateError) throw updateError;
      
      return {
        transaction_id: transaction.id,
        account_id: receipt.account_id,
        amount: receipt.amount,
        new_balance: newBalance
      };
      
    } catch (error) {
      console.error('Error processing verified payment:', error);
      throw error;
    }
  }

  // ============================================================================
  // CREAR DESPACHO DESDE CUENTA (ALTERNATIVO)
  // ============================================================================
  
  static async createDispatchFromAccount(accountId, deliveryAddress, notes = null, scheduledDate = null) {
    try {
      // Primero intentar usar la función RPC
      const { data, error } = await supabase.rpc('create_dispatch_from_account', {
        p_account_id: accountId,
        p_delivery_address: deliveryAddress,
        p_notes: notes,
        p_scheduled_date: scheduledDate
      });
      
      if (!error && data) {
        return data;
      }
      
      // Si falla, hacer manualmente
      console.log('⚠️ Función RPC no disponible, procesando manualmente...');
      
      // Verificar que la cuenta esté lista para despacho
      const { data: account, error: accountError } = await supabase
        .from('customer_accounts')
        .select('*, customers(company_id)')
        .eq('id', accountId)
        .eq('status', 'pending_dispatch')
        .eq('dispatch_requested', true)
        .single();
      
      if (accountError || !account) {
        throw new Error('Cuenta no encontrada o no está lista para despacho');
      }
      
      // Generar número de despacho simple
      const dispatchNumber = `DISP-${Date.now()}`;
      
      // Crear el despacho
      const { data: dispatch, error: dispatchError } = await supabase
        .from('dispatches')
        .insert({
          account_id: accountId,
          dispatch_number: dispatchNumber,
          status: 'pending',
          dispatch_date: scheduledDate || new Date().toISOString().split('T')[0],
          delivery_address: deliveryAddress,
          notes: notes
        })
        .select()
        .single();
      
      if (dispatchError) throw dispatchError;
      
      // Obtener ventas de la cuenta y crear items del despacho
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*, stock_movements(quantity)')
        .eq('account_id', accountId);
      
      if (salesError) throw salesError;
      
      // Crear items del despacho
      if (sales && sales.length > 0) {
        const dispatchItems = sales.map(sale => ({
          dispatch_id: dispatch.id,
          sale_id: sale.id,
          quantity: sale.stock_movements[0]?.quantity || 1,
          unit_price: sale.price
        }));
        
        const { error: itemsError } = await supabase
          .from('dispatch_items')
          .insert(dispatchItems);
        
        if (itemsError) throw itemsError;
      }
      
      // Actualizar estado de la cuenta
      const { error: updateError } = await supabase
        .from('customer_accounts')
        .update({
          status: 'closed',
          dispatch_requested: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);
      
      if (updateError) throw updateError;
      
      return {
        dispatch_id: dispatch.id,
        dispatch_number: dispatchNumber,
        account_id: accountId,
        delivery_address: deliveryAddress
      };
      
    } catch (error) {
      console.error('Error creating dispatch:', error);
      throw error;
    }
  }
}

export default DatabaseFunctions;
