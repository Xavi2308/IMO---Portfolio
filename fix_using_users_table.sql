-- ========================================
-- USAR TABLA USERS ORIGINAL - MANTENER MULTITENANT
-- ========================================

-- PASO 1: Eliminar la tabla user_profiles problemática
-- (Solo si estás seguro de que no la necesitas)
-- DROP TABLE IF EXISTS user_profiles CASCADE;

-- PASO 2: Asegurar que la tabla users tiene la estructura correcta
-- Verificar estructura actual de users
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- PASO 3: Verificar que tu usuario existe en auth.users y en users
SELECT 
    'AUTH.USERS' as tabla,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
WHERE au.id = auth.uid();

SELECT 
    'USERS TABLE' as tabla,
    u.id,
    u.username,
    u.role,
    u.email,
    u.company_id,
    c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid();

-- PASO 4: Si tu usuario no está en la tabla users, agregarlo
-- (Descomenta solo si la consulta anterior no encontró tu usuario)
/*
INSERT INTO users (
    id,
    username,
    email,
    role,
    company_id,
    created_at,
    updated_at
)
SELECT 
    auth.uid(),
    'admin_user',  -- Cambiar por tu username deseado
    au.email,
    'admin',
    '9a54c748-39a9-4ebd-9cc2-2a9f1f8744cf', -- ID de la empresa (usar el que ya tienes)
    NOW(),
    NOW()
FROM auth.users au
WHERE au.id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid());
*/

-- PASO 5: Recrear políticas RLS para web_integrations usando tabla USERS
DROP POLICY IF EXISTS "Users can view company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can insert company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can update company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can delete company integrations" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_select" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_insert" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_update" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_delete" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_select_policy" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_insert_policy" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_update_policy" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_delete_policy" ON web_integrations;

-- Nuevas políticas usando tabla USERS
CREATE POLICY "integrations_select_users" ON web_integrations FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "integrations_insert_users" ON web_integrations FOR INSERT WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
);

CREATE POLICY "integrations_update_users" ON web_integrations FOR UPDATE 
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin' 
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
)
WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin' 
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "integrations_delete_users" ON web_integrations FOR DELETE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- PASO 6: Verificar que las políticas funcionan
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'web_integrations'
ORDER BY policyname;

-- PASO 7: Verificar tu usuario actual con tabla USERS
SELECT 
    'VERIFICACIÓN FINAL CON USERS' as test,
    u.id as user_id,
    u.username,
    u.role,
    u.email,
    u.company_id,
    c.name as company_name,
    auth.uid() as auth_uid,
    CASE 
        WHEN u.role = 'admin' THEN '🟢 Puede usar integraciones web'
        ELSE '🔴 No puede usar integraciones web (no es admin)'
    END as integration_access,
    CASE 
        WHEN u.id = auth.uid() THEN '✅ Usuario actual encontrado'
        ELSE '❌ No es el usuario actual'
    END as user_match
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid();

-- PASO 8: Test de inserción (opcional - para verificar que funciona)
-- Probar insertar una integración de prueba
-- INSERT INTO web_integrations (
--     company_id, 
--     user_id, 
--     platform, 
--     config, 
--     enabled, 
--     status
-- ) VALUES (
--     (SELECT company_id FROM users WHERE id = auth.uid()),
--     auth.uid(),
--     'test_platform',
--     '{"test": "data"}',
--     false,
--     'disconnected'
-- );

-- Si funciona, eliminar el test:
-- DELETE FROM web_integrations WHERE platform = 'test_platform' AND user_id = auth.uid();
