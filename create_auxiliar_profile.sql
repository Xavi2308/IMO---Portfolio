-- Script para crear el perfil del auxiliar logístico
-- Ejecutar este script en Supabase SQL Editor

-- 1. Verificar la estructura de la tabla profiles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Ver algunos perfiles existentes para entender la estructura
SELECT * FROM profiles LIMIT 3;

-- 3. Crear el perfil para el usuario auxiliar logístico
-- NOTA: Ajusta los valores según la estructura que veas en los pasos anteriores
INSERT INTO profiles (
  id,
  email,
  role,
  company_id,
  created_at,
  updated_at
) VALUES (
  '5ab3a7c8-f771-4fe0-ac1c-6f64b50ae573',  -- ID del usuario que acabas de crear
  'auxiliar@majovalero.com',
  'auxiliar_logistico',
  '9a54c748-39a9-4ebd-9cc2-2a9f1f8744cf',  -- Usa tu company_id real
  NOW(),
  NOW()
);

-- 4. Verificar que el perfil se creó correctamente
SELECT id, email, role, company_id, created_at 
FROM profiles 
WHERE email = 'auxiliar@majovalero.com';

-- 5. También verificar en la tabla users si existe
SELECT * FROM users WHERE email = 'auxiliar@majovalero.com';