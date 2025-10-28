const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMjI1NzgsImV4cCI6MjA2MzU5ODU3OH0.HAwUsqs5A5eIUivDxGuFR29Cm2RpdS1jwbltLrS46FQ'; // Anon key

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndPrepareDatabase() {
  try {
    console.log('🔍 Verificando estructura de base de datos...');
    
    // 1. Verificar tabla users
    console.log('\n📋 Verificando tabla users...');
    const { data: usersCheck, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Error en tabla users:', usersError.message);
      return false;
    }
    console.log('✅ Tabla users: OK');
    
    // 2. Verificar tabla companies
    console.log('\n🏢 Verificando tabla companies...');
    const { data: companiesCheck, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    if (companiesError) {
      console.error('❌ Error en tabla companies:', companiesError.message);
      return false;
    }
    console.log('✅ Tabla companies: OK');
    
    // 3. Verificar columnas necesarias en companies
    console.log('\n🔧 Verificando columnas en companies...');
    const { data: companyStructure, error: structureError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.error('❌ Error verificando estructura:', structureError.message);
    } else {
      const sampleCompany = companyStructure[0];
      if (sampleCompany) {
        console.log('📊 Columnas disponibles:', Object.keys(sampleCompany));
      }
    }
    
    // 4. Intentar insertar empresa de prueba
    console.log('\n🧪 Probando inserción de empresa...');
    const testCompany = {
      name: 'Empresa Test'
      // Solo nombre por ahora
    };
    
    const { data: insertTest, error: insertError } = await supabase
      .from('companies')
      .insert(testCompany)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error insertando empresa de prueba:', insertError.message);
      console.error('💡 Detalles:', insertError);
      return false;
    }
    
    console.log('✅ Inserción de empresa: OK');
    console.log('🆔 ID generado:', insertTest.id);
    
    // 5. Limpiar empresa de prueba
    await supabase
      .from('companies')
      .delete()
      .eq('id', insertTest.id);
    
    console.log('🧹 Empresa de prueba eliminada');
    
    console.log('\n🎉 Base de datos lista para registro!');
    return true;
    
  } catch (error) {
    console.error('💥 Error inesperado:', error);
    return false;
  }
}

// Ejecutar verificación
checkAndPrepareDatabase()
  .then(success => {
    if (success) {
      console.log('\n✅ ¡Todo listo! Puedes proceder con el registro.');
    } else {
      console.log('\n❌ Hay problemas en la base de datos que deben resolverse.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error ejecutando verificación:', error);
    process.exit(1);
  });