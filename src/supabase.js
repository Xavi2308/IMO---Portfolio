import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMjI1NzgsImV4cCI6MjA2MzU5ODU3OH0.HAwUsqs5A5eIUivDxGuFR29Cm2RpdS1jwbltLrS46FQ';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODAyMjU3OCwiZXhwIjoyMDYzNTk4NTc4fQ.tDy9qlbeW2RxP4YE_vb44vjZABcgkBWwhsQWhO-5U-k';

// SINGLETON ABSOLUTO - SOLO UNA INSTANCIA PARA TODO
let _supabaseInstance = null;

/**
 * Cliente ÚNICO de Supabase - SINGLETON COMPLETO
 */
function createSupabaseClient() {
  if (_supabaseInstance) {
    console.log('🔄 Reutilizando instancia ÚNICA de Supabase');
    return _supabaseInstance;
  }
  
  console.log('🔧 Creando ÚNICA instancia de Supabase (SINGLETON ABSOLUTO)');
  
  _supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'sb-lrsarbumzkqywootbsgy-auth-token',
      flowType: 'pkce'
    }
  });
  
  console.log('✅ Cliente Supabase ÚNICO creado - NO MÁS MÚLTIPLES INSTANCIAS');
  return _supabaseInstance;
}

// Crear la instancia única
export const supabase = createSupabaseClient();

// USAR LA MISMA INSTANCIA para admin (evita múltiples clientes)
export const supabaseAdmin = supabase;

// Exportar funciones que devuelven la misma instancia
export function getSupabaseClient() {
  return supabase;
}

export function getSupabaseAdmin() {
  return supabase; // MISMA INSTANCIA - sin duplicados
}

// Exportar por defecto
export default supabase;