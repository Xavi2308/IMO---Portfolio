// Usar la misma instancia SINGLETON de supabase
import supabase from './supabase';

// No crear nueva instancia, reutilizar la existente
console.log('🔄 SupabaseAdmin: Reutilizando instancia SINGLETON');

export default supabase;