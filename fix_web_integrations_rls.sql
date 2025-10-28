-- ========================================
-- CORREGIR POLÍTICAS RLS PARA WEB_INTEGRATIONS
-- ========================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can insert company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can update company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can delete company integrations" ON web_integrations;

-- NUEVAS POLÍTICAS MÁS FLEXIBLES

-- Los usuarios pueden ver integraciones de su empresa
CREATE POLICY "Users can view company integrations" 
  ON web_integrations FOR SELECT 
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Solo admin puede insertar nuevas integraciones para su empresa
CREATE POLICY "Admin can insert company integrations" 
  ON web_integrations FOR INSERT 
  WITH CHECK (
    -- Verificar que el usuario sea admin de la empresa
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND company_id = web_integrations.company_id 
      AND role = 'admin'
    )
    AND auth.uid() = user_id
  );

-- Solo admin puede actualizar integraciones de su empresa
CREATE POLICY "Admin can update company integrations" 
  ON web_integrations FOR UPDATE 
  USING (
    -- Solo puede actualizar si es admin de la empresa
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND company_id = web_integrations.company_id 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    -- Y los nuevos valores también deben cumplir las reglas
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND company_id = web_integrations.company_id 
      AND role = 'admin'
    )
  );

-- Solo admin puede eliminar integraciones de su empresa
CREATE POLICY "Admin can delete company integrations" 
  ON web_integrations FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND company_id = web_integrations.company_id 
      AND role = 'admin'
    )
  );

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Verificar las políticas RLS actualizadas
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies 
WHERE tablename = 'web_integrations'
ORDER BY policyname;

-- Verificar si el usuario actual tiene permisos (VERSION VISIBLE)
SELECT 
  up.user_id,
  up.username,
  up.role as "Rol Usuario",
  up.company_id as "ID Empresa",
  c.name as "Nombre Empresa",
  CASE 
    WHEN up.role = 'admin' THEN '✅ SÍ tiene permisos de admin'
    ELSE '❌ NO tiene permisos de admin'
  END as "Estado Permisos",
  auth.uid() as "Auth UID"
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id
WHERE up.user_id = auth.uid();

-- Si el resultado anterior está vacío, verificar si existe el perfil
SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM user_profiles WHERE user_id = auth.uid()) THEN 
      'Perfil encontrado'
    ELSE 
      'ERROR: No existe perfil para este usuario'
  END as "Estado Perfil",
  auth.uid() as "Auth UID Actual";

-- Verificar todas las integraciones existentes para debugging
SELECT 
  wi.*,
  up.username,
  up.role,
  c.name as company_name
FROM web_integrations wi
LEFT JOIN user_profiles up ON wi.user_id = up.user_id
LEFT JOIN companies c ON wi.company_id = c.id;
