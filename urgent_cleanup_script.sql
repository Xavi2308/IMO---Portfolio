-- 🚨 LIMPIEZA URGENTE - REDUCIR DE 7.17GB A <5GB
-- EJECUTAR EN ORDEN, REVISAR IMPACTO DESPUÉS DE CADA PASO

-- ===========================================
-- PASO 1: ELIMINAR IMÁGENES BASE64 (MAYOR IMPACTO)
-- ===========================================
-- Estas son las que más espacio consumen
UPDATE products 
SET image_url = NULL 
WHERE 
    image_url LIKE 'data:image%' OR  -- Base64 embebidas
    LENGTH(image_url) > 1000;        -- URLs sospechosamente largas

-- Verificar impacto
SELECT COUNT(*) as images_cleaned FROM products WHERE image_url IS NULL;

-- ===========================================
-- PASO 2: LIMPIEZA MASIVA DE NOTIFICACIONES
-- ===========================================
-- Eliminar TODAS las notificaciones >1 mes (son temporales)
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '1 month';

-- Verificar impacto
SELECT COUNT(*) as remaining_notifications FROM notifications;

-- ===========================================
-- PASO 3: ELIMINAR VARIACIONES SIN STOCK ANTIGUAS
-- ===========================================
-- Eliminar variaciones sin stock >3 meses (reducción masiva)
DELETE FROM variations 
WHERE (stock = 0 OR stock IS NULL)
AND created_at < NOW() - INTERVAL '3 months';

-- Verificar impacto
SELECT COUNT(*) as remaining_variations FROM variations;

-- ===========================================
-- PASO 4: ARCHIVAR MOVIMIENTOS MUY ANTIGUOS
-- ===========================================
-- Solo si los pasos anteriores no son suficientes
-- ⚠️ HACER BACKUP PRIMERO

-- Eliminar movimientos >1 año (si es necesario)
-- DELETE FROM movements 
-- WHERE created_at < NOW() - INTERVAL '1 year';

-- ===========================================
-- PASO 5: LIMPIEZA DE CAMPOS LARGOS
-- ===========================================
-- Truncar campos de texto que pueden ser largos
UPDATE products 
SET 
    description = CASE 
        WHEN LENGTH(description) > 500 THEN LEFT(description, 500) || '...'
        ELSE description 
    END,
    notes = CASE 
        WHEN LENGTH(notes) > 200 THEN LEFT(notes, 200) || '...'
        ELSE notes 
    END;

-- ===========================================
-- VERIFICACIÓN FINAL
-- ===========================================
-- Ver tamaño actual después de limpieza
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
