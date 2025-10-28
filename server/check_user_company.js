const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkUserCompanyRelationship() {
  console.log('=== VERIFICACIÓN DE RELACIÓN USUARIO-EMPRESA ===\n');
  
  try {
    // 1. Verificar empresas existentes
    console.log('1. EMPRESAS REGISTRADAS:');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, subscription_type, special_agreement, agreement_notes')
      .order('name');
    
    if (companiesError) throw companiesError;
    
    companies.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.name} (ID: ${company.id})`);
      console.log(`      - Tipo: ${company.subscription_type}`);
      console.log(`      - Fundadora: ${company.special_agreement ? 'SÍ' : 'NO'}`);
      console.log(`      - Notas: ${company.agreement_notes || 'N/A'}\n`);
    });

    // 2. Verificar usuarios y sus empresas asignadas
    console.log('\n2. USUARIOS Y SUS EMPRESAS:');
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        username,
        first_name,
        last_name,
        company_id,
        companies (
          id,
          name,
          subscription_type,
          special_agreement
        )
      `)
      .order('username');
    
    if (usersError) throw usersError;
    
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. Usuario: ${user.username || 'Sin username'}`);
      console.log(`      - Nombre: ${user.first_name} ${user.last_name}`);
      console.log(`      - ID Usuario: ${user.id}`);
      console.log(`      - Company ID: ${user.company_id || 'NO ASIGNADA'}`);
      if (user.companies) {
        console.log(`      - Empresa: ${user.companies.name}`);
        console.log(`      - Tipo empresa: ${user.companies.subscription_type}`);
        console.log(`      - Es fundadora: ${user.companies.special_agreement ? 'SÍ' : 'NO'}`);
      } else {
        console.log(`      - ⚠️  SIN EMPRESA ASIGNADA`);
      }
      console.log('');
    });

    // 3. Buscar usuarios sin empresa asignada
    const usersWithoutCompany = users.filter(user => !user.company_id);
    if (usersWithoutCompany.length > 0) {
      console.log('\n3. ⚠️  USUARIOS SIN EMPRESA ASIGNADA:');
      usersWithoutCompany.forEach(user => {
        console.log(`   - ${user.username} (ID: ${user.id})`);
      });
    }

  } catch (error) {
    console.error('Error en la verificación:', error);
  }
  
  process.exit(0);
}

checkUserCompanyRelationship();
