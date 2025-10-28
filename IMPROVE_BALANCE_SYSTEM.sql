-- ========================================
-- SISTEMA MEJORADO DE CUENTAS Y BALANCES
-- ========================================

-- Agregar campos faltantes a customer_accounts
ALTER TABLE customer_accounts 
ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'mixed' CHECK (account_type IN ('mixed', 'dispatch_only', 'separate_only')),
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS can_be_dispatched BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dispatch_ready BOOLEAN DEFAULT FALSE;

-- Agregar campos a sales para mejor control
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS consecutive_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS is_balance_use BOOLEAN DEFAULT FALSE, -- Si usa saldo a favor
ADD COLUMN IF NOT EXISTS balance_used DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_payment DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS dispatch_priority INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT TRUE;

-- Crear tabla para promociones
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(12,2),
    min_purchase_amount DECIMAL(12,2),
    active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla para ventas sin referencia (solo pagos)
CREATE TABLE IF NOT EXISTS payment_only_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    payment_proof_url TEXT,
    consecutive_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Función para calcular balance actualizado
CREATE OR REPLACE FUNCTION calculate_account_balance(account_id_param UUID)
RETURNS TABLE(
    total_sales DECIMAL(12,2),
    total_payments DECIMAL(12,2),
    total_payment_only DECIMAL(12,2),
    balance DECIMAL(12,2),
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH sales_summary AS (
        SELECT COALESCE(SUM(s.total_value), 0) as sales_total
        FROM sales s 
        WHERE s.account_id = account_id_param AND s.status = 'approved'
    ),
    payments_summary AS (
        SELECT COALESCE(SUM(pr.amount), 0) as payments_total
        FROM payment_receipts pr
        WHERE pr.account_id = account_id_param AND pr.verified = true
    ),
    payment_only_summary AS (
        SELECT COALESCE(SUM(pos.amount), 0) as payment_only_total
        FROM payment_only_sales pos
        WHERE pos.account_id = account_id_param
    )
    SELECT 
        ss.sales_total,
        ps.payments_total,
        pos.payment_only_total,
        (ps.payments_total + pos.payment_only_total - ss.sales_total) as account_balance,
        CASE 
            WHEN (ps.payments_total + pos.payment_only_total - ss.sales_total) > 0 THEN 'favor'
            WHEN (ps.payments_total + pos.payment_only_total - ss.sales_total) < 0 THEN 'pending'
            ELSE 'balanced'
        END as balance_status
    FROM sales_summary ss, payments_summary ps, payment_only_summary pos;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar balances automáticamente
CREATE OR REPLACE FUNCTION update_account_balance_trigger()
RETURNS TRIGGER AS $$
DECLARE
    account_id_to_update UUID;
    balance_info RECORD;
BEGIN
    -- Determinar el account_id según la tabla
    IF TG_TABLE_NAME = 'sales' THEN
        account_id_to_update := COALESCE(NEW.account_id, OLD.account_id);
    ELSIF TG_TABLE_NAME = 'payment_receipts' THEN
        account_id_to_update := COALESCE(NEW.account_id, OLD.account_id);
    ELSIF TG_TABLE_NAME = 'payment_only_sales' THEN
        account_id_to_update := COALESCE(NEW.account_id, OLD.account_id);
    END IF;
    
    IF account_id_to_update IS NOT NULL THEN
        -- Calcular nuevo balance
        SELECT * INTO balance_info FROM calculate_account_balance(account_id_to_update);
        
        -- Actualizar la cuenta
        UPDATE customer_accounts 
        SET 
            total_value = balance_info.total_sales,
            paid_value = balance_info.total_payments + balance_info.total_payment_only,
            balance = balance_info.balance,
            last_activity_at = NOW()
        WHERE id = account_id_to_update;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para actualización automática
DROP TRIGGER IF EXISTS sales_balance_update ON sales;
CREATE TRIGGER sales_balance_update
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_account_balance_trigger();

DROP TRIGGER IF EXISTS payments_balance_update ON payment_receipts;
CREATE TRIGGER payments_balance_update
    AFTER INSERT OR UPDATE OR DELETE ON payment_receipts
    FOR EACH ROW EXECUTE FUNCTION update_account_balance_trigger();

DROP TRIGGER IF EXISTS payment_only_balance_update ON payment_only_sales;
CREATE TRIGGER payment_only_balance_update
    AFTER INSERT OR UPDATE OR DELETE ON payment_only_sales
    FOR EACH ROW EXECUTE FUNCTION update_account_balance_trigger();

-- Políticas RLS para nuevas tablas
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_only_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY promotions_company_policy ON promotions
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY payment_only_sales_company_policy ON payment_only_sales
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ========================================
-- SISTEMA DE BALANCES MEJORADO
-- ========================================
