-- Verificar el estado actual de Demo Company
SELECT 
    id,
    name,
    subscription_type,
    special_agreement,
    primary_color,
    max_users,
    agreement_notes
FROM companies 
WHERE name ILIKE '%majo%';

-- Si Demo Company existe pero no tiene special_agreement = true, actualizar
UPDATE companies 
SET special_agreement = true
WHERE name ILIKE '%majo%' AND special_agreement != true;

-- Verificar empresas después de la actualización
SELECT 
    id,
    name,
    subscription_type,
    special_agreement,
    primary_color,
    max_users
FROM companies 
ORDER BY name;
