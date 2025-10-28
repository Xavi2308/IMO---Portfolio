// Script para verificar los datos directamente desde la aplicación
// Ejecutar esto en la consola del navegador

console.log('🔍 Verificando datos de ventas...');

// Esto se ejecutará en el contexto de la aplicación donde ya hay un cliente de Supabase
(async function checkConsecutiveData() {
  try {
    // Verificar estructura de la tabla
    const { data: tableInfo, error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'sales' 
          AND table_schema = 'public'
          AND column_name IN ('consecutive_number', 'id', 'sale_type', 'order_id')
        ORDER BY ordinal_position;
      `
    });
    
    if (tableError) {
      console.log('❌ Error verificando estructura:', tableError);
    } else {
      console.log('📋 Estructura de campos relevantes:', tableInfo);
    }

    // Verificar datos reales
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id, consecutive_number, sale_type, order_id, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (salesError) {
      console.log('❌ Error obteniendo ventas:', salesError);
    } else {
      console.log('📊 Últimas 3 ventas:');
      sales.forEach((sale, i) => {
        console.log(`  ${i + 1}. ID: ${sale.id}`);
        console.log(`     Consecutivo: ${sale.consecutive_number === null ? 'NULL' : sale.consecutive_number}`);
        console.log(`     Sale Type: ${sale.sale_type}`);
        console.log(`     Order ID: ${sale.order_id === null ? 'NULL' : sale.order_id}`);
        console.log(`     Fecha: ${sale.created_at}`);
        console.log('');
      });
    }

    // Verificar si hay ventas con consecutivo válido
    const { data: withConsecutive, error: consecutiveError } = await supabase
      .from('sales')
      .select('id, consecutive_number')
      .not('consecutive_number', 'is', null)
      .limit(5);

    if (consecutiveError) {
      console.log('❌ Error buscando consecutivos:', consecutiveError);
    } else {
      console.log(`📈 Ventas con consecutivo válido: ${withConsecutive?.length || 0}`);
      if (withConsecutive && withConsecutive.length > 0) {
        withConsecutive.forEach(sale => {
          console.log(`  - ID ${sale.id}: ${sale.consecutive_number}`);
        });
      }
    }

  } catch (error) {
    console.log('💥 Error general:', error);
  }
})();