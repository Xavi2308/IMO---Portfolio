import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key-here';
const supabaseServiceKey = 'your-service-role-key-here';

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