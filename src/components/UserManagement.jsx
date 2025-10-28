/**
 * @file UserManagement.jsx
 * @description Componente de React para la gestión de usuarios en la aplicación PearApp. Permite listar, agregar y eliminar usuarios,
 * adaptándose a entornos web y Electron mediante el uso de APIs específicas (fetch para web, electronAPI para Electron).
 * Implementa un formulario para crear nuevos usuarios y una lista interactiva para visualizar y eliminar usuarios existentes.
 */

import React, { useState, useEffect, useContext } from 'react';
import LanguageContext from '../context/LanguageContext';
import translations from '../translations';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../supabaseClient';

// Utilidad para texto blanco o negro según fondo c1-c5 o bg-theme
function getTextContrastClass(bgClass, forceBg) {
  // Si se fuerza el fondo (por ejemplo, bg-theme es blanco o negro)
  if (forceBg === 'light') return 'text-theme-c1';
  if (forceBg === 'dark') return 'text-theme-c5';
  if (bgClass.includes('bg-theme-c1')) return 'text-theme-c5';
  if (bgClass.includes('bg-theme-c5')) return 'text-theme-c1';
  // Para otros, usar texto por defecto
  return '';
}

// Detecta si la aplicación se está ejecutando dentro de Electron
const isElectron = !!window.electronAPI;

/**
 * @description Componente funcional para la gestión de usuarios. Maneja la creación, eliminación y visualización de usuarios
 * mediante un formulario y una lista dinámica. Soporta entornos web y Electron.
 * @returns {JSX.Element} Elemento JSX que representa la interfaz de gestión de usuarios.
 */
