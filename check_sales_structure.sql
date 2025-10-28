-- 🔍 VERIFICAR ESTRUCTURA DE LA TABLA SALES
-- Para asegurar que usamos las columnas correctas

-- Ver todas las columnas de la tabla sales
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver algunas filas de ejemplo para entender la estructura
SELECT * FROM sales LIMIT 3;

-- Ver estructura de sale_items también
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sale_items' AND table_schema = 'public'
ORDER BY ordinal_position;
