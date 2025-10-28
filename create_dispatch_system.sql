-- Script para crear las tablas del sistema de despachos y órdenes
-- Ejecutar este script en Supabase SQL Editor

-- 1. Tabla para órdenes de clientes (consolidación de ventas apartadas)
CREATE TABLE IF NOT EXISTS customer_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ready_for_dispatch', 'dispatched', 'pending')),
  total_pairs INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dispatched_at TIMESTAMP WITH TIME ZONE,
  dispatched_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- 2. Tabla para items de órdenes (referencias individuales)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES customer_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  reference VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL,
  size VARCHAR(10) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  is_checked BOOLEAN DEFAULT FALSE, -- Para que el auxiliar logístico marque como apartado
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMP WITH TIME ZONE,
  sale_id UUID REFERENCES sales(id), -- Referencia a la venta original
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Modificar tabla sales para incluir el tipo de despacho
ALTER TABLE sales ADD COLUMN IF NOT EXISTS dispatch_type VARCHAR(20) DEFAULT 'separate' CHECK (dispatch_type IN ('separate', 'dispatch'));
ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES customer_orders(id);

-- 4. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_id ON customer_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_company_id ON customer_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON customer_orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_dispatch_type ON sales(dispatch_type);
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id);

-- 5. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Aplicar trigger a customer_orders
CREATE TRIGGER update_customer_orders_updated_at 
    BEFORE UPDATE ON customer_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Crear función para manejar la lógica de órdenes automáticamente
CREATE OR REPLACE FUNCTION handle_order_logic()
RETURNS TRIGGER AS $$
DECLARE
  existing_order_id UUID;
  new_order_id UUID;
  item_count INTEGER;
BEGIN
  -- Solo procesar si es una venta con dispatch_type 'separate' o 'dispatch'
  IF NEW.dispatch_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar una orden activa existente para este cliente
  SELECT id INTO existing_order_id 
  FROM customer_orders 
  WHERE customer_id = NEW.customer_id 
    AND company_id = NEW.company_id 
    AND status = 'active' 
  LIMIT 1;

  -- Si no existe una orden activa, crear una nueva
  IF existing_order_id IS NULL THEN
    INSERT INTO customer_orders (customer_id, company_id, status)
    VALUES (NEW.customer_id, NEW.company_id, 'active')
    RETURNING id INTO new_order_id;
    existing_order_id := new_order_id;
  END IF;

  -- Actualizar la venta con el order_id
  NEW.order_id := existing_order_id;

  -- Si es dispatch, marcar la orden como lista para despacho
  IF NEW.dispatch_type = 'dispatch' THEN
    UPDATE customer_orders 
    SET status = 'ready_for_dispatch', updated_at = NOW()
    WHERE id = existing_order_id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Aplicar trigger a sales
CREATE TRIGGER handle_order_logic_trigger
    BEFORE INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION handle_order_logic();

-- 9. Crear función para crear order_items automáticamente
CREATE OR REPLACE FUNCTION create_order_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si la venta tiene order_id
  IF NEW.order_id IS NOT NULL THEN
    -- Insertar items basados en los items de la venta
    INSERT INTO order_items (
      order_id, 
      product_id, 
      reference, 
      color, 
      size, 
      quantity, 
      unit_price, 
      subtotal, 
      sale_id
    )
    SELECT 
      NEW.order_id,
      si.product_id,
      si.reference,
      si.color,
      si.size,
      si.quantity,
      si.unit_price,
      si.subtotal,
      NEW.id
    FROM sale_items si
    WHERE si.sale_id = NEW.id;

    -- Actualizar totales de la orden
    UPDATE customer_orders 
    SET 
      total_pairs = (
        SELECT COALESCE(SUM(oi.quantity), 0) 
        FROM order_items oi 
        WHERE oi.order_id = NEW.order_id
      ),
      total_amount = (
        SELECT COALESCE(SUM(oi.subtotal), 0) 
        FROM order_items oi 
        WHERE oi.order_id = NEW.order_id
      ),
      updated_at = NOW()
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Aplicar trigger AFTER INSERT a sales para crear order_items
CREATE TRIGGER create_order_items_trigger
    AFTER INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION create_order_items();

-- 11. Crear políticas RLS para las nuevas tablas
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Política para customer_orders: solo usuarios de la misma empresa
CREATE POLICY "Users can view customer_orders from their company" ON customer_orders
  FOR ALL USING (company_id = (
    SELECT company_id FROM auth.users WHERE id = auth.uid()
  ));

-- Política para order_items: solo usuarios de la misma empresa a través de la orden
CREATE POLICY "Users can view order_items from their company" ON order_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM customer_orders co 
    WHERE co.id = order_items.order_id 
    AND co.company_id = (
      SELECT company_id FROM auth.users WHERE id = auth.uid()
    )
  ));

-- 12. Grants necesarios
GRANT ALL ON customer_orders TO authenticated;
GRANT ALL ON order_items TO authenticated;