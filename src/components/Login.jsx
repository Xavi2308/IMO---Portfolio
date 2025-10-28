import React, { useState, useContext } from 'react';
import LanguageContext from '../context/LanguageContext';
import translations from '../translations';
import supabase from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function Login({ setUser }) {
  const { lang, setLang } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Iniciando proceso de login para:', email);

      // Crear timeout para el login
      const loginTimeout = setTimeout(() => {
        console.error('⏰ Timeout en login después de 15 segundos');
        setError('El login está tardando demasiado. Intenta nuevamente.');
        setLoading(false);
      }, 15000);

      // 1. Autenticación con Supabase
      console.log('🔍 Autenticando con Supabase...');
      const { data: authData, error: authError } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de autenticación')), 8000)
        )
      ]);

      if (authError) {
        clearTimeout(loginTimeout);
        console.error('❌ Error de autenticación:', authError);
        throw new Error(authError.message);
      }

      if (!authData?.user) {
        clearTimeout(loginTimeout);
        console.error('❌ No se obtuvo información del usuario');
        throw new Error('Error en autenticación - no se obtuvo usuario');
      }

      console.log('✅ Usuario autenticado correctamente:', authData.user.id, authData.user.email);

      // 2. Buscar perfil del usuario en la tabla users
      console.log('🔍 Buscando perfil de usuario en tabla users...');
      
      let userData, userError;
      
      try {
        const searchResult = await Promise.race([
          supabase
            .from('users')
            .select(`
              id, 
              username, 
              role, 
              first_name,
              last_name,
              email,
              last_login,
              is_active,
              company_id
            `)
            .eq('id', authData.user.id)
            .single(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout de consulta de usuario')), 5000)
          )
        ]);
        
        userData = searchResult.data;
        userError = searchResult.error;
        
        console.log(`📋 Resultado de búsqueda en users:`, { userData, userError });
        
      } catch (error) {
        console.log(`❌ Error buscando en tabla users:`, error.message);
        userError = error;
      }

      // 3. Si encontramos el usuario, buscar información de empresa
      let companyData = null;
      if (userData) {
        console.log('🏢 Buscando información de empresa en user_companies...');
        
        try {
          const companyResult = await supabase
            .from('user_companies')
            .select(`
              role,
              is_active,
              companies (
                id,
                name,
                code,
                subscription_type,
                primary_color,
                secondary_color,
                settings
              )
            `)
            .eq('user_id', authData.user.id)
            .eq('is_active', true)
            .single();
            
          if (companyResult.data) {
            companyData = companyResult.data;
            console.log('✅ Información de empresa obtenida:', companyData);
          } else {
            console.warn('⚠️ No se encontró información de empresa:', companyResult.error);
          }
        } catch (companyError) {
          console.warn('⚠️ Error buscando empresa:', companyError);
        }
      }

      // 4. Si no hay usuario, intentar crearlo automáticamente
      if (!userData || userError) {
        console.log('🔧 Usuario no encontrado en tabla users, intentando crear...');
        
        // Verificar si existe en user_companies primero
        try {
          const existingCompanyUser = await supabase
            .from('user_companies')
            .select('user_id, role')
            .eq('user_id', authData.user.id)
            .single();
            
          if (existingCompanyUser.data) {
            console.log('✅ Usuario existe en user_companies, creando entrada en users...');
            
            // Crear entrada en users basada en la información de Auth
            const newUserData = {
              id: authData.user.id,
              email: authData.user.email,
              username: authData.user.email.split('@')[0],
              role: existingCompanyUser.data.role,
              first_name: '',
              last_name: '',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const { data: createdUser, error: createError } = await supabase
              .from('users')
              .insert(newUserData)
              .select()
              .single();
              
            if (createError) {
              console.error('❌ Error creando usuario:', createError);
              throw new Error(`No se pudo crear el perfil: ${createError.message}`);
            }
            
            console.log('✅ Usuario creado exitosamente:', createdUser);
            userData = createdUser;
            userError = null;
            
          } else {
            throw new Error('Usuario no encontrado ni en users ni en user_companies');
          }
          
        } catch (creationError) {
          console.error('❌ Error en creación de usuario:', creationError);
        }
      }

      // Si aún no hay usuario después del intento de creación, mostrar error
      if (!userData || userError) {
        clearTimeout(loginTimeout);
        console.log('🔧 Usuario no encontrado en la base de datos');
        console.log('🚨 Información del error:', { 
          hasUserData: !!userData, 
          hasError: !!userError,
          errorCode: userError?.code,
          errorMessage: userError?.message
        });

        // Intentar obtener lista de tablas disponibles para debug
        let availableTables = 'No se pudo obtener información de tablas';
        try {
          console.log('🔍 Obteniendo información de base de datos...');
          
          // Intentar algunas consultas de prueba para ver qué existe
          const testQueries = [
            { name: 'auth.users', query: supabase.auth.getUser() },
            { name: 'companies', query: supabase.from('companies').select('count').limit(1) },
            { name: 'users', query: supabase.from('users').select('count').limit(1) },
            { name: 'profiles', query: supabase.from('profiles').select('count').limit(1) }
          ];
          
          const results = [];
          for (const test of testQueries) {
            try {
              await test.query;
              results.push(`✅ ${test.name}`);
            } catch (err) {
              results.push(`❌ ${test.name} (${err.message?.substring(0, 50)})`);
            }
          }
          availableTables = results.join('\n');
          
        } catch (debugError) {
          console.warn('⚠️ Error obteniendo debug info:', debugError);
        }

        // Mostrar mensaje de error más específico
        const errorMessage = `Tu cuenta de email (${authData.user.email}) está registrada en Supabase Auth pero no tiene un perfil configurado en la base de datos.

PROBLEMA DETECTADO: La tabla de perfiles de usuario no existe o no es accesible.

INFORMACIÓN TÉCNICA:
- Usuario autenticado: ${authData.user.id}
- Email: ${authData.user.email}
- Error: ${userError?.message || 'Perfil no encontrado'}
- Código: ${userError?.code || 'PROFILE_NOT_FOUND'}

TABLAS DISPONIBLES:
${availableTables}

SOLUCIÓN: El administrador necesita:
1. Crear la tabla de perfiles de usuario
2. Configurar los permisos RLS correctamente
3. Crear tu perfil de usuario`;
        
        setError(errorMessage);
        setLoading(false);
        return;
      }

      console.log('✅ Datos del usuario obtenidos:', userData.id, userData.username);

      // 5. Actualizar último login de forma asíncrona (no crítico)
      supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id)
        .then(result => {
          if (result.error) {
            console.warn('⚠️ Error actualizando last login:', result.error);
          } else {
            console.log('✅ Last login actualizado');
          }
        })
        .catch(err => console.warn('⚠️ Error en promesa last login:', err));

      // 6. Crear objeto del usuario con información de empresa
      const userToSet = {
        id: userData.id,
        email: authData.user.email || userData.email,
        username: userData.username,
        role: companyData?.role || userData.role, // Usar el rol de la empresa si existe
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        company_id: companyData?.companies?.id || userData.company_id,
        company: companyData?.companies || null
      };
      
      console.log('✅ Usuario completo establecido:', userToSet.id, userToSet.username);
      setUser(userToSet);

      // Limpiar timeout antes de navegar
      clearTimeout(loginTimeout);
      
      console.log('🏠 Navegando a la página principal');
      navigate('/');

    } catch (error) {
      console.error('❌ Error en handleLogin:', error);
      setError(error.message || 'Error en el inicio de sesión');
      setLoading(false);
    }
  };

  const clearCacheAndRetry = async () => {
    console.log('🧹 Limpiando caché y reintentando...');
    
    // Limpiar almacenamiento local
    localStorage.clear();
    sessionStorage.clear();
    
    // Limpiar cookies de Supabase si existen
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Cerrar sesión en Supabase por si acaso
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('⚠️ Error cerrando sesión:', err);
    }
    
    // Recargar la página
    window.location.reload();
  };

  const t = translations[lang] || translations.es;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo con tema lima celeste */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-teal-300 to-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-300 to-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-cyan-300 to-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      {/* Tarjeta principal de login */}
      <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10 border border-white/20">
        <div className="text-center mb-8">
          <div className="relative mb-6">
            <img 
              src="/logo-removebg-preview.png" 
              alt="Logo" 
              className="mx-auto h-20 w-auto mb-4 transition-transform duration-300 hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
            {t.login.title}
          </h1>
          <p className="text-gray-600 text-sm">
            {t.login.subtitle}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl animate-in slide-in-from-top duration-300">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error de inicio de sesión
                </h3>
                <div className="mt-2 text-sm text-red-700 whitespace-pre-line max-h-40 overflow-y-auto">
                  {error}
                </div>
                <div className="mt-4">
                  <button
                    onClick={clearCacheAndRetry}
                    className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                  >
                    🧹 Limpiar caché y reintentar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t.login.email}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--theme-main)] focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder={t.login.emailPlaceholder}
                  required
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t.login.password}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--theme-main)] focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder={t.login.passwordPlaceholder}
                  required
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
            style={{
              background: loading 
                ? 'linear-gradient(90deg, #9CA3AF, #6B7280)' 
                : 'var(--theme-matching-gradient)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t.login.loggingIn}
              </>
            ) : (
              <>
                <span>{t.login.loginButton}</span>
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Sección de Sign Up */}
        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">o</span>
            </div>
          </div>
          
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-3">
              {t.login.noAccount}
            </p>
            <button
              onClick={() => navigate('/signup')}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transform hover:scale-[1.02]"
            >
              <span>{t.login.signUp}</span>
              <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600 mb-4">
            {t.login.languageSelect}
          </div>
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setLang('es')}
              className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                lang === 'es' 
                  ? 'text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={{
                background: lang === 'es' ? 'var(--theme-main)' : 'transparent'
              }}
            >
              🇪🇸 Español
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                lang === 'en' 
                  ? 'text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={{
                background: lang === 'en' ? 'var(--theme-main)' : 'transparent'
              }}
            >
              🇺🇸 English
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

export default Login;