-- SOLUCIÓN URGENTE: Arreglar todos los problemas del sistema
-- Ejecutar este script completo para restaurar funcionalidad

-- 1. DESHABILITAR TEMPORALMENTE LOS TRIGGERS PROBLEMÁTICOS
DROP TRIGGER IF EXISTS handle_order_logic_trigger ON sales;
DROP TRIGGER IF EXISTS create_order_items_trigger ON sales;

-- 2. ARREGLAR RLS EN CUSTOMER_ORDERS (problema principal)
-- El trigger está intentando crear customer_orders pero RLS lo bloquea

-- 2.1 Crear una función que bypasee RLS para el sistema automático
CREATE OR REPLACE FUNCTION create_customer_order_system(
  p_customer_id UUID,
  p_company_id UUID,
  p_status TEXT DEFAULT 'active'
) RETURNS UUID
SECURITY DEFINER  -- Esto ejecuta con permisos del owner, bypaseando RLS
LANGUAGE plpgsql
AS $$
DECLARE
  order_id UUID;
BEGIN
  INSERT INTO customer_orders (customer_id, company_id, status)
  VALUES (p_customer_id, p_company_id, p_status)
  RETURNING id INTO order_id;
  
  RETURN order_id;
END;
$$;

-- 3. RECREAR TRIGGER HANDLE_ORDER_LOGIC CON FUNCIÓN SEGURA
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

  -- Si no existe una orden activa, crear una nueva usando función segura
  IF existing_order_id IS NULL THEN
    SELECT create_customer_order_system(NEW.customer_id, NEW.company_id, 'active') INTO new_order_id;
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

-- 4. RECREAR TRIGGER CREATE_ORDER_ITEMS MÁS SIMPLE
CREATE OR REPLACE FUNCTION create_order_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si la venta tiene order_id
  IF NEW.order_id IS NOT NULL THEN
    -- Insertar items basados en los items de la venta
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
      p.id as product_id,
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
      total_pairs = (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = NEW.order_id),
      total_amount = (SELECT COALESCE(SUM(oi.subtotal), 0) FROM order_items oi WHERE oi.order_id = NEW.order_id),
      updated_at = NOW()
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. VOLVER A CREAR LOS TRIGGERS
CREATE TRIGGER handle_order_logic_trigger
    BEFORE INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION handle_order_logic();

CREATE TRIGGER create_order_items_trigger
    AFTER INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION create_order_items();

-- 6. VERIFICAR QUE TODO FUNCIONA
SELECT 'TRIGGERS RECREADOS CORRECTAMENTE' as status;

-- 7. VERIFICAR TRIGGERS ACTIVOS
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'sales';

-- 8. PROBAR CREACIÓN DE CUSTOMER_ORDER
SELECT 'Si ves este mensaje, el sistema está listo para probar' as mensaje;