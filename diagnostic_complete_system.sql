-- Script de diagnóstico y solución completa
-- Ejecutar paso a paso para identificar y solucionar todos los problemas

-- 1. DIAGNÓSTICO: Verificar qué está causando el error sale_references
SELECT 'DIAGNÓSTICO INICIADO' as status;

-- 2. Verificar que las ventas se están creando correctamente
SELECT id, customer_id, status, dispatch_type, order_id, consecutive_number, created_at
FROM sales 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Verificar si se están creando customer_orders automáticamente
SELECT co.id, co.customer_id, co.status, co.total_pairs, co.total_amount, co.created_at,
       c.name as customer_name
FROM customer_orders co
LEFT JOIN customers c ON co.customer_id = c.id
ORDER BY co.created_at DESC 
LIMIT 5;

-- 4. Verificar si se están creando order_items automáticamente
SELECT oi.id, oi.order_id, oi.reference, oi.color, oi.size, oi.quantity, oi.sale_id
FROM order_items oi
ORDER BY oi.created_at DESC 
LIMIT 10;

-- 5. Verificar la estructura actual de sales (para ver si faltan campos)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Verificar que los triggers están funcionando
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'sales';

-- 7. Verificar si hay alguna tabla que contenga "reference" en el nombre
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%reference%'
ORDER BY table_name;

-- 8. SOLUCIÓN TEMPORAL: Deshabilitar los triggers si están causando problemas
-- Solo ejecutar si los pasos anteriores muestran errores
-- DROP TRIGGER IF EXISTS handle_order_logic_trigger ON sales;
-- DROP TRIGGER IF EXISTS create_order_items_trigger ON sales;

SELECT 'DIAGNÓSTICO COMPLETADO - Revisar resultados arriba' as status;