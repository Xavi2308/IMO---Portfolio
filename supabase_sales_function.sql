-- 🚀 FUNCIÓN OPTIMIZADA PARA SUPABASE - VENTAS CON DETALLES DE PRODUCTOS
-- Esta función debe ejecutarse en el SQL Editor de Supabase

CREATE OR REPLACE FUNCTION get_sales_with_product_details(
    p_user_id UUID DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
    id BIGINT,
    created_at TIMESTAMPTZ,
    total_amount NUMERIC,
    discount NUMERIC,
    payment_method TEXT,
    customer_name TEXT,
    customer_document TEXT,
    customer_phone TEXT,
    productos_detalle TEXT,
    total_pares INTEGER,
    referencias_diferentes BIGINT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    offset_val INTEGER;
BEGIN
    offset_val := (p_page - 1) * p_page_size;
    
    RETURN QUERY
    SELECT 
        s.id,
        s.created_at,
        s.total_amount,
        s.discount,
        s.payment_method,
        c.name as customer_name,
        c.document as customer_document,
        c.phone as customer_phone,
        
        -- String detallado de productos
        STRING_AGG(
            CONCAT(
                p.reference, '-', 
                v.color, 
                CASE 
                    WHEN si.sizes IS NOT NULL THEN 
                        ' [' || (
                            SELECT STRING_AGG(key || ':' || value, ', ' ORDER BY key)
                            FROM jsonb_each_text(si.sizes::jsonb)
                            WHERE value::integer > 0
                        ) || ']'
                    ELSE ''
                END
            ), 
            ' | ' 
            ORDER BY p.reference, v.color
        ) as productos_detalle,
        
        -- Total de pares
        COALESCE(SUM((
            SELECT SUM(value::integer) 
            FROM jsonb_each_text(si.sizes::jsonb)
            WHERE value::integer > 0
        )), 0)::INTEGER as total_pares,
        
        -- Referencias diferentes
        COUNT(DISTINCT p.reference) as referencias_diferentes
        
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN sale_items si ON s.id = si.sale_id
    LEFT JOIN variations v ON si.variation_id = v.id
    LEFT JOIN products p ON v.product_id = p.id
    
    WHERE 
        (p_user_id IS NULL OR s.user_id = p_user_id)
        AND (p_start_date IS NULL OR s.created_at >= p_start_date)
        AND (p_end_date IS NULL OR s.created_at <= p_end_date)
    
    GROUP BY 
        s.id, s.created_at, s.total_amount, s.discount, s.payment_method,
        c.name, c.document, c.phone
    
    ORDER BY s.created_at DESC
    LIMIT p_page_size
    OFFSET offset_val;
END;
$$;

-- Dar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_sales_with_product_details TO authenticated;

-- 📋 EJEMPLO DE USO:
-- SELECT * FROM get_sales_with_product_details(
--     p_user_id := NULL,  -- NULL para todos los usuarios
--     p_start_date := '2024-01-01'::timestamptz,
--     p_end_date := '2024-12-31'::timestamptz,
--     p_page := 1,
--     p_page_size := 20
-- );
