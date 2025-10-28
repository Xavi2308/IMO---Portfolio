-- 📊 CONSULTA CORREGIDA PARA TU ESTRUCTURA REAL DE VENTAS
-- Basada en sales + sale_items (sin variations/products)

SELECT 
    s.id as sale_id,
    s.created_at::date as fecha_venta,
    s.total_value as total,
    s.paid_amount,
    s.payment_method as metodo_pago,
    s.sale_type as tipo_venta,
    s.status as estado,
    
    -- Cliente información
    c.name as cliente_nombre,
    c.document as cliente_documento,
    c.phone as cliente_telefono,
    
    -- 🆕 NUEVA COLUMNA: Detalles de productos como string
    STRING_AGG(
        CONCAT(
            si.reference, ' - ', 
            si.color, ' [',
            si.size, ':', si.quantity,
            ']'
        ), 
        ' | ' 
        ORDER BY si.reference, si.color, si.size
    ) as productos_detalle,
    
    -- Cantidad total de pares (suma directa)
    SUM(si.quantity) as total_pares,
    
    -- Número de referencias diferentes
    COUNT(DISTINCT si.reference) as referencias_diferentes,
    
    -- Número de items diferentes (ref-color-talla únicos)
    COUNT(si.id) as items_diferentes,
    
    -- Total calculado vs registrado
    SUM(si.subtotal) as total_calculado

FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN sale_items si ON s.id = si.sale_id

WHERE s.created_at >= CURRENT_DATE - INTERVAL '30 days'  -- Últimos 30 días

GROUP BY 
    s.id, s.created_at, s.total_value, s.paid_amount, s.payment_method,
    s.sale_type, s.status, c.name, c.document, c.phone

ORDER BY s.created_at DESC;

-- 📋 EJEMPLO DE RESULTADO:
-- productos_detalle: "104 - Rojo [36:2, 38:1] | 105 - Azul [37:3, 39:1] | 106 - Negro [40:2]"
-- Significa: Ref 104 Rojo (2 pares talla 36, 1 par talla 38) | Ref 105 Azul (3 pares talla 37, 1 par talla 39) | etc.
