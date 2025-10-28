-- Función RPC para restaurar stock de manera eficiente al rechazar una venta
-- Esta función evita N+1 queries al hacer todo en una sola operación

CREATE OR REPLACE FUNCTION restore_stock_on_reject(
  p_product_id UUID,
  p_color VARCHAR,
  p_size VARCHAR,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_variation_id UUID;
  v_current_stock INTEGER;
BEGIN
  -- Buscar la variación específica
  SELECT id, stock INTO v_variation_id, v_current_stock
  FROM variations 
  WHERE product_id = p_product_id 
    AND color = p_color 
    AND size = p_size
  LIMIT 1;
  
  -- Si no se encuentra la variación, retornar false pero no fallar
  IF v_variation_id IS NULL THEN
    RAISE WARNING 'No se encontró variación para product_id:% color:% size:%', p_product_id, p_color, p_size;
    RETURN FALSE;
  END IF;
  
  -- Restaurar el stock
  UPDATE variations 
  SET stock = v_current_stock + p_quantity,
      updated_at = NOW()
  WHERE id = v_variation_id;
  
  -- Verificar que se actualizó
  IF NOT FOUND THEN
    RAISE WARNING 'No se pudo actualizar stock para variación %', v_variation_id;
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log el error pero no fallar toda la operación
    RAISE WARNING 'Error restaurando stock: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Asegurar que la función tenga los permisos correctos
GRANT EXECUTE ON FUNCTION restore_stock_on_reject(UUID, VARCHAR, VARCHAR, INTEGER) TO authenticated;