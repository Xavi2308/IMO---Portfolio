-- 🧹 SCRIPTS DE LIMPIEZA SEGUROS PARA REDUCIR EGRESS
-- ⚠️ IMPORTANTE: Hacer BACKUP antes de ejecutar cualquier script

-- ==========================================
-- OPCIÓN 1: LIMPIEZA CONSERVADORA (MÁS SEGURA)
-- ==========================================

-- 1A. Limpiar variaciones sin stock hace más de 6 meses
-- (Solo si no han tenido movimientos recientes)
DELETE FROM variations 
WHERE id IN (
    SELECT v.id 
    FROM variations v
    LEFT JOIN movements m ON v.id = m.variation_id
    WHERE (v.stock = 0 OR v.stock IS NULL)
    AND v.created_at < NOW() - INTERVAL '6 months'
    AND (m.id IS NULL OR m.created_at < NOW() - INTERVAL '6 months')
);

-- 1B. Limpiar notificaciones antiguas (más de 3 meses)
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '3 months';

-- 1C. Truncar campos de texto largos innecesarios
UPDATE products 
SET 
    description = LEFT(description, 500),
    notes = LEFT(notes, 200)
WHERE 
    LENGTH(COALESCE(description, '')) > 500 OR
    LENGTH(COALESCE(notes, '')) > 200;

-- ==========================================
-- OPCIÓN 2: LIMPIEZA MODERADA (IMPACTO MEDIO)
-- ==========================================

-- 2A. Archivar movimientos muy antiguos (más de 2 años)
-- Crear tabla de archivo primero
CREATE TABLE IF NOT EXISTS movements_archive (
    LIKE movements INCLUDING ALL
);

-- Mover datos antiguos al archivo
INSERT INTO movements_archive 
SELECT * FROM movements 
WHERE created_at < NOW() - INTERVAL '2 years';

-- Eliminar de la tabla principal
DELETE FROM movements 
WHERE created_at < NOW() - INTERVAL '2 years';

-- 2B. Archivar ventas antiguas (más de 1 año)
CREATE TABLE IF NOT EXISTS sales_archive (
    LIKE sales INCLUDING ALL
);

INSERT INTO sales_archive 
SELECT * FROM sales 
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM sales 
WHERE created_at < NOW() - INTERVAL '1 year';

-- ==========================================
-- OPCIÓN 3: OPTIMIZACIÓN DE IMÁGENES
-- ==========================================

-- 3A. Limpiar URLs de imagen rotas o muy largas
UPDATE products 
SET image_url = NULL 
WHERE 
    LENGTH(image_url) > 500 OR  -- URLs sospechosamente largas
    image_url LIKE 'data:image%' OR  -- Base64 embebidas
    image_url = '' OR
    image_url = 'undefined' OR
    image_url = 'null';

-- ==========================================
-- OPCIÓN 4: LIMPIEZA AVANZADA (MAYOR IMPACTO)
-- ==========================================

-- 4A. Eliminar productos huérfanos (sin variaciones con stock)
DELETE FROM products 
WHERE id NOT IN (
    SELECT DISTINCT product_id 
    FROM variations 
    WHERE stock > 0
);

-- 4B. Consolidar referencias duplicadas
-- (⚠️ CUIDADO: Solo si estás seguro de que son realmente duplicados)
-- Este script necesita revisión manual caso por caso

-- ==========================================
-- SCRIPTS DE MANTENIMIENTO CONTINUO
-- ==========================================

-- Crear un job para limpieza automática semanal
-- (Esto se ejecutaría automáticamente)

-- Limpiar notificaciones cada semana
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql;

-- Limpiar variaciones sin stock muy antiguas
CREATE OR REPLACE FUNCTION cleanup_old_zero_stock()
RETURNS void AS $$
BEGIN
    DELETE FROM variations 
    WHERE (stock = 0 OR stock IS NULL)
    AND created_at < NOW() - INTERVAL '3 months'
    AND id NOT IN (
        SELECT DISTINCT variation_id 
        FROM movements 
        WHERE created_at > NOW() - INTERVAL '3 months'
    );
END;
$$ LANGUAGE plpgsql;
