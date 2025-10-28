-- ========================================
-- CREAR PERFIL FALTANTE PARA EL USUARIO
-- ========================================

-- Primero, verificar información del usuario autenticado
SELECT 
    auth.uid() as "Tu User ID",
    au.email as "Tu Email",
    au.user_metadata as "Metadata"
FROM auth.users au
WHERE au.id = auth.uid();

-- Verificar si ya tienes empresa asignada
SELECT * FROM companies ORDER BY created_at DESC LIMIT 5;

-- Crear perfil de usuario faltante
-- IMPORTANTE: Cambia 'TU_USERNAME' por tu nombre de usuario deseado
-- Y cambia 'COMPANY_ID_AQUI' por el ID de tu empresa (cópialo de la consulta anterior)

INSERT INTO user_profiles (
    user_id,
    username,
    email,
    first_name,
    last_name,
    role,
    company_id,
    created_at,
    updated_at
) VALUES (
    auth.uid(),                    -- Tu user_id actual
    'admin_user',                  -- Cambia por tu username deseado
    (SELECT email FROM auth.users WHERE id = auth.uid()), -- Tu email actual
    'Admin',                       -- Tu nombre
    'User',                        -- Tu apellido
    'admin',                       -- Rol admin
    -- IMPORTANTE: Copia un company_id de la consulta anterior y ponlo aquí:
    (SELECT id FROM companies ORDER BY created_at DESC LIMIT 1), -- Toma la empresa más reciente
    NOW(),
    NOW()
);

-- Verificar que se creó correctamente
SELECT 
  up.user_id,
  up.username,
  up.role as "Rol Usuario",
  up.company_id as "ID Empresa", 
  c.name as "Nombre Empresa",
  '✅ Perfil creado exitosamente' as "Estado"
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id  
WHERE up.user_id = auth.uid();

-- Si no tienes ninguna empresa, crear una empresa nueva:
-- (Solo ejecuta esto si la consulta de companies está vacía)

/*
INSERT INTO companies (
    name,
    created_at,
    updated_at
) VALUES (
    'Mi Empresa',
    NOW(), 
    NOW()
) RETURNING *;

-- Después actualizar el perfil con el ID de la nueva empresa:
UPDATE user_profiles 
SET company_id = (SELECT id FROM companies ORDER BY created_at DESC LIMIT 1)
WHERE user_id = auth.uid();
*/
