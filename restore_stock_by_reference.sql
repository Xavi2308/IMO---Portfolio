-- Función alternativa que busca por reference si sale_items no tiene product_id
CREATE OR REPLACE FUNCTION restore_stock_on_reject_by_reference(
  p_reference VARCHAR,
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
  v_product_id UUID;
BEGIN
  -- Primero buscar el product_id usando la referencia
  -- Esto asume que existe una tabla products con reference
  SELECT id INTO v_product_id
  FROM products 
  WHERE reference = p_reference
  LIMIT 1;
  
  IF v_product_id IS NULL THEN
    RAISE WARNING 'No se encontró producto con referencia %', p_reference;
    RETURN FALSE;
  END IF;
  
  -- Buscar la variación específica usando product_id
  SELECT id, stock INTO v_variation_id, v_current_stock
  FROM variations 
  WHERE product_id = v_product_id 
    AND color = p_color 
    AND size = p_size
  LIMIT 1;
  
  -- Si no se encuentra la variación, retornar false pero no fallar
  IF v_variation_id IS NULL THEN
    RAISE WARNING 'No se encontró variación para product_id:% (ref:%) color:% size:%', v_product_id, p_reference, p_color, p_size;
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

-- Asegurar permisos
GRANT EXECUTE ON FUNCTION restore_stock_on_reject_by_reference(VARCHAR, VARCHAR, VARCHAR, INTEGER) TO authenticated;