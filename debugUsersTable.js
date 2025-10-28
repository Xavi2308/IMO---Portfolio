const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMjI1NzgsImV4cCI6MjA2MzU5ODU3OH0.HAwUsqs5A5eIUivDxGuFR29Cm2RpdS1jwbltLrS46FQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugUsersTable() {
  try {
    console.log('🔍 Analizando tabla users...');
    
    // 1. Verificar estructura actual
    console.log('\n📊 Verificando datos existentes...');
    const { data: existingUsers, error: selectError } = await supabase
      .from('users')
      .select('*')
      .limit(3);
    
    if (selectError) {
      console.error('❌ Error consultando users:', selectError);
      return;
    }
    
    console.log('✅ Usuarios existentes:', existingUsers.length);
    if (existingUsers.length > 0) {
      console.log('📋 Estructura de user existente:', Object.keys(existingUsers[0]));
      console.log('👤 Ejemplo de usuario:', existingUsers[0]);
    }
    
    // 2. Simular auth user (como si ya estuviera autenticado)
    console.log('\n🧪 Simulando inserción con usuario autenticado...');
    
    // Primero hacer login o signup temporal para establecer sesión
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'test-debug@example.com',
      password: 'password123'
    });
    
    if (authError && !authError.message.includes('already registered')) {
      console.error('❌ Error de auth:', authError);
      return;
    }
    
    console.log('🔐 Usuario auth establecido');
    
    // 3. Intentar insertar perfil simple
    const simpleProfile = {
      username: 'Test User Debug',
      first_name: 'Test',
      last_name: 'User',
      email: 'test-debug@example.com',
      role: 'admin',
      is_active: true
    };
    
    console.log('📋 Intentando insertar perfil simple:', simpleProfile);
    
    const { data: insertResult, error: insertError } = await supabase
      .from('users')
      .insert(simpleProfile)
      .select();
    
    if (insertError) {
      console.error('❌ Error insertando perfil simple:', insertError);
      console.error('💡 Código de error:', insertError.code);
      console.error('💡 Mensaje:', insertError.message);
      console.error('💡 Detalles:', insertError.details);
      console.error('💡 Hint:', insertError.hint);
    } else {
      console.log('✅ Perfil insertado exitosamente:', insertResult);
      
      // Limpiar
      if (insertResult && insertResult[0]) {
        await supabase
          .from('users')
          .delete()
          .eq('id', insertResult[0].id);
        console.log('🧹 Perfil de prueba eliminado');
      }
    }
    
  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

// Ejecutar diagnóstico
debugUsersTable()
  .then(() => {
    console.log('\n✅ Diagnóstico completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error en diagnóstico:', error);
    process.exit(1);
  });