-- CREAR FOREIGN KEY PARA SALES_REFERENCE_CODE_FKEY
-- Este script crea la relación que esperan los componentes React

-- Paso 1: Asegurar que las columnas existen
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_code VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_status VARCHAR(20) DEFAULT 'active';

-- Paso 2: Asegurar que la tabla sale_references existe
CREATE TABLE IF NOT EXISTS sale_references (
    id SERIAL PRIMARY KEY,
    client_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending_dispatch',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    notes TEXT
);

-- Paso 3: Eliminar foreign key si ya existe (para recrearla)
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_reference_code_fkey;

-- Paso 4: Crear la foreign key que esperan los componentes React
-- Esta conecta sales.reference_code con sale_references.client_reference
ALTER TABLE sales 
ADD CONSTRAINT sales_reference_code_fkey 
FOREIGN KEY (reference_code) REFERENCES sale_references(client_reference);

-- Paso 5: Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_sales_reference_code ON sales(reference_code);
CREATE INDEX IF NOT EXISTS idx_sale_references_client_reference ON sale_references(client_reference);
CREATE INDEX IF NOT EXISTS idx_sale_references_company_id ON sale_references(company_id);

-- Paso 6: Habilitar RLS en sale_references si no está habilitado
ALTER TABLE sale_references ENABLE ROW LEVEL SECURITY;

-- Paso 7: Crear políticas RLS para sale_references
DROP POLICY IF EXISTS "sale_references_select_policy" ON sale_references;
CREATE POLICY "sale_references_select_policy" ON sale_references
    FOR SELECT USING (company_id = auth.jwt() ->> 'company_id'::int);

DROP POLICY IF EXISTS "sale_references_insert_policy" ON sale_references;
CREATE POLICY "sale_references_insert_policy" ON sale_references
    FOR INSERT WITH CHECK (company_id = auth.jwt() ->> 'company_id'::int);

DROP POLICY IF EXISTS "sale_references_update_policy" ON sale_references;
CREATE POLICY "sale_references_update_policy" ON sale_references
    FOR UPDATE USING (company_id = auth.jwt() ->> 'company_id'::int);

-- Completado
SELECT 'FOREIGN KEY sales_reference_code_fkey CREADA EXITOSAMENTE' as result;