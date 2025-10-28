-- ========================================
-- SISTEMA COMPLETO DE DESPACHOS Y CUENTAS
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ========================================

-- PASO 1: AGREGAR ROL DE DESPACHO
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'vendedor', 'produccion', 'lector', 'despacho'));
COMMENT ON COLUMN users.role IS 'Roles: admin, vendedor, produccion, lector, despacho';

-- PASO 2: CREAR TABLAS DEL SISTEMA
-- 2.1 TABLA DE CUENTAS DE CLIENTES
CREATE TABLE IF NOT EXISTS customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    account_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'pending_dispatch', 'closed')),
    total_value DECIMAL(12,2) DEFAULT 0,
    paid_value DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    dispatch_requested BOOLEAN DEFAULT FALSE,
    dispatch_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    closed_by UUID REFERENCES users(id),
    UNIQUE(company_id, account_number)
);

-- 2.2 TABLA DE COMPROBANTES DE PAGO
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

-- 2.3 TABLA DE DESPACHOS
CREATE TABLE IF NOT EXISTS dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    dispatch_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    total_items INTEGER DEFAULT 0,
    confirmed_items INTEGER DEFAULT 0,
    delivery_address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    dispatch_user_id UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    UNIQUE(company_id, dispatch_number)
);

-- 2.4 TABLA DE ITEMS DE DESPACHO
CREATE TABLE IF NOT EXISTS dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id),
    reference VARCHAR(100) NOT NULL,
    color VARCHAR(50),
    size VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 1,
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMPTZ,
    confirmation_method VARCHAR(20) DEFAULT 'manual' CHECK (confirmation_method IN ('manual', 'barcode', 'qr'))
);

-- 2.5 TABLA DE TRANSACCIONES DE CUENTA
CREATE TABLE IF NOT EXISTS account_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('sale', 'payment', 'adjustment')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_id UUID, -- ID de venta, pago, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- 2.6 TABLA DE CONSECUTIVOS POR EMPRESA
CREATE TABLE IF NOT EXISTS company_consecutives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    consecutive_type VARCHAR(50) NOT NULL,
    current_number INTEGER DEFAULT 0,
    prefix VARCHAR(10) DEFAULT '',
    
    UNIQUE(company_id, consecutive_type)
);

-- PASO 3: ACTUALIZAR TABLAS EXISTENTES
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES customer_accounts(id),
ADD COLUMN IF NOT EXISTS dispatch_type VARCHAR(20) DEFAULT 'separate' CHECK (dispatch_type IN ('separate', 'dispatch'));

-- PASO 4: CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer ON customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_company ON customer_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_status ON customer_accounts(status);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_account ON payment_receipts(account_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_account ON dispatches(account_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch ON dispatch_items(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_account ON account_transactions(account_id);

-- PASO 5: CREAR FUNCIÓN PARA CONSECUTIVOS
CREATE OR REPLACE FUNCTION get_next_consecutive(p_type TEXT, p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_num INTEGER;
    new_num INTEGER;
    prefix TEXT;
    result TEXT;
BEGIN
    -- Verificar si existe el consecutivo para esta empresa
    SELECT current_number, COALESCE(prefix, '') INTO current_num, prefix
    FROM company_consecutives 
    WHERE company_id = p_company_id AND consecutive_type = p_type;
    
    -- Si no existe, crear uno nuevo
    IF current_num IS NULL THEN
        current_num := 0;
        prefix := '';
        INSERT INTO company_consecutives (company_id, consecutive_type, current_number, prefix)
        VALUES (p_company_id, p_type, 1, prefix)
        ON CONFLICT (company_id, consecutive_type) DO NOTHING;
        new_num := 1;
    ELSE
        -- Incrementar el consecutivo
        new_num := current_num + 1;
        UPDATE company_consecutives 
        SET current_number = new_num 
        WHERE company_id = p_company_id AND consecutive_type = p_type;
    END IF;
    
    -- Formatear el resultado
    result := prefix || LPAD(new_num::TEXT, 6, '0');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- PASO 6: CREAR POLÍTICAS RLS
-- Habilitar RLS en todas las tablas
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_consecutives ENABLE ROW LEVEL SECURITY;

-- Políticas para customer_accounts
CREATE POLICY customer_accounts_company_policy ON customer_accounts
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
            UNION
            SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        )
    );

-- Políticas para payment_receipts
CREATE POLICY payment_receipts_company_policy ON payment_receipts
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
            UNION
            SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        )
    );

-- Políticas para dispatches
CREATE POLICY dispatches_company_policy ON dispatches
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
            UNION
            SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        )
    );

-- Políticas para dispatch_items
CREATE POLICY dispatch_items_company_policy ON dispatch_items
    FOR ALL USING (
        dispatch_id IN (
            SELECT id FROM dispatches WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
                UNION
                SELECT company_id FROM user_companies WHERE user_id = auth.uid()
            )
        )
    );

-- Políticas para account_transactions
CREATE POLICY account_transactions_company_policy ON account_transactions
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
            UNION
            SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        )
    );

-- Políticas para company_consecutives
CREATE POLICY company_consecutives_company_policy ON company_consecutives
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
            UNION
            SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        )
    );

-- ========================================
-- SCRIPT COMPLETADO
-- ========================================
-- Este script crea todo el sistema de despachos y cuentas
-- Ejecutar en el SQL Editor de Supabase
-- ========================================
