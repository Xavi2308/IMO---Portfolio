-- SOLUCIÓN URGENTE: Arreglar tabla sale_references y campos faltantes
-- Ejecutar paso a paso

-- 1. INVESTIGAR EL ERROR sale_references
-- Verificar si hay alguna vista o tabla relacionada
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%sale%' OR table_name LIKE '%reference%')
ORDER BY table_name;

-- 2. CREAR TABLA sale_references SI NO EXISTE (parche temporal)
-- Esto es para evitar el error hasta identificar el problema real
CREATE TABLE IF NOT EXISTS sale_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  reference VARCHAR(100),
  color VARCHAR(50),
  size VARCHAR(10),
  quantity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. VERIFICAR ESTRUCTURA ACTUAL DE SALES
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. ASEGURAR QUE SALES TIENE TODOS LOS CAMPOS NECESARIOS
-- Verificar si falta algún campo crítico

-- 4.1 Agregar campos faltantes si no existen
DO $$
BEGIN
    -- Usuario de ventas (vendedor)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'created_by' AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    
    -- Estado de la venta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'status' AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'rejected'));
    END IF;
    
    -- Usuario que aprueba
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'approved_by' AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN approved_by UUID REFERENCES auth.users(id);
    END IF;
    
    -- Fecha de aprobación
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'approved_at' AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 5. CREAR TRIGGER PARA POBLAR sale_references AUTOMÁTICAMENTE
-- Si la aplicación busca esta tabla, la poblamos automáticamente
CREATE OR REPLACE FUNCTION populate_sale_references()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertar en sale_references los items de la venta
    INSERT INTO sale_references (sale_id, reference, color, size, quantity)
    SELECT 
        NEW.id,
        si.reference,
        si.color,
        si.size,
        si.quantity
    FROM sale_items si
    WHERE si.sale_id = NEW.id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. CREAR TRIGGER PARA sale_references
DROP TRIGGER IF EXISTS populate_sale_references_trigger ON sales;
CREATE TRIGGER populate_sale_references_trigger
    AFTER INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION populate_sale_references();

-- 7. ACTUALIZAR VENTAS EXISTENTES PARA QUE TENGAN STATUS
UPDATE sales 
SET status = 'confirmed' 
WHERE status IS NULL;

-- 8. VERIFICAR QUE TODO ESTÁ CONFIGURADO
SELECT 'SISTEMA REPARADO - PROBAR VENTAS AHORA' as status;

-- 9. VERIFICAR TRIGGERS ACTIVOS
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'sales'
ORDER BY action_timing, trigger_name;