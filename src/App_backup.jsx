/**
 * @file App.jsx - Versión simplificada temporal
 * @description Versión temporal que bypassa las consultas problemáticas a la base de datos
 */

import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './components/Login';
import MainInterface from './components/MainInterface';
import UserManagement from './components/UserManagement';
import CompanySetup from './components/CompanySetup';
import './styles.css';
import { generatePalette } from './utils/generatePalette';
import ImoChatBall from './components/ImoChatBall';
import ImoWelcomeNotification from './components/ImoWelcomeNotification';
import LanguageContext from './context/LanguageContext';
import { CompanyProvider, useCompany } from './context/CompanyContext';

// Lista de roles válidos
const VALID_ROLES = ['admin', 'lector', 'vendedor', 'produccion'];

/**
 * @description Componente que maneja el flujo principal después de la autenticación
 */
const AuthenticatedApp = ({ user, handleSetUser, lang, setLang }) => {
  const { company, loading: companyLoading } = useCompany();

  console.log('AuthenticatedApp rendered with user:', user);
  console.log('Company loading:', companyLoading, 'Company:', company);

  if (companyLoading) {
    return <div className="p-4 text-center">Cargando información de empresa...</div>;
  }

  // Si el usuario no tiene empresa asignada, mostrar configuración
  if (!company) {
    return (
      <CompanySetup 
        onComplete={(newCompany) => {
          console.log('Empresa creada:', newCompany);
          // La empresa se actualizará automáticamente en el context
        }}
      />
    );
  }

  // Si tiene empresa, mostrar la interfaz principal
  return (
    <>
      <MainInterface user={user} setUser={handleSetUser} />
      <ImoWelcomeNotification username={user.username || user.email} />
      <ImoChatBall username={user.username || user.email || ''} />
    </>
  );
};

/**
 * @description Componente raíz de la aplicación - VERSIÓN TEMPORAL SIMPLIFICADA
 */
function App() {
  // --- ESTADO DEL COMPONENTE ---
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // --- MANEJADORES DE EVENTOS ---
  const handleSetUser = (userData) => {
    if (userData) {
      const { role, ...userWithoutRole } = userData;
      localStorage.setItem('pear-user', JSON.stringify(userWithoutRole));
    } else {
      localStorage.removeItem('pear-user');
      localStorage.removeItem('activeModule');
      localStorage.removeItem('themeColor');
      localStorage.removeItem('textColor');
    }
    setUser(userData);
  };

  // --- EFECTOS SECUNDARIOS ---
  useEffect(() => {
    console.log('Main useEffect executed - initializing session');
    
    // Timeout como fallback
    const timeoutId = setTimeout(() => {
      console.log('Session initialization timeout - setting loading to false');
      setLoadingSession(false);
    }, 10000);
    
    async function initializeSession(session) {
      console.log('initializeSession called with session:', session);
      
      if (session) {
        console.log('Session exists, user ID:', session.user.id);
        
        // SOLUCIÓN TEMPORAL: Crear un usuario con datos hardcodeados
        console.log('Creating temporary user profile...');
        
        const finalUser = {
          id: session.user.id,
          email: session.user.email,
          username: session.user.email?.split('@')[0] || 'usuario',
          role: 'admin', // Rol por defecto
          first_name: '',
          last_name: '',
          company_id: '9a54c748-39a9-4ebd-9cc2-2a9f1f8744cf', // Demo Company ID
          company: {
            id: '9a54c748-39a9-4ebd-9cc2-2a9f1f8744cf',
            name: 'Demo Company',
            subscription_type: 'premium',
            special_agreement: true,
            primary_color: '#DAA520',
            secondary_color: '#B8860B'
          }
        };

        console.log('Setting temporary user:', finalUser);
        handleSetUser(finalUser);

        // Configurar tema básico
        const themeColor = '#DAA520'; // Color dorado de Demo Company
        const palette = generatePalette(themeColor);
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
        localStorage.setItem('themeColor', themeColor);
        
        console.log('Temporary session setup complete');
      } else {
        console.log('No session found, setting user to null');
        handleSetUser(null);
      }
      
      console.log('Setting loadingSession to false');
      setLoadingSession(false);
      clearTimeout(timeoutId);
    }

    // Obtiene la sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session obtained:', session);
      initializeSession(session);
    });

    // Escucha cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      await initializeSession(session);
    });

    // Limpia la suscripción al desmontar el componente
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // --- LISTENER PARA CAMBIOS DE TEMA ---
  useEffect(() => {
    const handleThemeChange = (event) => {
      console.log('App.jsx: Evento de cambio de tema recibido:', event.detail);
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
      
      console.log('App.jsx: Variables CSS actualizadas globalmente');
    };

    window.addEventListener('themeChanged', handleThemeChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  // --- COMPONENTES DE PROTECCIÓN DE RUTAS ---
  const ProtectedRoute = ({ children }) => {
    if (loadingSession) {
      return <div className="p-4 text-center">Cargando sesión...</div>;
    }
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  const RoleProtectedRoute = ({ allowedRoles, children }) => {
    if (loadingSession) {
      return <div className="p-4 text-center">Cargando sesión...</div>;
    }
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (!allowedRoles.includes(user.role)) {
      handleSetUser(null);
      supabase.auth.signOut();
      return <div className="text-red-500 text-center p-4">Acceso denegado. Tu sesión ha sido cerrada por intento de acceso no autorizado.</div>;
    }
    return children;
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  const [lang, setLangState] = React.useState(() => localStorage.getItem('imo-lang') || 'es');

  useEffect(() => {
    localStorage.setItem('imo-lang', lang);
  }, [lang]);

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem('imo-lang', newLang);
  };

  console.log('App render - loadingSession:', loadingSession, 'user:', user);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <CompanyProvider user={user}>
        <div className="min-h-screen" style={{ background: 'var(--theme-matching-gradient)' }}>
          <Routes>
            {/* Ruta para la página de login */}
            <Route 
              path="/login" 
              element={
                loadingSession ? (
                  <div className="p-4 text-center">Cargando sesión...</div>
                ) : user ? (
                  <Navigate to="/" replace />
                ) : (
                  <Login setUser={handleSetUser} />
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
        </div>
      </CompanyProvider>
    </LanguageContext.Provider>
  );
}

export default App;
