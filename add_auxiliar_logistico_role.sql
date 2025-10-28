-- Script para verificar la estructura de usuarios y crear auxiliar logístico
-- Ejecutar este script en Supabase SQL Editor

-- 1. Verificar la estructura de la tabla auth.users
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'auth'
ORDER BY ordinal_position;

-- 2. Verificar si hay una tabla de roles personalizada
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%role%' OR table_name LIKE '%user%';

-- 3. Verificar cómo están estructurados los usuarios actuales
SELECT id, email, raw_user_meta_data, created_at,
       (raw_user_meta_data->>'role') as extracted_role,
       (raw_user_meta_data->>'company_id') as extracted_company_id
FROM auth.users 
LIMIT 5;

-- 3.1. Obtener el company_id desde la tabla sales (donde sí está)
SELECT DISTINCT company_id, COUNT(*) as sales_count
FROM sales 
GROUP BY company_id
ORDER BY sales_count DESC;

-- 3.2. Verificar si los usuarios tienen company_id en algún lado
SELECT id, email, 
       raw_user_meta_data,
       (raw_user_meta_data->>'company_id') as company_id_from_metadata
FROM auth.users
WHERE raw_user_meta_data IS NOT NULL;

-- 3.3. Verificar si existe una columna company_id directa en auth.users
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'auth' 
  AND column_name = 'company_id';

-- 3.4. Verificar cómo se relacionan usuarios con ventas (para entender la lógica actual)
SELECT DISTINCT s.created_by, s.company_id, u.email
FROM sales s
JOIN auth.users u ON s.created_by = u.id
LIMIT 5;

-- 4. Crear usuario auxiliar logístico usando raw_user_meta_data
-- NOTA: Ajusta el email y company_id según tus necesidades
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'auxiliar@tuempresa.com',  -- Cambia este email
  crypt('password123', gen_salt('bf')), -- Cambia esta contraseña
  NOW(),
  jsonb_build_object(
    'role', 'auxiliar_logistico',
    'company_id', '9a54c748-39a9-4ebd-9cc2-2a9f1f8744cf',  -- Cambia este company_id
    'name', 'Auxiliar Logístico Test'
  ),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 5. Verificar que el usuario se creó correctamente
SELECT id, email, 
       (raw_user_meta_data->>'role') as role,
       (raw_user_meta_data->>'company_id') as company_id,
       created_at 
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'auxiliar_logistico';