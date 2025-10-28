-- SCRIPT SEGURO PARA MANEJAR DUPLICADOS Y CREAR CONSTRAINT UNIQUE
-- Este script maneja casos donde ya existen datos duplicados

-- Paso 1: Verificar si hay duplicados en client_reference
DO $check_duplicates$
DECLARE
    rec RECORD;
BEGIN
    -- Mostrar duplicados si existen
    IF EXISTS (
        SELECT client_reference 
        FROM sale_references 
        GROUP BY client_reference 
        HAVING COUNT(*) > 1
    ) THEN
        RAISE NOTICE 'ENCONTRADOS DUPLICADOS EN client_reference:';
        
        -- Mostrar los duplicados
        FOR rec IN 
            SELECT client_reference, COUNT(*) as count 
            FROM sale_references 
            GROUP BY client_reference 
            HAVING COUNT(*) > 1
        LOOP
            RAISE NOTICE 'client_reference: %, count: %', rec.client_reference, rec.count;
        END LOOP;
        
        -- Eliminar duplicados manteniendo solo el más reciente
        DELETE FROM sale_references 
        WHERE id NOT IN (
            SELECT DISTINCT ON (client_reference) id
            FROM sale_references 
            ORDER BY client_reference, created_at DESC
        );
        
        RAISE NOTICE 'DUPLICADOS ELIMINADOS - Solo se mantuvieron los registros más recientes';
    ELSE
        RAISE NOTICE 'No se encontraron duplicados en client_reference';
    END IF;
END $check_duplicates$;

-- Paso 2: Ahora crear la constraint UNIQUE de forma segura
ALTER TABLE sale_references DROP CONSTRAINT IF EXISTS sale_references_client_reference_key;
ALTER TABLE sale_references ADD CONSTRAINT sale_references_client_reference_key UNIQUE (client_reference);

-- Paso 3: Crear la foreign key
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_reference_code_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_reference_code_fkey 
    FOREIGN KEY (reference_code) REFERENCES sale_references(client_reference) ON DELETE SET NULL;

-- Verificación
SELECT 'CONSTRAINT UNIQUE Y FOREIGN KEY CREADAS EXITOSAMENTE' as result;