/**
 * @file fix-company-ids-simple.js
 * @description Script simplificado para migrar company_id a datos existentes
 */

const { createClient } = require('@supabase/supabase-js');

// Usar las URLs directamente (reemplazar con las reales)
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzI2ODczMiwiZXhwIjoyMDMyODQ0NzMyLCJtYXhfYWdlIjozMTUzNjAwMH0.8DDaHGO1Z1UzZR4Vl9i0KP7tMqNDdNNXLkGu7Gm5xKY'; // Solo para testing

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateCompanyIds() {
  try {
    console.log('🔄 Iniciando migración de company_id...');

    // 1. Obtener todas las empresas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, created_at')
      .order('created_at', { ascending: true });

    if (companiesError) {
      throw new Error(`Error obteniendo empresas: ${companiesError.message}`);
    }

    if (!companies || companies.length === 0) {
      console.log('❌ No hay empresas en la base de datos');
      return;
    }

    console.log(`📊 Empresas encontradas: ${companies.length}`);
    companies.forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.name} (${company.id})`);
    });

    // 2. Usar la primera empresa como destino para datos sin company_id
    const targetCompany = companies[0];
    console.log(`🎯 Empresa objetivo: ${targetCompany.name} (${targetCompany.id})`);

    // 3. Migrar productos
    console.log('🔄 Migrando productos...');
    const { error: productsError } = await supabase
      .from('products')
      .update({ company_id: targetCompany.id })
      .is('company_id', null);

    if (productsError) {
      console.error(`❌ Error migrando productos: ${productsError.message}`);
    } else {
      console.log('✅ Productos migrados exitosamente');
    }

    // 4. Migrar variaciones
    console.log('🔄 Migrando variaciones...');
    const { error: variationsError } = await supabase
      .from('variations')
      .update({ company_id: targetCompany.id })
      .is('company_id', null);

    if (variationsError) {
      console.error(`❌ Error migrando variaciones: ${variationsError.message}`);
    } else {
      console.log('✅ Variaciones migradas exitosamente');
    }

    // 5. Verificar resultados
    console.log('\n📊 VERIFICACIÓN POST-MIGRACIÓN:');
    
    const { count: productsNull } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('company_id', null);

    const { count: variationsNull } = await supabase
      .from('variations')
      .select('*', { count: 'exact', head: true })
      .is('company_id', null);

    console.log(`  Productos sin company_id: ${productsNull || 0}`);
    console.log(`  Variaciones sin company_id: ${variationsNull || 0}`);

    // 6. Mostrar productos por empresa
    console.log('\n🏢 PRODUCTOS POR EMPRESA:');
    for (const company of companies) {
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);

      const { count: variationsCount } = await supabase
        .from('variations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);

      console.log(`  📊 ${company.name}:`);
      console.log(`    - Productos: ${productsCount || 0}`);
      console.log(`    - Variaciones: ${variationsCount || 0}`);
    }

    console.log('\n🎉 Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

migrateCompanyIds()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });