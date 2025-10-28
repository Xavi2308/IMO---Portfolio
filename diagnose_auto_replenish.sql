-- ========================================
-- DIAGNÓSTICO: VERIFICAR ESTADO DE AUTO_REPLENISH
-- ========================================

-- 1. Verificar si la columna auto_replenish existe
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'auto_replenish';

-- 2. Ver cuántos productos tienen auto_replenish = true vs false
SELECT 
  auto_replenish,
  COUNT(*) as cantidad
FROM products 
GROUP BY auto_replenish;

-- 3. Ver algunos productos específicos con su estado
SELECT id, reference, auto_replenish
FROM products 
LIMIT 10;

-- ========================================
-- SOLUCIÓN: EJECUTAR SI LA COLUMNA NO EXISTE
-- ========================================

-- Solo ejecutar si la consulta #1 no devuelve resultados
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS auto_replenish BOOLEAN DEFAULT FALSE;

-- ========================================
-- SOLUCIÓN: CORREGIR DATOS EXISTENTES
-- ========================================

-- Establecer FALSE para todos los productos existentes
UPDATE products 
SET auto_replenish = FALSE 
WHERE auto_replenish IS NULL OR auto_replenish = TRUE;

-- Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_products_auto_replenish 
ON products (auto_replenish) 
WHERE auto_replenish = TRUE;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

-- Verificar que todos los productos ahora tengan auto_replenish = false
SELECT 
  auto_replenish,
  COUNT(*) as cantidad
FROM products 
GROUP BY auto_replenish;

-- Debe mostrar solo: false | [número total de productos]
