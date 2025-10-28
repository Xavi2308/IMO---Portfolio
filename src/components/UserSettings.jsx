import React, { useState } from 'react';
import { supabase } from '../supabase';

const UserSettings = ({ user, onUpdate }) => {
  const [username, setUsername] = useState(user.username || '');
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          username: username.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim()
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          setMessage('⚠️ Este nombre de usuario ya está en uso. Elige otro.');
        } else {
          setMessage('❌ Error al actualizar el perfil. Inténtalo de nuevo.');
        }
        return;
      }

      setMessage('✅ Perfil actualizado correctamente');
      
      // Notificar al componente padre para actualizar el usuario
      if (onUpdate) {
        onUpdate({
          ...user,
          username: username.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim()
        });
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('❌ Error inesperado. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Mi Perfil</h3>
        <p className="text-sm text-gray-600">Personaliza tu información de usuario</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de Usuario
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: juan_perez"
            maxLength={50}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Este será tu nombre visible en la aplicación
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tu nombre"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellido
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tu apellido"
            maxLength={100}
          />
        </div>

        <div className="bg-gray-50 px-3 py-2 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <p className="text-sm text-gray-600">{user.email}</p>
          <p className="text-xs text-gray-500 mt-1">
            El email se usa solo para iniciar sesión y no se puede cambiar
          </p>
        </div>

        {message && (
          <div className={`p-3 rounded-lg ${
            message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
};

export default UserSettings;
