-- Script para configurar políticas RLS en la tabla users
-- Ejecutar este script en Supabase SQL Editor

--- 1. Verificar si RLS está habilitado en la tabla users
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 2. Habilitar RLS si no está habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas existentes si las hay (para limpiar)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view users from their company" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

-- 4. Crear una política simple que permita a todos los usuarios autenticados leer la tabla users
-- Esto evita la recursión infinita
CREATE POLICY "Enable read access for all users" ON public.users
  FOR SELECT USING (true);

-- 5. Crear política para que los usuarios puedan actualizar su propio perfil
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 7. Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 8. Confirmar permisos básicos para authenticated
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- 9. Probar que el usuario actual puede ver su perfil
SELECT id, username, role, email, company_id, first_name, last_name
FROM public.users 
WHERE id = auth.uid();