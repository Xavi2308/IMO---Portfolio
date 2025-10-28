// ========================================================================================
// 🧹 LIMPIEZA FINAL COMPLETA - SOLUCIÓN DEFINITIVA PARA MULTIPLES CLIENTS
// ========================================================================================
// INSTRUCCIONES: Ejecutar este código en la consola del navegador (F12 > Console)

console.log('🧹 Iniciando limpieza final completa...');

// 1. Limpiar TODOS los datos de localStorage y sessionStorage
console.log('🗑️ Limpiando localStorage y sessionStorage...');
localStorage.clear();
sessionStorage.clear();

// 2. Eliminar TODAS las variables globales de Supabase
console.log('🗑️ Eliminando variables globales de Supabase...');
delete window.__SUPABASE_CLIENT__;
delete window.__SUPABASE_ADMIN__;
delete window.supabase;
delete window.supabaseClient;
delete window.supabaseAdmin;

// 3. Limpiar IndexedDB (donde Supabase guarda sesiones)
console.log('🗑️ Limpiando IndexedDB...');
if (window.indexedDB) {
  const deleteDB = (dbName) => {
    const deleteReq = indexedDB.deleteDatabase(dbName);
    deleteReq.onsuccess = () => console.log(`✅ Base de datos ${dbName} eliminada`);
    deleteReq.onerror = () => console.log(`❌ Error eliminando ${dbName}`);
  };
  
  // Bases de datos comunes de Supabase
  deleteDB('supabase-auth');
  deleteDB('sb-imo-main-v3');
  deleteDB('sb-imo-admin-v3');
  deleteDB('sb-imo-clean-v1');
  deleteDB('sb-imo-final');
}

// 4. Limpiar cookies relacionadas con Supabase
console.log('🗑️ Limpiando cookies...');
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// 5. Limpiar cualquier service worker
console.log('🗑️ Eliminando service workers...');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('🗑️ Service worker eliminado');
    });
  });
}

// 6. Limpiar cache del navegador
console.log('🗑️ Limpiando cache...');
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log(`🗑️ Cache ${name} eliminado`);
    });
  });
}

// 7. Limpiar claves específicas que pueden quedar
console.log('🗑️ Limpiando claves específicas...');
const keysToRemove = [
  'sb-imo-main-v3-auth-token',
  'sb-imo-admin-v3-auth-token', 
  'sb-imo-clean-v1-auth-token',
  'sb-imo-final-auth-token',
  'sb-imo-single-auth-token',
  'sb-imo-user-final-auth-token',
  'sb-imo-admin-final-auth-token',
  'supabase.auth.token',
  'sb-auth-token'
];

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
  console.log(`🗑️ Clave ${key} eliminada`);
});

// 8. Mensaje final
console.log('✅ Limpieza completa terminada');
console.log('🔄 Recargando la página...');

// 9. Recargar la página para empezar completamente limpio
setTimeout(() => {
  window.location.href = window.location.href; // Forzar recarga completa
}, 2000);