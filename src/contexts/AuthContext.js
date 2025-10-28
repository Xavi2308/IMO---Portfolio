// 🚀 CONTEXTO DE AUTENTICACIÓN OPTIMIZADO
// Para garantizar que los hooks optimizados funcionen correctamente

import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Inicializando autenticación...');
        
        // 🛡️ SEGURIDAD: Limpiar datos potencialmente corruptos al inicio
        const cleanAuth = () => {
          setUser(null);
          setCompany(null);
          localStorage.removeItem('user');
          localStorage.removeItem('company');
        };

        // Verificar sesión actual sin fallback a localStorage
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error obteniendo sesión:', error);
          cleanAuth();
          return;
        }

        if (session?.user && mounted) {
          console.log('✅ Sesión válida encontrada para:', session.user.email);
          await loadUserData(session.user);
        } else {
          console.log('ℹ️ No hay sesión activa');
          cleanAuth();
        }
      } catch (error) {
        console.error('❌ Error inicializando auth:', error);
        // Limpiar datos en caso de error
        setUser(null);
        setCompany(null);
        localStorage.removeItem('user');
        localStorage.removeItem('company');
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
          console.log('✅ Inicialización de auth completada');
        }
      }
    };

    initializeAuth();

    // Escuchar cambios de autenticación
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserData(session.user);
      } else if (event === 'SIGNED_OUT') {
        // 🛡️ SEGURIDAD: Limpieza agresiva de datos SOLO al cerrar sesión
        console.log('🧹 Sesión cerrada, limpiando datos...');
        setUser(null);
        setCompany(null);
        localStorage.removeItem('user');
        localStorage.removeItem('company');
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      } else if (event === 'TOKEN_REFRESHED') {
        // ✅ TOKEN_REFRESHED es normal, no limpiar datos
        console.log('🔄 Token refrescado automáticamente');
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const loadUserData = async (authUser) => {
    try {
      console.log('🔄 Cargando datos del usuario:', authUser.id);
      
      // 🛡️ SEGURIDAD: Limpiar datos anteriores al cargar nuevo usuario
      setUser(null);
      setCompany(null);
      localStorage.removeItem('user');
      localStorage.removeItem('company');
      
      // Intentar cargar datos de la tabla users (no profiles)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        console.warn('⚠️ Error cargando usuario de DB, usando datos de auth:', userError);
        setUser({
          id: authUser.id,
          email: authUser.email,
          username: authUser.email?.split('@')[0] || 'Usuario',
          role: 'vendedor'
        });
        return;
      }

      console.log('✅ Usuario cargado de users:', userData.email);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      // Si tiene company_id, cargar empresa
      if (userData.company_id) {
        try {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', userData.company_id)
            .single();
            
          if (!companyError && companyData) {
            console.log('✅ Empresa cargada:', companyData.name);
            setCompany(companyData);
            localStorage.setItem('company', JSON.stringify(companyData));
          } else {
            console.error('❌ Error cargando empresa:', companyError);
          }
        } catch (companyError) {
          console.warn('⚠️ No se pudo cargar empresa:', companyError);
        }
      } else {
        console.warn('⚠️ Usuario sin company_id asignado');
      }

    } catch (error) {
      console.error('❌ Error cargando datos del usuario:', error);
      // Fallback a datos básicos con limpieza previa
      setUser({
        id: authUser.id,
        email: authUser.email,
        username: authUser.email?.split('@')[0] || 'Usuario',
        role: 'vendedor'
      });
    }
  };

  const updateUser = (newUserData) => {
    setUser(newUserData);
    localStorage.setItem('user', JSON.stringify(newUserData));
  };

  const updateCompany = (newCompanyData) => {
    setCompany(newCompanyData);
    localStorage.setItem('company', JSON.stringify(newCompanyData));
  };

  const signOut = async () => {
    try {
      console.log('🧹 Iniciando logout completo...');
      
      // 1. Cerrar sesión en Supabase
      await supabase.auth.signOut();
      
      // 2. Limpiar estado de React
      setUser(null);
      setCompany(null);
      
      // 3. Limpiar localStorage y sessionStorage completamente
      localStorage.removeItem('user');
      localStorage.removeItem('company');
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      // 4. Limpiar cualquier cache del navegador
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      console.log('✅ Logout completo - datos limpiados');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  const value = {
    user,
    company,
    companyId: company?.id,
    loading,
    initialized,
    setUser: updateUser,
    setCompany: updateCompany,
    signOut,
    loadUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
