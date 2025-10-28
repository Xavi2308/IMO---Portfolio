-- SCRIPT DE DIAGNÓSTICO Y REPARACIÓN COMPLETA
-- Para resolver el error "column reference_code does not exist"

\echo 'DIAGNÓSTICO INICIAL:'

-- Verificar estructura actual de sales
\echo 'Columnas en tabla sales:'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar si existe sale_references
\echo 'Verificando tabla sale_references:'
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'sale_references'
);

-- REPARACIONES:

-- 1. Crear sale_references si no existe
CREATE TABLE IF NOT EXISTS sale_references (
    id SERIAL PRIMARY KEY,
    client_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending_dispatch',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id INTEGER NOT NULL,
    notes TEXT
);

-- 2. Agregar columnas faltantes a sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_code VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_status VARCHAR(20) DEFAULT 'active';

-- 3. Crear foreign keys necesarias
-- Para customers
ALTER TABLE sale_references DROP CONSTRAINT IF EXISTS sale_references_customer_id_fkey;
ALTER TABLE sale_references ADD CONSTRAINT sale_references_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Para companies (si existe la tabla)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public') THEN
        ALTER TABLE sale_references DROP CONSTRAINT IF EXISTS sale_references_company_id_fkey;
        ALTER TABLE sale_references ADD CONSTRAINT sale_references_company_id_fkey 
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Asegurar que client_reference sea UNIQUE antes de crear la foreign key
ALTER TABLE sale_references DROP CONSTRAINT IF EXISTS sale_references_client_reference_key;
ALTER TABLE sale_references ADD CONSTRAINT sale_references_client_reference_key UNIQUE (client_reference);

-- 5. La foreign key crítica que esperan los componentes React
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_reference_code_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_reference_code_fkey 
    FOREIGN KEY (reference_code) REFERENCES sale_references(client_reference) ON DELETE SET NULL;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_sales_reference_code ON sales(reference_code);
CREATE INDEX IF NOT EXISTS idx_sale_references_client_reference ON sale_references(client_reference);
CREATE INDEX IF NOT EXISTS idx_sale_references_customer_id ON sale_references(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_references_company_id ON sale_references(company_id);

-- 7. RLS Policies
ALTER TABLE sale_references ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
DROP POLICY IF EXISTS "sale_references_select_policy" ON sale_references;
CREATE POLICY "sale_references_select_policy" ON sale_references
    FOR SELECT USING (
        company_id = COALESCE((auth.jwt() ->> 'company_id')::int, 
                             (auth.jwt() ->> 'user_metadata' ->> 'company_id')::int)
    );

-- Política para INSERT
DROP POLICY IF EXISTS "sale_references_insert_policy" ON sale_references;
CREATE POLICY "sale_references_insert_policy" ON sale_references
    FOR INSERT WITH CHECK (
        company_id = COALESCE((auth.jwt() ->> 'company_id')::int, 
                             (auth.jwt() ->> 'user_metadata' ->> 'company_id')::int)
    );

-- Política para UPDATE
DROP POLICY IF EXISTS "sale_references_update_policy" ON sale_references;
CREATE POLICY "sale_references_update_policy" ON sale_references
    FOR UPDATE USING (
        company_id = COALESCE((auth.jwt() ->> 'company_id')::int, 
                             (auth.jwt() ->> 'user_metadata' ->> 'company_id')::int)
    );

-- Política para DELETE
DROP POLICY IF EXISTS "sale_references_delete_policy" ON sale_references;
CREATE POLICY "sale_references_delete_policy" ON sale_references
    FOR DELETE USING (
        company_id = COALESCE((auth.jwt() ->> 'company_id')::int, 
                             (auth.jwt() ->> 'user_metadata' ->> 'company_id')::int)
    );

\echo 'VERIFICACIÓN FINAL:'

-- Verificar que reference_code existe en sales
SELECT 'reference_code column exists in sales:' as status, 
       EXISTS (
           SELECT FROM information_schema.columns 
           WHERE table_name = 'sales' AND column_name = 'reference_code' AND table_schema = 'public'
       ) as exists;

-- Verificar que la foreign key existe
SELECT 'sales_reference_code_fkey exists:' as status,
       EXISTS (
           SELECT FROM information_schema.table_constraints 
           WHERE constraint_name = 'sales_reference_code_fkey' AND table_name = 'sales' AND table_schema = 'public'
       ) as exists;

\echo 'REPARACIÓN COMPLETADA - Los componentes React deberían funcionar ahora';