import React, { useState, useContext } from 'react';
import LanguageContext from '../context/LanguageContext';
import translations from '../translations';
import supabase from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import onboardingService from '../services/onboardingService';

// Función helper para timeout personalizado
const withTimeout = (promise, timeoutMs = 15000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

// Función de retry con timeout
const retryWithTimeout = async (operation, maxRetries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Intento ${attempt}/${maxRetries}`);
      return await withTimeout(operation(), 15000);
    } catch (error) {
      console.error(`❌ Intento ${attempt} falló:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (error.message.includes('timeout') || error.message.includes('Query timeout')) {
        console.log(`⏰ Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Aumentar delay exponencialmente
      } else {
        throw error; // Si no es timeout, no reintentar
      }
    }
  }
};

function SignUp() {
  const { lang, setLang } = useContext(LanguageContext);
  const navigate = useNavigate();
  const { setUser } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
  const t = translations[lang] || translations.es;

  const validateForm = () => {
    const errors = {};
    
    // Validar nombre
    if (!formData.firstName.trim()) {
      errors.firstName = 'El nombre es requerido';
    }
    
    // Validar apellido
    if (!formData.lastName.trim()) {
      errors.lastName = 'El apellido es requerido';
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = 'Por favor ingresa un email válido';
    }
    
    // Validar contraseña
    if (formData.password.length < 6) {
      errors.password = t.signup.passwordMinLength;
    }
    
    // Validar confirmación de contraseña
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t.signup.passwordMismatch;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error de validación cuando el usuario empiece a escribir
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('🔐 Iniciando proceso de registro para:', formData.email);
      console.log('📋 Datos del formulario:', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        passwordLength: formData.password.length
      });
      
      // 1. Crear usuario en Supabase Auth
      console.log('📡 Llamando a supabase.auth.signUp...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            username: `${formData.firstName} ${formData.lastName}`.trim()
          }
        }
      });
      
      console.log('📡 Respuesta de signUp:', { authData, authError });
      
      if (authError) {
        console.error('❌ Error de registro de Supabase:', authError);
        throw new Error(`Error de registro: ${authError.message}`);
      }
      
      if (!authData?.user) {
        console.error('❌ No se obtuvo información del usuario');
        throw new Error('Error en el registro - no se obtuvo información del usuario');
      }
      
      console.log('✅ Usuario registrado correctamente:', authData.user.id);
      
      // 2. Crear perfil en la tabla users con timeout
      console.log('👤 Creando perfil de usuario...');
      const profileData = {
        id: authData.user.id,
        email: formData.email,
        username: `${formData.firstName} ${formData.lastName}`.trim(),
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: 'admin', // El primer usuario de la empresa será admin
        is_active: true
      };
      
      console.log('📋 Datos del perfil a insertar:', profileData);
      
      try {
        // Usar retry con timeout personalizado para operaciones críticas
        const { data: profileResult, error: profileError } = await retryWithTimeout(
          () => supabase
            .from('users')
            .upsert(profileData, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            })
            .select()
            .single(),
          2, // Máximo 2 intentos
          3000 // 3 segundos entre intentos
        );
        
        console.log('📡 Respuesta de inserción de perfil:', { profileResult, profileError });
        
        if (profileError) {
          console.error('❌ Error creando perfil:', profileError);
          // Si hay error, continuamos sin detener el registro
          console.warn('⚠️ Continuando sin perfil completo...');
        } else {
          console.log('✅ Perfil creado exitosamente');
        }
      } catch (timeoutError) {
        console.error('⏰ Error final creando perfil después de reintentos:', timeoutError);
        console.warn('⚠️ Continuando sin perfil (falló después de reintentos)...');
      }
      
      // Continuar con el resto del proceso independientemente del perfil
        console.error('❌ Detalles completos del error:', JSON.stringify(profileError, null, 2));
        
        // Si es un error de tabla que no existe, dar mensaje más claro
        if (profileError.message?.includes('relation "users" does not exist')) {
          throw new Error('Error de configuración: La tabla de usuarios no existe en la base de datos. Por favor ejecuta el script de configuración primero.');
      }
      
      // 3. Actualizar contexto de usuario
      const userData = {
        id: authData.user.id,
        email: formData.email,
        username: `${formData.firstName} ${formData.lastName}`.trim(),
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: 'admin',
        is_active: true
      };
      
      setUser(userData);
      
      // 4. Enviar email de bienvenida (opcional) - TEMPORALMENTE DESHABILITADO
      /* try {
        await onboardingService.sendWelcomeEmail(authData.user.id, 'welcome_user', {
          firstName: formData.firstName,
          email: formData.email
        });
      } catch (emailError) {
        console.warn('⚠️ Error enviando email de bienvenida:', emailError);
        // No fallar el registro por esto
      } */
      
      // 5. Redirigir a creación de empresa
      console.log('🏢 Redirigiendo a creación de empresa...');
      console.log('✅ REGISTRO COMPLETADO EXITOSAMENTE!');
      
      navigate('/company-setup', { 
        state: { 
          userId: authData.user.id,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          onboardingStep: 'company_setup'
        } 
      });
      
    } catch (error) {
      console.error('❌ Error en handleSignUp:', error);
      setError(error.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-teal-300 to-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-300 to-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-cyan-300 to-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      {/* Tarjeta principal de registro */}
      <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10 border border-white/20">
        <div className="text-center mb-8">
          <div className="relative mb-6">
            <img 
              src="/logo-removebg-preview.png" 
              alt="Logo IMO" 
              className="mx-auto h-16 w-auto mb-4 transition-transform duration-300 hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
            {t.signup.title}
          </h1>
          <p className="text-gray-600 text-sm">
            {t.signup.subtitle}
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
                <h3 className="text-sm font-medium text-red-800">Error de registro</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t.signup.firstName}
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--theme-main)] focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                  validationErrors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={t.signup.firstNamePlaceholder}
                required
              />
              {validationErrors.firstName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t.signup.lastName}
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--theme-main)] focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                  validationErrors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={t.signup.lastNamePlaceholder}
                required
              />
              {validationErrors.lastName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t.signup.email}
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 pl-11 border rounded-xl focus:ring-2 focus:ring-[var(--theme-main)] focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                  validationErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={t.signup.emailPlaceholder}
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t.signup.password}
            </label>
            <div className="relative">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 pl-11 border rounded-xl focus:ring-2 focus:ring-[var(--theme-main)] focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                  validationErrors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={t.signup.passwordPlaceholder}
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t.signup.confirmPassword}
            </label>
            <div className="relative">
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-3 pl-11 border rounded-xl focus:ring-2 focus:ring-[var(--theme-main)] focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                  validationErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={t.signup.confirmPasswordPlaceholder}
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
              )}
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
                {t.signup.signingUp}
              </>
            ) : (
              <>
                <span>{t.signup.signUpButton}</span>
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Botón bonito para volver al login */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-4">
            {t.signup.hasAccount}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="group relative inline-flex items-center px-6 py-3 overflow-hidden text-sm font-medium text-gray-600 border-2 border-gray-200 rounded-xl hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300 hover:border-teal-500 hover:shadow-lg transform hover:scale-105"
          >
            <span className="absolute left-0 block w-full h-0 transition-all bg-gradient-to-r from-teal-500 to-cyan-500 opacity-100 group-hover:h-full top-1/2 group-hover:top-0 duration-400 ease"></span>
            <span className="absolute right-0 flex items-center justify-start w-10 h-10 duration-300 transform translate-x-full group-hover:translate-x-0 ease">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </span>
            <span className="relative transform group-hover:-translate-x-2 transition-transform duration-300">
              {t.signup.signIn}
            </span>
          </button>
        </div>

        {/* Selector de idioma */}
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

      <style>{`
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

export default SignUp;