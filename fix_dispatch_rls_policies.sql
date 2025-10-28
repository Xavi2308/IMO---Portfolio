-- Script para configurar políticas RLS completas para el sistema de despachos
-- Ejecutar este script en Supabase SQL Editor

-- 1. Verificar qué políticas existen actualmente para customer_orders
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('customer_orders', 'order_items');

-- 2. Eliminar políticas problemáticas existentes y crear nuevas
DROP POLICY IF EXISTS "Users can view customer_orders from their company" ON customer_orders;
DROP POLICY IF EXISTS "Users can view order_items from their company" ON order_items;

-- 3. Crear política simple para customer_orders
CREATE POLICY "Enable access to customer_orders for authenticated users" ON customer_orders
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 4. Crear política simple para order_items  
CREATE POLICY "Enable access to order_items for authenticated users" ON order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM customer_orders 
      WHERE company_id IN (
        SELECT DISTINCT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- 5. Verificar que las políticas se crearon
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('customer_orders', 'order_items');

-- 6. Probar acceso a customer_orders
SELECT id, customer_id, status, total_pairs, total_amount, created_at
FROM customer_orders
LIMIT 3;

-- 7. Probar acceso a order_items
SELECT id, order_id, reference, color, size, quantity
FROM order_items  
LIMIT 3;