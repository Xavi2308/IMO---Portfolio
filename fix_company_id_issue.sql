-- SOLUCIÓN: Arreglar company_id faltante en ventas
-- El problema es que la aplicación no envía company_id

-- 1. VERIFICAR VENTAS RECIENTES PARA VER EL PATRÓN
SELECT id, customer_id, company_id, dispatch_type, created_by, created_at
FROM sales 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. VERIFICAR QUE EL USUARIO TENGA company_id
SELECT pu.id, pu.email, pu.company_id, pu.username, pu.role
FROM public.users pu
WHERE pu.id = auth.uid();

-- 2.1 También verificar los datos en auth.users (solo metadata)
SELECT id, email, (raw_user_meta_data->>'company_id') as meta_company_id
FROM auth.users 
WHERE id = auth.uid();

-- 3. CREAR TRIGGER TEMPORAL QUE AUTO-ASIGNE company_id
-- Esto es un parche hasta que arreglemos la aplicación

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
    
    -- Si no lo encuentra ahí, buscar en auth.users metadata
    IF user_company_id IS NULL THEN
      SELECT (raw_user_meta_data->>'company_id')::UUID INTO user_company_id
      FROM auth.users 
      WHERE id = NEW.created_by;
    END IF;
    
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

-- 4. CREAR TRIGGER QUE SE EJECUTE ANTES DEL handle_order_logic
DROP TRIGGER IF EXISTS auto_assign_company_id_trigger ON sales;
CREATE TRIGGER auto_assign_company_id_trigger
    BEFORE INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id();

-- 5. VERIFICAR EL ORDEN DE TRIGGERS (debe ser primero auto_assign, luego handle_order_logic)
SELECT trigger_name, action_order, action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'sales'
ORDER BY action_timing, action_order;

-- 6. SI EL ORDEN ESTÁ MALO, RECREAR handle_order_logic CON PRIORIDAD MENOR
DROP TRIGGER IF EXISTS handle_order_logic_trigger ON sales;
CREATE TRIGGER handle_order_logic_trigger
    BEFORE INSERT ON sales
    FOR EACH ROW 
    WHEN (NEW.dispatch_type IS NOT NULL)
    EXECUTE FUNCTION handle_order_logic();

-- 7. PROBAR QUE FUNCIONA
SELECT 'TRIGGERS CONFIGURADOS EN ORDEN CORRECTO' as status;

-- 8. VERIFICAR COMPANY_ID DE USUARIO ACTUAL
SELECT 
  u.id as user_id,
  u.company_id as profile_company_id,
  au.raw_user_meta_data->>'company_id' as auth_company_id,
  COALESCE(u.company_id, (au.raw_user_meta_data->>'company_id')::UUID) as final_company_id
FROM public.users u
FULL JOIN auth.users au ON u.id = au.id
WHERE u.id = auth.uid() OR au.id = auth.uid();