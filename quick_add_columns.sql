-- AGREGAR COLUMNAS REFERENCE_CODE Y REFERENCE_STATUS A SALES
-- Ejecutar este script en tu cliente PostgreSQL

ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_code VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_status VARCHAR(20) DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_sales_reference_code ON sales(reference_code);

-- Verificación
SELECT 'Columnas agregadas exitosamente' as resultado;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
  AND table_schema = 'public'
  AND column_name IN ('reference_code', 'reference_status', 'dispatch_type')
ORDER BY column_name;