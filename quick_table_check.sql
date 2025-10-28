-- VERIFICACIÓN RÁPIDA DE TABLAS DISPONIBLES
-- Ejecuta esto en Supabase SQL Editor

-- 1. Ver todas las tablas que existen
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Buscar tablas que contengan 'sale' o 'venta'
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%sale%' OR table_name LIKE '%venta%')
ORDER BY table_name;

-- 3. Si existe sales, ver su estructura
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;