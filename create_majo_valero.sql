-- Recrear empresa Demo Company con acuerdo especial
INSERT INTO companies (
  name, 
  code, 
  subscription_type, 
  subscription_status, 
  special_agreement, 
  primary_color, 
  secondary_color, 
  max_users, 
  agreement_notes,
  trial_ends_at,
  created_at,
  updated_at
) VALUES (
  'Demo Company',
  'MV001',
  'premium',
  'active',
  true,
  '#DAA520',
  '#B8860B',
  999999,
  'Empresa fundadora - Acceso premium perpetuo sin costo',
  NULL,
  NOW(),
  NOW()
);

-- Verificar que se creó correctamente
SELECT id, name, subscription_type, special_agreement, primary_color 
FROM companies 
WHERE name = 'Demo Company';
