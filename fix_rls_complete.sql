-- ========================================
-- SOLUCIÓN COMPLETA PARA RLS WEB_INTEGRATIONS
-- ========================================

-- Paso 1: Deshabilitar RLS temporalmente para debugging
ALTER TABLE web_integrations DISABLE ROW LEVEL SECURITY;

-- Paso 2: Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can insert company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can update company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can delete company integrations" ON web_integrations;

-- Paso 3: Verificar la estructura de user_profiles
SELECT 
    up.user_id,
    up.username,
    up.role,
    up.company_id,
    c.name as company_name
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id
WHERE up.user_id = auth.uid();

-- Paso 4: Crear políticas simples y funcionales
ALTER TABLE web_integrations ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: Ver integraciones de tu empresa
CREATE POLICY "web_integrations_select_policy" 
  ON web_integrations FOR SELECT 
  USING (
    company_id = (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Política de INSERT: Solo admins pueden crear integraciones
CREATE POLICY "web_integrations_insert_policy" 
  ON web_integrations FOR INSERT 
  WITH CHECK (
    -- Verificar que sea admin y que el company_id coincida
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
    AND
    company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
    AND
    user_id = auth.uid()
  );

-- Política de UPDATE: Solo admins pueden actualizar
CREATE POLICY "web_integrations_update_policy" 
  ON web_integrations FOR UPDATE 
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
    AND
    company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
    AND
    company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Política de DELETE: Solo admins pueden eliminar
CREATE POLICY "web_integrations_delete_policy" 
  ON web_integrations FOR DELETE 
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
    AND
    company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Paso 5: Verificar que el usuario actual sea admin
DO $$
DECLARE
    user_info RECORD;
BEGIN
    SELECT 
        up.user_id,
        up.username,
        up.role,
        up.company_id,
        c.name as company_name
    INTO user_info
    FROM user_profiles up
    LEFT JOIN companies c ON up.company_id = c.id
    WHERE up.user_id = auth.uid();

    IF user_info.user_id IS NULL THEN
        RAISE NOTICE 'ERROR: No se encontró perfil de usuario para auth.uid()';
    ELSIF user_info.role != 'admin' THEN
        RAISE NOTICE 'ERROR: Usuario no es admin. Rol actual: %', user_info.role;
        RAISE NOTICE 'Ejecuta: UPDATE user_profiles SET role = ''admin'' WHERE user_id = auth.uid();';
    ELSE
        RAISE NOTICE 'OK: Usuario % es admin de la empresa % (ID: %)', 
            user_info.username, user_info.company_name, user_info.company_id;
    END IF;
END $$;

-- Paso 6: Si el usuario no es admin, actualizarlo
-- DESCOMENTA LA SIGUIENTE LÍNEA SI NECESITAS HACER ADMIN AL USUARIO ACTUAL:
-- UPDATE user_profiles SET role = 'admin' WHERE user_id = auth.uid();

-- Paso 7: Verificar las políticas creadas
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'web_integrations'
ORDER BY policyname;

-- Paso 8: Probar inserción manual (OPCIONAL - para debugging)
-- INSERT INTO web_integrations (company_id, user_id, platform, config, enabled, status) 
-- VALUES (
--     (SELECT company_id FROM user_profiles WHERE user_id = auth.uid()),
--     auth.uid(),
--     'test_platform',
--     '{"test": "data"}',
--     false,
--     'disconnected'
-- );

-- Si todo funciona, eliminar el registro de prueba:
-- DELETE FROM web_integrations WHERE platform = 'test_platform' AND user_id = auth.uid();
