-- ========================================
-- VERIFICAR ESTRUCTURAS DE TABLAS
-- ========================================

-- Estructura de tabla users
SELECT 
    'USERS TABLE' as tabla,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Estructura de tabla user_profiles
SELECT 
    'USER_PROFILES TABLE' as tabla,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Comparar datos existentes
SELECT 
    'DATOS EN USERS' as tabla,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN username IS NOT NULL THEN 1 END) as con_username,
    COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as con_first_name,
    COUNT(CASE WHEN last_name IS NOT NULL THEN 1 END) as con_last_name
FROM users;

SELECT 
    'DATOS EN USER_PROFILES' as tabla,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN username IS NOT NULL THEN 1 END) as con_username,
    COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as con_first_name,
    COUNT(CASE WHEN last_name IS NOT NULL THEN 1 END) as con_last_name
FROM user_profiles;

-- Ver datos específicos de ambas tablas
SELECT 
    'USER DATA COMPARISON' as info,
    u.id,
    u.username as users_username,
    u.email as users_email,
    u.role as users_role,
    u.company_id as users_company_id,
    up.username as profiles_username,
    up.first_name as profiles_first_name,
    up.last_name as profiles_last_name,
    up.company_id as profiles_company_id
FROM users u
FULL OUTER JOIN user_profiles up ON u.id = up.user_id
WHERE u.id = auth.uid() OR up.user_id = auth.uid();
