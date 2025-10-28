-- ========================================
-- SETUP COMPLETO PARA NÚMEROS CONSECUTIVOS DE VENTAS
-- ========================================

-- 0. Verificaciones iniciales
-- Verificar si existe la tabla companies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        RAISE NOTICE 'ADVERTENCIA: La tabla companies no existe. Creando tabla básica...';
        
        CREATE TABLE companies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Insertar una empresa por defecto
        INSERT INTO companies (name) VALUES ('Empresa Principal') 
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Tabla companies creada con empresa por defecto';
    ELSE
        RAISE NOTICE 'Tabla companies existe ✅';
    END IF;
END
$$;

-- Verificar/agregar company_id a la tabla sales si no existe
DO $$
DECLARE
    default_company_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'company_id'
    ) THEN
        RAISE NOTICE 'Agregando columna company_id a la tabla sales...';
        
        -- Obtener ID de empresa por defecto
        SELECT id INTO default_company_id FROM companies LIMIT 1;
        
        -- Agregar columna
        ALTER TABLE sales ADD COLUMN company_id UUID;
        
        -- Establecer empresa por defecto para ventas existentes
        UPDATE sales SET company_id = default_company_id WHERE company_id IS NULL;
        
        -- Agregar constraint
        ALTER TABLE sales ADD CONSTRAINT fk_sales_company 
        FOREIGN KEY (company_id) REFERENCES companies(id);
        
        RAISE NOTICE 'Columna company_id agregada a sales ✅';
    ELSE
        RAISE NOTICE 'Columna company_id ya existe en sales ✅';
    END IF;
END
$$;

-- 1. Crear tabla company_consecutives si no existe
CREATE TABLE IF NOT EXISTS company_consecutives (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    consecutive_type VARCHAR(50) NOT NULL,
    current_number INTEGER NOT NULL DEFAULT 0,
    prefix VARCHAR(10) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, consecutive_type)
);

-- 2. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_company_consecutives_company_type 
ON company_consecutives(company_id, consecutive_type);

-- 3. Crear función get_next_consecutive
CREATE OR REPLACE FUNCTION get_next_consecutive(p_type TEXT, p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_num INTEGER;
    new_num INTEGER;
    table_prefix TEXT;
    result TEXT;
BEGIN
    -- Verificar si existe el consecutivo para esta empresa
    SELECT current_number, COALESCE(company_consecutives.prefix, '') 
    INTO current_num, table_prefix
    FROM company_consecutives 
    WHERE company_id = p_company_id AND consecutive_type = p_type;
    
    -- Si no existe, crear uno nuevo
    IF current_num IS NULL THEN
        current_num := 0;
        table_prefix := CASE 
            WHEN p_type = 'account' THEN 'CTA-'
            WHEN p_type = 'dispatch' THEN 'DESP-'
            WHEN p_type = 'sale' THEN 'VTA-'
            ELSE ''
        END;
        
        INSERT INTO company_consecutives (company_id, consecutive_type, current_number, prefix)
        VALUES (p_company_id, p_type, 1, table_prefix)
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
    result := table_prefix || LPAD(new_num::TEXT, 6, '0');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verificar que la columna consecutive_number existe en la tabla sales
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'consecutive_number'
    ) THEN
        ALTER TABLE sales ADD COLUMN consecutive_number VARCHAR(20);
        RAISE NOTICE 'Columna consecutive_number agregada a la tabla sales';
    ELSE
        RAISE NOTICE 'Columna consecutive_number ya existe en la tabla sales';
    END IF;
END
$$;

-- 5. Crear índice en consecutive_number para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_sales_consecutive_number 
ON sales(consecutive_number);

-- 6. Actualizar ventas existentes que no tienen número consecutivo
DO $$
DECLARE
    company_record RECORD;
    sale_record RECORD;
    consecutive_num TEXT;
BEGIN
    -- Para cada empresa
    FOR company_record IN SELECT DISTINCT company_id FROM sales WHERE consecutive_number IS NULL
    LOOP
        RAISE NOTICE 'Procesando empresa: %', company_record.company_id;
        
        -- Obtener ventas sin consecutivo de esta empresa, ordenadas por fecha
        FOR sale_record IN 
            SELECT id 
            FROM sales 
            WHERE company_id = company_record.company_id 
            AND consecutive_number IS NULL 
            ORDER BY created_at ASC
        LOOP
            -- Generar consecutivo para esta venta
            SELECT get_next_consecutive('sale', company_record.company_id) INTO consecutive_num;
            
            -- Actualizar la venta
            UPDATE sales 
            SET consecutive_number = consecutive_num 
            WHERE id = sale_record.id;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Actualización de números consecutivos completada';
END
$$;

-- 7. Verificación final
SELECT 
    'Tabla company_consecutives' as componente,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_consecutives') 
         THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as estado
UNION ALL
SELECT 
    'Función get_next_consecutive' as componente,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_next_consecutive') 
         THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as estado
UNION ALL
SELECT 
    'Columna consecutive_number' as componente,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'consecutive_number') 
         THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as estado;

-- 8. Mostrar algunos consecutivos generados
SELECT 
    company_id,
    consecutive_type,
    current_number,
    prefix
FROM company_consecutives 
WHERE consecutive_type = 'sale'
ORDER BY company_id;

-- 9. Mostrar algunas ventas con sus consecutivos
SELECT 
    id,
    consecutive_number,
    created_at,
    total_value
FROM sales 
WHERE consecutive_number IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;