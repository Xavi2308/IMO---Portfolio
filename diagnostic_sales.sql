-- DIAGNÓSTICO RÁPIDO DE LA BASE DE DATOS
-- Ejecuta esto en Supabase SQL Editor para ver el estado actual

-- 1. Verificar si existe la tabla sales
SELECT 
    'Tabla sales' as item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') 
         THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as estado;

-- 2. Ver estructura de sales si existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;

-- 3. Contar registros en sales
SELECT 
    'Registros en sales' as item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') 
         THEN (SELECT COUNT(*)::text FROM sales)
         ELSE 'N/A - Tabla no existe' END as cantidad;

-- 4. Ver algunas ventas si existen
SELECT id, created_at, total_value, sale_type, consecutive_number, company_id, customer_id
FROM sales 
ORDER BY created_at DESC 
LIMIT 5;