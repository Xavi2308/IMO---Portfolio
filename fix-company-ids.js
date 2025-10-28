/**
 * @file fix-company-ids.js
 * @description Script para migrar company_id a datos existentes que lo tienen NULL
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_SERVICE_KEY
);

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

    // 3. Verificar datos sin company_id
    const queries = [
      { table: 'products', name: 'Productos' },
      { table: 'variations', name: 'Variaciones' },
      { table: 'sales', name: 'Ventas' },
      { table: 'sales_items', name: 'Items de venta' },
      { table: 'movements', name: 'Movimientos' }
    ];

    const stats = {};
    
    for (const query of queries) {
      const { count, error } = await supabase
        .from(query.table)
        .select('*', { count: 'exact', head: true })
        .is('company_id', null);

      if (error) {
        console.warn(`⚠️ Error contando ${query.name}: ${error.message}`);
        stats[query.table] = 0;
      } else {
        stats[query.table] = count || 0;
        console.log(`📋 ${query.name} sin company_id: ${stats[query.table]}`);
      }
    }

    // 4. Migrar datos
    let totalMigrated = 0;

    for (const query of queries) {
      if (stats[query.table] > 0) {
        console.log(`🔄 Migrando ${stats[query.table]} registros de ${query.name}...`);
        
        const { error: updateError } = await supabase
          .from(query.table)
          .update({ company_id: targetCompany.id })
          .is('company_id', null);

        if (updateError) {
          console.error(`❌ Error migrando ${query.name}: ${updateError.message}`);
        } else {
          console.log(`✅ ${query.name} migrados exitosamente`);
          totalMigrated += stats[query.table];
        }
      }
    }

    console.log(`🎉 Migración completada: ${totalMigrated} registros actualizados`);

    // 5. Verificar resultados
    console.log('\n📊 VERIFICACIÓN POST-MIGRACIÓN:');
    for (const query of queries) {
      const { count, error } = await supabase
        .from(query.table)
        .select('*', { count: 'exact', head: true })
        .is('company_id', null);

      if (!error) {
        console.log(`  ${query.name} sin company_id: ${count || 0}`);
      }
    }

    // 6. Mostrar distribución por empresa
    console.log('\n🏢 DISTRIBUCIÓN POR EMPRESA:');
    for (const company of companies) {
      console.log(`\n  📊 ${company.name}:`);
      
      for (const query of queries) {
        const { count, error } = await supabase
          .from(query.table)
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);

        if (!error && count > 0) {
          console.log(`    - ${query.name}: ${count}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  migrateCompanyIds()
    .then(() => {
      console.log('\n✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrateCompanyIds };