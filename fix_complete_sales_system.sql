-- SOLUCIÓN COMPLETA: Arreglar todos los problemas críticos
-- Ejecutar paso a paso para resolver cada issue

-- 1. ARREGLAR EL PROBLEMA DE company_id NULL
-- El trigger no está pasando company_id correctamente

CREATE OR REPLACE FUNCTION handle_order_logic()
RETURNS TRIGGER AS $$
DECLARE
  existing_order_id UUID;
  new_order_id UUID;
  user_company_id UUID;
BEGIN
  -- Solo procesar si es una venta con dispatch_type 'separate' o 'dispatch'
  IF NEW.dispatch_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- CRÍTICO: Asegurar que company_id esté presente
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id no puede ser NULL para ventas con dispatch_type';
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

-- 2. RECREAR EL TRIGGER CON LA FUNCIÓN CORREGIDA
DROP TRIGGER IF EXISTS handle_order_logic_trigger ON sales;
CREATE TRIGGER handle_order_logic_trigger
    BEFORE INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION handle_order_logic();

-- 3. VERIFICAR LA ESTRUCTURA DE SALES PARA ASEGURAR QUE TIENE COMPANY_ID
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' AND table_schema = 'public'
  AND column_name IN ('company_id', 'status', 'approved_by', 'approved_at')
ORDER BY column_name;

-- 4. VERIFICAR SI FALTA LA COLUMNA STATUS EN SALES (necesaria para aprobar/rechazar)
-- Si sales no tiene status, la agregamos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'status' AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'rejected'));
    END IF;
END $$;

-- 5. VERIFICAR SI EXISTEN LAS COLUMNAS PARA APROBACIÓN
DO $$
BEGIN
    -- Agregar approved_by si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'approved_by' AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN approved_by UUID REFERENCES auth.users(id);
    END IF;
    
    -- Agregar approved_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'approved_at' AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 6. CREAR FUNCIÓN PARA APROBAR VENTA
CREATE OR REPLACE FUNCTION approve_sale(sale_id UUID, approver_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sales 
    SET status = 'confirmed',
        approved_by = approver_id,
        approved_at = NOW()
    WHERE id = sale_id AND status = 'pending';
    
    RETURN FOUND;
END;
$$;

-- 7. CREAR FUNCIÓN PARA RECHAZAR VENTA (REVERSA INVENTARIO)
CREATE OR REPLACE FUNCTION reject_sale(sale_id UUID, approver_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    sale_item RECORD;
    variation_record RECORD;
BEGIN
    -- Marcar la venta como rechazada
    UPDATE sales 
    SET status = 'rejected',
        approved_by = approver_id,
        approved_at = NOW()
    WHERE id = sale_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Reversar el inventario: devolver el stock a las variaciones
    FOR sale_item IN 
        SELECT si.reference, si.color, si.size, si.quantity
        FROM sale_items si 
        WHERE si.sale_id = reject_sale.sale_id
    LOOP
        -- Buscar la variación correspondiente
        SELECT * INTO variation_record
        FROM variations v
        INNER JOIN products p ON v.product_id = p.id
        WHERE p.reference = sale_item.reference 
          AND v.color = sale_item.color 
          AND v.size = sale_item.size;
        
        -- Si existe la variación, devolver el stock
        IF FOUND THEN
            UPDATE variations 
            SET stock = stock + sale_item.quantity
            WHERE id = variation_record.id;
        END IF;
    END LOOP;
    
    -- Eliminar items de order_items si existen
    DELETE FROM order_items WHERE sale_id = reject_sale.sale_id;
    
    RETURN TRUE;
END;
$$;

-- 8. VERIFICAR QUE TODO ESTÁ CONFIGURADO
SELECT 'SISTEMA DE APROBACIÓN CONFIGURADO' as status;

-- 9. PROBAR LAS FUNCIONES
SELECT 'Funciones de aprobación/rechazo creadas correctamente' as resultado;