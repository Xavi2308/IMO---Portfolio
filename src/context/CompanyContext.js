// ========================================
// CONTEXT PARA GESTIÓN DE EMPRESA ACTUAL
// ========================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../supabaseClient';

const CompanyContext = createContext();

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany debe usarse dentro de CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false); // Cambiado a false para evitar loading inicial innecesario
  const [error, setError] = useState(null);

  // Obtener empresa del usuario actual
  const fetchUserCompany = async () => {
    // Evitar consultas si ya hay empresa cargada
    if (company) {
      console.log('🏢 Empresa ya cargada, evitando consulta duplicada');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Obtener usuario autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('❌ No hay usuario autenticado en CompanyContext');
        setLoading(false);
        return;
      }

      console.log('👤 CompanyContext: Usuario autenticado:', user.id);

      // Buscar empresa del usuario en la tabla users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          company_id,
          companies(id, name, settings)
        `)
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('❌ Error obteniendo datos del usuario:', userError);
        
        // Si no encuentra en users, buscar en user_companies
        const { data: userCompanyData, error: ucError } = await supabase
          .from('user_companies')
          .select(`
            company_id,
            companies(id, name, settings)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (ucError) {
          console.error('❌ Error obteniendo empresa del usuario:', ucError);
          setError('No se pudo obtener la empresa del usuario');
          setLoading(false);
          return;
        }

        if (userCompanyData?.companies) {
          console.log('🏢 Empresa encontrada desde user_companies:', userCompanyData.companies.name);
          setCompany(userCompanyData.companies);
        }
      } else if (userData?.companies) {
        console.log('🏢 Empresa encontrada desde users:', userData.companies.name);
        setCompany(userData.companies);
      } else {
        console.log('⚠️ Usuario sin empresa asignada');
        setError('Usuario sin empresa asignada');
      }

    } catch (err) {
      console.error('❌ Error en fetchUserCompany:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cambiar empresa (para usuarios con múltiples empresas)
  const changeCompany = async (companyId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      
      setCompany(data);
      console.log('🔄 Empresa cambiada a:', data.name);
    } catch (err) {
      console.error('❌ Error cambiando empresa:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar empresa al montar (solo si es necesario)
  useEffect(() => {
    // No cargar automáticamente - dejar que App.jsx maneje la carga
    console.log('🏢 CompanyContext: Inicializado sin carga automática');
  }, []);

  // Efecto para escuchar cambios de autenticación (solo eventos críticos)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 CompanyContext auth event:', event);
      
      // Solo procesar eventos críticos para empresa
      if (event === 'SIGNED_OUT') {
        console.log('👋 CompanyContext: Usuario cerró sesión, limpiando empresa');
        setCompany(null);
        setLoading(false);
      }
      // No procesar SIGNED_IN aquí porque App.jsx ya maneja la carga de empresa
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    company,
    loading,
    error,
    fetchUserCompany,
    changeCompany,
    setCompany
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export default CompanyContext;
