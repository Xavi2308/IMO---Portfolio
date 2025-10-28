// Script para revisar estructura multitenant y planes de compañías
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODAyMjU3OCwiZXhwIjoyMDYzNTk4NTc4fQ.tDy9qlbeW2RxP4YE_vb44vjZABcgkBWwhsQWhO-5U-k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function reviewMultitenantStructure() {
  console.log('🔍 === ANÁLISIS DE ESTRUCTURA MULTITENANT ===');
  
  try {
    // 1. Revisar estructura de companies
    console.log('\n📋 1. TABLA COMPANIES:');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (companiesError) {
      console.error('Error consultando companies:', companiesError);
    } else {
      console.log(`Total compañías: ${companies.length}`);
      companies.forEach(company => {
        console.log(`\n🏢 ${company.name} (${company.id})`);
        console.log(`   📅 Plan: ${company.subscription_type || 'No definido'}`);
        console.log(`   💰 Special Agreement: ${company.special_agreement || 'No'}`);
        console.log(`   🎨 Primary Color: ${company.primary_color || 'Default'}`);
        console.log(`   📊 Status: ${company.status || 'active'}`);
        console.log(`   📆 Created: ${new Date(company.created_at).toLocaleDateString()}`);
      });
    }

    // 2. Revisar planes disponibles (si existe tabla de planes)
    console.log('\n📋 2. VERIFICANDO TABLA DE PLANES:');
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });
    
    if (plansError) {
      console.log('❌ No existe tabla subscription_plans o error:', plansError.message);
      
      // Crear tabla de planes si no existe
      console.log('\n🚀 CREANDO ESTRUCTURA DE PLANES...');
      const createPlansSql = `
        CREATE TABLE IF NOT EXISTS subscription_plans (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          display_name VARCHAR(100) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          currency VARCHAR(3) DEFAULT 'COP',
          billing_period VARCHAR(20) DEFAULT 'monthly', -- monthly, annually
          features JSONB DEFAULT '[]',
          limits JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Insertar planes básicos si no existen
        INSERT INTO subscription_plans (name, display_name, description, price, features, limits) VALUES
        ('free', 'Plan Gratuito', 'Plan básico gratuito con funcionalidades limitadas', 0, 
         '["Gestión básica de inventario", "Hasta 100 productos", "1 usuario"]',
         '{"max_products": 100, "max_users": 1, "max_storage_mb": 50}'
        ),
        ('basic', 'Plan Básico', 'Plan para pequeños negocios', 50000, 
         '["Gestión completa de inventario", "Hasta 1000 productos", "Hasta 3 usuarios", "Reportes básicos"]',
         '{"max_products": 1000, "max_users": 3, "max_storage_mb": 500}'
        ),
        ('professional', 'Plan Profesional', 'Plan para empresas medianas', 120000, 
         '["Funcionalidades completas", "Productos ilimitados", "Hasta 10 usuarios", "Reportes avanzados", "Integraciones"]',
         '{"max_products": -1, "max_users": 10, "max_storage_mb": 2000}'
        ),
        ('enterprise', 'Plan Empresarial', 'Plan para grandes empresas', 250000, 
         '["Todo incluido", "Usuarios ilimitados", "Soporte prioritario", "Personalización avanzada"]',
         '{"max_products": -1, "max_users": -1, "max_storage_mb": 10000}'
        )
        ON CONFLICT (name) DO NOTHING;
      `;
      
      // No podemos ejecutar SQL directamente aquí, pero mostraremos el SQL
      console.log('📝 SQL para crear planes:');
      console.log(createPlansSql);
      
    } else {
      console.log(`✅ Planes encontrados: ${plans.length}`);
      plans.forEach(plan => {
        console.log(`\n💎 ${plan.display_name} (${plan.name})`);
        console.log(`   💰 Precio: $${plan.price} ${plan.currency}/${plan.billing_period}`);
        console.log(`   📋 Límites:`, JSON.stringify(plan.limits, null, 2));
        console.log(`   🎯 Características:`, JSON.stringify(plan.features, null, 2));
      });
    }

    // 3. Revisar relación users -> companies
    console.log('\n📋 3. RELACIÓN USERS -> COMPANIES:');
    const { data: userCompanies, error: ucError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        company_id,
        role,
        companies (
          id,
          name,
          subscription_type,
          special_agreement
        )
      `)
      .limit(10);
    
    if (ucError) {
      console.log('❌ Error consultando users-companies:', ucError.message);
    } else {
      console.log(`✅ Muestra de ${userCompanies.length} usuarios:`);
      userCompanies.forEach(user => {
        console.log(`\n👤 ${user.email}`);
        console.log(`   🏢 Empresa: ${user.companies?.name || 'Sin empresa'}`);
        console.log(`   🎭 Rol: ${user.role || 'user'}`);
        console.log(`   📋 Plan: ${user.companies?.subscription_type || 'No definido'}`);
      });
    }

    // 4. Analizar uso actual de recursos por compañía
    console.log('\n📋 4. ANÁLISIS DE USO POR COMPAÑÍA:');
    for (const company of companies) {
      console.log(`\n🔍 Analizando ${company.name}:`);
      
      // Contar productos
      const { count: productCount, error: prodError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);
      
      // Contar usuarios
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);
      
      // Contar variaciones (inventario detallado)
      const { count: variationCount, error: varError } = await supabase
        .from('variations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);
      
      console.log(`   📦 Productos: ${productCount || 'Error'}`);
      console.log(`   👥 Usuarios: ${userCount || 'Error'}`);
      console.log(`   🔢 Variaciones: ${variationCount || 'Error'}`);
      
      if (prodError) console.log(`   ❌ Error productos:`, prodError.message);
      if (userError) console.log(`   ❌ Error usuarios:`, userError.message);
      if (varError) console.log(`   ❌ Error variaciones:`, varError.message);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Función para actualizar planes de compañías
async function updateCompanyPlans() {
  console.log('\n🔄 === ACTUALIZACIÓN DE PLANES ===');
  
  try {
    // Sugerir planes basados en uso actual
    const { data: companies } = await supabase
      .from('companies')
      .select('*');
    
    for (const company of companies) {
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);
      
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);
      
      let suggestedPlan = 'free';
      if (productCount > 1000 || userCount > 3) {
        suggestedPlan = 'professional';
      } else if (productCount > 100 || userCount > 1) {
        suggestedPlan = 'basic';
      }
      
      console.log(`\n🏢 ${company.name}:`);
      console.log(`   📊 Uso actual: ${productCount} productos, ${userCount} usuarios`);
      console.log(`   💡 Plan sugerido: ${suggestedPlan}`);
      console.log(`   📋 Plan actual: ${company.subscription_type || 'no definido'}`);
      
      // Actualizar si no tiene plan definido
      if (!company.subscription_type) {
        const { error } = await supabase
          .from('companies')
          .update({ subscription_type: suggestedPlan })
          .eq('id', company.id);
        
        if (error) {
          console.log(`   ❌ Error actualizando: ${error.message}`);
        } else {
          console.log(`   ✅ Plan actualizado a: ${suggestedPlan}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error actualizando planes:', error);
  }
}

// Ejecutar análisis
reviewMultitenantStructure().then(() => {
  return updateCompanyPlans();
}).then(() => {
  console.log('\n✅ === ANÁLISIS COMPLETADO ===');
  process.exit(0);
}).catch(console.error);