-- ========================================
-- FUNCIONES RPC PARA EL SISTEMA DE CUENTAS
-- ========================================

-- ============================================================================
-- FUNCIÓN: PROCESAR PAGO VERIFICADO
-- ============================================================================
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

-- ============================================================================
-- FUNCIÓN: CREAR DESPACHO DESDE CUENTA
-- ============================================================================
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
    SELECT get_next_consecutive('dispatch', company_id_var) INTO dispatch_number;
    
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

-- ============================================================================
-- FUNCIÓN: CALCULAR BALANCE DE CUENTA
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_account_balance(p_account_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
    total_sales DECIMAL := 0;
    total_payments DECIMAL := 0;
    balance DECIMAL := 0;
BEGIN
    -- Calcular total de ventas
    SELECT COALESCE(SUM(s.price * sm.quantity), 0) INTO total_sales
    FROM sales s
    JOIN stock_movements sm ON s.id = sm.sale_id
    WHERE s.account_id = p_account_id;
    
    -- Calcular total de pagos verificados
    SELECT COALESCE(SUM(pr.amount), 0) INTO total_payments
    FROM payment_receipts pr
    WHERE pr.account_id = p_account_id AND pr.verified = true;
    
    -- Calcular balance
    balance := total_sales - total_payments;
    
    RETURN balance;
END;
$$;

-- ============================================================================
-- FUNCIÓN: OBTENER RESUMEN FINANCIERO DE CLIENTE
-- ============================================================================
CREATE OR REPLACE FUNCTION get_customer_financial_summary(
    p_customer_id UUID,
    p_company_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    total_accounts INTEGER := 0;
    total_sales DECIMAL := 0;
    total_payments DECIMAL := 0;
    total_credit DECIMAL := 0;
    total_debt DECIMAL := 0;
    open_accounts INTEGER := 0;
    result JSON;
BEGIN
    -- Contar cuentas del cliente
    SELECT COUNT(*) INTO total_accounts
    FROM customer_accounts ca
    JOIN customers c ON ca.customer_id = c.id
    WHERE ca.customer_id = p_customer_id AND c.company_id = p_company_id;
    
    -- Contar cuentas abiertas
    SELECT COUNT(*) INTO open_accounts
    FROM customer_accounts ca
    JOIN customers c ON ca.customer_id = c.id
    WHERE ca.customer_id = p_customer_id 
      AND c.company_id = p_company_id 
      AND ca.status = 'open';
    
    -- Calcular totales
    SELECT 
        COALESCE(SUM(ca.total_value), 0),
        COALESCE(SUM(ca.paid_value), 0),
        COALESCE(SUM(CASE WHEN ca.balance > 0 THEN ca.balance ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN ca.balance < 0 THEN ABS(ca.balance) ELSE 0 END), 0)
    INTO total_sales, total_payments, total_credit, total_debt
    FROM customer_accounts ca
    JOIN customers c ON ca.customer_id = c.id
    WHERE ca.customer_id = p_customer_id AND c.company_id = p_company_id;
    
    -- Preparar resultado
    result := json_build_object(
        'customer_id', p_customer_id,
        'summary', json_build_object(
            'accountsCount', total_accounts,
            'openAccountsCount', open_accounts,
            'totalSales', total_sales,
            'totalPayments', total_payments,
            'totalCredit', total_credit,
            'totalDebt', total_debt,
            'netBalance', total_credit - total_debt
        )
    );
    
    RETURN result;
END;
$$;

-- ============================================================================
-- TRIGGER: ACTUALIZAR BALANCE AUTOMÁTICAMENTE
-- ============================================================================
CREATE OR REPLACE FUNCTION update_account_balance_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Actualizar balance cuando se crea/actualiza una transacción
    UPDATE customer_accounts
    SET balance = calculate_account_balance(NEW.account_id),
        updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$;

-- Crear trigger para transacciones
DROP TRIGGER IF EXISTS trigger_update_account_balance ON account_transactions;
CREATE TRIGGER trigger_update_account_balance
    AFTER INSERT OR UPDATE ON account_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance_trigger();

-- ============================================================================
-- TRIGGER: ACTUALIZAR TOTALES DE CUENTA CUANDO HAY VENTAS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_account_totals_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    movement_quantity INTEGER;
BEGIN
    -- Solo procesar si la venta tiene una cuenta asociada
    IF NEW.account_id IS NOT NULL THEN
        -- Obtener la cantidad del movimiento de stock
        SELECT quantity INTO movement_quantity
        FROM stock_movements
        WHERE sale_id = NEW.id
        LIMIT 1;
        
        -- Actualizar el total de la cuenta
        UPDATE customer_accounts
        SET 
            total_value = (
                SELECT COALESCE(SUM(s.price * sm.quantity), 0)
                FROM sales s
                JOIN stock_movements sm ON s.id = sm.sale_id
                WHERE s.account_id = NEW.account_id
            ),
            updated_at = NOW()
        WHERE id = NEW.account_id;
        
        -- Recalcular balance
        UPDATE customer_accounts
        SET balance = total_value - paid_value
        WHERE id = NEW.account_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Crear trigger para ventas
DROP TRIGGER IF EXISTS trigger_update_account_totals_on_sale ON sales;
CREATE TRIGGER trigger_update_account_totals_on_sale
    AFTER INSERT OR UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_account_totals_on_sale();

-- ============================================================================
-- FUNCIÓN: VERIFICAR SI CLIENTE PUEDE REALIZAR COMPRA
-- ============================================================================
CREATE OR REPLACE FUNCTION can_customer_afford_purchase(
    p_customer_id UUID,
    p_company_id UUID,
    p_purchase_amount DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    customer_balance DECIMAL := 0;
BEGIN
    -- Calcular balance total del cliente
    SELECT COALESCE(SUM(ca.balance), 0) INTO customer_balance
    FROM customer_accounts ca
    JOIN customers c ON ca.customer_id = c.id
    WHERE ca.customer_id = p_customer_id 
      AND c.company_id = p_company_id
      AND ca.status = 'open';
    
    -- Retornar true si el balance es suficiente
    RETURN customer_balance >= p_purchase_amount;
END;
$$;

-- ============================================================================
-- PERMISOS
-- ============================================================================

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION process_verified_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_dispatch_from_account(UUID, TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_account_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_financial_summary(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_customer_afford_purchase(UUID, UUID, DECIMAL) TO authenticated;
