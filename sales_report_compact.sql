-- 📊 VERSIÓN COMPACTA - REPORTE DE VENTAS CON PRODUCTOS
-- Formato más resumido para fácil lectura

SELECT 
    s.id,
    s.created_at::date as fecha,
    s.total_amount as total,
    c.name as cliente,
    
    -- OPCIÓN 1: Formato detallado con tallas
    STRING_AGG(
        CONCAT(p.reference, '-', v.color, ' [', 
               (SELECT STRING_AGG(CONCAT(size, ':', qty), ',') 
                FROM jsonb_each_text(si.sizes::jsonb) 
                WHERE qty::integer > 0), ']'),
        ' | '
    ) as productos_detallado,
    
    -- OPCIÓN 2: Formato simple solo ref-color
    STRING_AGG(
        CONCAT(p.reference, '-', v.color),
        ', '
        ORDER BY p.reference
    ) as productos_simple,
    
    -- OPCIÓN 3: Solo referencias únicas
    STRING_AGG(DISTINCT p.reference, ', ' ORDER BY p.reference) as referencias,
    
    -- Total de pares
    SUM((SELECT SUM(qty::integer) FROM jsonb_each_text(si.sizes::jsonb))) as pares

FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN sale_items si ON s.id = si.sale_id
LEFT JOIN variations v ON si.variation_id = v.id
LEFT JOIN products p ON v.product_id = p.id

WHERE s.created_at >= CURRENT_DATE - INTERVAL '7 days'

GROUP BY s.id, s.created_at, s.total_amount, c.name
ORDER BY s.created_at DESC;

-- 📋 EJEMPLOS DE FORMATO:
-- productos_detallado: "104-Rojo [36:2,38:1] | 105-Azul [37:3]"
-- productos_simple: "104-Rojo, 105-Azul, 106-Negro"  
-- referencias: "104, 105, 106"
