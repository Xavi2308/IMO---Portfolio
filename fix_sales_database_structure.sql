-- FIX SALES DATABASE STRUCTURE
-- Ejecutar este script para corregir la estructura de la tabla sales

-- Primero, verificar la estructura actual
SELECT 'ESTRUCTURA ACTUAL DE LA TABLA SALES:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Agregar columnas faltantes si no existen
ALTER TABLE sales ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_code VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_status VARCHAR(20) DEFAULT 'active';

-- Crear las claves foráneas si no existen
-- Para created_by -> users(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_created_by_fkey' 
        AND table_name = 'sales'
    ) THEN
        ALTER TABLE sales ADD CONSTRAINT sales_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
END$$;

-- Para approved_by -> users(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_approved_by_fkey' 
        AND table_name = 'sales'
    ) THEN
        ALTER TABLE sales ADD CONSTRAINT sales_approved_by_fkey 
        FOREIGN KEY (approved_by) REFERENCES users(id);
    END IF;
END$$;

-- Para customer_id -> customers(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_customer_id_fkey' 
        AND table_name = 'sales'
    ) THEN
        ALTER TABLE sales ADD CONSTRAINT sales_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id);
    END IF;
END$$;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_approved_by ON sales(approved_by);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_reference_code ON sales(reference_code);
CREATE INDEX IF NOT EXISTS idx_sales_dispatch_type ON sales(dispatch_type);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);

-- Verificar la estructura después de los cambios
SELECT 'ESTRUCTURA DESPUÉS DE LOS CAMBIOS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar las claves foráneas
SELECT 'CLAVES FORÁNEAS CONFIGURADAS:' as info;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='sales'
ORDER BY tc.constraint_name;

-- Verificar datos de una venta reciente para debugging
SELECT 'DATOS DE VENTA MÁS RECIENTE:' as info;
SELECT 
    id,
    consecutive_number,
    customer_id,
    created_by,
    approved_by,
    status,
    sale_type,
    total_value,
    dispatch_type,
    created_at
FROM sales 
ORDER BY created_at DESC 
LIMIT 1;