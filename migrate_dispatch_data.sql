-- Script para migrar datos existentes al nuevo sistema de despachos
-- Ejecutar después de create_dispatch_system.sql

-- 1. Actualizar todas las ventas existentes que no tienen dispatch_type
UPDATE sales 
SET dispatch_type = 'separate' 
WHERE dispatch_type IS NULL;

-- 2. Función para migrar ventas existentes a órdenes
CREATE OR REPLACE FUNCTION migrate_existing_sales_to_orders()
RETURNS INTEGER AS $$
DECLARE
  sale_record RECORD;
  order_id UUID;
  existing_order_id UUID;
  total_migrated INTEGER := 0;
BEGIN
  -- Migrar ventas con dispatch_type 'separate' que no tienen order_id
  FOR sale_record IN 
    SELECT s.*, c.id as customer_id, c.name as customer_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.dispatch_type = 'separate' 
    AND s.order_id IS NULL
    ORDER BY s.customer_id, s.created_at
  LOOP
    -- Buscar orden existente para este cliente
    SELECT id INTO existing_order_id 
    FROM customer_orders 
    WHERE customer_id = sale_record.customer_id 
    AND company_id = sale_record.company_id 
    AND status = 'active' 
    LIMIT 1;

    -- Si no existe, crear nueva orden
    IF existing_order_id IS NULL THEN
      INSERT INTO customer_orders (
        customer_id, 
        company_id, 
        status,
        created_at
      ) VALUES (
        sale_record.customer_id,
        sale_record.company_id,
        'active',
        sale_record.created_at
      ) RETURNING id INTO order_id;
      existing_order_id := order_id;
    END IF;

    -- Actualizar la venta con el order_id
    UPDATE sales 
    SET order_id = existing_order_id 
    WHERE id = sale_record.id;

    -- Crear order_items para esta venta
    INSERT INTO order_items (
      order_id, 
      product_id, 
      reference, 
      color, 
      size, 
      quantity, 
      unit_price, 
      subtotal, 
      sale_id
    )
    SELECT 
      existing_order_id,
      si.product_id,
      si.reference,
      si.color,
      si.size,
      si.quantity,
      si.unit_price,
      si.subtotal,
      sale_record.id
    FROM sale_items si
    WHERE si.sale_id = sale_record.id;

    total_migrated := total_migrated + 1;
  END LOOP;

  -- Actualizar totales de todas las órdenes
  UPDATE customer_orders 
  SET 
    total_pairs = (
      SELECT COALESCE(SUM(oi.quantity), 0) 
      FROM order_items oi 
      WHERE oi.order_id = customer_orders.id
    ),
    total_amount = (
      SELECT COALESCE(SUM(oi.subtotal), 0) 
      FROM order_items oi 
      WHERE oi.order_id = customer_orders.id
    ),
    updated_at = NOW();

  RETURN total_migrated;
END;
$$ language 'plpgsql';

-- 3. Ejecutar la migración
SELECT migrate_existing_sales_to_orders() as sales_migrated;

-- 4. Función para consolidar órdenes por cliente (opcional)
CREATE OR REPLACE FUNCTION consolidate_customer_orders()
RETURNS INTEGER AS $$
DECLARE
  customer_record RECORD;
  main_order_id UUID;
  orders_to_merge UUID[];
  total_consolidated INTEGER := 0;
BEGIN
  -- Para cada cliente que tiene múltiples órdenes activas
  FOR customer_record IN 
    SELECT customer_id, company_id, COUNT(*) as order_count
    FROM customer_orders 
    WHERE status = 'active'
    GROUP BY customer_id, company_id
    HAVING COUNT(*) > 1
  LOOP
    -- Obtener la orden más antigua como principal
    SELECT id INTO main_order_id
    FROM customer_orders
    WHERE customer_id = customer_record.customer_id
    AND company_id = customer_record.company_id
    AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;

    -- Obtener todas las demás órdenes para fusionar
    SELECT ARRAY_AGG(id) INTO orders_to_merge
    FROM customer_orders
    WHERE customer_id = customer_record.customer_id
    AND company_id = customer_record.company_id
    AND status = 'active'
    AND id != main_order_id;

    -- Mover todos los order_items a la orden principal
    UPDATE order_items 
    SET order_id = main_order_id
    WHERE order_id = ANY(orders_to_merge);

    -- Actualizar sales para apuntar a la orden principal
    UPDATE sales 
    SET order_id = main_order_id
    WHERE order_id = ANY(orders_to_merge);

    -- Eliminar las órdenes vacías
    DELETE FROM customer_orders 
    WHERE id = ANY(orders_to_merge);

    total_consolidated := total_consolidated + array_length(orders_to_merge, 1);
  END LOOP;

  -- Actualizar totales de las órdenes consolidadas
  UPDATE customer_orders 
  SET 
    total_pairs = (
      SELECT COALESCE(SUM(oi.quantity), 0) 
      FROM order_items oi 
      WHERE oi.order_id = customer_orders.id
    ),
    total_amount = (
      SELECT COALESCE(SUM(oi.subtotal), 0) 
      FROM order_items oi 
      WHERE oi.order_id = customer_orders.id
    ),
    updated_at = NOW()
  WHERE status = 'active';

  RETURN total_consolidated;
END;
$$ language 'plpgsql';

-- 5. Ejecutar consolidación (opcional)
-- SELECT consolidate_customer_orders() as orders_consolidated;

-- 6. Verificar la migración
SELECT 
  'Total sales' as metric,
  COUNT(*) as count
FROM sales
UNION ALL
SELECT 
  'Sales with orders' as metric,
  COUNT(*) as count
FROM sales 
WHERE order_id IS NOT NULL
UNION ALL
SELECT 
  'Total orders' as metric,
  COUNT(*) as count
FROM customer_orders
UNION ALL
SELECT 
  'Total order items' as metric,
  COUNT(*) as count
FROM order_items;