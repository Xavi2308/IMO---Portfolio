const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMjI1NzgsImV4cCI6MjA2MzU5ODU3OH0.HAwUsqs5A5eIUivDxGuFR29Cm2RpdS1jwbltLrS46FQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSWorkaround() {
  try {
    console.log('🧪 Probando workaround para RLS...');
    
    // 1. Crear usuario con signup
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'password123'
    });
    
    if (authError) {
      console.error('❌ Error en signup:', authError);
      return;
    }
    
    console.log('✅ Usuario creado en auth:', authData.user.id);
    
    // 2. Esperar un momento para que la sesión se establezca
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Verificar sesión
    const { data: session } = await supabase.auth.getSession();
    console.log('🔐 Sesión establecida:', !!session?.session?.user);
    
    // 4. Intentar insertar en users
    const profileData = {
      id: authData.user.id,
      email: authData.user.email,
      username: 'Test User',
      first_name: 'Test',
      last_name: 'User',
      role: 'admin',
      is_active: true
    };
    
    console.log('📋 Intentando insertar:', profileData);
    
    const { data: insertResult, error: insertError } = await supabase
      .from('users')
      .insert(profileData)
      .select();
    
    if (insertError) {
      console.error('❌ Error en insert:', insertError);
      
      // Probar con diferentes enfoques
      console.log('🔄 Probando con upsert...');
      const { data: upsertResult, error: upsertError } = await supabase
        .from('users')
        .upsert(profileData, { onConflict: 'id' })
        .select();
      
      if (upsertError) {
        console.error('❌ Error en upsert:', upsertError);
      } else {
        console.log('✅ Upsert exitoso:', upsertResult);
      }
    } else {
      console.log('✅ Insert exitoso:', insertResult);
    }
    
  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

testRLSWorkaround();