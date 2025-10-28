import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

/**
 * Hook para manejar límites de planes de suscripción
 */
export function usePlanLimits() {
  const [company, setCompany] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Obtener empresa del usuario actual
    const getCurrentCompany = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('company_id, companies(id, name)')
          .eq('id', user.id)
          .single();

        if (userData?.companies) {
          setCompany(userData.companies);
        }
      } catch (error) {
        console.error('Error getting company:', error);
      }
    };

    getCurrentCompany();
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchCompanyLimits();
    }
  }, [company?.id]);

  const fetchCompanyLimits = async () => {
    try {
      setLoading(true);
      setError(null);

      // Llamar a la función RPC para obtener límites
      const { data, error: rpcError } = await supabase
        .rpc('get_company_limits', { company_uuid: company.id });

      if (rpcError) {
        throw rpcError;
      }

      setLimits(data);
    } catch (err) {
      console.error('Error fetching company limits:', err);
      setError(err.message);
      
      // Fallback a límites por defecto si hay error
      setLimits({
        max_products: -1,
        max_users: -1,
        max_storage_mb: 1000
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validar si se puede crear un nuevo recurso
   */
  const canCreateResource = async (resourceType, currentCount = null) => {
    if (!limits) return false;

    const maxAllowed = limits[`max_${resourceType}`];
    
    // -1 significa ilimitado
    if (maxAllowed === -1) return true;

    // Si no se proporciona el conteo actual, consultarlo
    let count = currentCount;
    if (count === null) {
      count = await getCurrentResourceCount(resourceType);
    }

    return count < maxAllowed;
  };

  /**
   * Obtener conteo actual de un tipo de recurso
   */
  const getCurrentResourceCount = async (resourceType) => {
    try {
      let query;
      
      switch (resourceType) {
        case 'products':
          query = supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);
          break;
          
        case 'users':
          query = supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);
          break;
          
        default:
          throw new Error(`Tipo de recurso no soportado: ${resourceType}`);
      }

      const { count, error } = await query;
      
      if (error) throw error;
      
      return count || 0;
    } catch (err) {
      console.error(`Error counting ${resourceType}:`, err);
      return 0;
    }
  };

  /**
   * Validar límites usando la función de Supabase
   */
  const validateLimitsInDB = async (resourceType, currentCount = null) => {
    try {
      let count = currentCount;
      if (count === null) {
        count = await getCurrentResourceCount(resourceType);
      }

      const { data, error } = await supabase
        .rpc('validate_company_limits', {
          company_uuid: company.id,
          resource_type: resourceType,
          current_count: count
        });

      if (error) throw error;

      return data;
    } catch (err) {
      console.error('Error validating limits in DB:', err);
      return false;
    }
  };

  /**
   * Obtener información del plan actual
   */
  const getPlanInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          subscription_type,
          plan_id,
          subscription_plans (
            name,
            display_name,
            description,
            price,
            currency,
            billing_period,
            features,
            limits
          )
        `)
        .eq('id', company.id)
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error('Error fetching plan info:', err);
      return null;
    }
  };

  /**
   * Verificar si una característica está disponible en el plan
   */
  const hasFeature = (featureName) => {
    if (!limits || !company) return false;
    
    // Por ahora, asumimos que las características están en las features del plan
    // Esta lógica se puede expandir según la implementación específica
    return true; // Placeholder - implementar según necesidades
  };

  return {
    limits,
    loading,
    error,
    canCreateResource,
    getCurrentResourceCount,
    validateLimitsInDB,
    getPlanInfo,
    hasFeature,
    refetch: fetchCompanyLimits
  };
}

/**
 * Hook para obtener información de planes disponibles
 */
export function useSubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (fetchError) throw fetchError;

      setPlans(data || []);
    } catch (err) {
      console.error('Error fetching subscription plans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans
  };
}

/**
 * Componente de validación de límites para usar en formularios
 */
export function useLimitValidation(resourceType) {
  const { canCreateResource, getCurrentResourceCount } = usePlanLimits();
  const [isValid, setIsValid] = useState(null);
  const [currentCount, setCurrentCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const validateLimit = async () => {
    setLoading(true);
    try {
      const count = await getCurrentResourceCount(resourceType);
      setCurrentCount(count);
      
      const valid = await canCreateResource(resourceType, count);
      setIsValid(valid);
      
      return valid;
    } catch (error) {
      console.error('Error validating limit:', error);
      setIsValid(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validateLimit();
  }, [resourceType]);

  return {
    isValid,
    currentCount,
    loading,
    validateLimit
  };
}