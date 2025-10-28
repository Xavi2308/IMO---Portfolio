-- VERIFICAR Y CORREGIR TODO EL SISTEMA DE REFERENCIAS
-- Paso 1: Verificar qué columnas existen actualmente

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales' AND table_schema = 'public'
  AND column_name IN ('reference_code', 'reference_status', 'dispatch_type', 'company_id')
ORDER BY column_name;

-- Paso 2: Verificar si existe la tabla sale_references
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'sale_references';

-- Paso 3: ASEGURAR que las columnas existen en sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_code VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_status VARCHAR(20) DEFAULT 'active';

-- Paso 4: Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_sales_reference_code ON sales(reference_code);

-- Paso 5: Verificar foreign keys existentes
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'sales' OR tc.table_name = 'sale_references')
  AND tc.table_schema = 'public';

-- Paso 6: CREAR la foreign key que falta si no existe
DO $$
BEGIN
    -- Verificar si la foreign key ya existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_reference_code_fkey' 
        AND table_name = 'sales'
        AND table_schema = 'public'
    ) THEN
        -- Crear la foreign key
        ALTER TABLE sales 
        ADD CONSTRAINT sales_reference_code_fkey 
        FOREIGN KEY (reference_code) REFERENCES sale_references(client_reference);
    END IF;
EXCEPTION
    WHEN others THEN
        -- Si hay error, probablemente porque los datos no coinciden
        RAISE NOTICE 'No se pudo crear foreign key: %', SQLERRM;
END $$;

-- Paso 7: Verificar que todo está correcto
SELECT 'VERIFICACIÓN COMPLETADA' as status;

-- Mostrar estructura final de sales
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales' AND table_schema = 'public'
  AND column_name IN ('reference_code', 'reference_status', 'dispatch_type', 'company_id')
ORDER BY column_name;