-- ========================================
-- SOLUCIÓN PARA TRUNCAR TABLA SALES
-- ========================================

-- Primero, vamos a identificar las tablas que referencian a 'sales'
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE 
  tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'sales';

-- ========================================
-- OPCIÓN 1: ELIMINAR DATOS EN ORDEN CORRECTO
-- ========================================

-- 1. Primero eliminar datos de tablas que referencian a sales
-- (Ajusta según las tablas que aparezcan en la consulta anterior)

-- Ejemplo común - ajusta según tu estructura:
-- DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales);
-- DELETE FROM order_sales WHERE sale_id IN (SELECT id FROM sales);

-- 2. Luego eliminar datos de sales
DELETE FROM sales;

-- ========================================
-- OPCIÓN 2: DESACTIVAR TEMPORALMENTE FOREIGN KEYS
-- ========================================

-- ⚠️ CUIDADO: Esto desactiva TODAS las foreign keys temporalmente
-- Solo usar si estás seguro de lo que haces

-- 1. Desactivar foreign key checks
SET session_replication_role = replica;

-- 2. Truncar la tabla
TRUNCATE TABLE sales CASCADE;

-- 3. Reactivar foreign key checks
SET session_replication_role = DEFAULT;

-- ========================================
-- OPCIÓN 3: USAR CASCADE (RECOMENDADO PARA DESARROLLO)
-- ========================================

-- Esto eliminará automáticamente los registros dependientes
TRUNCATE TABLE sales CASCADE;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

-- Verificar que la tabla esté vacía
SELECT COUNT(*) as sales_count FROM sales;

-- Verificar integridad de foreign keys
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE 
  tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  );
