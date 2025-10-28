import supabase from '../src/supabaseClient.js';

// Función para generar el code_id a partir del barcode_code
function generateCodeId(barcode) {
  if (!barcode) return '';
  let parts = barcode.split('-');
  if (parts.length < 3) return '';
  let code = parts[0].split(' ')[0];
  let color = parts.slice(1, -1).join(' ').replace(/-/g, ' ');
  let size = parts[parts.length - 1];
  let initials = color
    .split(' ')
    .filter(Boolean)
    .map(word => word[0])
    .join('')
    .toUpperCase();
  return `${code}${initials}${size}`;
}

async function updateAllCodeIds() {
  const { data, error } = await supabase
    .from('variations')
    .select('id, barcode_code');
  if (error) {
    console.error('Error fetching variations:', error);
    return;
  }
  for (const variation of data) {
  if (!variation.barcode_code) {
    console.warn(`Variation id ${variation.id} has empty barcode_code`);
    continue;
  }
  // Normaliza el barcode_code
  const cleanBarcode = variation.barcode_code.trim().replace(/\s+/g, ' ');
  const code_id = generateCodeId(cleanBarcode);
  if (!code_id) {
    console.warn(`Variation id ${variation.id} with barcode_code "${variation.barcode_code}" could not generate code_id`);
    continue;
  }
  console.log(`ID: ${variation.id} | barcode_code: "${variation.barcode_code}" | cleanBarcode: "${cleanBarcode}" | code_id: "${code_id}"`);
  const { error: updateError } = await supabase
    .from('variations')
    .update({ code_id })
    .eq('id', variation.id);
  if (updateError) {
    console.error(`Error updating id ${variation.id}:`, updateError.message);
  } else {
    console.log(`Updated id ${variation.id} with code_id ${code_id}`);
  }
}
}

updateAllCodeIds();