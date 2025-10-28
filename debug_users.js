// Script temporal para diagnosticar usuarios en la base de datos
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (usando las mismas variables que la app)
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUzMTU2MzQsImV4cCI6MjA0MDg5MTYzNH0.ooaFqM4TXdGzJ5_YY6iFHhiT75vf_lZMhCZCiQbNnYU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticUsers() {
  try {
    console.log('🔍 Verificando usuarios en auth.users...');
    
    // Obtener usuarios de auth (esto podría no funcionar con client anónimo)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('⚠️ No se pueden listar usuarios de auth (requiere permisos admin):', authError.message);
    } else {
      console.log(`✅ Usuarios en auth.users: ${authUsers.users.length}`);
      authUsers.users.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id})`);
      });
    }
    
    console.log('\n🔍 Verificando usuarios en user_profiles...');
    
    // Obtener usuarios de user_profiles
    const { data: profileUsers, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, username, role, first_name, last_name, company_id');
    
    if (profileError) {
      console.error('❌ Error obteniendo user_profiles:', profileError);
    } else {
      console.log(`✅ Usuarios en user_profiles: ${profileUsers.length}`);
      profileUsers.forEach(user => {
        console.log(`  - ${user.username} (ID: ${user.id}, Role: ${user.role})`);
      });
    }
    
    console.log('\n🔍 Verificando empresas...');
    
    // Obtener empresas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, code');
    
    if (companiesError) {
      console.error('❌ Error obteniendo companies:', companiesError);
    } else {
      console.log(`✅ Empresas disponibles: ${companies.length}`);
      companies.forEach(company => {
        console.log(`  - ${company.name} (ID: ${company.id}, Code: ${company.code})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnosticUsers().then(() => {
  console.log('\n✅ Diagnóstico completado');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error ejecutando diagnóstico:', err);
  process.exit(1);
});