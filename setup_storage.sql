-- ========================================
-- CONFIGURACIÓN DE STORAGE PARA COMPROBANTES
-- ========================================

-- Crear bucket para comprobantes de pago si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para el bucket de comprobantes
-- Permitir que usuarios autenticados vean comprobantes de su empresa
CREATE POLICY "Users can view company receipts" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'payment-receipts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text 
    FROM companies c 
    JOIN users u ON u.company_id = c.id 
    WHERE u.id = auth.uid()
  )
);

-- Permitir que usuarios autenticados suban comprobantes a su empresa
CREATE POLICY "Users can upload company receipts" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'payment-receipts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text 
    FROM companies c 
    JOIN users u ON u.company_id = c.id 
    WHERE u.id = auth.uid()
  )
);

-- Permitir que administradores eliminen comprobantes
CREATE POLICY "Admins can delete company receipts" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'payment-receipts' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 
    FROM users u 
    JOIN companies c ON u.company_id = c.id
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
    AND c.id::text = (storage.foldername(name))[1]
  )
);
