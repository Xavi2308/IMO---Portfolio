-- ========================================
-- AGREGAR CAMPO DE REPOSICIÓN AUTOMÁTICA
-- ========================================

-- Agregar campo para controlar reposición automática por producto
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS auto_replenish BOOLEAN DEFAULT FALSE;

-- Comentario para documentar el campo
COMMENT ON COLUMN products.auto_replenish IS 'Controla si el producto debe ser incluido en la reposición automática de stock';

-- Crear índice para mejorar performance en consultas de reposición
CREATE INDEX IF NOT EXISTS idx_products_auto_replenish ON products (auto_replenish) WHERE auto_replenish = TRUE;

-- Actualizar productos existentes para tener reposición automática deshabilitada por defecto
UPDATE products SET auto_replenish = FALSE WHERE auto_replenish IS NULL;
