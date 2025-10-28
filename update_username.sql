-- Buscar y actualizar el usuario con email exyleiten
-- Nota: Ejecutar después de hacer login en la aplicación

-- 1. Ver todos los usuarios actuales en user_profiles
SELECT 
    up.id,
    up.username,
    up.first_name,
    up.last_name,
    au.email
FROM user_profiles up
JOIN auth.users au ON au.id = up.id;

-- 2. Actualizar usuario con email que contenga 'exyleiten'
UPDATE user_profiles 
SET 
    username = 'Xavi',
    first_name = 'Xavi',
    last_name = ''
WHERE id IN (
    SELECT up.id 
    FROM user_profiles up
    JOIN auth.users au ON au.id = up.id
    WHERE au.email ILIKE '%exyleiten%'
);

-- 3. Verificar el cambio
SELECT 
    up.id,
    up.username,
    up.first_name,
    up.last_name,
    au.email
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE au.email ILIKE '%exyleiten%';
