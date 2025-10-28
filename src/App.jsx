/**
 * @file App.jsx
 * @description Componente principal de la aplicación que gestiona la autenticación del usuario, 
 * la inicialización de la sesión, la configuración del tema y el enrutamiento protegido por roles. 
 * Integra Supabase para la autenticación y manejo de datos, y utiliza React Router para la navegación.
 */

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

import supabase from './supabaseClient';
import supabaseAdmin from './supabaseAdmin';
import './styles.css';
import { generatePalette } from './utils/generatePalette';
import LanguageContext from './context/LanguageContext';
import LazyLoadingSpinner from './components/LazyLoadingSpinner';
import { preloadCriticalComponents, preloadByRole } from './utils/preloadManager';
import './utils/optimizationReport'; // Auto-show optimization report in development

// 🚀 OPTIMIZACIÓN: Lazy loading de componentes principales
const Login = lazy(() => import('./components/Login'));
const SignUp = lazy(() => import('./components/SignUp'));
const CompanyRegistration = lazy(() => import('./components/CompanyRegistration'));
const PlanSelection = lazy(() => import('./components/PlanSelection'));
const OnboardingDashboard = lazy(() => import('./components/OnboardingDashboard'));
const TestRegistration = lazy(() => import('./components/TestRegistration'));
const MainInterface = lazy(() => import('./components/MainInterface'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const CompanySetup = lazy(() => import('./components/CompanySetup'));
const ImoChatBall = lazy(() => import('./components/ImoChatBall'));
const ImoWelcomeNotification = lazy(() => import('./components/ImoWelcomeNotification'));


// Lista de roles válidos
const VALID_ROLES = ['admin', 'lector', 'vendedor', 'produccion', 'auxiliar_logistico'];
const AuthenticatedApp = ({ user, handleSetUser, lang, setLang }) => {
  console.log('🔍 AuthenticatedApp - Usuario:', {
    id: user?.id,
    email: user?.email,
    company_id: user?.company_id,
    company_name: user?.company?.name
  });
  
  // Si no tiene company_id, mostrar configuración
  if (!user?.company_id) {
    console.log('⚠️ Usuario sin empresa - revisar onboarding');
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl mb-4">Error de configuración</h2>
        <p>Usuario sin empresa asignada. Por favor contacte al administrador.</p>
      </div>
    );
    /*
    return (
      <CompanySetup 
        onComplete={(newCompany) => {
          console.log('Empresa creada:', newCompany);
          handleSetUser({
            ...user,
            company_id: newCompany.id,
            company: newCompany
          });
        }}
      />
    );
    */
  }

  // Mostrar interfaz principal con datos del usuario
  console.log('✅ Usuario tiene empresa, mostrando interfaz principal');
  return (
    <Suspense fallback={<div></div>}>
      <MainInterface user={user} setUser={handleSetUser} />
    </Suspense>
  );
};

/**
 * @description Componente raíz de la aplicación que maneja la autenticación, el tema y las rutas.
 * @returns {JSX.Element} Elemento JSX que representa la aplicación completa.
 */
function App() {
  // --- ESTADO DEL COMPONENTE ---
  // Inicializar user desde localStorage inmediatamente para evitar parpadeo
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('pear-user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        console.log('🔄 Inicializando usuario desde localStorage:', parsedUser.email);
        return parsedUser;
      }
    } catch (error) {
      console.error('❌ Error parseando usuario inicial:', error);
      localStorage.removeItem('pear-user');
    }
    return null;
  });
  
  const [loadingSession, setLoadingSession] = useState(() => {
    // Si ya tenemos usuario desde localStorage, no necesitamos loading
    try {
      const savedUser = localStorage.getItem('pear-user');
      return savedUser ? false : true;
    } catch {
      return true;
    }
  }); // Estado para indicar si la sesión está cargando
  const [isInitializing, setIsInitializing] = useState(false); // Prevenir múltiples inicializaciones
  const lastSessionRef = useRef(null); // Referencia para rastrear la última sesión procesada
  const processedSessionsRef = useRef(new Set()); // Set para rastrear sesiones ya procesadas
  const initializationTimeoutRef = useRef(null); // Referencia para el timeout de inicialización
  const lastAuthEventRef = useRef(null); // Referencia para evitar eventos auth duplicados
  const [debugInfo, setDebugInfo] = useState(''); // Estado para mostrar información de debug

  // --- MANEJADORES DE EVENTOS Y FUNCIONES AUXILIARES ---
  /**
   * @description Guarda o elimina los datos del usuario en localStorage, excluyendo el rol.
   * @param {Object|null} userData - Datos del usuario o null para limpiar.
   */
  const handleSetUser = (userData) => {
    if (userData) {
      // � TEMPORAL: Guardar todos los datos incluyendo el rol para que funcione el sidebar
      // TODO: En futuro implementar sistema más seguro de manejo de roles
      localStorage.setItem('pear-user', JSON.stringify(userData));
      
      // 🚀 OPTIMIZACIÓN: Precargar componentes basados en el rol del usuario
      preloadByRole(userData.role);
    } else {
      // Limpia los datos almacenados al cerrar sesión
      localStorage.removeItem('pear-user');
      localStorage.removeItem('activeModule');
      localStorage.removeItem('themeColor');
      localStorage.removeItem('textColor');
    }
    setUser(userData);
  };

  /**
   * @description Calcula el color de texto en función del color de fondo para garantizar legibilidad.
   * @param {string} hexColor - Color en formato hexadecimal (ej. #2E7D32).
   * @returns {string} Color de texto (#000000 o #FFFFFF).
   */
  // Ya no se necesita, los colores de texto se definen por CSS variables

  // --- EFECTOS SECUNDARIOS ---
  useEffect(() => {
    
    // Limpiar timeout anterior si existe
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }
    
    // Timeout como fallback para evitar carga infinita
    initializationTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Timeout de inicialización alcanzado - forzando fin de carga');
      setLoadingSession(false);
      setIsInitializing(false);
    }, 15000); // 15 segundos máximo
    
    /**
     * @description Configura el tema del usuario aplicando colores personalizados o de empresa
     * @param {Object} user - Objeto de usuario con datos de perfil y empresa
     */
    async function configureUserTheme(user) {
      // Configura el tema del usuario (PRIORIZAR configuración personal)
      let themeColor = '#7DD3C0'; // Color lima celeste claro por defecto
      
      try {
        // Intentar buscar configuración personal de tema
        const { data: themeData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', `theme_color_${user.id}`)
          .single();
        
        if (themeData?.value) {
          themeColor = themeData.value;
          console.log('✅ Color personalizado del usuario cargado:', themeColor);
        } else if (user.company?.primary_color) {
          // Solo usar el color de empresa si no hay configuración personal
          themeColor = user.company.primary_color;
          console.log('✅ Color de empresa cargado:', themeColor);
        } else {
          console.log('✅ Usando color lima celeste por defecto:', themeColor);
        }
      } catch (error) {
        // Si falla la consulta de settings, usar color de empresa o por defecto
        console.log('⚠️ No se pudo cargar configuración de tema, usando por defecto');
        if (user.company?.primary_color) {
          themeColor = user.company.primary_color;
        }
      }

      // Genera la paleta Matching Gradient y la aplica como variables CSS globales
      const userPalette = generatePalette(themeColor);
      const docRoot = document.documentElement;
      docRoot.style.setProperty('--theme-color', userPalette.main);
      docRoot.style.setProperty('--theme-main', userPalette.main);
      docRoot.style.setProperty('--theme-c1', userPalette.c1);
      docRoot.style.setProperty('--theme-c2', userPalette.c2);
      docRoot.style.setProperty('--theme-c3', userPalette.c3);
      docRoot.style.setProperty('--theme-c4', userPalette.c4);
      docRoot.style.setProperty('--theme-c5', userPalette.c5);
      docRoot.style.setProperty('--theme-matching-gradient', `linear-gradient(90deg, ${userPalette.c1}, ${userPalette.c2}, ${userPalette.main}, ${userPalette.c3}, ${userPalette.c4}, ${userPalette.c5})`);
      docRoot.style.setProperty('--theme-color-hover', userPalette.themeColorHover);
      docRoot.style.setProperty('--theme-secondary-1', userPalette.c3);
      docRoot.style.setProperty('--theme-secondary-2', userPalette.c4);
      docRoot.style.setProperty('--theme-secondary-3', userPalette.c5);
      docRoot.style.setProperty('--theme-secondary-4', userPalette.c2);
      localStorage.setItem('themeColor', themeColor);
    }

    /**
     * @description Inicializa la sesión del usuario, consulta datos y configura el tema.
     * @param {Object|null} session - Objeto de sesión de Supabase o null.
     */
    async function initializeSession(session) {
      
      console.log('🔄 Iniciando inicialización de sesión:', session?.user?.id);
      setDebugInfo('Iniciando inicialización de sesión...');
      
      // Prevenir múltiples inicializaciones simultáneas
      if (isInitializing) {
        console.log('⚠️ Ya hay una inicialización en curso, saltando...');
        setDebugInfo('Ya hay una inicialización en curso...');
        return;
      }
      
      // Verificar si es la misma sesión que ya procesamos
      const sessionId = session?.user?.id || null;
      const currentUserId = user?.id || null;
      
      // Si es la misma sesión que ya tenemos procesada, no recargar
      if (sessionId && sessionId === currentUserId && user) {
        console.log('✅ Misma sesión ya procesada, finalizando carga inmediatamente');
        setDebugInfo('');
        setLoadingSession(false);
        return;
      }
      
      // Solo procesar si realmente hay una sesión nueva o diferente
      if (!session && !sessionId) {
        console.log('❌ No hay sesión para procesar');
        setDebugInfo('');
        setLoadingSession(false);
        // Solo limpiar usuario si no hay uno válido desde localStorage
        if (!user) {
          handleSetUser(null);
        }
        return;
      }
      
      // Actualizar referencia de la sesión actual
      lastSessionRef.current = session;
      
      setIsInitializing(true);
      
      // Timeout de seguridad para evitar bloqueos
      const timeoutId = setTimeout(() => {
        console.warn('⏰ Timeout en inicialización de sesión');
        setDebugInfo('Timeout en inicialización');
        setIsInitializing(false);
        setLoadingSession(false);
      }, 15000); // 15 segundos máximo
      
      try {
        if (session) {
          console.log('👤 Cargando perfil de usuario:', session.user.id);
          setDebugInfo(`Cargando perfil: ${session.user.email}`);
          
          // Estrategia simplificada: intentar cargar perfil con timeout razonable
          const { data: userData, error: userError } = await Promise.race([
            supabase
              .from('users')
              .select(`
                id, username, role, first_name, last_name, company_id, email, is_active
              `)
              .eq('id', session.user.id)
              .single(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Query timeout')), 10000) // Aumentado a 10 segundos
            )
          ]);

          if (userError || !userData) {
            console.error('❌ Error al cargar perfil:', userError);
            setDebugInfo(`Error cargando perfil: ${userError?.message || 'Usuario no encontrado'}`);
            throw new Error('No se pudo cargar el perfil de usuario');
          }

          console.log('✅ Perfil cargado exitosamente:', userData);
          setDebugInfo(`Perfil cargado: ${userData.username}`);

          // Cargar información de empresa desde user_companies
          let companyData = null;
          try {
            const { data: companyInfo } = await supabase
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
              .eq('user_id', session.user.id)
              .eq('is_active', true)
              .single();
              
            if (companyInfo) {
              companyData = companyInfo;
              console.log('✅ Información de empresa cargada desde user_companies:', companyData);
            }
          } catch (companyError) {
            console.warn('⚠️ No se pudo cargar desde user_companies:', companyError);
            
            // Si falla user_companies, intentar cargar empresa directamente usando company_id
            if (userData.company_id) {
              console.log('🔄 Intentando cargar empresa directamente con company_id:', userData.company_id);
              try {
                const { data: directCompany } = await supabase
                  .from('companies')
                  .select(`
                    id,
                    name,
                    code,
                    subscription_type,
                    primary_color,
                    secondary_color,
                    settings
                  `)
                  .eq('id', userData.company_id)
                  .single();
                  
                if (directCompany) {
                  companyData = {
                    role: userData.role,
                    is_active: true,
                    companies: directCompany
                  };
                  console.log('✅ Empresa cargada directamente:', directCompany);
                }
              } catch (directError) {
                console.error('❌ Error cargando empresa directamente:', directError);
              }
            }
          }

          const finalUser = {
            id: userData.id,
            email: session.user.email || userData.email,
            username: userData.username || session.user.email?.split('@')[0] || 'usuario',
            role: companyData?.role || userData.role,
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            company_id: companyData?.companies?.id || userData.company_id,
            company: companyData?.companies || null
          };

          // Valida el rol contra la lista de roles permitidos
          if (!VALID_ROLES.includes(finalUser.role)) {
            console.warn('⚠️ Rol no válido detectado:', finalUser.role);
            
            // En lugar de cerrar sesión, asignar rol por defecto
            if (finalUser.role === 'user' || !finalUser.role) {
              console.log('🔧 Asignando rol por defecto: lector');
              finalUser.role = 'lector'; // Rol por defecto más permisivo
            } else {
              console.error('❌ Rol completamente inválido:', finalUser.role);
              setDebugInfo(`Rol inválido: ${finalUser.role}. Contacta al administrador.`);
              
              // Solo cerrar sesión si es un rol completamente inválido
              handleSetUser(null);
              await supabase.auth.signOut();
              alert('Tu rol no es válido. Contacta al administrador.');
              return;
            }
          }

          setDebugInfo('Configurando tema...');
          // Configurar tema de forma simple
          await configureUserTheme(finalUser);
          
          console.log('✅ Usuario establecido:', finalUser);
          setDebugInfo('Usuario establecido exitosamente');
          handleSetUser(finalUser);
          
        } else {
          console.log('❌ No hay sesión activa');
          setDebugInfo('No hay sesión activa');
          handleSetUser(null);
        }
      } catch (err) {
        console.error('❌ Error en inicialización:', err);
        setDebugInfo(`Error: ${err.message}`);
        
        // En caso de error, limpiar usuario y permitir re-login
        handleSetUser(null);
      } finally {
        console.log('🏁 Finalizando inicialización');
        setDebugInfo('');
        setLoadingSession(false);
        setIsInitializing(false);
        
        // Limpiar timeout de seguridad
        clearTimeout(timeoutId);
        
        // Limpiar timeout de referencia si existe
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
          initializationTimeoutRef.current = null;
        }
      }
    }

    // Obtiene la sesión inicial y maneja la validación
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Si hay sesión activa, verificar si necesitamos actualizar datos
        if (user && user.id === session.user.id) {
          // Mismo usuario ya cargado desde localStorage, finalizar inmediatamente
          console.log('✅ Usuario ya cargado desde localStorage, sesión válida');
          
          // Configurar tema en background sin bloquear UI
          configureUserTheme(user).catch((themeError) => {
            console.warn('⚠️ Error configurando tema:', themeError);
          });
          
          // Finalizar inmediatamente para evitar parpadeo
          setLoadingSession(false);
          setDebugInfo('');
        } else {
          // Usuario diferente o no hay usuario, inicializar completamente
          console.log('🔄 Inicializando sesión completa...');
          initializeSession(session);
        }
      } else {
        // Si no hay sesión, verificar si los datos de localStorage son válidos
        if (user) {
          console.log('� Verificando validez de usuario desde localStorage...');
          setDebugInfo('Verificando sesión guardada...');
          
          // Verificar si la sesión aún es válida consultando auth
          supabase.auth.getUser().then(({ data: { user: authUser }, error }) => {
            if (error || !authUser || authUser.id !== user.id) {
              // La sesión no es válida, limpiar localStorage
              console.log('❌ Sesión guardada no válida, limpiando...');
              localStorage.removeItem('pear-user');
              setUser(null);
              setLoadingSession(false);
              setDebugInfo('');
            } else {
              // La sesión es válida, mantener usuario actual
              console.log('✅ Sesión válida recuperada desde localStorage');
              
              // Configurar tema en background sin bloquear
              configureUserTheme(user).catch((themeError) => {
                console.warn('⚠️ Error configurando tema:', themeError);
              });
              
              // Finalizar inmediatamente
              setLoadingSession(false);
              setDebugInfo('');
            }
          });
        } else {
          // No hay usuario ni sesión
          setLoadingSession(false);
          setDebugInfo('');
        }
      }
    });

    // Escucha cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth event:', event, session?.user?.id);
      
      // Evitar procesamiento de eventos duplicados muy seguidos
      const now = Date.now();
      const eventKey = `${event}-${session?.user?.id || 'null'}`;
      
      if (lastAuthEventRef.current?.key === eventKey && 
          now - lastAuthEventRef.current.timestamp < 2000) { // Aumentar a 2 segundos
        console.log('⏭️ Ignorando evento auth duplicado:', event);
        return;
      }
      
      lastAuthEventRef.current = { key: eventKey, timestamp: now };
      
      // Ignorar eventos que no requieren reinicialización
      const ignoredEvents = [
        'INITIAL_SESSION', // Evento inicial ya manejado
        'USER_UPDATED',    // Cambios de perfil
        'MFA_CHALLENGE_VERIFIED', // Verificación MFA
        'TOKEN_REFRESHED', // Actualización de token (manejado automáticamente)
        'PASSWORD_RECOVERY', // Recuperación de contraseña
        'TAB_VISIBILITY_CHANGED' // Cambios de visibilidad de pestaña
      ];
      
      if (ignoredEvents.includes(event)) {
        console.log('⏭️ Ignorando evento auth sin acción:', event);
        return;
      }
      
      // Solo procesar eventos críticos
      if (event === 'SIGNED_OUT') {
        console.log('👋 Usuario cerró sesión intencionalmente');
        handleSetUser(null);
        setLoadingSession(false);
      } else if (event === 'SIGNED_IN') {
        const newSessionId = session?.user?.id;
        const currentUserId = user?.id;
        const sessionKey = `${newSessionId}-${session?.access_token?.slice(-8)}`;
        
        console.log('👤 Usuario inició sesión:', newSessionId);
        
        // CRÍTICO: Verificar si ya procesamos esta sesión exacta
        if (processedSessionsRef.current.has(sessionKey)) {
          console.log('🔄 Sesión ya procesada, ignorando evento duplicado');
          return;
        }
        
        // Solo reinicializar si realmente es necesario
        if (!user || !currentUserId) {
          console.log('🔄 No hay usuario cargado, inicializando por primera vez...');
          processedSessionsRef.current.add(sessionKey);
          await initializeSession(session);
        } else if (newSessionId !== currentUserId) {
          console.log('🔄 Usuario diferente detectado, cambiando sesión...');
          processedSessionsRef.current.clear(); // Limpiar sesiones anteriores
          processedSessionsRef.current.add(sessionKey);
          await initializeSession(session);
        } else {
          console.log('✅ Mismo usuario ya existe, marcando sesión como procesada');
          processedSessionsRef.current.add(sessionKey);
        }
      }
    });

    // Configurar tema lima celeste por defecto al inicializar la aplicación
    const defaultTheme = generatePalette('#7DD3C0');
    const docRoot = document.documentElement;
    docRoot.style.setProperty('--theme-color', defaultTheme.main);
    docRoot.style.setProperty('--theme-main', defaultTheme.main);
    docRoot.style.setProperty('--theme-c1', defaultTheme.c1);
    docRoot.style.setProperty('--theme-c2', defaultTheme.c2);
    docRoot.style.setProperty('--theme-c3', defaultTheme.c3);
    docRoot.style.setProperty('--theme-c4', defaultTheme.c4);
    docRoot.style.setProperty('--theme-c5', defaultTheme.c5);
    docRoot.style.setProperty('--theme-matching-gradient', `linear-gradient(90deg, ${defaultTheme.c1}, ${defaultTheme.c2}, ${defaultTheme.main}, ${defaultTheme.c3}, ${defaultTheme.c4}, ${defaultTheme.c5})`);
    docRoot.style.setProperty('--theme-color-hover', defaultTheme.themeColorHover);
    docRoot.style.setProperty('--theme-secondary-1', defaultTheme.c3);
    docRoot.style.setProperty('--theme-secondary-2', defaultTheme.c4);
    docRoot.style.setProperty('--theme-secondary-3', defaultTheme.c5);
    docRoot.style.setProperty('--theme-secondary-4', defaultTheme.c2);

    // Prevenir recargas innecesarias al cambiar de ventana
    const handleVisibilityChange = () => {
      // No hacer nada al cambiar visibilidad - evitar recargas innecesarias
      console.log('👁️ Visibilidad cambiada, ignorando para evitar reload');
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Limpia la suscripción al desmontar el componente
    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, []); // Ejecuta solo al montar el componente

  // Limpiar sesiones procesadas periódicamente para evitar acumulación de memoria
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (processedSessionsRef.current.size > 10) {
        console.log('🧹 Limpiando sesiones procesadas para optimizar memoria');
        processedSessionsRef.current.clear();
      }
    }, 300000); // Cada 5 minutos

    return () => clearInterval(cleanupInterval);
  }, []);

  // --- LISTENER PARA CAMBIOS DE TEMA ---
  useEffect(() => {
    const handleThemeChange = (event) => {
      const { color, palette } = event.detail;
      
      // Aplicar la nueva paleta a las variables CSS
      const root = document.documentElement;
      root.style.setProperty('--theme-color', palette.main);
      root.style.setProperty('--theme-main', palette.main);
      root.style.setProperty('--theme-c1', palette.c1);
      root.style.setProperty('--theme-c2', palette.c2);
      root.style.setProperty('--theme-c3', palette.c3);
      root.style.setProperty('--theme-c4', palette.c4);
      root.style.setProperty('--theme-c5', palette.c5);
      root.style.setProperty('--theme-matching-gradient', `linear-gradient(90deg, ${palette.c1}, ${palette.c2}, ${palette.main}, ${palette.c3}, ${palette.c4}, ${palette.c5})`);
      root.style.setProperty('--theme-color-hover', palette.themeColorHover);
      root.style.setProperty('--theme-secondary-1', palette.c3);
      root.style.setProperty('--theme-secondary-2', palette.c4);
      root.style.setProperty('--theme-secondary-3', palette.c5);
      root.style.setProperty('--theme-secondary-4', palette.c2);
    };

    // Agregar listener para eventos de cambio de tema
    window.addEventListener('themeChanged', handleThemeChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  /**
   * @description Componente para proteger rutas que requieren autenticación.
   * @param {JSX.Element} children - Componentes hijos a renderizar si está autenticado.
   * @returns {JSX.Element} Componente renderizado o redirección a login.
   */
  const ProtectedRoute = ({ children }) => {
    // Si tenemos usuario (desde localStorage) pero aún está cargando, mostrar la app
    // esto evita el parpadeo al login
    if (user && loadingSession) {
      return children; // Mostrar la aplicación mientras valida en background
    }
    
    if (loadingSession) {
      return <div className="p-4 text-center">Cargando sesión...</div>;
    }
    
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    
    return children;
  };

  /**
   * @description Componente para proteger rutas que requieren roles específicos.
   * @param {string[]} allowedRoles - Lista de roles permitidos para la ruta.
   * @param {JSX.Element} children - Componentes hijos a renderizar si el rol es válido.
   * @returns {JSX.Element} Componente renderizado, mensaje de error o redirección a login.
   */
  const RoleProtectedRoute = ({ allowedRoles, children }) => {
    // Si tenemos usuario pero aún está cargando, mostrar contenido si el rol es válido
    if (user && loadingSession && allowedRoles.includes(user.role)) {
      return children; // Mostrar la aplicación mientras valida en background
    }
    
    if (loadingSession) {
      return <div className="p-4 text-center">Cargando sesión...</div>;
    }
    
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    
    if (!allowedRoles.includes(user.role)) {
      // NO cerrar sesión - solo mostrar acceso denegado y redirigir al inicio
      console.log(`🚫 Acceso denegado para rol ${user.role} en ruta que requiere: ${allowedRoles.join(', ')}`);
      return <Navigate to="/" replace />;
    }
    
    return children;
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  // Inicializar idioma desde localStorage o 'es'
  const [lang, setLangState] = React.useState(() => localStorage.getItem('imo-lang') || 'es');

  // Guardar idioma en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('imo-lang', lang);
  }, [lang]);

  // setLang que actualiza estado y localStorage
  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem('imo-lang', newLang);
  };

  return (
      <LanguageContext.Provider value={{ lang, setLang }}>
          <div 
            className="min-h-screen" 
            style={{ 
              background: loadingSession ? '#f0f0f0' : 'var(--theme-matching-gradient)',
              transition: 'background 0.3s ease'
            }}
          >
            <Suspense fallback={<LazyLoadingSpinner message="Cargando aplicación..." />}>
              <Routes>
              {/* Ruta para la página de login */}
              <Route 
                path="/login" 
                element={
                  loadingSession ? (
                    <div className="min-h-screen bg-background flex items-center justify-center p-4">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--theme-color)] mx-auto mb-4"></div>
                        <p className="text-lg font-medium text-[var(--theme-c2)]">Cargando sesión...</p>
                        {debugInfo && (
                          <p className="text-sm text-[var(--theme-c4)] mt-2">{debugInfo}</p>
                        )}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="mt-4 text-xs text-gray-500">
                            <p>Estado: {isInitializing ? 'Inicializando' : 'Esperando'}</p>
                            <p>Debug: {debugInfo || 'Sin información'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : user ? (
                    <Navigate to="/" replace />
                  ) : (
                    <Login setUser={handleSetUser} />
                  )
                }
              />
              
              {/* Ruta para registro de nuevos usuarios */}
              <Route 
                path="/signup" 
                element={
                  loadingSession ? (
                    <LazyLoadingSpinner message="Cargando..." />
                  ) : user ? (
                    <Navigate to="/" replace />
                  ) : (
                    <SignUp />
                  )
                }
              />
              
              {/* Ruta para configuración de empresa (después del registro) */}
              <Route 
                path="/company-setup" 
                element={
                  loadingSession ? (
                    <LazyLoadingSpinner message="Cargando..." />
                  ) : user ? (
                    <Navigate to="/" replace />
                  ) : (
                    <CompanyRegistration />
                  )
                }
              />
              
              {/* Ruta para selección de plan */}
              <Route 
                path="/plan-selection" 
                element={
                  loadingSession ? (
                    <LazyLoadingSpinner message="Cargando..." />
                  ) : user ? (
                    <Navigate to="/" replace />
                  ) : (
                    <PlanSelection />
                  )
                }
              />
              {/* Ruta principal protegida */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AuthenticatedApp 
                      user={user} 
                      handleSetUser={handleSetUser} 
                      lang={lang} 
                      setLang={setLang} 
                    />
                  </ProtectedRoute>
                }
              />
              
              {/* Ruta para dashboard de onboarding */}
              <Route
                path="/onboarding-dashboard"
                element={
                  <ProtectedRoute>
                    <OnboardingDashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* Ruta temporal para pruebas */}
              <Route
                path="/test-registration"
                element={<TestRegistration />}
              />
              {/* Ruta protegida por rol para gestión de usuarios */}
              <Route
                path="/users"
                element={
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <UserManagement />
                  </RoleProtectedRoute>
                }
              />
              {/* Redirección para rutas no definidas */}
              <Route
                path="*"
                element={<Navigate to={user ? '/' : '/login'} replace />}
              />
              </Routes>
            </Suspense>
        </div>
    </LanguageContext.Provider>
  );
}

export default App;