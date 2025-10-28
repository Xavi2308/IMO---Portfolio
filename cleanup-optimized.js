// ========================================================================================
// 🧹 LIMPIEZA OPTIMIZADA FINAL - NUEVA VERSIÓN CON CACHÉ MANUAL
// ========================================================================================
// INSTRUCCIONES: Ejecutar este código en la consola del navegador (F12 > Console)

console.log('🧹 Iniciando limpieza optimizada final...');

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

// 3. Limpiar caché manual de useInventorySimple (NUEVO)
console.log('🗑️ Limpiando caché manual de hooks...');
if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  // Intentar limpiar caché interno si está accesible
  console.log('🗑️ Intentando limpiar caché interno de React...');
}

// 4. Limpiar IndexedDB (donde Supabase guarda sesiones)
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
  deleteDB('sb-lrsarbumzkqywootbsgy-auth-token');
}

// 5. Limpiar cookies relacionadas con Supabase
console.log('🗑️ Limpiando cookies...');
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// 6. Limpiar cualquier service worker
console.log('🗑️ Eliminando service workers...');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('🗑️ Service worker eliminado');
    });
  });
}

// 7. Limpiar cache del navegador
console.log('🗑️ Limpiando cache...');
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log(`🗑️ Cache ${name} eliminado`);
    });
  });
}

// 8. Limpiar claves específicas que pueden quedar
console.log('🗑️ Limpiando claves específicas...');
const keysToRemove = [
  'sb-imo-main-v3-auth-token',
  'sb-imo-admin-v3-auth-token', 
  'sb-imo-clean-v1-auth-token',
  'sb-imo-final-auth-token',
  'sb-imo-single-auth-token',
  'sb-imo-user-final-auth-token',
  'sb-imo-admin-final-auth-token',
  'sb-lrsarbumzkqywootbsgy-auth-token',
  'supabase.auth.token',
  'sb-auth-token',
  'user'
];

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
  console.log(`🗑️ Clave ${key} eliminada`);
});

// 9. Forzar limpieza de memoria (si es posible)
console.log('🗑️ Intentando limpieza de memoria...');
if (window.gc) {
  window.gc();
  console.log('✅ Garbage collection ejecutado');
} else {
  console.log('ℹ️ Garbage collection no disponible');
}

// 10. Mensaje final
console.log('✅ Limpieza optimizada completada');
console.log('🔄 Recargando la página...');
console.log('ℹ️ NOTA: Ahora la aplicación tiene caché inteligente que debería evitar bucles');

// 11. Recargar la página para empezar completamente limpio
setTimeout(() => {
  window.location.reload(true); // Forzar recarga sin caché
}, 2000);