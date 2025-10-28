-- VERIFICACIÓN SIMPLE DEL SISTEMA
SELECT 'VERIFICANDO COLUMNAS EN SALES' as info;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales' AND table_schema = 'public'
  AND column_name IN ('reference_code', 'reference_status', 'dispatch_type')
ORDER BY column_name;

SELECT 'VERIFICANDO TABLA SALE_REFERENCES' as info;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'sale_references';

-- Agregar columnas si no existen
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_code VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_status VARCHAR(20) DEFAULT 'active';

SELECT 'COLUMNAS AGREGADAS - VERIFICANDO NUEVAMENTE' as info;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales' AND table_schema = 'public'
  AND column_name IN ('reference_code', 'reference_status', 'dispatch_type')
ORDER BY column_name;