function UserManagement() {
  const { lang } = useContext(LanguageContext);
  const { user, company } = useAuth();
  
  // --- ESTADO DEL COMPONENTE ---
  const [users, setUsers] = useState([]); // Lista de usuarios obtenida de la API
  const [newEmail, setnewEmail] = useState(''); // Email del nuevo usuario
  const [newPassword, setNewPassword] = useState(''); // Contraseña del nuevo usuario
  const [newUsername, setnewUsername] = useState(''); // Nombre del nuevo usuario
  const [newRole, setNewRole] = useState('vendedor'); // Rol del nuevo usuario (valor por defecto: vendedor)
  const [error, setError] = useState(null); // Mensaje de error en caso de fallos
  const [loading, setLoading] = useState(false); // Indicador de carga durante operaciones asíncronas
  const [showForm, setShowForm] = useState(false); // Controla la visibilidad del formulario

  // --- EFECTOS SECUNDARIOS ---
  useEffect(() => {
    // Solo cargar usuarios cuando tengamos empresa definida
    if (company?.id) {
      fetchUsers(); // Carga inicial de usuarios al montar el componente
    }
  }, [company?.id]); // Dependencia de company.id

  /**
   * @description Obtiene la lista de usuarios desde la API, adaptándose al entorno (Electron o web).
   *              Actualiza el estado `users` con los datos obtenidos o muestra un error en caso de fallo.
   * @returns {Promise<void>}
   */
  const fetchUsers = async () => {
    try {
      // 🛡️ SEGURIDAD: Solo obtener usuarios de la empresa actual
      if (!company?.id) {
        console.warn('Esperando carga de empresa para obtener usuarios...');
        setUsers([]);
        setError(null);
        return;
      }

      console.log(`🔍 Cargando usuarios para empresa: ${company.name} (ID: ${company.id})`);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', company.id);

      if (error) {
        throw new Error(error.message);
      }

      setUsers(data || []); // Actualiza el estado con los usuarios obtenidos
      setError(null);
      console.log(`✅ ${data?.length || 0} usuarios cargados para ${company.name}`);
    } catch (err) {
      setError(`Error al cargar usuarios: ${err.message}`); // Captura y muestra errores
      console.error('Error al cargar usuarios:', err);
    }
  };

  // --- MANEJADORES DE EVENTOS Y FUNCIONES AUXILIARES ---
  /**
   * @description Maneja el envío del formulario para agregar un nuevo usuario. Realiza la solicitud a la API
   *              según el entorno (Electron o web), limpia el formulario y actualiza la lista de usuarios.
   * @param {Event} e - Evento del formulario.
   * @returns {Promise<void>}
   */
  const handleAddUser = async (e) => {
    e.preventDefault(); // Evita la recarga de la página
    setError(null); // Limpia errores previos
    setLoading(true); // Activa el indicador de carga

    try {
      // 🛡️ SEGURIDAD: Verificar que hay empresa antes de crear usuario
      if (!company?.id) {
        throw new Error('No se puede crear usuario sin empresa definida');
      }

      // 1. Crear usuario en Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      });

      if (authError) {
        throw new Error(`Error al crear usuario: ${authError.message}`);
      }

      // 2. Crear perfil en la tabla users con company_id asignado
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: newEmail,
          username: newUsername,
          role: newRole,
          company_id: company.id // 🎯 CRÍTICO: Asignar automáticamente la empresa actual
        });

      if (profileError) {
        throw new Error(`Error al crear perfil: ${profileError.message}`);
      }

      // Limpia los campos del formulario tras un éxito
      setnewEmail('');
      setNewPassword('');
      setnewUsername('');
      setNewRole('vendedor');
      setShowForm(false); // Oculta el formulario tras agregar
      await fetchUsers(); // Actualiza la lista de usuarios
      
      console.log(`✅ Usuario ${newUsername} creado exitosamente para empresa ${company.name}`);
    } catch (err) {
      setError(err.message); // Captura y muestra errores
      console.error('Error al crear usuario:', err);
    } finally {
      setLoading(false); // Desactiva el indicador de carga
    }
  };

  /**
   * @description Elimina un usuario especificado por su ID, previa confirmación de usuario. Realiza la solicitud a la API
   *              según el entorno (Electron o web) y actualiza la lista de usuarios.
   * @param {number} id - ID del usuario a eliminar.
   * @returns {Promise<void>}
   */
  const handleDeleteUser = async (id) => {
    // Muestra un diálogo de confirmación antes de eliminar
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción es irreversible.')) return;

    try {
      // 🛡️ SEGURIDAD: Verificar que el usuario pertenece a la empresa antes de eliminarlo
      const { data: userToDelete, error: checkError } = await supabase
        .from('users')
        .select('company_id, username')
        .eq('id', id)
        .single();

      if (checkError) {
        throw new Error(`Error al verificar usuario: ${checkError.message}`);
      }

      if (userToDelete.company_id !== company.id) {
        throw new Error('No tienes permisos para eliminar este usuario (pertenece a otra empresa)');
      }

      // Eliminar el perfil del usuario
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(`Error al eliminar usuario: ${deleteError.message}`);
      }

      console.log(`✅ Usuario ${userToDelete.username} eliminado exitosamente`);
      await fetchUsers(); // Actualiza la lista de usuarios tras eliminar
    } catch (err) {
      setError(err.message); // Captura y muestra errores
      console.error('Error al eliminar usuario:', err);
    }
  };

  /**
   * @description Obtiene el color de badge según el rol del usuario
   * @param {string} role - Rol del usuario
   * @returns {string} Clases CSS para el badge
   */
  // Devuelve solo la clase de fondo y borde, el color de texto lo decide el contraste
  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-theme-c3 border-theme',
      vendedor: 'bg-theme-c3 border-theme',
      produccion: 'bg-theme-c3 border-theme',
      lector: 'bg-theme-c4 border-default'
    };
    return colors[role] || colors.lector;
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-3 flex flex-wrap items-center gap-2">
                <span className="w-8 h-8 text-theme inline-block align-middle flex-shrink-0">
                  {/* User management icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                </span>
                <span className="flex-shrink-0">{translations[lang]?.user_management || 'Gestión de Usuarios'}</span>
              </h1>
              <p className={`text-muted ${getTextContrastClass('bg-background')}`}>{translations[lang]?.user_management_desc || 'Administra los usuarios de tu aplicación'}</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`inline-flex items-center px-4 py-2 bg-theme-c3 hover:bg-theme-c2 font-medium rounded-lg shadow-default transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-c2 focus:ring-offset-2 ${getTextContrastClass('bg-theme-c3')}`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {showForm ? (translations[lang]?.cancel || 'Cancelar') : (translations[lang]?.add_user || 'Nuevo Usuario')}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={`mb-6 bg-theme-c4 border border-theme-c2 px-4 py-3 rounded-lg flex items-center shadow-default ${getTextContrastClass('bg-theme-c4')}`}>
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Layout condicional: muestra formulario y lista en grid solo cuando showForm es true */}
        {showForm ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulario */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl shadow-default border border-default p-6">
                <h2 className={`text-xl font-semibold mb-6 ${getTextContrastClass('bg-card')}`}> 
                  {translations[lang]?.add_user || 'Agregar Usuario'}
                </h2>
                
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${getTextContrastClass('bg-background')}`}>
                      {translations[lang]?.username || 'Correo Electrónico'}
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setnewEmail(e.target.value)}
                      placeholder={translations[lang]?.username || 'usuario@ejemplo.com'}
                      className={`w-full px-3 py-2 bg-background border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme focus:border-theme transition-all ${getTextContrastClass('bg-background')}`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${getTextContrastClass('bg-background')}`}>
                      {translations[lang]?.full_name || 'Nombre Completo'}
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setnewUsername(e.target.value)}
                      placeholder={translations[lang]?.full_name || 'Juan Pérez'}
                      className={`w-full px-3 py-2 bg-background border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme focus:border-theme transition-all ${getTextContrastClass('bg-background')}`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${getTextContrastClass('bg-background')}`}>
                      {translations[lang]?.password || 'Contraseña'}
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={translations[lang]?.password || '••••••••'}
                      className={`w-full px-3 py-2 bg-background border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme focus:border-theme transition-all ${getTextContrastClass('bg-background')}`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${getTextContrastClass('bg-background')}`}>
                      {translations[lang]?.role || 'Rol'}
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className={`w-full px-3 py-2 bg-background border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme focus:border-theme transition-all ${getTextContrastClass('bg-background')}`}
                    >
                      <option value="admin">{translations[lang]?.admin || 'Administrador'}</option>
                      <option value="vendedor">{translations[lang]?.seller || 'Vendedor'}</option>
                      <option value="produccion">{translations[lang]?.production || 'Producción'}</option>
                      <option value="lector">{translations[lang]?.reader || 'Lector'}</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full bg-theme-c3 hover:bg-theme-c2 disabled:bg-text-muted font-medium py-2.5 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme focus:ring-offset-2 flex items-center justify-center ${getTextContrastClass('bg-theme-c3')}`}
                  >
                    {loading ? (
                      <>
                        <svg className={`animate-spin -ml-1 mr-3 h-5 w-5 ${getTextContrastClass('bg-theme-c3')}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {translations[lang]?.adding || 'Agregando...'}
                      </>
                    ) : (
                      translations[lang]?.add_user || 'Agregar Usuario'
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Lista de usuarios */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-xl shadow-default border border-default overflow-hidden">
                <div className="px-6 py-4 border-b border-default">
                  <h2 className={`text-xl font-semibold ${getTextContrastClass('bg-card')}`}> 
                    {translations[lang]?.registered_users || 'Usuarios Registrados'} ({users.length})
                  </h2>
                </div>

                {users.length === 0 ? (
                  <div className="p-12 text-center">
                    <svg className={`mx-auto h-12 w-12 text-muted ${getTextContrastClass('bg-card')}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <h3 className={`mt-4 text-lg font-medium ${getTextContrastClass('bg-card')}`}>{translations[lang]?.no_users || 'No hay usuarios'}</h3>
                    <p className={`mt-2 text-muted ${getTextContrastClass('bg-card')}`}>{translations[lang]?.add_first_user || 'Comienza agregando tu primer usuario.'}</p>
                  </div>
                ) : (
                  <div className="divide-y border-default">
                    {users.map((user) => (
                      <div key={user.id} className="p-6 hover-bg transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {/* Forzar contraste: si el tema es claro, texto oscuro; si es oscuro, texto claro */}
                              <div className={`w-10 h-10 bg-theme rounded-full flex items-center justify-center font-semibold ${getTextContrastClass('bg-theme', 'light')}`}> 
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className={`font-semibold ${getTextContrastClass('bg-card')}`}>{user.username}</h3>
                                <p className={`text-sm text-muted ${getTextContrastClass('bg-card')}`}>{user.email}</p>
                              </div>
                            </div>
                            {/* Forzar contraste para badge de rol: si es fondo claro, texto oscuro; si es fondo oscuro, texto claro */}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role).replace('text-theme', '')} ${getTextContrastClass(getRoleBadgeColor(user.role), getRoleBadgeColor(user.role).includes('bg-theme-c3') || getRoleBadgeColor(user.role).includes('bg-theme-c4') || getRoleBadgeColor(user.role).includes('bg-theme-c5') ? 'light' : 'dark')}`}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-error text-text-inverted px-2 py-1 rounded hover:bg-error-hover transition-colors"
                            title="Eliminar usuario"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Vista solo de lista cuando el formulario está oculto */
          <div className="bg-card rounded-xl shadow-default border border-default overflow-hidden">
            <div className="px-6 py-4 border-b border-default">
              <h2 className={`text-xl font-semibold ${getTextContrastClass('bg-card')}`}> 
                {translations[lang]?.registered_users || 'Usuarios Registrados'} ({users.length})
              </h2>
            </div>

            {users.length === 0 ? (
              <div className="p-12 text-center">
                <svg className={`mx-auto h-12 w-12 text-muted ${getTextContrastClass('bg-card')}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 className={`mt-4 text-lg font-medium ${getTextContrastClass('bg-card')}`}>No hay usuarios</h3>
                <p className={`mt-2 text-muted ${getTextContrastClass('bg-card')}`}>Comienza agregando tu primer usuario.</p>
              </div>
            ) : (
              <div className="divide-y border-default">
                {users.map((user) => (
                  <div key={user.id} className="p-6 hover-bg transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 bg-theme rounded-full flex items-center justify-center font-semibold ${getTextContrastClass('bg-theme', 'light')}`}> 
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className={`font-semibold ${getTextContrastClass('bg-card')}`}>{user.username}</h3>
                            <p className={`text-sm text-muted ${getTextContrastClass('bg-card')}`}>{user.email}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role).replace('text-theme', '')} ${getTextContrastClass(getRoleBadgeColor(user.role), getRoleBadgeColor(user.role).includes('bg-theme-c3') || getRoleBadgeColor(user.role).includes('bg-theme-c4') || getRoleBadgeColor(user.role).includes('bg-theme-c5') ? 'light' : 'dark')}`}>
                          {translations[lang]?.[user.role] || (user.role.charAt(0).toUpperCase() + user.role.slice(1))}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className={`inline-flex items-center px-3 py-2 text-sm font-medium bg-theme-c4 hover:bg-theme-c3 border border-theme-c2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-c2 focus:ring-offset-2 ${getTextContrastClass('bg-theme-c4')}`}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {translations[lang]?.delete_user || 'Eliminar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
