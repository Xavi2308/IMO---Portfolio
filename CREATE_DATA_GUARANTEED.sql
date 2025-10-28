-- ========================================
-- CREAR DATOS DE PRUEBA - MÉTODO DIRECTO
-- GARANTIZADO QUE FUNCIONA
-- ========================================

-- PASO 1: Obtener tu company_id actual
SELECT 
    'Tu company_id es:' as info,
    company_id,
    username
FROM users 
WHERE id = auth.uid();

-- PASO 2: Crear cliente y cuenta en una sola operación
WITH nuevo_cliente AS (
    INSERT INTO customers (
        name, 
        document, 
        phone, 
        city, 
        address, 
        company_id
    ) VALUES (
        'Cliente Prueba Despacho ' || TO_CHAR(NOW(), 'DD/MM/YY HH24:MI'),
        'TEST-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
        '300-123-4567',
        'Bogotá',
        'Calle 123 #45-67',
        (SELECT company_id FROM users WHERE id = auth.uid())
    )
    RETURNING id, company_id, name
),
nueva_cuenta AS (
    INSERT INTO customer_accounts (
        customer_id,
        company_id,
        account_number,
        status,
        total_value,
        paid_value,
        balance,
        dispatch_requested,
        created_by
    )
    SELECT 
        nc.id,
        nc.company_id,
        'CTA-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 999999)::TEXT, 6, '0'),
        'pending_dispatch',
        150000.00,
        0.00,
        -150000.00,
        true,
        auth.uid()
    FROM nuevo_cliente nc
    RETURNING *
)
SELECT 
    '✅ DATOS CREADOS EXITOSAMENTE' as resultado,
    nc.name as cliente_nombre,
    nct.account_number as numero_cuenta,
    nct.status as estado,
    nct.total_value as valor_total
FROM nuevo_cliente nc, nueva_cuenta nct;

-- PASO 3: Verificar que se crearon correctamente
SELECT 
    'VERIFICACIÓN' as tipo,
    c.name as cliente,
    c.document,
    ca.account_number,
    ca.status,
    ca.dispatch_requested,
    ca.total_value
FROM customers c
JOIN customer_accounts ca ON ca.customer_id = c.id
WHERE c.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND c.document LIKE 'TEST-%'
ORDER BY c.created_at DESC
LIMIT 5;

-- ========================================
-- LISTO! 
-- Ahora refrescar la aplicación y deberías ver 
-- la cuenta en la sección amarilla
-- ========================================
