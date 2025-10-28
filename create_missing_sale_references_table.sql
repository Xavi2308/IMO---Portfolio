-- CREAR LA TABLA sale_references QUE FALTA
-- Tu aplicación React la está esperando

CREATE TABLE IF NOT EXISTS sale_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  client_reference VARCHAR(50),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  total_pairs INTEGER DEFAULT 0,
  total_value DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending_dispatch', 'dispatched', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dispatched_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_sale_references_customer ON sale_references(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_references_company ON sale_references(company_id);
CREATE INDEX IF NOT EXISTS idx_sale_references_status ON sale_references(status);
CREATE INDEX IF NOT EXISTS idx_sale_references_sale ON sale_references(sale_id);

-- Habilitar RLS
ALTER TABLE sale_references ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Users can view sale_references of their company" ON sale_references
  FOR SELECT USING (
    company_id IN (
      SELECT DISTINCT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sale_references for their company" ON sale_references
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT DISTINCT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update sale_references of their company" ON sale_references
  FOR UPDATE USING (
    company_id IN (
      SELECT DISTINCT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Grants
GRANT ALL ON sale_references TO authenticated;

-- AGREGAR COLUMNA reference_code A LA TABLA SALES SI NO EXISTE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'reference_code' AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN reference_code VARCHAR(50);
        CREATE INDEX IF NOT EXISTS idx_sales_reference_code ON sales(reference_code);
    END IF;
END $$;

-- AGREGAR COLUMNA reference_status A LA TABLA SALES SI NO EXISTE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'reference_status' AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN reference_status VARCHAR(20) DEFAULT 'active';
    END IF;
END $$;

SELECT 'TABLA sale_references Y COLUMNAS FALTANTES CREADAS CORRECTAMENTE' as status;