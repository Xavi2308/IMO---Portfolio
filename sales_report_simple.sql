-- 📊 VERSIÓN COMPACTA - REPORTE DE VENTAS
-- Formato más resumido y fácil de leer

SELECT 
    s.id as sale_id,
    s.created_at::date as fecha,
    s.total_value as total,
    s.payment_method as pago,
    c.name as cliente,
    
    -- OPCIÓN 1: Formato detallado con tallas
    STRING_AGG(
        si.reference || '-' || si.color || ' [' || si.size || ':' || si.quantity || ']',
        ' | '
        ORDER BY si.reference
    ) as productos_detallado,
    
    -- OPCIÓN 2: Formato simple (solo ref-color)
    STRING_AGG(
        DISTINCT si.reference || '-' || si.color,
        ', '
        ORDER BY si.reference || '-' || si.color
    ) as productos_simple,
    
    -- OPCIÓN 3: Solo referencias
    STRING_AGG(
        DISTINCT si.reference,
        ', '
        ORDER BY si.reference
    ) as referencias,
    
    -- Totales
    SUM(si.quantity) as pares,
    COUNT(si.id) as items

FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN sale_items si ON s.id = si.sale_id

WHERE s.created_at >= CURRENT_DATE - INTERVAL '7 days'
AND s.status = 'confirmed'

GROUP BY s.id, s.created_at, s.total_value, s.payment_method, c.name
ORDER BY s.created_at DESC;

-- 📋 EJEMPLOS DE FORMATO PARA TUS DATOS:
-- productos_detallado: "MC104 DIANI-PARDO X PIETRA [41:1] | MC129 FER-TALCO X SALMON [37:1]"
-- productos_simple: "MC104 DIANI-PARDO X PIETRA, MC129 FER-TALCO X SALMON"  
-- referencias: "MC104 DIANI, MC129 FER"
