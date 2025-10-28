-- ========================================
-- ACTUALIZAR STATUS DE CUENTAS A 'OPEN'
-- ========================================

-- Actualizar todas las cuentas sin status a 'open'
UPDATE customer_accounts 
SET status = 'open' 
WHERE status IS NULL OR status = '';

-- Verificar resultado
SELECT 
  ca.account_number,
  ca.status,
  ca.balance,
  c.name as customer_name
FROM customer_accounts ca
JOIN customers c ON c.id = ca.customer_id
ORDER BY ca.created_at;