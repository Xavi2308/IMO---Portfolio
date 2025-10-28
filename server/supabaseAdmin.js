const { createClient } = require('@supabase/supabase-js');

// Crear cliente administrativo para operaciones del servidor
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = { supabaseAdmin };