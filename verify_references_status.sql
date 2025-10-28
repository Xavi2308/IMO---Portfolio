-- VERIFICAR ESTADO ACTUAL DEL SISTEMA DE REFERENCIAS
-- Este script verifica si todo ya está configurado correctamente

\echo 'VERIFICANDO ESTADO ACTUAL:'

-- 1. Verificar que reference_code existe en sales
SELECT 'reference_code column exists in sales:' as status, 
       EXISTS (
           SELECT FROM information_schema.columns 
           WHERE table_name = 'sales' AND column_name = 'reference_code' AND table_schema = 'public'
       ) as exists;

-- 2. Verificar que reference_status existe en sales
SELECT 'reference_status column exists in sales:' as status, 
       EXISTS (
           SELECT FROM information_schema.columns 
           WHERE table_name = 'sales' AND column_name = 'reference_status' AND table_schema = 'public'
       ) as exists;

-- 3. Verificar que la tabla sale_references existe
SELECT 'sale_references table exists:' as status,
       EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_name = 'sale_references'
       ) as exists;

-- 4. Verificar que el constraint UNIQUE existe
SELECT 'sale_references_client_reference_key exists:' as status,
       EXISTS (
           SELECT FROM information_schema.table_constraints 
           WHERE constraint_name = 'sale_references_client_reference_key' 
           AND table_name = 'sale_references' 
           AND table_schema = 'public'
       ) as exists;

-- 5. Verificar que la foreign key existe
SELECT 'sales_reference_code_fkey exists:' as status,
       EXISTS (
           SELECT FROM information_schema.table_constraints 
           WHERE constraint_name = 'sales_reference_code_fkey' 
           AND table_name = 'sales' 
           AND table_schema = 'public'
       ) as exists;

-- 6. Mostrar todas las foreign keys relacionadas
\echo 'FOREIGN KEYS RELACIONADAS:'
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
  AND tc.table_schema = 'public'
  AND (tc.constraint_name LIKE '%reference%' OR kcu.column_name LIKE '%reference%');

-- 7. Verificar estructura de sale_references
\echo 'ESTRUCTURA DE SALE_REFERENCES:'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sale_references' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Verificar que RLS está habilitado
SELECT 'RLS enabled on sale_references:' as status,
       relrowsecurity as enabled
FROM pg_class 
WHERE relname = 'sale_references' AND relkind = 'r';

\echo 'VERIFICACIÓN COMPLETADA';

-- Resumen final
SELECT CASE 
    WHEN (
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name IN ('reference_code', 'reference_status')
    ) = 2 
    AND EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_reference_code_fkey' AND table_name = 'sales'
    )
    THEN 'SISTEMA DE REFERENCIAS CONFIGURADO CORRECTAMENTE ✅'
    ELSE 'FALTAN CONFIGURACIONES ❌'
END as resultado_final;