// Verificar estructura de tabla variations para optimizar el índice
const { createClient } = require('@supabase/supabase-js');

// Usar las URLs directas por simplicidad
const supabase = createClient(
  'https://your-project.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgwNjgyMzYsImV4cCI6MjA0MzY0NDIzNn0.mEf94YSMKfdCa7qz8cYE8NGKgFS8vNEV9hnrVYaVC8w'
);

async function checkVariationsStructure() {
  try {
    console.log('🔍 Verificando estructura de tabla variations...');
    
    // Intentar obtener una muestra de la tabla variations para ver sus columnas
    const { data, error } = await supabase
      .from('variations')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Estructura de variations:');
      console.log('Columnas disponibles:', Object.keys(data[0]));
      console.log('Ejemplo de data:', data[0]);
    } else {
      console.log('⚠️ No hay datos en variations para verificar estructura');
      
      // Intentar obtener información del esquema
      console.log('Intentando obtener esquema...');
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'variations');
        
      if (schemaError) {
        console.log('No se pudo obtener esquema:', schemaError.message);
      } else {
        console.log('Columnas del esquema:', schemaData);
      }
    }
    
  } catch (err) {
    console.error('❌ Error verificando estructura:', err.message);
  }
}

checkVariationsStructure();