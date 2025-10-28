-- Database Optimization: Índices para mejorar performance de queries en Supabase
-- Ejecutar estos comandos en Supabase Dashboard > SQL Editor

-- 1. TABLA PRODUCTS - Índices para búsquedas frecuentes
-- Índice compuesto para búsquedas por referencia
CREATE INDEX IF NOT EXISTS idx_products_reference ON products (reference);

-- Índice para filtros por línea
CREATE INDEX IF NOT EXISTS idx_products_line ON products (line);

-- Índice compuesto para ordering por fecha de creación
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);

-- Índice para búsquedas texto en referencia (para LIKE queries)
CREATE INDEX IF NOT EXISTS idx_products_reference_text ON products USING gin (reference gin_trgm_ops);

-- 2. TABLA VARIATIONS - Índices para inventario y stock
-- Índice compuesto para búsquedas por color y talla
CREATE INDEX IF NOT EXISTS idx_variations_color_size ON variations (color, size);

-- Índice para filtros por stock (productos con stock > 0)
CREATE INDEX IF NOT EXISTS idx_variations_stock ON variations (stock) WHERE stock > 0;

-- Índice para códigos de barras (unique queries)
CREATE INDEX IF NOT EXISTS idx_variations_barcode ON variations (barcode_code);

-- Índice compuesto para producto + color (agrupaciones frecuentes)
CREATE INDEX IF NOT EXISTS idx_variations_product_color ON variations (product_id, color);

-- Índice para fechas de creación en variations
CREATE INDEX IF NOT EXISTS idx_variations_created_at ON variations (created_at DESC);

-- 3. TABLA ORDERS - Índices para órdenes y ventas
-- Índice por estado de orden (filtering frecuente)
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

-- Índice por fecha de orden (reporting por fechas)
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders (order_date DESC);

-- Índice por cliente (historial de órdenes)
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);

-- Índice compuesto para reportes por fecha y estado
CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders (order_date DESC, status);

-- 4. TABLA CUSTOMERS - Índices para clientes
-- Índice para búsquedas por nombre/email
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);

-- Índice para filtros por ciudad/región
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers (city);

-- 5. TABLA MOVEMENTS - Índices para movimientos de inventario
-- Índice por fecha de movimiento (reportes frecuentes)
CREATE INDEX IF NOT EXISTS idx_movements_date ON movements (movement_date DESC);

-- Índice por tipo de movimiento
CREATE INDEX IF NOT EXISTS idx_movements_type ON movements (movement_type);

-- Índice compuesto para producto + fecha
CREATE INDEX IF NOT EXISTS idx_movements_product_date ON movements (product_id, movement_date DESC);

-- 6. TABLA SALES - Índices para ventas
-- Índice por fecha de venta (reportes de ventas)
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (sale_date DESC);

-- Índice por vendedor (performance por usuario)
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales (user_id);

-- Índice compuesto para reportes por fecha y vendedor
CREATE INDEX IF NOT EXISTS idx_sales_date_user ON sales (sale_date DESC, user_id);

-- 7. EXTENSIÓN para búsquedas de texto (si no está habilitada)
-- Esta extensión mejora las búsquedas con LIKE y similares
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 8. ÍNDICES PARCIALES para optimizaciones específicas
-- Solo productos activos (si hay un campo de estado)
-- CREATE INDEX IF NOT EXISTS idx_products_active ON products (id) WHERE status = 'active';

-- Solo variaciones con stock para búsquedas de disponibilidad
CREATE INDEX IF NOT EXISTS idx_variations_available ON variations (product_id, color, size) WHERE stock > 0;

-- 9. ESTADÍSTICAS para el optimizador de consultas
-- Actualizar estadísticas para que PostgreSQL optimice mejor las queries
ANALYZE products;
ANALYZE variations;
ANALYZE orders;
ANALYZE customers;
ANALYZE movements;
ANALYZE sales;

-- 10. COMENTARIOS para documentación
COMMENT ON INDEX idx_products_reference IS 'Optimiza búsquedas por referencia de producto';
COMMENT ON INDEX idx_variations_stock IS 'Optimiza filtros por productos con stock disponible';
COMMENT ON INDEX idx_orders_date_status IS 'Optimiza reportes de órdenes por fecha y estado';
COMMENT ON INDEX idx_customers_name IS 'Optimiza búsquedas por nombre de cliente (texto completo)';
COMMENT ON INDEX idx_movements_date IS 'Optimiza reportes de movimientos por fecha';

-- NOTA: Ejecutar estos comandos uno por uno en Supabase SQL Editor
-- Monitorear el performance antes y después con:
-- EXPLAIN ANALYZE SELECT ... para ver el plan de ejecución
