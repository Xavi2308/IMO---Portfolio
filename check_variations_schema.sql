-- Query para verificar la estructura de la tabla variations
-- Ejecutar en Supabase SQL Editor para ver las columnas disponibles

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'variations'
ORDER BY ordinal_position;