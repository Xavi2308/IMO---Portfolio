-- ========================================
-- CONFIGURACIÓN DE USUARIOS CON EMPRESAS
-- Ejecutar en Supabase SQL Editor
-- ========================================

-- 1. AGREGAR COMPANY_ID A LA TABLA USERS
-- ========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. AGREGAR FOREIGN KEY CONSTRAINT
-- ========================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_company' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_company 
        FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;
END $$;

-- 3. CREAR TABLA USER_COMPANIES PARA RELACIONES MÚLTIPLES (OPCIONAL)
-- ========================================
CREATE TABLE IF NOT EXISTS user_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Evitar duplicados
    UNIQUE(user_id, company_id)
);

-- 4. CREAR ÍNDICES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON user_companies(company_id);

-- 5. ACTUALIZAR USUARIOS EXISTENTES CON LA PRIMERA EMPRESA
-- ========================================
WITH first_company AS (
  SELECT id FROM companies ORDER BY created_at LIMIT 1
)
UPDATE users 
SET company_id = (SELECT id FROM first_company)
WHERE company_id IS NULL;

-- 6. INSERTAR RELACIONES EN USER_COMPANIES
-- ========================================
INSERT INTO user_companies (user_id, company_id, role)
SELECT 
    u.id as user_id,
    u.company_id,
    CASE 
        WHEN u.role = 'admin' THEN 'admin'
        WHEN u.role = 'vendedor' THEN 'sales'
        ELSE 'user'
    END as role
FROM users u
WHERE u.company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- 7. HABILITAR RLS EN USER_COMPANIES
-- ========================================
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propias relaciones
DROP POLICY IF EXISTS "Users can view their own company relationships" ON user_companies;
CREATE POLICY "Users can view their own company relationships" ON user_companies
FOR SELECT USING (user_id = auth.uid());

-- Política para que admins puedan gestionar usuarios de su empresa
DROP POLICY IF EXISTS "Admins can manage users in their company" ON user_companies;
CREATE POLICY "Admins can manage users in their company" ON user_companies
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM user_companies 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
