-- ========================================
-- VERIFICAR STATUS DE CUENTAS
-- ========================================

-- Ver todas las cuentas con su status
SELECT 
  ca.account_number,
  ca.status,
  ca.balance,
  c.name as customer_name,
  comp.name as company_name
FROM customer_accounts ca
JOIN customers c ON c.id = ca.customer_id
JOIN companies comp ON comp.id = c.company_id
ORDER BY comp.name, ca.created_at;
