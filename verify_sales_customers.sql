-- VERIFICACIÓN DE RELACIÓN SALES-CUSTOMERS
-- Ejecuta esto en Supabase SQL Editor para verificar los datos

-- 1. Ver algunos clientes
SELECT id, name, phone, created_at
FROM customers 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Ver algunas ventas con sus customer_id
SELECT id, customer_id, consecutive_number, total_value, created_at
FROM sales 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Verificar si los customer_id de sales existen en customers
SELECT 
    s.id as sale_id,
    s.consecutive_number,
    s.customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    CASE 
        WHEN c.id IS NULL THEN '❌ Cliente no encontrado'
        ELSE '✅ Cliente encontrado'
    END as status
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
ORDER BY s.created_at DESC
LIMIT 10;

-- 4. Contar ventas con y sin clientes válidos
SELECT 
    COUNT(*) as total_sales,
    COUNT(c.id) as sales_with_valid_customers,
    COUNT(*) - COUNT(c.id) as sales_with_missing_customers
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id;