-- ========================================
-- CREAR TABLA PARA INTEGRACIONES WEB
-- ========================================

-- Tabla para almacenar configuraciones de integraciones web
CREATE TABLE IF NOT EXISTS web_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'wordpress', 'shopify', 'magento', etc.
  config JSONB NOT NULL DEFAULT '{}', -- Configuración específica de la plataforma
  enabled BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Evitar duplicados por empresa y plataforma (multitenant)
  UNIQUE(company_id, platform)
);

-- Índices para optimizar consultas multitenant
CREATE INDEX IF NOT EXISTS idx_web_integrations_company_id ON web_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_web_integrations_user_id ON web_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_web_integrations_platform ON web_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_web_integrations_enabled ON web_integrations(enabled) WHERE enabled = true;

-- Comentarios para documentar la tabla
COMMENT ON TABLE web_integrations IS 'Configuraciones de integraciones con plataformas web como WordPress, Shopify, etc.';
COMMENT ON COLUMN web_integrations.platform IS 'Identificador de la plataforma (wordpress, shopify, magento, etc.)';
COMMENT ON COLUMN web_integrations.config IS 'Configuración específica en JSON (URLs, API keys, etc.)';
COMMENT ON COLUMN web_integrations.status IS 'Estado de la conexión: connected, disconnected, error';
COMMENT ON COLUMN web_integrations.last_sync IS 'Última vez que se sincronizaron datos con la plataforma';

-- Políticas de seguridad RLS (Row Level Security) - Multitenant
ALTER TABLE web_integrations ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver integraciones de su empresa
CREATE POLICY "Users can view company integrations" 
  ON web_integrations FOR SELECT 
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Solo admin puede insertar nuevas integraciones para su empresa
CREATE POLICY "Admin can insert company integrations" 
  ON web_integrations FOR INSERT 
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) AND auth.uid() = user_id
  );

-- Solo admin puede actualizar integraciones de su empresa
CREATE POLICY "Admin can update company integrations" 
  ON web_integrations FOR UPDATE 
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Solo admin puede eliminar integraciones de su empresa
CREATE POLICY "Admin can delete company integrations" 
  ON web_integrations FOR DELETE 
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_web_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para ejecutar la función automáticamente
CREATE TRIGGER update_web_integrations_updated_at
  BEFORE UPDATE ON web_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_web_integrations_updated_at();

-- Insertar ejemplos de configuración (opcional - para desarrollo)
-- INSERT INTO web_integrations (user_id, platform, config, enabled) VALUES
-- (auth.uid(), 'wordpress', '{"url": "https://ejemplo.com", "consumerKey": "", "consumerSecret": ""}', false),
-- (auth.uid(), 'shopify', '{"shopName": "mi-tienda", "apiKey": "", "accessToken": ""}', false);

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Verificar que la tabla se creó correctamente
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'web_integrations' 
ORDER BY ordinal_position;

-- Verificar las políticas RLS
SELECT schemaname, tablename, policyname, qual 
FROM pg_policies 
WHERE tablename = 'web_integrations';
