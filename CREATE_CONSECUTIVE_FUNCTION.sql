-- ========================================
-- VERIFICAR Y CREAR FUNCIÓN get_next_consecutive
-- ========================================

-- Verificar si la función existe
SELECT 
    routine_name,
    routine_type,
    '✅ FUNCIÓN EXISTE' as estado
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name = 'get_next_consecutive';

-- Si no aparece nada arriba, ejecutar la función:

CREATE OR REPLACE FUNCTION get_next_consecutive(p_type TEXT, p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_num INTEGER;
    new_num INTEGER;
    prefix TEXT;
    result TEXT;
BEGIN
    -- Verificar si existe el consecutivo para esta empresa
    SELECT current_number, COALESCE(prefix, '') INTO current_num, prefix
    FROM company_consecutives 
    WHERE company_id = p_company_id AND consecutive_type = p_type;
    
    -- Si no existe, crear uno nuevo
    IF current_num IS NULL THEN
        current_num := 0;
        prefix := CASE 
            WHEN p_type = 'account' THEN 'CTA-'
            WHEN p_type = 'dispatch' THEN 'DESP-'
            WHEN p_type = 'sale' THEN 'VTA-'
            ELSE ''
        END;
        
        INSERT INTO company_consecutives (company_id, consecutive_type, current_number, prefix)
        VALUES (p_company_id, p_type, 1, prefix)
        ON CONFLICT (company_id, consecutive_type) DO NOTHING;
        new_num := 1;
    ELSE
        -- Incrementar el consecutivo
        new_num := current_num + 1;
        UPDATE company_consecutives 
        SET current_number = new_num 
        WHERE company_id = p_company_id AND consecutive_type = p_type;
    END IF;
    
    -- Formatear el resultado
    result := prefix || LPAD(new_num::TEXT, 6, '0');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Probar la función
SELECT get_next_consecutive('account', (SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1)) as numero_prueba;

-- ========================================
-- FUNCIÓN CREADA Y PROBADA
-- ========================================
