// Script para crear tablas de planes y configurar multitenant
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODAyMjU3OCwiZXhwIjoyMDYzNTk4NTc4fQ.tDy9qlbeW2RxP4YE_vb44vjZABcgkBWwhsQWhO-5U-k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupMultitenantStructure() {
  console.log('🚀 === CONFIGURANDO ESTRUCTURA MULTITENANT ===');
  
  try {
    // 1. Crear tabla de planes de suscripción
    console.log('\n📋 1. CREANDO TABLA SUBSCRIPTION_PLANS...');
    
    const createPlansTable = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS subscription_plans (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          display_name VARCHAR(100) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          currency VARCHAR(3) DEFAULT 'COP',
          billing_period VARCHAR(20) DEFAULT 'monthly',
          features JSONB DEFAULT '[]',
          limits JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (createPlansTable.error) {
      console.log('❌ Error creando tabla:', createPlansTable.error.message);
      // Intentar con query directa
      const { error: directError } = await supabase
        .from('subscription_plans')
        .select('id')
        .limit(1);
      
      if (directError && directError.message.includes('does not exist')) {
        console.log('⚠️ Tabla no existe, necesitas ejecutar el SQL manualmente en Supabase Dashboard');
        console.log('\n📝 SQL PARA EJECUTAR EN SUPABASE:');
        console.log(`
-- 1. Crear tabla de planes
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'COP',
  billing_period VARCHAR(20) DEFAULT 'monthly',
  features JSONB DEFAULT '[]',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insertar planes básicos
INSERT INTO subscription_plans (name, display_name, description, price, features, limits) VALUES
('free', 'Plan Gratuito', 'Plan básico gratuito con funcionalidades limitadas', 0, 
 '["Gestión básica de inventario", "Hasta 100 productos", "1 usuario"]'::jsonb,
 '{"max_products": 100, "max_users": 1, "max_storage_mb": 50}'::jsonb
),
('basic', 'Plan Básico', 'Plan para pequeños negocios', 50000, 
 '["Gestión completa de inventario", "Hasta 1000 productos", "Hasta 3 usuarios", "Reportes básicos"]'::jsonb,
 '{"max_products": 1000, "max_users": 3, "max_storage_mb": 500}'::jsonb
),
('professional', 'Plan Profesional', 'Plan para empresas medianas', 120000, 
 '["Funcionalidades completas", "Productos ilimitados", "Hasta 10 usuarios", "Reportes avanzados", "Integraciones"]'::jsonb,
 '{"max_products": -1, "max_users": 10, "max_storage_mb": 2000}'::jsonb
),
('premium', 'Plan Premium', 'Plan actual de Demo Company', 200000, 
 '["Funcionalidades completas", "Productos ilimitados", "Usuarios ilimitados", "Reportes avanzados", "Integraciones", "Soporte prioritario"]'::jsonb,
 '{"max_products": -1, "max_users": -1, "max_storage_mb": 5000}'::jsonb
),
('enterprise', 'Plan Empresarial', 'Plan para grandes empresas', 350000, 
 '["Todo incluido", "Usuarios ilimitados", "Soporte 24/7", "Personalización avanzada", "Dedicated support"]'::jsonb,
 '{"max_products": -1, "max_users": -1, "max_storage_mb": 20000}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- 3. Habilitar RLS en la tabla
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- 4. Política para lectura pública de planes
CREATE POLICY "Plans are publicly readable" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- 5. Política para admins modificar planes
CREATE POLICY "Only admins can modify plans" ON subscription_plans
  FOR ALL USING (
    auth.role() = 'service_role' OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 6. Agregar columna plan_id a companies si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'plan_id') THEN
        ALTER TABLE companies ADD COLUMN plan_id UUID REFERENCES subscription_plans(id);
    END IF;
END $$;

-- 7. Crear función para obtener límites de plan
CREATE OR REPLACE FUNCTION get_company_limits(company_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  limits JSONB;
BEGIN
  SELECT sp.limits INTO limits
  FROM companies c
  LEFT JOIN subscription_plans sp ON c.plan_id = sp.id
  WHERE c.id = company_uuid;
  
  -- Si no hay plan asignado, devolver límites del plan gratuito
  IF limits IS NULL THEN
    SELECT sp.limits INTO limits
    FROM subscription_plans sp
    WHERE sp.name = 'free';
  END IF;
  
  RETURN COALESCE(limits, '{}'::jsonb);
END;
$$;

-- 8. Crear función para validar límites
CREATE OR REPLACE FUNCTION validate_company_limits(
  company_uuid UUID,
  resource_type TEXT,
  current_count INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  limits JSONB;
  max_allowed INTEGER;
BEGIN
  -- Obtener límites de la compañía
  SELECT get_company_limits(company_uuid) INTO limits;
  
  -- Extraer el límite específico del recurso
  max_allowed := (limits ->> ('max_' || resource_type))::INTEGER;
  
  -- -1 significa ilimitado
  IF max_allowed = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si está dentro del límite
  RETURN current_count < max_allowed;
END;
$$;
        `);
      }
    } else {
      console.log('✅ Tabla subscription_plans configurada');
    }

    // 2. Verificar y configurar plan de Demo Company
    console.log('\n📋 2. CONFIGURANDO PLAN DE MAJO VALERO...');
    
    // Buscar si ya existe el plan premium
    const { data: existingPlans } = await supabase
      .from('subscription_plans')
      .select('id, name')
      .eq('name', 'premium');
    
    if (!existingPlans || existingPlans.length === 0) {
      console.log('⚠️ Necesitas ejecutar el SQL en Supabase Dashboard primero');
    } else {
      console.log('✅ Plan premium encontrado:', existingPlans[0].id);
      
      // Actualizar compañía para usar el plan correcto
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, subscription_type, plan_id')
        .eq('name', 'Demo Company')
        .single();
      
      if (company) {
        console.log(`📊 Compañía actual:`, {
          name: company.name,
          subscription_type: company.subscription_type,
          plan_id: company.plan_id
        });
        
        if (!company.plan_id) {
          const { error: updateError } = await supabase
            .from('companies')
            .update({ plan_id: existingPlans[0].id })
            .eq('id', company.id);
          
          if (updateError) {
            console.log('❌ Error actualizando plan_id:', updateError.message);
          } else {
            console.log('✅ Plan_id actualizado para Demo Company');
          }
        }
      }
    }

    // 3. Configurar políticas de Row Level Security
    console.log('\n📋 3. CONFIGURANDO RLS MULTITENANT...');
    
    const rlsPolicies = [
      {
        table: 'products',
        policy: 'Products are isolated by company',
        sql: `
          DROP POLICY IF EXISTS "Products are isolated by company" ON products;
          CREATE POLICY "Products are isolated by company" ON products
            FOR ALL USING (
              company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
              )
            );
        `
      },
      {
        table: 'variations',
        policy: 'Variations are isolated by company', 
        sql: `
          DROP POLICY IF EXISTS "Variations are isolated by company" ON variations;
          CREATE POLICY "Variations are isolated by company" ON variations
            FOR ALL USING (
              company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
              ) OR
              EXISTS (
                SELECT 1 FROM products p 
                WHERE p.id = variations.product_id 
                AND p.company_id IN (
                  SELECT company_id FROM users WHERE id = auth.uid()
                )
              )
            );
        `
      },
      {
        table: 'sales',
        policy: 'Sales are isolated by company',
        sql: `
          DROP POLICY IF EXISTS "Sales are isolated by company" ON sales;
          CREATE POLICY "Sales are isolated by company" ON sales
            FOR ALL USING (
              company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
              )
            );
        `
      }
    ];

    console.log('📝 POLÍTICAS RLS PARA EJECUTAR:');
    rlsPolicies.forEach(policy => {
      console.log(`\n-- ${policy.policy}`);
      console.log(policy.sql);
    });

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar configuración
setupMultitenantStructure().then(() => {
  console.log('\n✅ === CONFIGURACIÓN MULTITENANT COMPLETADA ===');
  console.log('\n📋 PRÓXIMOS PASOS:');
  console.log('1. Ejecutar el SQL mostrado arriba en Supabase Dashboard');
  console.log('2. Verificar que las políticas RLS estén activas');
  console.log('3. Probar la aplicación para confirmar aislamiento de datos');
  process.exit(0);
}).catch(console.error);