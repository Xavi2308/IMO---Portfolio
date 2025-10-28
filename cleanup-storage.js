/**
 * Script para limpiar completamente el localStorage y forzar recreación
 */
console.log('🧹 Limpiando localStorage completamente...');

// Limpiar todas las claves de Supabase anteriores
const keysToRemove = [
  'sb-unified-auth',
  'sb-unified-auth-v2', 
  'sb-admin-unified-auth',
  'sb-admin-unified-auth-v2',
  'supabase.auth.token',
  'sb-lrsarbumzkqywootbsgy-auth-token'
];

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
  console.log(`🗑️ Removido: ${key}`);
});

// Limpiar variables globales
if (typeof window !== 'undefined') {
  window.__SUPABASE_CLIENT__ = null;
  window.__SUPABASE_ADMIN__ = null;
  window.__SUPABASE_SINGLETON_CREATED__ = false;
  window.__SUPABASE_ADMIN_SINGLETON_CREATED__ = false;
  console.log('🗑️ Variables globales limpiadas');
}

console.log('✅ Limpieza completa finalizada');
console.log('🔄 Recargando página...');

// Recargar la página
location.reload();