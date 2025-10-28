/**
 * @file migrate-company-ids.js
 * @description Endpoint temporal para migrar company_id desde el servidor
 */

const express = require('express');
const { supabaseAdmin } = require('./supabaseAdmin');

const router = express.Router();

router.post('/migrate-company-ids', async (req, res) => {
  try {
    console.log('🔄 Iniciando migración de company_id...');

    // 1. Obtener todas las empresas
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name, created_at')
      .order('created_at', { ascending: true });

    if (companiesError) {
      throw new Error(`Error obteniendo empresas: ${companiesError.message}`);
    }

    if (!companies || companies.length === 0) {
      return res.json({ success: false, message: 'No hay empresas en la base de datos' });
    }

    console.log(`📊 Empresas encontradas: ${companies.length}`);
    companies.forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.name} (${company.id})`);
    });

    // 2. Usar la primera empresa como destino para datos sin company_id
    const targetCompany = companies[0];
    console.log(`🎯 Empresa objetivo: ${targetCompany.name} (${targetCompany.id})`);

    const results = [];

    // 3. Verificar datos sin company_id antes de migrar
    const tables = ['products', 'variations'];
    const beforeCounts = {};

    for (const table of tables) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
        .is('company_id', null);

      beforeCounts[table] = count || 0;
      console.log(`📋 ${table} sin company_id antes: ${beforeCounts[table]}`);
    }

    // 4. Migrar productos
    if (beforeCounts.products > 0) {
      console.log('🔄 Migrando productos...');
      const { error: productsError } = await supabaseAdmin
        .from('products')
        .update({ company_id: targetCompany.id })
        .is('company_id', null);

      if (productsError) {
        console.error(`❌ Error migrando productos: ${productsError.message}`);
        results.push({ table: 'products', success: false, error: productsError.message });
      } else {
        console.log('✅ Productos migrados exitosamente');
        results.push({ table: 'products', success: true, migrated: beforeCounts.products });
      }
    }

    // 5. Migrar variaciones
    if (beforeCounts.variations > 0) {
      console.log('🔄 Migrando variaciones...');
      const { error: variationsError } = await supabaseAdmin
        .from('variations')
        .update({ company_id: targetCompany.id })
        .is('company_id', null);

      if (variationsError) {
        console.error(`❌ Error migrando variaciones: ${variationsError.message}`);
        results.push({ table: 'variations', success: false, error: variationsError.message });
      } else {
        console.log('✅ Variaciones migradas exitosamente');
        results.push({ table: 'variations', success: true, migrated: beforeCounts.variations });
      }
    }

    // 6. Verificar resultados después
    const afterCounts = {};
    for (const table of tables) {
      const { count } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
        .is('company_id', null);

      afterCounts[table] = count || 0;
      console.log(`📋 ${table} sin company_id después: ${afterCounts[table]}`);
    }

    // 7. Obtener distribución final
    const distribution = {};
    for (const company of companies) {
      distribution[company.name] = {};
      
      for (const table of tables) {
        const { count } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);

        distribution[company.name][table] = count || 0;
      }
    }

    res.json({
      success: true,
      companies: companies.length,
      targetCompany: targetCompany.name,
      beforeCounts,
      afterCounts,
      results,
      distribution
    });

  } catch (error) {
    console.error('❌ Error en migración:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;