/**
 * @file SignUpDebug.jsx  
 * @description Versión simplificada del registro para debugging
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { testDatabaseConnection, createSimpleUser } from '../utils/testDatabase';

const SignUpDebug = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: form, 2: testing, 3: success
  const [testResults, setTestResults] = useState([]);
  
  const [formData, setFormData] = useState({
    firstName: 'Juan',
    lastName: 'Probador',
    email: 'juanprobador@gmail.com',
    password: 'test123456',
    confirmPassword: 'test123456'
  });

  const addTestResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { message, type, timestamp }]);
  };

  const handleTest = async () => {
    setStep(2);
    setTestResults([]);
    addTestResult('🔍 Iniciando diagnóstico...', 'info');

    // Test 1: Conexión a base de datos
    addTestResult('📡 Verificando conexión a Supabase...', 'info');
    const dbTest = await testDatabaseConnection();
    
    if (!dbTest.success) {
      addTestResult(`❌ Error de base de datos: ${dbTest.message}`, 'error');
      if (dbTest.error === 'TABLA_USERS_NO_EXISTE') {
        addTestResult('💡 SOLUCIÓN: Ejecuta el archivo database_improvements.sql en Supabase', 'warning');
      }
      return;
    }
    
    addTestResult('✅ Conexión a base de datos exitosa', 'success');

    // Test 2: Registro de usuario en auth
    addTestResult('🔐 Probando registro en Supabase Auth...', 'info');
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      });

      if (authError) {
        addTestResult(`❌ Error en Auth: ${authError.message}`, 'error');
        return;
      }

      addTestResult('✅ Usuario registrado en Auth correctamente', 'success');
      addTestResult(`👤 ID de usuario: ${authData.user.id}`, 'info');

      // Test 3: Crear perfil en tabla users
      addTestResult('📋 Creando perfil en tabla users...', 'info');
      
      const userResult = await createSimpleUser({
        id: authData.user.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email
      });

      if (!userResult.success) {
        addTestResult(`❌ Error creando perfil: ${userResult.error.message}`, 'error');
        return;
      }

      addTestResult('✅ Perfil de usuario creado correctamente', 'success');
      addTestResult('🎉 ¡REGISTRO COMPLETADO EXITOSAMENTE!', 'success');
      
      setStep(3);
      
      // Redirigir después de 3 segundos
      setTimeout(() => {
        navigate('/company-setup', { 
          state: { 
            userId: authData.user.id,
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName
          } 
        });
      }, 3000);

    } catch (error) {
      addTestResult(`💥 Error inesperado: ${error.message}`, 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            🔧 Debug de Registro - IMO
          </h1>
          <p className="text-gray-600">
            Versión de diagnóstico para identificar problemas
          </p>
        </div>

        {step === 1 && (
          <div>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="firstName"
                  placeholder="Nombre"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Apellido"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full border rounded-lg px-3 py-2"
              />
              
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <button
              onClick={handleTest}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔍 Probar Registro con Debug
            </button>
            
            <button
              onClick={() => navigate('/signup')}
              className="w-full mt-2 text-blue-600 hover:underline"
            >
              ← Volver al registro normal
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">📊 Resultados del Diagnóstico</h3>
            </div>
            
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className={`mb-1 ${
                  result.type === 'error' ? 'text-red-400' : 
                  result.type === 'success' ? 'text-green-400' : 
                  result.type === 'warning' ? 'text-yellow-400' : 
                  'text-blue-400'
                }`}>
                  [{result.timestamp}] {result.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              ¡Registro Exitoso!
            </h2>
            <p className="text-gray-600 mb-4">
              Redirigiendo a configuración de empresa...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignUpDebug;