-- ========================================
-- CONFIGURACIÓN COMPLETA DEL SISTEMA DE CUENTAS DE CLIENTES
-- Ejecutar en Supabase SQL Editor
-- ========================================

-- 1. AGREGAR COLUMNA COMPANY_ID A CUSTOMERS
-- ========================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. AGREGAR FOREIGN KEY CONSTRAINT
-- ========================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_customers_company' 
        AND table_name = 'customers'
    ) THEN
        ALTER TABLE customers 
        ADD CONSTRAINT fk_customers_company 
        FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;
END $$;

-- 3. ACTUALIZAR CUSTOMERS EXISTENTES CON LA PRIMERA EMPRESA
-- ========================================
WITH first_company AS (
  SELECT id FROM companies ORDER BY created_at LIMIT 1
)
UPDATE customers 
SET company_id = (SELECT id FROM first_company)
WHERE company_id IS NULL;

-- 4. CREAR ÍNDICES PARA MEJOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON customer_accounts(customer_id);

-- 5. CREAR POLÍTICAS RLS PARA CUSTOMER_ACCOUNTS
-- ========================================
-- Habilitar RLS
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
DROP POLICY IF EXISTS "Users can view accounts from their company" ON customer_accounts;
CREATE POLICY "Users can view accounts from their company" ON customer_accounts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = customer_accounts.customer_id
    AND c.company_id = (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  )
);

-- Política para INSERT
DROP POLICY IF EXISTS "Users can create accounts for their company customers" ON customer_accounts;
CREATE POLICY "Users can create accounts for their company customers" ON customer_accounts
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = customer_accounts.customer_id
    AND c.company_id = (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  )
);

-- Política para UPDATE
DROP POLICY IF EXISTS "Users can update accounts from their company" ON customer_accounts;
CREATE POLICY "Users can update accounts from their company" ON customer_accounts
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = customer_accounts.customer_id
    AND c.company_id = (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  )
);

-- 6. VERIFICAR CONFIGURACIÓN
-- ========================================
-- Verificar que customers tienen company_id
SELECT 
  'Customers sin company_id' as check_type,
  COUNT(*) as count
FROM customers 
WHERE company_id IS NULL

UNION ALL

-- Verificar cuentas existentes
SELECT 
  'Cuentas existentes' as check_type,
  COUNT(*) as count
FROM customer_accounts

UNION ALL

-- Verificar relación customers-companies
SELECT 
  'Customers con empresa' as check_type,
  COUNT(*) as count
FROM customers c
JOIN companies comp ON c.company_id = comp.id;

-- Mostrar resumen de cuentas por empresa
SELECT 
  comp.name as empresa,
  COUNT(ca.*) as total_cuentas,
  SUM(ca.balance) as balance_total
FROM companies comp
LEFT JOIN customers c ON c.company_id = comp.id
LEFT JOIN customer_accounts ca ON ca.customer_id = c.id
GROUP BY comp.id, comp.name
ORDER BY comp.name;
