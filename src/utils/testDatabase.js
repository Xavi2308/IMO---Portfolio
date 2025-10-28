/**
 * @file testDatabase.js
 * @description Script para probar la conexión y verificar tablas de Supabase
 */

import supabase from '../supabaseClient';

// Función para verificar conexión y tablas
export const testDatabaseConnection = async () => {
  try {
    console.log('🔍 Verificando conexión a Supabase...');
    
    // 1. Verificar conexión básica
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (testError) {
      console.error('❌ Error de conexión:', testError);
      
      if (testError.message.includes('relation "users" does not exist')) {
        console.error('💥 PROBLEMA: La tabla "users" no existe');
        console.log('📋 SOLUCIÓN: Necesitas ejecutar el script database_improvements.sql');
        return {
          success: false,
          error: 'TABLA_USERS_NO_EXISTE',
          message: 'La tabla "users" no existe. Ejecuta el script de base de datos primero.'
        };
      }
      
      return {
        success: false,
        error: 'CONNECTION_ERROR',
        message: testError.message
      };
    }
    
    console.log('✅ Conexión a base de datos exitosa');
    
    // 2. Verificar estructura de la tabla users
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' });
    
    if (columnError) {
      console.warn('⚠️ No se pudo verificar estructura de tabla users:', columnError);
    } else {
      console.log('📊 Columnas disponibles en tabla users:', columns);
    }
    
    return {
      success: true,
      message: 'Conexión exitosa'
    };
    
  } catch (error) {
    console.error('💥 Error verificando base de datos:', error);
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: error.message
    };
  }
};

// Función para verificar si un usuario ya existe
export const checkUserExists = async (email) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error verificando usuario existente:', error);
    return false;
  }
};

// Función para crear usuario simplificado (solo para debug)
export const createSimpleUser = async (userData) => {
  try {
    console.log('👤 Creando usuario simplificado...');
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userData.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        username: `${userData.firstName} ${userData.lastName}`.trim(),
        is_active: true
      })
      .select();
      
    if (error) {
      throw error;
    }
    
    console.log('✅ Usuario creado:', data[0]);
    return { success: true, data: data[0] };
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    return { success: false, error };
  }
};

export default {
  testDatabaseConnection,
  checkUserExists,
  createSimpleUser
};