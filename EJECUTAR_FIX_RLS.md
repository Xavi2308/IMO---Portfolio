# 🔧 Solución RLS para Web Integrations

## Problema Identificado

- El error `new row violates row-level security policy for table "web_integrations"` ocurre porque las políticas RLS están buscando el usuario en la tabla `user_profiles` que tiene valores NULL
- La arquitectura multitenant debe usar la tabla `users` original

## Pasos para Ejecutar la Solución

### 1. Abrir Supabase SQL Editor

1. Ve a tu panel de Supabase
2. Navega a **SQL Editor**
3. Crea una nueva consulta

### 2. Ejecutar el Script por Secciones

#### Sección A - Verificar Estructura Actual

```sql
-- Verificar estructura de tabla users
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Verificar tu usuario
SELECT
    'AUTH.USERS' as tabla,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
WHERE au.id = auth.uid();

SELECT
    'USERS TABLE' as tabla,
    u.id,
    u.username,
    u.role,
    u.email,
    u.company_id,
    c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid();
```

#### Sección B - Limpiar Políticas Viejas

```sql
-- Eliminar todas las políticas existentes de web_integrations
DROP POLICY IF EXISTS "Users can view company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can insert company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can update company integrations" ON web_integrations;
DROP POLICY IF EXISTS "Admin can delete company integrations" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_select" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_insert" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_update" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_delete" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_select_policy" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_insert_policy" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_update_policy" ON web_integrations;
DROP POLICY IF EXISTS "web_integrations_delete_policy" ON web_integrations;
```

#### Sección C - Crear Nuevas Políticas usando tabla USERS

```sql
-- Políticas nuevas que usan la tabla users
CREATE POLICY "integrations_select_users" ON web_integrations FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "integrations_insert_users" ON web_integrations FOR INSERT WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
);

CREATE POLICY "integrations_update_users" ON web_integrations FOR UPDATE
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
)
WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "integrations_delete_users" ON web_integrations FOR DELETE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);
```

#### Sección D - Verificar Resultado

```sql
-- Verificar políticas creadas
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'web_integrations'
ORDER BY policyname;

-- Verificación final
SELECT
    'VERIFICACIÓN FINAL CON USERS' as test,
    u.id as user_id,
    u.username,
    u.role,
    u.email,
    u.company_id,
    c.name as company_name,
    auth.uid() as auth_uid,
    CASE
        WHEN u.role = 'admin' THEN '🟢 Puede usar integraciones web'
        ELSE '🔴 No puede usar integraciones web (no es admin)'
    END as integration_access,
    CASE
        WHEN u.id = auth.uid() THEN '✅ Usuario actual encontrado'
        ELSE '❌ No es el usuario actual'
    END as user_match
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid();
```

### 3. Agregar Usuario si es Necesario

Si la verificación en la Sección A muestra que tu usuario NO existe en la tabla `users`, ejecuta esto (reemplaza con tus datos):

```sql
INSERT INTO users (
    id,
    username,
    email,
    role,
    company_id,
    created_at,
    updated_at
)
SELECT
    auth.uid(),
    'admin_user',  -- Cambiar por tu username
    au.email,
    'admin',
    'TU_COMPANY_ID_AQUÍ', -- ID de tu empresa
    NOW(),
    NOW()
FROM auth.users au
WHERE au.id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid());
```

## ⚠️ Importante

- Ejecuta las secciones **una por una** en orden
- Verifica que cada paso funcione antes de continuar
- Si algo falla, detente y avísame
- NO ejecutes la inserción de usuario a menos que sea necesario

## ✅ Resultado Esperado

- Las políticas RLS usarán la tabla `users` correctamente
- Podrás guardar integraciones de WordPress/WooCommerce
- Se mantendrá la arquitectura multitenant
- El CompanyContext seguirá funcionando correctamente
