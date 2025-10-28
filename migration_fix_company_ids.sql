-- 🛠️ MIGRACIÓN: Asignar company_id a datos existentes
-- Este script asigna company_id a productos, variaciones y otros datos que lo tengan NULL

-- 1. VERIFICAR DATOS EXISTENTES
SELECT 'EMPRESAS EXISTENTES' as tipo, id, name FROM companies;

SELECT 'USUARIOS SIN EMPRESA' as tipo, id, email, username FROM profiles WHERE company_id IS NULL;

SELECT 'PRODUCTOS SIN EMPRESA' as tipo, COUNT(*) as total FROM products WHERE company_id IS NULL;

SELECT 'VARIACIONES SIN EMPRESA' as tipo, COUNT(*) as total FROM variations WHERE company_id IS NULL;

-- 2. OBTENER LA PRIMERA EMPRESA (LA MÁS ANTIGUA)
-- Asumiendo que los datos existentes pertenecen a la primera empresa creada
WITH primera_empresa AS (
  SELECT id as company_id FROM companies ORDER BY created_at ASC LIMIT 1
)
SELECT 'EMPRESA OBJETIVO' as tipo, company_id FROM primera_empresa;

-- 3. ACTUALIZAR PRODUCTOS SIN COMPANY_ID
WITH primera_empresa AS (
  SELECT id as company_id FROM companies ORDER BY created_at ASC LIMIT 1
)
UPDATE products 
SET company_id = (SELECT company_id FROM primera_empresa)
WHERE company_id IS NULL;

-- 4. ACTUALIZAR VARIACIONES SIN COMPANY_ID
WITH primera_empresa AS (
  SELECT id as company_id FROM companies ORDER BY created_at ASC LIMIT 1
)
UPDATE variations 
SET company_id = (SELECT company_id FROM primera_empresa)
WHERE company_id IS NULL;

-- 5. ACTUALIZAR OTROS DATOS SI EXISTEN
-- Sales
UPDATE sales 
SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)
WHERE company_id IS NULL AND EXISTS (SELECT 1 FROM companies);

-- Sales items
UPDATE sales_items 
SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)
WHERE company_id IS NULL AND EXISTS (SELECT 1 FROM companies);

-- Movements
UPDATE movements 
SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)
WHERE company_id IS NULL AND EXISTS (SELECT 1 FROM companies);

-- 6. VERIFICAR RESULTADOS
SELECT 'PRODUCTOS DESPUÉS' as tipo, 
       COUNT(*) FILTER (WHERE company_id IS NOT NULL) as con_empresa,
       COUNT(*) FILTER (WHERE company_id IS NULL) as sin_empresa
FROM products;

SELECT 'VARIACIONES DESPUÉS' as tipo,
       COUNT(*) FILTER (WHERE company_id IS NOT NULL) as con_empresa,
       COUNT(*) FILTER (WHERE company_id IS NULL) as sin_empresa
FROM variations;

-- 7. MOSTRAR PRODUCTOS POR EMPRESA
SELECT c.name as empresa, COUNT(p.*) as productos 
FROM companies c
LEFT JOIN products p ON c.id = p.company_id 
GROUP BY c.id, c.name
ORDER BY c.created_at ASC;