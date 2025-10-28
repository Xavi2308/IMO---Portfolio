-- ========================================
-- SCRIPT DE PRUEBA - SISTEMA DE REPOSICIÓN AUTOMÁTICA
-- ========================================

-- Verificar que el campo auto_replenish se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND table_schema = 'public' 
  AND column_name = 'auto_replenish';

-- Ver algunos productos de ejemplo con el nuevo campo
SELECT id, reference, line, auto_replenish, created_at
FROM products 
LIMIT 10;

-- Contar productos con reposición automática habilitada vs deshabilitada
SELECT 
  auto_replenish,
  COUNT(*) as cantidad,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as porcentaje
FROM products 
GROUP BY auto_replenish
ORDER BY auto_replenish DESC;

-- Verificar que la consulta de Orders ahora filtra correctamente
-- (Esta consulta simula lo que hace Orders.jsx)
SELECT 
  p.id, 
  p.reference, 
  p.auto_replenish,
  COUNT(v.id) as variaciones
FROM products p
LEFT JOIN variations v ON p.id = v.product_id
WHERE p.auto_replenish = true  -- Solo productos con reposición automática
GROUP BY p.id, p.reference, p.auto_replenish
LIMIT 5;

-- Ver si hay suspensiones activas (tabla de suspensiones)
SELECT COUNT(*) as suspensiones_activas
FROM stock_suspensions 
WHERE suspend_until > NOW();

-- Mostrar productos con reposición deshabilitada (para verificar)
SELECT 
  p.reference,
  p.line,
  p.auto_replenish,
  COUNT(v.id) as variaciones,
  SUM(v.stock) as stock_total
FROM products p
LEFT JOIN variations v ON p.id = v.product_id
WHERE p.auto_replenish = false
GROUP BY p.id, p.reference, p.line, p.auto_replenish
LIMIT 10;
