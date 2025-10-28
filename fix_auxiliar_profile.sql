-- Script para crear el perfil del auxiliar logístico en la tabla users
-- Ejecutar este script en Supabase SQL Editor

-- 1. Verificar que el usuario existe en auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'auxiliar@majovalero.com';

-- 2. Actualizar el CHECK constraint para incluir auxiliar_logistico
-- Primero eliminar el constraint existente
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Agregar el nuevo constraint con todos los roles
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'user', 'vendedor', 'supervisor', 'auxiliar_logistico'));

-- 3. Crear el perfil en la tabla public.users
INSERT INTO public.users (
  id,
  username,
  role,
  email,
  company_id,
  first_name,
  last_name,
  is_active,
  created_at,
  updated_at
) VALUES (
  '5ab3a7c8-f771-4fe0-ac1c-6f64b50ae573',  -- El ID del auth.users
  'AuxiliarLogistico',
  'auxiliar_logistico',
  'auxiliar@majovalero.com',
  '9a54c748-39a9-4ebd-9cc2-2a9f1f8744cf',  -- Tu company_id
  'Auxiliar',
  'Logístico',
  true,
  NOW(),
  NOW()
);

-- 4. Verificar que el perfil se creó correctamente
SELECT id, username, role, email, company_id, first_name, last_name, is_active
FROM public.users 
WHERE role = 'auxiliar_logistico';

-- 5. Verificar que la conexión auth.users -> public.users funciona
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  pu.id as profile_id,
  pu.username,
  pu.role,
  pu.company_id
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'auxiliar@majovalero.com';