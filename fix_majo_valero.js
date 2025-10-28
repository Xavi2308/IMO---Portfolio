const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMjI1NzgsImV4cCI6MjA2MzU5ODU3OH0.HAwUsqs5A5eIUivDxGuFR29Cm2RpdS1jwbltLrS46FQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMajoValeroStatus() {
  try {
    console.log('🔍 Verificando estado de Demo Company...\n');
    
    // 1. Verificar todas las empresas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*');
    
    if (companiesError) {
      console.error('❌ Error:', companiesError.message);
      return;
    }
    
    console.log(`📊 Total de empresas: ${companies.length}`);
    companies.forEach(company => {
      console.log(`   - ${company.name} (${company.subscription_type}, especial: ${company.special_agreement})`);
    });
    
    // 2. Buscar específicamente Demo Company
    const majoValero = companies.find(c => c.name.toLowerCase().includes('majo'));
    
    if (!majoValero) {
      console.log('\n❌ Demo Company NO encontrada');
      console.log('🔧 Recreando empresa Demo Company...');
      
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: 'Demo Company',
          code: 'MV001',
          subscription_type: 'premium',
          subscription_status: 'active',
          special_agreement: true,
          primary_color: '#DAA520',
          secondary_color: '#B8860B',
          max_users: 999999,
          agreement_notes: 'Empresa fundadora - Acceso premium perpetuo sin costo'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creando empresa:', createError.message);
        return;
      }
      
      console.log('✅ Empresa Demo Company recreada:');
      console.log(`   - ID: ${newCompany.id}`);
      console.log(`   - Acuerdo especial: ${newCompany.special_agreement}`);
      
      // 3. Buscar usuarios de Demo Company y asignarlos a la empresa
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, username')
        .is('company_id', null);
      
      if (usersError) {
        console.error('❌ Error buscando usuarios:', usersError.message);
        return;
      }
      
      if (users.length > 0) {
        console.log(`\n👥 Asignando ${users.length} usuarios a Demo Company...`);
        
        const { error: assignError } = await supabase
          .from('user_profiles')
          .update({ company_id: newCompany.id })
          .is('company_id', null);
        
        if (assignError) {
          console.error('❌ Error asignando usuarios:', assignError.message);
        } else {
          console.log('✅ Usuarios asignados correctamente');
        }
      }
      
    } else {
      console.log('\n✅ Demo Company encontrada:');
      console.log(`   - ID: ${majoValero.id}`);
      console.log(`   - Tipo: ${majoValero.subscription_type}`);
      console.log(`   - Acuerdo especial: ${majoValero.special_agreement}`);
      
      if (!majoValero.special_agreement) {
        console.log('\n🔧 Actualizando acuerdo especial...');
        const { error: updateError } = await supabase
          .from('companies')
          .update({ 
            special_agreement: true,
            agreement_notes: 'Empresa fundadora - Acceso premium perpetuo sin costo'
          })
          .eq('id', majoValero.id);
        
        if (updateError) {
          console.error('❌ Error actualizando:', updateError.message);
        } else {
          console.log('✅ Acuerdo especial activado');
        }
      }
    }
    
    console.log('\n🎯 Próximos pasos:');
    console.log('1. Recarga la página de la aplicación');
    console.log('2. La estrella debería aparecer dorada');
    console.log('3. El tooltip debería mostrar "Premium Gratuito - Empresa Fundadora"');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

checkMajoValeroStatus();
