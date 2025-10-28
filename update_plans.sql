-- Actualizar configuración de planes según la nueva tabla

-- 1. Actualizar Demo Company con configuración correcta
UPDATE companies 
SET 
  subscription_type = 'premium',
  subscription_status = 'active',
  special_agreement = true,
  primary_color = '#DAA520',
  secondary_color = '#B8860B',
  max_users = NULL, -- NULL significa ilimitado
  agreement_notes = 'Empresa fundadora - Acceso premium perpetuo sin costo'
WHERE name = 'Demo Company';

-- 2. Si hay otras empresas, configurar límites según los nuevos planes
-- Basic: 2 usuarios
UPDATE companies 
SET max_users = 2
WHERE subscription_type = 'basic' AND name != 'Demo Company';

-- Standard: 5 usuarios  
UPDATE companies 
SET max_users = 5
WHERE subscription_type = 'standard' AND name != 'Demo Company';

-- Premium: ilimitado (NULL)
UPDATE companies 
SET max_users = NULL
WHERE subscription_type = 'premium' AND name != 'Demo Company';

-- 3. Verificar la configuración final
SELECT 
  name,
  subscription_type,
  special_agreement,
  max_users,
  CASE 
    WHEN max_users IS NULL THEN 'Ilimitado'
    ELSE max_users::text
  END as users_display,
  agreement_notes
FROM companies 
ORDER BY name;
