const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAndUpdateMajoValero() {
  console.log('Verificando estado actual de Demo Company...');
  
  // Verificar estado actual
  const { data: currentData, error: selectError } = await supabase
    .from('companies')
    .select('id, name, subscription_type, special_agreement, primary_color, max_users, agreement_notes')
    .ilike('name', '%majo%');
  
  if (selectError) {
    console.error('Error al consultar:', selectError);
    return;
  }
  
  console.log('Estado actual:', currentData);
  
  if (currentData.length > 0) {
    const company = currentData[0];
    console.log('Actualizando Demo Company a plan Fundador...');
    
    // Actualizar a plan fundador
    const { data: updateData, error: updateError } = await supabase
      .from('companies')
      .update({ 
        special_agreement: true,
        agreement_notes: 'Empresa fundadora - Plan Fundador'
      })
      .eq('id', company.id)
      .select();
    
    if (updateError) {
      console.error('Error al actualizar:', updateError);
    } else {
      console.log('Actualizado exitosamente:', updateData);
    }
  } else {
    console.log('No se encontró empresa con nombre que contenga "majo"');
  }
  
  process.exit(0);
}

checkAndUpdateMajoValero();
