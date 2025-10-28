const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMjI1NzgsImV4cCI6MjA2MzU5ODU3OH0.HAwUsqs5A5eIUivDxGuFR29Cm2RpdS1jwbltLrS46FQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsernames() {
  try {
    console.log('🔍 Verificando usernames en la base de datos...\n');
    
    // Ver todos los usuarios y sus usernames
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, username, first_name, last_name, company_id');
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    console.log(`👥 Total usuarios: ${users.length}\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id.substring(0, 8)}...`);
      console.log(`   Username: "${user.username || 'NULL'}"`);
      console.log(`   Nombre: "${user.first_name || ''}" "${user.last_name || ''}"`);
      console.log(`   Company ID: ${user.company_id || 'NULL'}`);
      console.log('');
    });
    
    // Buscar específicamente usuarios con email que contenga "exyleiten"
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    const exyleitenUser = authUsers.users.find(u => u.email?.includes('exyleiten'));
    
    if (exyleitenUser) {
      console.log('📧 Usuario con exyleiten encontrado:');
      console.log(`   Email: ${exyleitenUser.email}`);
      console.log(`   ID: ${exyleitenUser.id}`);
      
      // Buscar su perfil
      const userProfile = users.find(u => u.id === exyleitenUser.id);
      if (userProfile) {
        console.log(`   Username actual: "${userProfile.username}"`);
        
        if (userProfile.username === 'exyleiten' || !userProfile.username) {
          console.log('\n🔧 Actualizando username a "Xavi"...');
          
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ 
              username: 'Xavi',
              first_name: 'Xavi'
            })
            .eq('id', exyleitenUser.id);
          
          if (updateError) {
            console.error('❌ Error actualizando:', updateError.message);
          } else {
            console.log('✅ Username actualizado a "Xavi"');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

checkUsernames();
