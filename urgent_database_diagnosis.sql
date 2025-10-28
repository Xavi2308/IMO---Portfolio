-- 🚨 DIAGNÓSTICO URGENTE - IDENTIFICAR TABLAS MÁS GRANDES
-- Supabase está usando 7.17GB de 5GB (143% de uso)

-- 1. Tamaño de cada tabla (ordenado por tamaño)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_pretty,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 2. Conteo de registros por tabla
SELECT 'products' as table_name, COUNT(*) as row_count FROM products
UNION ALL
SELECT 'variations', COUNT(*) FROM variations
UNION ALL
SELECT 'movements', COUNT(*) FROM movements
UNION ALL
SELECT 'sales', COUNT(*) FROM sales
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
ORDER BY row_count DESC;

-- 3. CRÍTICO: Buscar datos que consumen mucho espacio
-- Imágenes embebidas en base64 (CULPABLES PRINCIPALES)
SELECT 
    reference,
    LENGTH(image_url) as url_length,
    pg_size_pretty(LENGTH(image_url)) as url_size,
    SUBSTRING(image_url, 1, 50) as url_preview
FROM products 
WHERE LENGTH(COALESCE(image_url, '')) > 1000
ORDER BY LENGTH(image_url) DESC
LIMIT 20;

-- 4. Movimientos con datos JSON grandes
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as movement_count,
    AVG(LENGTH(COALESCE(notes, ''))) as avg_notes_length,
    MAX(LENGTH(COALESCE(notes, ''))) as max_notes_length
FROM movements 
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- 5. Notificaciones acumuladas
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as notification_count
FROM notifications 
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- 6. Variaciones sin stock (peso muerto)
SELECT 
    COUNT(*) as zero_stock_variations,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variations) as percentage
FROM variations 
WHERE stock = 0 OR stock IS NULL;
