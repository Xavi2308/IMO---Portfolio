-- 🧹 ANÁLISIS DE LIMPIEZA DE BASE DE DATOS PARA REDUCIR EGRESS
-- Consultas para identificar datos innecesarios que consumen ancho de banda

-- ==========================================
-- 1. ANÁLISIS DE IMÁGENES GRANDES O DUPLICADAS
-- ==========================================

-- Buscar URLs de imágenes muy largas (posibles base64 embebidas)
SELECT 
    reference,
    LENGTH(image_url) as url_length,
    image_url
FROM products 
WHERE LENGTH(image_url) > 200 -- URLs muy largas
ORDER BY url_length DESC
LIMIT 20;

-- Contar productos sin imagen vs con imagen
SELECT 
    CASE 
        WHEN image_url IS NULL OR image_url = '' THEN 'Sin imagen'
        ELSE 'Con imagen'
    END as estado_imagen,
    COUNT(*) as cantidad
FROM products 
GROUP BY estado_imagen;

-- ==========================================
-- 2. ANÁLISIS DE VARIACIONES SIN STOCK
-- ==========================================

-- Variaciones con stock 0 (candidatas a limpieza)
SELECT 
    COUNT(*) as variaciones_sin_stock,
    COUNT(DISTINCT product_id) as productos_afectados
FROM variations 
WHERE stock = 0 OR stock IS NULL;

-- Productos que solo tienen variaciones sin stock
SELECT 
    p.reference,
    p.line,
    COUNT(v.id) as total_variations,
    SUM(CASE WHEN v.stock > 0 THEN 1 ELSE 0 END) as variations_with_stock
FROM products p
LEFT JOIN variations v ON p.id = v.product_id
GROUP BY p.id, p.reference, p.line
HAVING SUM(CASE WHEN v.stock > 0 THEN 1 ELSE 0 END) = 0
ORDER BY total_variations DESC;

-- ==========================================
-- 3. ANÁLISIS DE DATOS HISTÓRICOS ANTIGUOS
-- ==========================================

-- Movimientos muy antiguos (más de 1 año)
SELECT 
    DATE_PART('year', created_at) as año,
    COUNT(*) as cantidad_movimientos,
    pg_size_pretty(
        pg_total_relation_size('movements') * COUNT(*) / 
        (SELECT COUNT(*) FROM movements)
    ) as tamaño_estimado
FROM movements 
WHERE created_at < NOW() - INTERVAL '1 year'
GROUP BY DATE_PART('year', created_at)
ORDER BY año;

-- Ventas muy antiguas
SELECT 
    DATE_PART('year', created_at) as año,
    COUNT(*) as cantidad_ventas
FROM sales 
WHERE created_at < NOW() - INTERVAL '1 year'
GROUP BY DATE_PART('year', created_at)
ORDER BY año;

-- ==========================================
-- 4. ANÁLISIS DE REFERENCIAS DUPLICADAS
-- ==========================================

-- Referencias duplicadas que podrían consolidarse
SELECT 
    reference,
    COUNT(*) as cantidad,
    STRING_AGG(DISTINCT line, ', ') as lineas
FROM products 
GROUP BY reference
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- ==========================================
-- 5. ANÁLISIS DE CAMPOS INNECESARIOS O LARGOS
-- ==========================================

-- Productos con campos de texto muy largos
SELECT 
    reference,
    LENGTH(COALESCE(description, '')) as desc_length,
    LENGTH(COALESCE(notes, '')) as notes_length,
    LENGTH(COALESCE(image_url, '')) as url_length
FROM products 
WHERE 
    LENGTH(COALESCE(description, '')) > 500 OR
    LENGTH(COALESCE(notes, '')) > 200 OR
    LENGTH(COALESCE(image_url, '')) > 300
ORDER BY (desc_length + notes_length + url_length) DESC;

-- ==========================================
-- 6. ANÁLISIS DE LOGS Y NOTIFICACIONES ANTIGUAS
-- ==========================================

-- Notificaciones muy antiguas
SELECT 
    DATE_PART('month', created_at) as mes,
    COUNT(*) as cantidad
FROM notifications 
WHERE created_at < NOW() - INTERVAL '3 months'
GROUP BY DATE_PART('month', created_at)
ORDER BY mes;

-- ==========================================
-- 7. TAMAÑO ESTIMADO DE CADA TABLA
-- ==========================================

-- Ver tamaño actual de cada tabla
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
