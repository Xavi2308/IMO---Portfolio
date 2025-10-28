-- ========================================
-- SISTEMA DE CUENTAS POR CLIENTE - MULTITENANT
-- ========================================

-- 1. TABLA DE CUENTAS DE CLIENTES
CREATE TABLE IF NOT EXISTS customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    account_number VARCHAR(50) NOT NULL, -- Número consecutivo de cuenta por empresa
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'pending_dispatch', 'closed')),
    total_value DECIMAL(12,2) DEFAULT 0,
    paid_value DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0, -- Saldo (positivo = a favor, negativo = pendiente)
    dispatch_requested BOOLEAN DEFAULT FALSE,
    dispatch_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    closed_by UUID REFERENCES users(id),
    
    UNIQUE(company_id, account_number)
);

-- 2. TABLA DE COMPROBANTES DE PAGO
CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50),
    receipt_date DATE,
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id)
);

-- 3. TABLA DE DESPACHOS
CREATE TABLE IF NOT EXISTS dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    dispatch_number VARCHAR(50) NOT NULL, -- Número consecutivo de despacho
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    total_items INTEGER DEFAULT 0,
    confirmed_items INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    dispatch_user_id UUID REFERENCES users(id), -- Usuario de despacho
    
    UNIQUE(company_id, dispatch_number)
);

-- 4. TABLA DE ITEMS DE DESPACHO
CREATE TABLE IF NOT EXISTS dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    reference VARCHAR(100) NOT NULL,
    color VARCHAR(100) NOT NULL,
    size VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL,
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMPTZ,
    confirmation_method VARCHAR(20) DEFAULT 'manual' CHECK (confirmation_method IN ('manual', 'scan'))
);

-- 5. TABLA DE TRANSACCIONES DE CUENTA
CREATE TABLE IF NOT EXISTS account_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'sale', 'adjustment', 'refund')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_id UUID, -- ID de la venta, pago, etc.
    reference_table VARCHAR(50), -- 'sales', 'payment_receipts', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- 6. TABLA DE CONSECUTIVOS POR EMPRESA
CREATE TABLE IF NOT EXISTS company_consecutives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    consecutive_type VARCHAR(50) NOT NULL, -- 'sale', 'account', 'dispatch'
    current_number INTEGER DEFAULT 0,
    prefix VARCHAR(10) DEFAULT '',
    
    UNIQUE(company_id, consecutive_type)
);

-- ========================================
-- MODIFICACIONES A TABLAS EXISTENTES
-- ========================================

-- Agregar campos a la tabla sales
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES customer_accounts(id),
ADD COLUMN IF NOT EXISTS consecutive_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS dispatch_type VARCHAR(20) DEFAULT 'separate' CHECK (dispatch_type IN ('separate', 'dispatch')),
ADD COLUMN IF NOT EXISTS payment_receipt_id UUID REFERENCES payment_receipts(id),
ADD COLUMN IF NOT EXISTS is_balance_usage BOOLEAN DEFAULT FALSE; -- Para identificar uso de saldo a favor

