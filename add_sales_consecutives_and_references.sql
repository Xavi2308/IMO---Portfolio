-- ========================================
-- AGREGAR SISTEMA DE CONSECUTIVOS Y REFERENCIAS DE VENTAS
-- ========================================

-- PASO 1: AGREGAR COLUMNAS A LA TABLA SALES
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS consecutive_number INTEGER,
ADD COLUMN IF NOT EXISTS reference_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS reference_status VARCHAR(20) DEFAULT 'active' CHECK (reference_status IN ('active', 'pending_dispatch', 'dispatched'));

-- PASO 2: CREAR TABLA DE REFERENCIAS DE VENTAS
CREATE TABLE IF NOT EXISTS sale_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    reference_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending_dispatch', 'dispatched')),
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    dispatched_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    dispatched_by UUID REFERENCES users(id),
    
    UNIQUE(company_id, reference_code)
);

-- PASO 3: CREAR FUNCIÓN PARA GENERAR CONSECUTIVOS POR EMPRESA
-- Primero eliminar la función existente si existe
DROP FUNCTION IF EXISTS get_next_consecutive(UUID, VARCHAR);
DROP FUNCTION IF EXISTS get_next_consecutive(UUID, character varying);

CREATE OR REPLACE FUNCTION get_next_consecutive(p_company_id UUID, p_type VARCHAR(50))
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Insertar o actualizar consecutivo
    INSERT INTO company_consecutives (company_id, consecutive_type, current_number)
    VALUES (p_company_id, p_type, 1)
    ON CONFLICT (company_id, consecutive_type)
    DO UPDATE SET current_number = company_consecutives.current_number + 1;
    
    -- Obtener el número actual
    SELECT current_number INTO next_number
    FROM company_consecutives
    WHERE company_id = p_company_id AND consecutive_type = p_type;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- PASO 4: CREAR FUNCIÓN PARA GENERAR REFERENCIAS DE CLIENTE
-- Primero eliminar la función existente si existe
DROP FUNCTION IF EXISTS generate_client_reference(UUID, UUID);

CREATE OR REPLACE FUNCTION generate_client_reference(p_company_id UUID, p_customer_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    customer_initials VARCHAR(10);
    year_part VARCHAR(4);
    reference_number INTEGER;
    new_reference VARCHAR(50);
    existing_active_ref VARCHAR(50);
BEGIN
    -- Verificar si el cliente tiene una referencia activa
    SELECT reference_code INTO existing_active_ref
    FROM sale_references
    WHERE company_id = p_company_id 
      AND customer_id = p_customer_id 
      AND status = 'active'
    LIMIT 1;
    
    -- Si ya tiene una referencia activa, devolverla
    IF existing_active_ref IS NOT NULL THEN
        RETURN existing_active_ref;
    END IF;
    
    -- Obtener iniciales del cliente (primeras 3 letras del nombre)
    SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 3)) INTO customer_initials
    FROM customers
    WHERE id = p_customer_id;
    
    -- Si no se pueden obtener iniciales, usar CLI
    IF customer_initials IS NULL OR LENGTH(customer_initials) = 0 THEN
        customer_initials := 'CLI';
    END IF;
    
    -- Obtener año actual
    year_part := EXTRACT(YEAR FROM NOW())::VARCHAR(4);
    
    -- Generar número de referencia
    reference_number := get_next_consecutive(p_company_id, 'REFERENCE');
    
    -- Formatear con ceros a la izquierda (3 dígitos)
    new_reference := customer_initials || LPAD(reference_number::VARCHAR, 3, '0') || '-' || year_part || '-' || LPAD(reference_number::VARCHAR, 3, '0');
    
    -- Crear la nueva referencia
    INSERT INTO sale_references (company_id, customer_id, reference_code, status, created_by)
    VALUES (p_company_id, p_customer_id, new_reference, 'active', NULL);
    
    RETURN new_reference;
END;
$$ LANGUAGE plpgsql;

-- PASO 5: CREAR FUNCIÓN PARA ACTUALIZAR DATOS DE REFERENCIA
-- Primero eliminar la función existente si existe
DROP FUNCTION IF EXISTS update_reference_totals(VARCHAR);

CREATE OR REPLACE FUNCTION update_reference_totals(p_reference_code VARCHAR(50))
RETURNS VOID AS $$
BEGIN
    UPDATE sale_references
    SET 
        total_items = (
            SELECT COALESCE(SUM(total_pairs), 0)
            FROM sales
            WHERE reference_code = p_reference_code
        ),
        total_value = (
            SELECT COALESCE(SUM(total_value), 0)
            FROM sales
            WHERE reference_code = p_reference_code
        )
    WHERE reference_code = p_reference_code;
END;
$$ LANGUAGE plpgsql;

-- PASO 6: CREAR TRIGGER PARA ACTUALIZAR REFERENCIAS AUTOMÁTICAMENTE
-- Primero eliminar la función del trigger si existe
DROP FUNCTION IF EXISTS trigger_update_reference_totals();

CREATE OR REPLACE FUNCTION trigger_update_reference_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar totales para la referencia nueva
    IF NEW.reference_code IS NOT NULL THEN
        PERFORM update_reference_totals(NEW.reference_code);
    END IF;
    
    -- Si se cambió la referencia, actualizar la anterior también
    IF TG_OP = 'UPDATE' AND OLD.reference_code IS NOT NULL AND OLD.reference_code != NEW.reference_code THEN
        PERFORM update_reference_totals(OLD.reference_code);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_reference_update_trigger ON sales;
CREATE TRIGGER sales_reference_update_trigger
    AFTER INSERT OR UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_reference_totals();

-- PASO 7: CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_sales_consecutive ON sales(consecutive_number);
CREATE INDEX IF NOT EXISTS idx_sales_reference ON sales(reference_code);
CREATE INDEX IF NOT EXISTS idx_sale_references_customer ON sale_references(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_references_company ON sale_references(company_id);
CREATE INDEX IF NOT EXISTS idx_sale_references_status ON sale_references(status);

-- PASO 8: CREAR NUEVO ROL DE DESPACHOS
DO $$
BEGIN
    -- No podemos crear roles desde SQL en Supabase, esto se debe hacer desde el panel
    -- Comentario: Crear rol 'despachos' manualmente en el panel de Supabase
END $$;

-- PASO 9: POLÍTICAS DE SEGURIDAD PARA SALE_REFERENCES
ALTER TABLE sale_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sale_references of their company" ON sale_references
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sale_references for their company" ON sale_references
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update sale_references of their company" ON sale_references
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- COMENTARIOS FINALES:
-- 1. Este script agrega el sistema de consecutivos y referencias
-- 2. Las referencias se generan automáticamente por cliente
-- 3. Se mantiene el historial y estado de cada referencia
-- 4. Se actualizan automáticamente los totales por referencia
-- 5. El rol 'despachos' debe crearse manualmente en Supabase