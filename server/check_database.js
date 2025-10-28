// Cargar variables de entorno
if (!process.env.SUPABASE_URL) {
  console.log('Modo desarrollo web detectado. Cargando variables desde .env');
  const dotenv = require('dotenv');
  dotenv.config();
}

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No se encontró la clave de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Verificando tablas disponibles...\n');
  
  try {
    // 1. Ver todas las tablas que existen
    console.log('1. TODAS LAS TABLAS:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('Error obteniendo tablas:', tablesError);
    } else {
      console.table(tables);
    }

    // 2. Buscar tablas que contengan 'sale' o 'venta'
    console.log('\n2. TABLAS RELACIONADAS CON VENTAS:');
    const salesTables = tables?.filter(table => 
      table.table_name.includes('sale') || 
      table.table_name.includes('venta')
    );
    
    if (salesTables && salesTables.length > 0) {
      console.table(salesTables);
    } else {
      console.log('❌ No se encontraron tablas de ventas');
    }

    // 3. Verificar si existe la tabla sales
    console.log('\n3. VERIFICANDO TABLA SALES:');
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .limit(1);

    if (salesError) {
      console.error('❌ Error accediendo a tabla sales:', salesError.message);
      
      // Verificar si existe customers
      console.log('\n4. VERIFICANDO TABLA CUSTOMERS:');
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .limit(1);
        
      if (customersError) {
        console.error('❌ Error accediendo a tabla customers:', customersError.message);
      } else {
        console.log('✅ Tabla customers existe y es accesible');
        console.log('Ejemplo de datos:', customersData);
      }
    } else {
      console.log('✅ Tabla sales existe y es accesible');
      console.log('Ejemplo de datos:', salesData);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkTables();