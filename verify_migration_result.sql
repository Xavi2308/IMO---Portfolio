-- ========================================
-- VERIFICACIÓN POST-MIGRACIÓN DETALLADA
-- ========================================

-- 1. Ver estructura actual de users (con las nuevas columnas)
SELECT 'ESTRUCTURA USERS ACTUALIZADA' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Conteo de registros en ambas tablas
SELECT 
    'CONTEOS FINALES' as tipo,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM user_profiles) as user_profiles_count;

-- 3. Ver TODOS los usuarios en la tabla users con su estado
SELECT 
    'TODOS LOS USUARIOS EN USERS' as tipo,
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.company_id,
    u.is_active,
    c.name as company_name,
    CASE 
        WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN '✅ Completo'
        WHEN u.first_name IS NOT NULL OR u.last_name IS NOT NULL THEN '⚠️ Parcial'
        WHEN u.username IS NOT NULL THEN '⚠️ Solo username'
        ELSE '❌ Datos incompletos'
    END as status
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
ORDER BY u.username;

-- 4. Verificar tu usuario actual específicamente
SELECT 'TU USUARIO ACTUAL (VERIFICACIÓN)' as info;
SELECT 
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.company_id,
    u.is_active,
    c.name as company_name,
    auth.uid() as current_auth_uid,
    CASE 
        WHEN u.id = auth.uid() THEN '✅ Es tu usuario'
        ELSE '❓ Otro usuario'
    END as is_current_user,
    CASE 
        WHEN u.role = 'admin' THEN '✅ Puede configurar integraciones web'
        ELSE '⚠️ Sin permisos de integración web'
    END as integration_access,
    CASE 
        WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN '✅ Perfil completo'
        WHEN u.first_name IS NOT NULL OR u.last_name IS NOT NULL THEN '⚠️ Perfil parcial'
        ELSE '❌ Faltan nombres'
    END as profile_status
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid() 
   OR u.email = (SELECT email FROM auth.users WHERE id = auth.uid())
ORDER BY is_current_user DESC;

-- 5. Verificar políticas RLS funcionando
SELECT 'PRUEBA DE POLÍTICAS RLS' as info;
SELECT 
    'RLS Test Result' as test_type,
    COUNT(*) as accessible_integrations
FROM web_integrations 
WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid());

-- 6. Estado final para continuar
SELECT 
    'ESTADO PARA CONTINUAR' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') 
        THEN '✅ LISTO PARA PROBAR WEB INTEGRATIONS'
        WHEN EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) 
        THEN '⚠️ USUARIO ENCONTRADO PERO NO ES ADMIN'
        ELSE '❌ USUARIO NO ENCONTRADO EN TABLA USERS'
    END as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND first_name IS NOT NULL AND last_name IS NOT NULL) 
        THEN '✅ PERFIL COMPLETO'
        WHEN EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) 
        THEN '⚠️ FALTAN FIRST_NAME/LAST_NAME'
        ELSE '❌ NO HAY PERFIL'
    END as profile_status;
