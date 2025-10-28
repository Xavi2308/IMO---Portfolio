-- Índices optimizados para mejorar el rendimiento de queries en Sales.jsx

-- Índice compuesto para la query principal de sales ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_sales_created_at_status ON sales(created_at DESC, status);

-- Índice para búsquedas por customer_id
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);

-- Índice para búsquedas por created_by
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);

-- Índice para búsquedas por approved_by
CREATE INDEX IF NOT EXISTS idx_sales_approved_by ON sales(approved_by);

-- Índice compuesto para filtros múltiples
CREATE INDEX IF NOT EXISTS idx_sales_status_created_at ON sales(status, created_at DESC);

-- Índices para las tablas relacionadas que se consultan frecuentemente
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Índice para sale_items (usado en approve/reject operations)
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_reference ON sale_items(reference);

-- Índice para variations (usado en restore_stock_on_reject_by_reference)
CREATE INDEX IF NOT EXISTS idx_variations_product_color_size ON variations(product_id, color, size);

-- Índice para products (usado en restore_stock_on_reject_by_reference)
CREATE INDEX IF NOT EXISTS idx_products_reference ON products(reference);

-- Índice para inventory_movements (usado en batch inserts)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_user_timestamp ON inventory_movements(user_id, timestamp DESC);

-- Índice para notifications (usado en background operations)  
-- Nota: La tabla notifications no existe aún, comentado hasta su creación
-- CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Estadísticas para el optimizador de consultas
ANALYZE sales;
ANALYZE customers;
ANALYZE users;
ANALYZE sale_items;
ANALYZE variations;
ANALYZE inventory_movements;
ANALYZE notifications;