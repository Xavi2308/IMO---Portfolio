/**
 * @file TestRegistration.jsx
 * @description Componente simple para probar el registro básico
 */

import React, { useState } from 'react';
import supabase from '../supabaseClient';

const TestRegistration = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleTest = async () => {
    setLoading(true);
    setResult('');

    try {
      console.log('🧪 Probando registro básico...');

      // 1. Crear usuario en auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });

      if (authError) {
        throw new Error(`Auth Error: ${authError.message}`);
      }

      console.log('✅ Usuario creado en auth:', authData.user.id);

      // 2. Crear usuario en tabla users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          username: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        throw new Error(`User DB Error: ${userError.message}`);
      }

      console.log('✅ Usuario creado en DB:', userData);

      // 3. Crear empresa simple
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: `Empresa de ${firstName}`,
          code: `EMP${Date.now()}`,
          subscription_type: 'free',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (companyError) {
        throw new Error(`Company Error: ${companyError.message}`);
      }

      console.log('✅ Empresa creada:', companyData);

      // 4. Actualizar usuario con company_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ company_id: companyData.id })
        .eq('id', authData.user.id);

      if (updateError) {
        throw new Error(`Update Error: ${updateError.message}`);
      }

      console.log('✅ Usuario actualizado con empresa');

      setResult(`✅ ÉXITO: Usuario ${email} creado con empresa ${companyData.name}`);

    } catch (error) {
      console.error('❌ Error en test:', error);
      setResult(`❌ ERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">🧪 Test de Registro</h2>
      
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Nombre"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <input
          type="text"
          placeholder="Apellido"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <button
          onClick={handleTest}
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Probando...' : 'Probar Registro'}
        </button>
      </div>

      {result && (
        <div className={`mt-4 p-3 rounded ${result.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {result}
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500">
        <p>Este componente prueba el flujo básico:</p>
        <ul className="list-disc list-inside">
          <li>Crear usuario en auth</li>
          <li>Crear usuario en tabla users</li>
          <li>Crear empresa</li>
          <li>Asociar usuario con empresa</li>
        </ul>
      </div>
    </div>
  );
};

export default TestRegistration;