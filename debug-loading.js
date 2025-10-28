// ========================================================================================
// 🔍 SCRIPT DE DIAGNÓSTICO RÁPIDO - REVISAR ESTADO DE CARGA
// ========================================================================================
// INSTRUCCIONES: Ejecutar este código en la consola del navegador (F12 > Console)

console.log('🔍 Revisando estado de la aplicación...');

// 1. Verificar si Supabase está conectado
console.log('📡 Estado de Supabase:');
if (window.supabase) {
  console.log('✅ Supabase cliente disponible');
  window.supabase.auth.getSession().then(({ data: { session } }) => {
    console.log('🔐 Sesión actual:', session ? 'Activa' : 'No activa');
    if (session) {
      console.log('👤 Usuario:', session.user.email);
    }
  });
} else {
  console.log('❌ Supabase cliente NO disponible');
}

// 2. Verificar localStorage
console.log('💾 Estado de localStorage:');
const authToken = localStorage.getItem('sb-lrsarbumzkqywootbsgy-auth-token');
console.log('🔑 Token de auth:', authToken ? 'Presente' : 'Ausente');

const userData = localStorage.getItem('user');
console.log('👤 Datos de usuario:', userData ? 'Presentes' : 'Ausentes');
if (userData) {
  try {
    const user = JSON.parse(userData);
    console.log('📋 Usuario guardado:', user.email, '| Empresa:', user.company_id);
  } catch (e) {
    console.log('❌ Error parseando usuario guardado');
  }
}

// 3. Verificar estado de React (si está disponible)
console.log('⚛️ Estado de React:');
const reactFiber = document.querySelector('#root')._reactInternals;
if (reactFiber) {
  console.log('✅ React está montado');
} else {
  console.log('❌ React no encontrado');
}

// 4. Verificar elementos DOM
console.log('🌐 Estado del DOM:');
const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
console.log('⏳ Elementos de carga encontrados:', loadingElements.length);

const errorElements = document.querySelectorAll('[class*="error"]');
console.log('❌ Elementos de error encontrados:', errorElements.length);

// 5. Verificar errores en consola
console.log('🚨 Revisando errores recientes...');
setTimeout(() => {
  console.log('🔍 Diagnóstico completado. Revisa los mensajes anteriores.');
}, 1000);