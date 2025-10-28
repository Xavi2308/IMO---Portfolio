-- ========================================
-- SCRIPT: Mejoras para Sistema de Registro
-- DESCRIPCIÓN: Crear tablas y mejorar estructura para onboarding
-- FECHA: Octubre 2025
-- ========================================

-- 1. Tabla para seguimiento del proceso de onboarding
CREATE TABLE IF NOT EXISTS company_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_step VARCHAR(50) NOT NULL DEFAULT 'registration',
    steps_completed JSONB DEFAULT '[]',
    step_data JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla para historial de cambios de suscripción
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    previous_plan_id UUID REFERENCES subscription_plans(id),
    change_reason VARCHAR(100) NOT NULL, -- 'initial', 'upgrade', 'downgrade', 'trial_end', 'manual'
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla para plantillas de email
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_key VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(200) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB DEFAULT '[]', -- Lista de variables disponibles
    category VARCHAR(50) DEFAULT 'general', -- 'onboarding', 'trial', 'billing', etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla para preferencias de notificaciones
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email_welcome BOOLEAN DEFAULT TRUE,
    email_onboarding_tips BOOLEAN DEFAULT TRUE,
    email_trial_reminders BOOLEAN DEFAULT TRUE,
    email_feature_updates BOOLEAN DEFAULT TRUE,
    email_billing BOOLEAN DEFAULT TRUE,
    in_app_notifications BOOLEAN DEFAULT TRUE,
    in_app_tips BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- 5. Tabla para analytics de onboarding
CREATE TABLE IF NOT EXISTS onboarding_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    step VARCHAR(50),
    session_id UUID,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Mejorar tabla companies con campos adicionales
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_usage_stats JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS setup_wizard_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_size VARCHAR(50), -- 'small', 'medium', 'large'
ADD COLUMN IF NOT EXISTS expected_monthly_sales INTEGER,
ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100); -- Cómo nos conoció

-- 7. Mejorar tabla users con campos de onboarding
ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Bogota',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'es',
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 8. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_company_onboarding_company ON company_onboarding(company_id);
CREATE INDEX IF NOT EXISTS idx_company_onboarding_step ON company_onboarding(current_step);
CREATE INDEX IF NOT EXISTS idx_subscription_history_company ON subscription_history(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_onboarding ON companies(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_companies_trial_end ON companies(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed);

-- Índices para tabla onboarding_analytics
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_company ON onboarding_analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_event ON onboarding_analytics(event_name);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_step ON onboarding_analytics(step);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_date ON onboarding_analytics(created_at);

-- 9. Insertar plantillas de email básicas
INSERT INTO email_templates (template_key, subject, html_content, text_content, variables, category) VALUES
(
    'welcome_user',
    '¡Bienvenido a IMO! Tu cuenta ha sido creada',
    '<h1>¡Hola {{first_name}}!</h1><p>Bienvenido a IMO. Tu cuenta ha sido creada exitosamente.</p><p>Ahora puedes configurar tu empresa y comenzar a gestionar tu inventario.</p>',
    'Hola {{first_name}}! Bienvenido a IMO. Tu cuenta ha sido creada exitosamente.',
    '["first_name", "email", "company_name"]',
    'onboarding'
),
(
    'company_created',
    '🎉 ¡Tu empresa {{company_name}} está lista!',
    '<h1>¡Felicitaciones!</h1><p>Tu empresa <strong>{{company_name}}</strong> ha sido configurada exitosamente.</p><p>Tienes <strong>30 días de prueba gratuita</strong> para explorar todas las funcionalidades.</p>',
    'Felicitaciones! Tu empresa {{company_name}} ha sido configurada exitosamente. Tienes 30 días de prueba gratuita.',
    '["first_name", "company_name", "trial_end_date", "plan_name"]',
    'onboarding'
),
(
    'trial_reminder_7days',
    'Tu prueba gratuita termina en 7 días - {{company_name}}',
    '<h1>¡No te quedes sin IMO!</h1><p>Tu prueba gratuita de <strong>{{company_name}}</strong> termina el {{trial_end_date}}.</p><p>Elige tu plan para continuar:</p>',
    'Tu prueba gratuita de {{company_name}} termina el {{trial_end_date}}. Elige tu plan para continuar.',
    '["first_name", "company_name", "trial_end_date", "dashboard_url"]',
    'trial'
);

-- 10. Crear función para actualizar timestamps automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a las tablas con updated_at
CREATE TRIGGER update_company_onboarding_updated_at 
    BEFORE UPDATE ON company_onboarding 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Insertar datos iniciales de configuración
INSERT INTO notification_preferences (user_id, company_id, email_welcome, email_onboarding_tips, email_trial_reminders, email_feature_updates, email_billing, in_app_notifications, in_app_tips) 
SELECT id, company_id, true, true, true, true, true, true, true 
FROM users 
WHERE company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- ========================================
-- FIN DEL SCRIPT
-- ========================================

-- Para verificar que todo se creó correctamente:
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('company_onboarding', 'subscription_history', 'email_templates', 'notification_preferences', 'onboarding_analytics')
ORDER BY tablename;