const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMjI1NzgsImV4cCI6MjA2MzU5ODU3OH0.HAwUsqs5A5eIUivDxGuFR29Cm2RpdS1jwbltLrS46FQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addUsernameColumn() {
  try {
    console.log('Intentando agregar columna username...');
    
    // Primero intentamos hacer un select para ver si ya existe la columna
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username')
      .limit(1);
    
    if (error && error.message.includes('column "username" does not exist')) {
      console.log('La columna username no existe, necesita agregarse manualmente en el dashboard de Supabase.');
      console.log('Ve a: https://supabase.com/dashboard/project/lrsarbumzkqywootbsgy/editor');
      console.log('Ejecuta: ALTER TABLE user_profiles ADD COLUMN username VARCHAR(50);');
      return;
    }
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('La columna username ya existe!');
    
    // Ahora vamos a actualizar los usuarios existentes que no tengan username
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, username')
      .is('username', null);
    
    if (usersError) {
      console.error('Error obteniendo usuarios:', usersError);
      return;
    }
    
    console.log(`Encontrados ${users.length} usuarios sin username`);
    
    // Actualizar cada usuario con un username basado en su email
    for (const userProfile of users) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userProfile.id);
      if (authUser?.user?.email) {
        const username = authUser.user.email.split('@')[0];
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ username })
          .eq('id', userProfile.id);
        
        if (updateError) {
          console.error(`Error actualizando usuario ${userProfile.id}:`, updateError);
        } else {
          console.log(`Usuario ${userProfile.id} actualizado con username: ${username}`);
        }
      }
    }
    
    console.log('Proceso completado!');
    
  } catch (error) {
    console.error('Error en el proceso:', error);
  }
}

addUsernameColumn();
