// Script para verificar estructura de la base de datos
import supabase from './src/supabaseClient.js';

async function checkDatabaseStructure() {
  console.log('🔍 Verificando estructura de la base de datos...\n');
  
  try {
    // 1. Verificar si existe la tabla users
    console.log('1. Verificando tabla users...');
    const { data: usersTable, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Error en tabla users:', usersError);
      if (usersError.message.includes('relation "users" does not exist')) {
        console.log('🔧 Necesitas crear la tabla users primero');
      }
    } else {
      console.log('✅ Tabla users existe');
    }
    
    // 2. Verificar si existe la tabla companies
    console.log('\n2. Verificando tabla companies...');
    const { data: companiesTable, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (companiesError) {
      console.error('❌ Error en tabla companies:', companiesError);
    } else {
      console.log('✅ Tabla companies existe');
    }
    
    // 3. Verificar estructura de la tabla users
    console.log('\n3. Verificando estructura de la tabla users...');
    const { data: userColumns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' });
    
    if (columnsError) {
      console.log('⚠️ No se pudo obtener estructura de columnas (función RPC no existe)');
    } else {
      console.log('📋 Columnas de users:', userColumns);
    }
    
    // 4. Verificar conexión con Auth
    console.log('\n4. Verificando autenticación...');
    const { data: authUser } = await supabase.auth.getUser();
    console.log('🔐 Estado de Auth:', authUser ? 'Conectado' : 'Desconectado');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar verificación
checkDatabaseStructure();