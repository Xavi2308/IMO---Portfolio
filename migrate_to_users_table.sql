-- ========================================
-- MIGRAR DE USER_PROFILES A USERS
-- ========================================

-- PASO 1: Agregar columnas faltantes a la tabla users si no existen
DO $$ 
BEGIN
    -- Verificar y agregar first_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_name') THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
        RAISE NOTICE 'Agregada columna first_name a users';
    END IF;

    -- Verificar y agregar last_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_name') THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
        RAISE NOTICE 'Agregada columna last_name a users';
    END IF;

    -- Verificar y agregar bio (si existe en user_profiles)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='bio') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN
        ALTER TABLE users ADD COLUMN bio TEXT;
        RAISE NOTICE 'Agregada columna bio a users';
    END IF;

    -- Verificar y agregar avatar_url (si existe en user_profiles)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='avatar_url') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN
        ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
        RAISE NOTICE 'Agregada columna avatar_url a users';
    END IF;

    -- Verificar y agregar phone (si existe en user_profiles)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='phone') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Agregada columna phone a users';
    END IF;
END $$;

-- PASO 2: Migrar datos de user_profiles a users (si existen datos)
DO $$ 
BEGIN
    -- Solo migrar si existen ambas tablas y hay datos en user_profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        
        -- Migrar datos básicos (solo first_name, last_name, username)
        UPDATE users u
        SET 
            first_name = COALESCE(up.first_name, u.first_name),
            last_name = COALESCE(up.last_name, u.last_name),
            username = COALESCE(up.username, u.username)
        FROM user_profiles up
        WHERE u.id = up.user_id
        AND up.user_id IS NOT NULL;

        -- NO migrar phone, bio, avatar_url ya que users no tiene esas columnas

        RAISE NOTICE 'Datos migrados de user_profiles a users';
    END IF;
END $$;

-- PASO 3: Verificar estructura final de users
SELECT 
    'ESTRUCTURA USERS ACTUALIZADA' as info,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- PASO 4: Verificar tus datos de usuario
SELECT 
    'TUS DATOS EN USERS' as info,
    id,
    username,
    email,
    first_name,
    last_name,
    role,
    company_id,
    CASE 
        WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN '✅ Datos completos'
        WHEN username IS NOT NULL THEN '⚠️ Faltan first_name/last_name'
        ELSE '❌ Faltan datos básicos'
    END as status
FROM users 
WHERE id = auth.uid();

-- PASO 5: Si necesitas crear tu usuario en la tabla users
-- (DESCOMENTA SOLO SI LA CONSULTA ANTERIOR NO MUESTRA TUS DATOS)
/*
INSERT INTO users (
    id,
    username,
    email,
    first_name,
    last_name,
    role,
    company_id,
    created_at,
    updated_at
)
SELECT 
    auth.uid(),
    COALESCE(
        (SELECT username FROM user_profiles WHERE user_id = auth.uid()),
        SPLIT_PART((SELECT email FROM auth.users WHERE id = auth.uid()), '@', 1)
    ) as username,
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    (SELECT first_name FROM user_profiles WHERE user_id = auth.uid()) as first_name,
    (SELECT last_name FROM user_profiles WHERE user_id = auth.uid()) as last_name,
    'admin',
    '9a54c748-39a9-4ebd-9cc2-2a9f1f8744cf', -- Reemplazar con tu company_id
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid());
*/

-- PASO 6: Resultado final
SELECT 'MIGRACIÓN COMPLETADA - USERS ACTUALIZADA' as resultado;
