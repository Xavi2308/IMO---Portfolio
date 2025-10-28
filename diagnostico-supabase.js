// ========================================================================================
// 🔍 DIAGNÓSTICO DE SUPABASE - Ver qué está pasando
// ========================================================================================
// INSTRUCCIONES: Ejecutar este código en la consola del navegador (F12 > Console)

console.log('🔍 === DIAGNÓSTICO DE SUPABASE ===');

// 1. Verificar localStorage
console.log('📱 LocalStorage keys:');
for(let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    if(key.includes('sb-') || key.includes('supabase')) {
        console.log(`  📝 ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`);
    }
}

// 2. Verificar sessionStorage  
console.log('💾 SessionStorage keys:');
for(let i = 0; i < sessionStorage.length; i++) {
    let key = sessionStorage.key(i);
    if(key.includes('sb-') || key.includes('supabase')) {
        console.log(`  📝 ${key}: ${sessionStorage.getItem(key)?.substring(0, 100)}...`);
    }
}

// 3. Verificar estado del cliente Supabase
console.log('🔧 Estado del cliente Supabase:');
if(window.supabase) {
    console.log('  ✅ Cliente principal existe');
    console.log('  👤 Usuario actual:', window.supabase.auth.getUser());
    console.log('  🔑 Sesión actual:', window.supabase.auth.getSession());
} else {
    console.log('  ❌ Cliente principal NO existe');
}

// 4. Verificar estado del admin
console.log('⚙️ Estado del cliente Admin:');
if(window.supabaseAdmin) {
    console.log('  ✅ Cliente admin existe');
} else {
    console.log('  ❌ Cliente admin NO existe');
}

// 5. Verificar cookies
console.log('🍪 Cookies relevantes:');
document.cookie.split(';').forEach(cookie => {
    if(cookie.includes('sb-') || cookie.includes('supabase')) {
        console.log(`  🍪 ${cookie.trim()}`);
    }
});

// 6. Verificar conexión a Supabase
console.log('🌐 Probando conexión...');
if(window.supabase) {
    window.supabase.from('products').select('count').limit(1)
        .then(result => {
            if(result.error) {
                console.log('  ❌ Error de conexión:', result.error);
            } else {
                console.log('  ✅ Conexión exitosa, datos:', result.data);
            }
        })
        .catch(error => {
            console.log('  ❌ Error de conexión catch:', error);
        });
} else {
    console.log('  ❌ No se puede probar - cliente no existe');
}

console.log('🔍 === FIN DEL DIAGNÓSTICO ===');