-- Agregar índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_company ON customer_accounts(customer_id, company_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_status ON customer_accounts(status);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_account ON payment_receipts(account_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_account ON dispatches(account_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch ON dispatch_items(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_account ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_account ON sales(account_id);

-- ========================================
-- FUNCIONES DE UTILIDAD
-- ========================================

-- Función para obtener el siguiente número consecutivo
CREATE OR REPLACE FUNCTION get_next_consecutive(
    p_company_id UUID,
    p_type VARCHAR(50)
) RETURNS VARCHAR(50) AS $$
DECLARE
    v_current INTEGER;
    v_prefix VARCHAR(10);
    v_result VARCHAR(50);
BEGIN
    -- Insertar o actualizar el consecutivo
    INSERT INTO company_consecutives (company_id, consecutive_type, current_number)
    VALUES (p_company_id, p_type, 1)
    ON CONFLICT (company_id, consecutive_type)
    DO UPDATE SET current_number = company_consecutives.current_number + 1
    RETURNING current_number, prefix INTO v_current, v_prefix;
    
    -- Formar el número consecutivo
    v_result := COALESCE(v_prefix, '') || LPAD(v_current::TEXT, 6, '0');
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular el balance de una cuenta
CREATE OR REPLACE FUNCTION calculate_account_balance(p_account_id UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    v_total_paid DECIMAL(12,2) := 0;
    v_total_sales DECIMAL(12,2) := 0;
    v_balance DECIMAL(12,2);
BEGIN
    -- Sumar todos los pagos verificados
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payment_receipts 
    WHERE account_id = p_account_id AND verified = TRUE;
    
    -- Sumar todas las ventas de la cuenta
    SELECT COALESCE(SUM(total_value), 0) INTO v_total_sales
    FROM sales 
    WHERE account_id = p_account_id AND status != 'rejected';
    
    v_balance := v_total_paid - v_total_sales;
    
    -- Actualizar la cuenta
    UPDATE customer_accounts 
    SET 
        paid_value = v_total_paid,
        total_value = v_total_sales,
        balance = v_balance
    WHERE id = p_account_id;
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS PARA AUTOMATIZACIÓN
-- ========================================

-- Trigger para actualizar balance cuando se verifica un pago
CREATE OR REPLACE FUNCTION update_account_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_account_balance(NEW.account_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_balance_payment
    AFTER INSERT OR UPDATE ON payment_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance_on_payment();

-- Trigger para actualizar balance cuando se crea/modifica una venta
CREATE OR REPLACE FUNCTION update_account_balance_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.account_id IS NOT NULL THEN
        PERFORM calculate_account_balance(NEW.account_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_balance_sale
    AFTER INSERT OR UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance_on_sale();

-- ========================================
-- POLÍTICAS RLS (Row Level Security)
-- ========================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_consecutives ENABLE ROW LEVEL SECURITY;

-- Políticas para customer_accounts
CREATE POLICY customer_accounts_policy ON customer_accounts
    FOR ALL USING (
        company_id = (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Políticas para payment_receipts
CREATE POLICY payment_receipts_policy ON payment_receipts
    FOR ALL USING (
        company_id = (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Políticas para dispatches
CREATE POLICY dispatches_policy ON dispatches
    FOR ALL USING (
        company_id = (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Políticas para dispatch_items
CREATE POLICY dispatch_items_policy ON dispatch_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM dispatches d
            WHERE d.id = dispatch_id
            AND d.company_id = (
                SELECT company_id FROM users 
                WHERE id = auth.uid()
            )
        )
    );

-- Políticas para account_transactions
CREATE POLICY account_transactions_policy ON account_transactions
    FOR ALL USING (
        company_id = (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Políticas para company_consecutives
CREATE POLICY company_consecutives_policy ON company_consecutives
    FOR ALL USING (
        company_id = (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- ========================================
-- DATOS INICIALES
-- ========================================

-- Insertar tipos de consecutivos iniciales para todas las empresas existentes
INSERT INTO company_consecutives (company_id, consecutive_type, current_number, prefix)
SELECT 
    id as company_id,
    'sale' as consecutive_type,
    0 as current_number,
    'V-' as prefix
FROM companies
ON CONFLICT (company_id, consecutive_type) DO NOTHING;

INSERT INTO company_consecutives (company_id, consecutive_type, current_number, prefix)
SELECT 
    id as company_id,
    'account' as consecutive_type,
    0 as current_number,
    'CTA-' as prefix
FROM companies
ON CONFLICT (company_id, consecutive_type) DO NOTHING;

INSERT INTO company_consecutives (company_id, consecutive_type, current_number, prefix)
SELECT 
    id as company_id,
    'dispatch' as consecutive_type,
    0 as current_number,
    'DESP-' as prefix
FROM companies
ON CONFLICT (company_id, consecutive_type) DO NOTHING;

-- ========================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ========================================

COMMENT ON TABLE customer_accounts IS 'Cuentas por cliente que agrupan múltiples ventas hasta el despacho';
COMMENT ON TABLE payment_receipts IS 'Comprobantes de pago subidos por usuarios de ventas';
COMMENT ON TABLE dispatches IS 'Despachos que agrupan ventas de una cuenta para envío';
COMMENT ON TABLE dispatch_items IS 'Items individuales de cada despacho para confirmación';
COMMENT ON TABLE account_transactions IS 'Historial de transacciones por cuenta (pagos, ventas, ajustes)';
COMMENT ON TABLE company_consecutives IS 'Numeración consecutiva por empresa y tipo';
