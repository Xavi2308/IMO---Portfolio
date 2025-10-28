-- ========================================
-- MIGRACIÓN CORREGIDA: USER_PROFILES → USERS
-- ========================================

-- PASO 1: Verificar estructura actual de ambas tablas
SELECT 'ESTRUCTURA USERS ACTUAL' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT 'ESTRUCTURA USER_PROFILES ACTUAL' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- PASO 2: Agregar SOLO las columnas necesarias a users
DO $$ 
BEGIN
    -- Agregar first_name si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_name') THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
        RAISE NOTICE '✅ Agregada columna first_name a users';
    ELSE
        RAISE NOTICE 'ℹ️ Columna first_name ya existe en users';
    END IF;

    -- Agregar last_name si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_name') THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
        RAISE NOTICE '✅ Agregada columna last_name a users';
    ELSE
        RAISE NOTICE 'ℹ️ Columna last_name ya existe en users';
    END IF;

    -- Agregar is_active si no existe (importante para la lógica)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Agregada columna is_active a users';
    ELSE
        RAISE NOTICE 'ℹ️ Columna is_active ya existe en users';
    END IF;

    RAISE NOTICE '🎯 Columnas necesarias agregadas a users';
END $$;

-- PASO 3: Migrar datos de user_profiles a users
-- Solo migrar los datos que no tienen user_id NULL
DO $$ 
DECLARE
    migration_count INTEGER := 0;
    update_count INTEGER := 0;
BEGIN
    -- Contar cuántos registros necesitan migración
    SELECT COUNT(*) INTO migration_count
    FROM user_profiles up
    WHERE up.user_id IS NOT NULL 
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = up.user_id);
    
    RAISE NOTICE 'Registros para migrar: %', migration_count;

    IF migration_count > 0 THEN
        -- Migrar first_name y last_name desde user_profiles
        UPDATE users u
        SET 
            first_name = COALESCE(up.first_name, u.first_name),
            last_name = COALESCE(up.last_name, u.last_name),
            is_active = COALESCE(up.is_active::boolean, true),
            updated_at = NOW()
        FROM user_profiles up
        WHERE u.id = up.user_id
        AND up.user_id IS NOT NULL;

        GET DIAGNOSTICS update_count = ROW_COUNT;
        RAISE NOTICE '✅ Migrados % registros de user_profiles a users', update_count;
    ELSE
        RAISE NOTICE 'ℹ️ No hay registros para migrar';
    END IF;
END $$;

-- PASO 4: Crear registros faltantes en users desde user_profiles
-- Para user_profiles que tienen user_id NULL pero datos válidos
DO $$ 
DECLARE
    insert_count INTEGER := 0;
BEGIN
    -- Insertar usuarios faltantes que están en user_profiles pero no en users
    INSERT INTO users (
        id,
        username,
        email,
        first_name,
        last_name,
        role,
        company_id,
        is_active,
        created_at,
        updated_at
    )
    SELECT 
        up.id, -- usar el id del user_profile como id del user
        up.username,
        au.email, -- buscar email en auth.users
        up.first_name,
        up.last_name,
        up.role,
        up.company_id,
        up.is_active::boolean,
        up.created_at,
        NOW()
    FROM user_profiles up
    LEFT JOIN auth.users au ON au.id = up.id
    WHERE up.id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = up.id)
    AND up.username IS NOT NULL;

    GET DIAGNOSTICS insert_count = ROW_COUNT;
    
    IF insert_count > 0 THEN
        RAISE NOTICE '✅ Creados % nuevos usuarios en table users', insert_count;
    ELSE
        RAISE NOTICE 'ℹ️ No se necesitaron crear usuarios adicionales';
    END IF;
END $$;

-- PASO 5: Verificar resultado de la migración
SELECT 'VERIFICACIÓN POST-MIGRACIÓN' as info;

-- Comparar conteos
SELECT 
    'CONTEOS FINALES' as tipo,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM user_profiles) as user_profiles_count;

-- Ver usuarios con datos completos
SELECT 
    'USUARIOS CON DATOS COMPLETOS' as tipo,
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
        WHEN u.username IS NOT NULL THEN '⚠️ Faltan nombres'
        ELSE '❌ Datos incompletos'
    END as status
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
ORDER BY u.username;

-- Ver si tu usuario actual existe y está completo
SELECT 
    'TU USUARIO ACTUAL' as tipo,
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.company_id,
    CASE 
        WHEN u.id = auth.uid() THEN '✅ Es tu usuario'
        ELSE '❓ Otro usuario'
    END as is_current_user,
    CASE 
        WHEN u.role = 'admin' THEN '✅ Puede configurar integraciones'
        ELSE '⚠️ Sin permisos de integración'
    END as integration_access
FROM users u
WHERE u.id = auth.uid() OR u.email = (SELECT email FROM auth.users WHERE id = auth.uid())
ORDER BY is_current_user DESC;

-- PASO 6: Mensaje final
SELECT '🎉 MIGRACIÓN COMPLETADA - REVISA LOS RESULTADOS ARRIBA' as resultado;
