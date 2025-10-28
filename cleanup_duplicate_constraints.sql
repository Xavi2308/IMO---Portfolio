-- CLEANUP DUPLICATE FOREIGN KEY CONSTRAINTS
-- Ejecutar este script para limpiar constraints duplicadas

-- Verificar todas las constraints de customer_id en sales
SELECT 'CONSTRAINTS EXISTENTES PARA customer_id:' as info;
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
  AND tc.table_name = 'sales'
  AND kcu.column_name = 'customer_id'
ORDER BY tc.constraint_name;

-- Eliminar constraints duplicadas (mantener solo sales_customer_id_fkey)
-- Primero eliminar constraints que no sean la principal
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'sales' 
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%customer%'
          AND constraint_name != 'sales_customer_id_fkey'
    LOOP
        EXECUTE 'ALTER TABLE sales DROP CONSTRAINT IF EXISTS ' || constraint_rec.constraint_name;
        RAISE NOTICE 'Eliminada constraint duplicada: %', constraint_rec.constraint_name;
    END LOOP;
END$$;

-- Verificar que solo quede la constraint correcta
SELECT 'CONSTRAINTS DESPUÉS DE LIMPIEZA:' as info;
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
  AND tc.table_name = 'sales'
  AND kcu.column_name = 'customer_id'
ORDER BY tc.constraint_name;

-- Test query para verificar que funciona
SELECT 'TEST DE QUERY:' as info;
SELECT 
    s.id,
    s.consecutive_number,
    s.customer_id,
    c.name as customer_name,
    s.created_by,
    u.username as created_by_username,
    s.status,
    s.sale_type,
    s.total_value
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN users u ON s.created_by = u.id
ORDER BY s.created_at DESC 
LIMIT 3;