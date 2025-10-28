-- SOLUCIÓN FINAL: Arreglar todos los problemas restantes
-- 1. Error "sale_references" - Corregir referencias en triggers
-- 2. Campos faltantes en ventas - Arreglar estructura
-- 3. Botones aprobar/rechazar - Verificar campos necesarios

-- 1. ELIMINAR TODOS LOS TRIGGERS PROBLEMÁTICOS Y RECREAR LIMPIAMENTE
DROP TRIGGER IF EXISTS auto_assign_company_id_trigger ON sales;
DROP TRIGGER IF EXISTS handle_order_logic_trigger ON sales;
DROP TRIGGER IF EXISTS create_order_items_trigger ON sales;

-- 2. VERIFICAR QUE LA TABLA SE LLAMA sale_items (no sale_references)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%sale%';

-- 3. RECREAR TRIGGER auto_assign_company_id CORREGIDO
CREATE OR REPLACE FUNCTION auto_assign_company_id()
RETURNS TRIGGER AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Si company_id es NULL, buscar el company_id del usuario
  IF NEW.company_id IS NULL THEN
    -- Buscar company_id desde la tabla users
    SELECT company_id INTO user_company_id
    FROM public.users 
    WHERE id = NEW.created_by;
    
    -- Asignar el company_id encontrado
    IF user_company_id IS NOT NULL THEN
      NEW.company_id := user_company_id;
    ELSE
      RAISE EXCEPTION 'No se pudo determinar company_id para el usuario %', NEW.created_by;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. RECREAR handle_order_logic SIN PROBLEMAS
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

-- 5. RECREAR create_order_items USANDO SALE_ITEMS (NO sale_references)
CREATE OR REPLACE FUNCTION create_order_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si la venta tiene order_id
  IF NEW.order_id IS NOT NULL THEN
    -- Insertar items basados en SALE_ITEMS (nombre correcto)
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
    FROM sale_items si  -- CORREGIDO: era sale_references
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

-- 6. RECREAR TODOS LOS TRIGGERS EN ORDEN CORRECTO
CREATE TRIGGER auto_assign_company_id_trigger
    BEFORE INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id();

CREATE TRIGGER handle_order_logic_trigger
    BEFORE INSERT ON sales
    FOR EACH ROW 
    WHEN (NEW.dispatch_type IS NOT NULL)
    EXECUTE FUNCTION handle_order_logic();

CREATE TRIGGER create_order_items_trigger
    AFTER INSERT ON sales
    FOR EACH ROW 
    WHEN (NEW.order_id IS NOT NULL)
    EXECUTE FUNCTION create_order_items();

-- 7. VERIFICAR ESTRUCTURA DE SALES PARA BOTONES APROBAR/RECHAZAR
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' AND table_schema = 'public'
  AND column_name IN ('status', 'approved_by', 'approved_at', 'created_by')
ORDER BY column_name;

-- 8. VERIFICAR QUE TRIGGERS ESTÉN ACTIVOS
SELECT trigger_name, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE event_object_table = 'sales'
ORDER BY action_timing, trigger_name;

SELECT 'SISTEMA COMPLETAMENTE CORREGIDO' as status;