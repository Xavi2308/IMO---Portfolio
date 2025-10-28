-- ========================================
-- TABLA PARA LOGS DE SINCRONIZACIÓN
-- ========================================

-- Crear tabla sync_logs para rastrear sincronizaciones
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'woocommerce', 'shopify', etc.
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    products_processed INTEGER DEFAULT 0,
    products_updated INTEGER DEFAULT 0,
    products_created INTEGER DEFAULT 0,
    products_deleted INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'success', 'error', 'partial_success'
    sync_direction VARCHAR(20) DEFAULT 'imo_to_platform', -- 'imo_to_platform', 'platform_to_imo', 'bidirectional'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS sync_logs_company_id_idx ON sync_logs(company_id);
CREATE INDEX IF NOT EXISTS sync_logs_platform_idx ON sync_logs(platform);
CREATE INDEX IF NOT EXISTS sync_logs_status_idx ON sync_logs(status);
CREATE INDEX IF NOT EXISTS sync_logs_started_at_idx ON sync_logs(started_at);

-- Políticas RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Política para ver logs de tu empresa
CREATE POLICY "sync_logs_select_policy" ON sync_logs FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Política para insertar logs (solo el sistema)
CREATE POLICY "sync_logs_insert_policy" ON sync_logs FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Agregar configuraciones de sincronización a la tabla companies
DO $$ 
BEGIN
    -- Verificar si ya existe la columna sync_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='sync_settings') THEN
        ALTER TABLE companies ADD COLUMN sync_settings JSONB DEFAULT '{
            "woocommerce_mapping_method": "sku",
            "woocommerce_sync_interval": 15,
            "woocommerce_sync_direction": "both",
            "woocommerce_sync_all": true,
            "woocommerce_auto_create": true,
            "woocommerce_sync_prices": true,
            "woocommerce_price_multiplier": 1,
            "woocommerce_stock_threshold": 0
        }'::jsonb;
        
        RAISE NOTICE '✅ Agregada columna sync_settings a companies';
    ELSE
        RAISE NOTICE 'ℹ️ Columna sync_settings ya existe en companies';
    END IF;
END $$;

-- Ver ejemplo de configuración
SELECT 'CONFIGURACIÓN DE SINCRONIZACIÓN POR DEFECTO' as info;
SELECT 
    c.id,
    c.name,
    c.sync_settings,
    CASE 
        WHEN c.sync_settings IS NOT NULL THEN '✅ Configurado'
        ELSE '⚠️ Sin configurar'
    END as status
FROM companies c
ORDER BY c.name;

-- Mensaje final
SELECT '🎉 TABLA SYNC_LOGS CREADA Y CONFIGURADA' as resultado;
