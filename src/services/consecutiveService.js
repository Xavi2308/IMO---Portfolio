// ========================================
// SERVICIO DE CONSECUTIVOS Y NUMERACIÓN
// ========================================

import { supabase } from '../supabase';

export class ConsecutiveService {
  
  // Obtener siguiente número consecutivo
  static async getNext(companyId, type) {
    try {
      const { data, error } = await supabase.rpc('get_next_consecutive', {
        p_company_id: companyId,
        p_type: type
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error getting consecutive number:', err);
      throw err;
    }
  }

  // Obtener consecutivo actual sin incrementar
  static async getCurrent(companyId, type) {
    try {
      const { data, error } = await supabase
        .from('company_consecutives')
        .select('current_number, prefix')
        .eq('company_id', companyId)
        .eq('consecutive_type', type)
        .single();

      if (error) throw error;
      
      if (!data) {
        return null;
      }

      const prefix = data.prefix || '';
      const number = String(data.current_number).padStart(6, '0');
      return `${prefix}${number}`;
    } catch (err) {
      console.error('Error getting current consecutive:', err);
      throw err;
    }
  }

  // Configurar prefijo para un tipo de consecutivo
  static async setPrefix(companyId, type, prefix) {
    try {
      const { error } = await supabase
        .from('company_consecutives')
        .upsert({
          company_id: companyId,
          consecutive_type: type,
          prefix: prefix,
          current_number: 0
        }, {
          onConflict: 'company_id,consecutive_type'
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error setting prefix:', err);
      throw err;
    }
  }

  // Obtener todos los tipos de consecutivos de una empresa
  static async getAll(companyId) {
    try {
      const { data, error } = await supabase
        .from('company_consecutives')
        .select('*')
        .eq('company_id', companyId)
        .order('consecutive_type');

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error getting all consecutives:', err);
      throw err;
    }
  }

  // Resetear consecutivo (solo para admin)
  static async reset(companyId, type, newNumber = 0) {
    try {
      const { error } = await supabase
        .from('company_consecutives')
        .update({ current_number: newNumber })
        .eq('company_id', companyId)
        .eq('consecutive_type', type);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error resetting consecutive:', err);
      throw err;
    }
  }
}

export default ConsecutiveService;
