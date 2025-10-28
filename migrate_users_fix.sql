-- ========================================
-- MIGRACIÓN Y UNIFICACIÓN DE TABLAS USERS
-- ========================================

-- PASO 1: Verificar el estado actual
SELECT 'TABLA USERS (Original)' as tabla, count(*) as registros FROM users;
SELECT 'TABLA USER_PROFILES (Nueva)' as tabla, count(*) as registros FROM user_profiles;

-- Ver datos actuales
SELECT 'USUARIOS EN AUTH.USERS' as info, id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- PASO 2: Limpiar user_profiles y migrar datos desde users
DELETE FROM user_profiles WHERE user_id IS NULL;

-- PASO 3: Migrar datos desde users a user_profiles correctamente
INSERT INTO user_profiles (
    user_id,
    username, 
    email,
    first_name,
    last_name,
    role,
    company_id,
    created_at,
    updated_at,
    phone,
    avatar_url,
    is_active
)
SELECT 
    u.id as user_id,           -- Usar el ID de users como user_id
    u.username,
    u.email,
    COALESCE(SPLIT_PART(u.username, ' ', 1), u.username) as first_name,
    COALESCE(SPLIT_PART(u.username, ' ', 2), '') as last_name,
    u.role,
    u.company_id,
    u.created_at,
    u.updated_at,
    NULL as phone,
    NULL as avatar_url,
    true as is_active
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = u.id
);

-- PASO 4: Verificar la migración
SELECT 
    'DESPUÉS DE MIGRACIÓN' as estado,
    up.user_id,
    up.username,
    up.role,
    up.company_id,
    c.name as company_name,
    au.email as auth_email
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id
LEFT JOIN auth.users au ON au.id = up.user_id
ORDER BY up.created_at DESC;

-- PASO 5: Verificar tu usuario actual específicamente
SELECT 
    'TU USUARIO ACTUAL' as info,
    auth.uid() as auth_uid,
    up.user_id,
    up.username,
    up.role,
    up.company_id,
    c.name as company_name,
    CASE 
        WHEN up.role = 'admin' THEN '✅ Es admin'
        ELSE '❌ No es admin'
    END as admin_status
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id
WHERE up.user_id = auth.uid();

-- PASO 6: Si tu usuario actual no aparece, buscarlo en la tabla users original
SELECT 
    'BUSCAR EN USERS ORIGINAL' as info,
    u.*,
    'Necesita migración manual' as accion
FROM users u
WHERE u.id = auth.uid()
AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = u.id
);

-- PASO 7: Migración manual si es necesario (ejecutar solo si el paso 6 encontró tu usuario)
-- INSERT INTO user_profiles (
--     user_id, username, email, first_name, last_name, role, company_id, created_at, updated_at, is_active
-- ) 
-- SELECT 
--     auth.uid(), username, email, 
--     COALESCE(SPLIT_PART(username, ' ', 1), username),
--     COALESCE(SPLIT_PART(username, ' ', 2), ''),
--     role, company_id, created_at, updated_at, true
-- FROM users 
-- WHERE id = auth.uid();

-- PASO 8: Actualizar políticas RLS para ser más robustas
DROP POLICY IF EXISTS "Users can view company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can insert company integrations" ON web_integrations;  
DROP POLICY IF EXISTS "Admin can update company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can delete company integrations" ON web_integrations;

-- Políticas simplificadas y robustas
CREATE POLICY "web_integrations_select" ON web_integrations FOR SELECT USING (
    company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "web_integrations_insert" ON web_integrations FOR INSERT WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
    AND company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
    AND user_id = auth.uid()
);

CREATE POLICY "web_integrations_update" ON web_integrations FOR UPDATE 
USING ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin' AND company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid()))
WITH CHECK ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin' AND company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "web_integrations_delete" ON web_integrations FOR DELETE USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
    AND company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
);

-- PASO 9: Verificación final
SELECT 
    'VERIFICACIÓN FINAL' as test,
    up.username,
    up.role,
    c.name as company,
    CASE 
        WHEN up.role = 'admin' THEN '🟢 Puede usar integraciones'
        ELSE '🔴 No puede usar integraciones'
    END as status
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id
WHERE up.user_id = auth.uid();
