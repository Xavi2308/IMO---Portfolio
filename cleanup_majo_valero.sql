-- Limpiar duplicados de Demo Company y consolidar usuarios

-- 1. Primero, veamos qué usuarios están asignados a cada empresa
SELECT 
  c.id as company_id,
  c.name,
  c.special_agreement,
  c.primary_color,
  COUNT(up.id) as user_count
FROM companies c
LEFT JOIN user_profiles up ON up.company_id = c.id
WHERE c.name = 'Demo Company'
GROUP BY c.id, c.name, c.special_agreement, c.primary_color;

-- 2. Obtener el ID de la primera empresa Demo Company (la que vamos a conservar)
WITH first_majo AS (
  SELECT id FROM companies 
  WHERE name = 'Demo Company' 
  ORDER BY created_at ASC 
  LIMIT 1
)
-- 3. Mover todos los usuarios de las empresas duplicadas a la primera
UPDATE user_profiles 
SET company_id = (SELECT id FROM first_majo)
WHERE company_id IN (
  SELECT id FROM companies 
  WHERE name = 'Demo Company' 
  AND id NOT IN (SELECT id FROM first_majo)
);

-- 4. Eliminar las empresas duplicadas (mantener solo la primera)
WITH first_majo AS (
  SELECT id FROM companies 
  WHERE name = 'Demo Company' 
  ORDER BY created_at ASC 
  LIMIT 1
)
DELETE FROM companies 
WHERE name = 'Demo Company' 
AND id NOT IN (SELECT id FROM first_majo);

-- 5. Asegurar que la empresa restante tenga la configuración correcta
UPDATE companies 
SET 
  subscription_type = 'premium',
  subscription_status = 'active',
  special_agreement = true,
  primary_color = '#DAA520',
  secondary_color = '#B8860B',
  max_users = 999999,
  agreement_notes = 'Empresa fundadora - Acceso premium perpetuo sin costo'
WHERE name = 'Demo Company';

-- 6. Verificar el resultado final
SELECT 
  c.id,
  c.name,
  c.subscription_type,
  c.special_agreement,
  c.primary_color,
  COUNT(up.id) as total_users
FROM companies c
LEFT JOIN user_profiles up ON up.company_id = c.id
WHERE c.name = 'Demo Company'
GROUP BY c.id, c.name, c.subscription_type, c.special_agreement, c.primary_color;
