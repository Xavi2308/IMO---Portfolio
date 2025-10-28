-- SCRIPT SIMPLE PARA AGREGAR SOLO LAS COLUMNAS FALTANTES
-- Si las foreign keys ya existen, solo agregamos lo que falta

-- Agregar columnas a sales si no existen
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_code VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_status VARCHAR(20) DEFAULT 'active';

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_sales_reference_code ON sales(reference_code);

-- Verificar que todo esté listo
SELECT 'Columnas agregadas exitosamente' as resultado;

-- Mostrar estructura final de sales (solo columnas relacionadas con referencias)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
  AND table_schema = 'public'
  AND column_name IN ('reference_code', 'reference_status', 'dispatch_type')
ORDER BY column_name;