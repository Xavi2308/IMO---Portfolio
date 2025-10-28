import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../supabaseClient';

const CompanyContext = createContext();

export const CompanyProvider = ({ children, user: propUser }) => {
  const [company, setCompany] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propUser) {
      loadCompanyData(propUser);
    } else {
      setCompany(null);
      setCustomFields([]);
      setLoading(false);
    }
  }, [propUser?.id, propUser?.company_id]); // Solo depender de los IDs, no del objeto completo

  const loadCompanyData = async (user) => {
    try {
      setLoading(true);
      
      if (!user.company_id) {
        setCompany(null);
        setCustomFields([]);
        return;
      }

      // Si el usuario ya tiene la información de la empresa desde App.jsx, usarla
      if (user.company) {
        setCompany(user.company);
        
        // Cargar campos personalizados
        const { data: fields } = await supabase
          .from('custom_fields')
          .select('*')
          .eq('company_id', user.company.id)
          .order('field_order');
          
        setCustomFields(fields || []);
        return;
      }

      // Si no tiene la información de la empresa, consultarla
      console.log('Fetching company data from database');
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single();

      if (companyError) {
        console.error('Error loading company:', companyError);
        return;
      }

      setCompany(companyData);
      
      // Cargar campos personalizados
      const { data: fields } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('company_id', companyData.id)
        .order('field_order');
        
      setCustomFields(fields || []);
    } catch (error) {
      console.error('Error loading company:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (companyData) => {
    try {
      // Crear la empresa
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: companyData.name,
          code: companyData.code,
          subscription_type: companyData.subscription_type || 'free',
          subscription_status: 'trial', // Nuevas empresas empiezan en trial
          max_users: companyData.max_users || 5,
          primary_color: companyData.primary_color || '#3B82F6',
          secondary_color: companyData.secondary_color || '#EF4444',
          timezone: companyData.timezone || 'America/Bogota',
          currency: companyData.currency || 'COP',
          language: companyData.language || 'es',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días de trial
          special_agreement: false,
          settings: companyData.settings || {}
        }])
        .select()
        .single();

      if (companyError) throw companyError;

      // Actualizar el perfil del usuario con la empresa
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          company_id: newCompany.id,
          role: 'admin' // El creador de la empresa es admin por defecto
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Crear campos personalizados por defecto
      const defaultFields = [
        {
          company_id: newCompany.id,
          field_name: 'reference',
          field_type: 'text',
          field_label: 'Referencia',
          is_required: true,
          field_order: 1,
          default_value: null
        },
        {
          company_id: newCompany.id,
          field_name: 'color',
          field_type: 'text',
          field_label: 'Color',
          is_required: false,
          field_order: 2,
          default_value: null
        },
        {
          company_id: newCompany.id,
          field_name: 'size',
          field_type: 'text',
          field_label: 'Talla',
          is_required: false,
          field_order: 3,
          default_value: null
        },
        {
          company_id: newCompany.id,
          field_name: 'price_r',
          field_type: 'number',
          field_label: 'Precio Detal',
          is_required: true,
          field_order: 4,
          default_value: null
        }
      ];

      const { error: fieldsError } = await supabase
        .from('custom_fields')
        .insert(defaultFields);

      if (fieldsError) {
        console.warn('Error creating default fields:', fieldsError);
      }

      setCompany(newCompany);
      setCustomFields(defaultFields);
      return newCompany;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  };

  const updateCustomFields = async (fields) => {
    try {
      // Eliminar campos existentes
      await supabase
        .from('custom_fields')
        .delete()
        .eq('company_id', company.id);

      // Insertar nuevos campos
      if (fields.length > 0) {
        const fieldsWithCompany = fields.map(field => ({
          ...field,
          company_id: company.id
        }));

        await supabase
          .from('custom_fields')
          .insert(fieldsWithCompany);
      }

      setCustomFields(fields);
    } catch (error) {
      console.error('Error updating custom fields:', error);
      throw error;
    }
  };

  return (
    <CompanyContext.Provider value={{
      company,
      setCompany,
      customFields,
      setCustomFields,
      updateCustomFields,
      createCompany,
      loading
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};