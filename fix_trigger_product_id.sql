-- Script para corregir el trigger create_order_items
-- El problema es que sale_items no tiene product_id, necesitamos buscarlo

-- 1. Verificar estructura de sale_items y nombres de tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%sale%'
ORDER BY table_name;

-- 1.1 Verificar estructura de la tabla de items de ventas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name LIKE '%sale%' AND table_schema = 'public'
  AND table_name != 'sales'
ORDER BY table_name, ordinal_position;

-- 2. Eliminar triggers primero, luego funciones
DROP TRIGGER IF EXISTS create_order_items_trigger ON sales;
DROP TRIGGER IF EXISTS handle_order_logic_trigger ON sales;
DROP FUNCTION IF EXISTS create_order_items();
DROP FUNCTION IF EXISTS handle_order_logic();

-- 3. Recrear la función handle_order_logic primero
CREATE OR REPLACE FUNCTION handle_order_logic()
RETURNS TRIGGER AS $$
DECLARE
  existing_order_id UUID;
  new_order_id UUID;
BEGIN
  -- Solo procesar si es una venta con dispatch_type 'separate' o 'dispatch'
  IF NEW.dispatch_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar una orden activa existente para este cliente
  SELECT id INTO existing_order_id 
  FROM customer_orders 
  WHERE customer_id = NEW.customer_id 
    AND company_id = NEW.company_id 
    AND status = 'active' 
  LIMIT 1;

  -- Si no existe una orden activa, crear una nueva
  IF existing_order_id IS NULL THEN
    INSERT INTO customer_orders (customer_id, company_id, status)
    VALUES (NEW.customer_id, NEW.company_id, 'active')
    RETURNING id INTO new_order_id;
    existing_order_id := new_order_id;
  END IF;

  -- Actualizar la venta con el order_id
  NEW.order_id := existing_order_id;

  -- Si es dispatch, marcar la orden como lista para despacho
  IF NEW.dispatch_type = 'dispatch' THEN
    UPDATE customer_orders 
    SET status = 'ready_for_dispatch', updated_at = NOW()
    WHERE id = existing_order_id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Recrear el trigger handle_order_logic
CREATE TRIGGER handle_order_logic_trigger
    BEFORE INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION handle_order_logic();

-- 5. Crear función create_order_items corregida
CREATE OR REPLACE FUNCTION create_order_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si la venta tiene order_id
  IF NEW.order_id IS NOT NULL THEN
    -- Insertar items basados en los items de la venta
    -- Buscar product_id usando la referencia
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
      NEW.order_id,
      p.id as product_id,  -- Buscar product_id desde products
      si.reference,
      si.color,
      si.size,
      si.quantity,
      si.unit_price,
      si.subtotal,
      NEW.id
    FROM sale_items si
    LEFT JOIN products p ON p.reference = si.reference
    WHERE si.sale_id = NEW.id;

    -- Actualizar totales de la orden
    UPDATE customer_orders 
    SET 
      total_pairs = (
        SELECT COALESCE(SUM(oi.quantity), 0) 
        FROM order_items oi 
        WHERE oi.order_id = NEW.order_id
      ),
      total_amount = (
        SELECT COALESCE(SUM(oi.subtotal), 0) 
        FROM order_items oi 
        WHERE oi.order_id = NEW.order_id
      ),
      updated_at = NOW()
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Volver a crear el trigger create_order_items
CREATE TRIGGER create_order_items_trigger
    AFTER INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION create_order_items();

-- 7. Probar que los triggers funcionan
SELECT 'Triggers recreados correctamente' as status;

-- 8. Verificar que los triggers existen
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'sales';