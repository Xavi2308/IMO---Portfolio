-- Query para verificar la estructura de la tabla sale_items
-- Ejecutar en Supabase SQL Editor

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sale_items'
ORDER BY ordinal_position;