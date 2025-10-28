// --- IMPORTACIONES ---
// Importa la biblioteca React para definir el componente funcional.
import React from 'react';
// Importa el componente SubInventoryManagement que se renderiza condicionalmente.
import SubInventoryManagement from './SubInventoryManagement';
// 📦 DESPACHOS: Importa el componente de gestión de despachos
import DeliveryModule from './DeliveryModule';

/**
 * @file Production.jsx
 * @description Componente principal del módulo de producción. Gestiona la navegación entre submódulos como la gestión de inventario y la generación de stickers. Renderiza el contenido adecuado según el submódulo activo y maneja errores y movimientos de usuario.
 */

/**
 * @description Componente funcional que representa el módulo de producción. Renderiza una interfaz para navegar entre submódulos o muestra el componente de gestión de inventario según el estado del submódulo activo.
 * @param {Object} user - Objeto que contiene la información del usuario autenticado.
 * @param {Function} logMovement - Función para registrar movimientos o acciones del usuario.
 * @param {Function} setError - Función para establecer un mensaje de error en el estado.
 * @param {string} errorMessage - Mensaje de error actual para mostrar al usuario.
 * @param {string} activeSubmodule - Submódulo activo (e.g., 'inventory' o null).
 * @param {Function} setActiveModule - Función para cambiar el módulo o submódulo activo.
 * @returns {JSX.Element} Elemento JSX que representa el módulo de producción.
 */
const Production = ({ user, logMovement, setError, errorMessage, activeSubmodule, setActiveModule }) => {
  console.log('🏭 Production render:', { activeSubmodule });
  
  // --- MANEJADORES DE EVENTOS Y FUNCIONES AUXILIARES ---
  /**
   * @description Función auxiliar que determina qué submódulo renderizar según el valor de activeSubmodule.
   * @returns {JSX.Element} Elemento JSX correspondiente al submódulo activo o la navegación predeterminada.
   */
  const renderSubmodule = () => {
    console.log('🏭 Production renderSubmodule - activeSubmodule:', activeSubmodule);
    
    // Evalúa si el submódulo activo es 'inventory'.
    if (activeSubmodule === 'inventory') {
      // Retorna el componente SubInventoryManagement con las props necesarias.
      return (
        <SubInventoryManagement
          // Renderiza el componente SubInventoryManagement cuando activeSubmodule es 'inventory'.
          logMovement={logMovement} // Pasa la función logMovement para registrar acciones del usuario.
          setError={setError} // Pasa la función setError para manejar mensajes de error.
          errorMessage={errorMessage} // Pasa el mensaje de error actual al componente hijo. 
          setShowInventory={() => setActiveModule('production')} //Define una función para volver al módulo de producción.
          user={user}  //Pasa la información del usuario al componente hijo. 
        />
      );
    }
    
    // 📦 NUEVO: Evalúa si el submódulo activo es 'deliveries'.
    if (activeSubmodule === 'deliveries') {
      return (
        <DeliveryModule
          user={user} // Pasa la información del usuario al componente hijo.
          setError={setError} // Pasa la función setError para manejar mensajes de error.
          errorMessage={errorMessage} // Pasa el mensaje de error actual al componente hijo.
        />
      );
    }
    
    // --- RENDERIZADO DEL COMPONENTE (NAVEGACIÓN PREDETERMINADA) ---
    // Retorna la interfaz de navegación predeterminada si no hay submódulo activo.
    console.log('🏭 Production - Renderizando tarjetas de navegación (sin submódulo activo)');
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contenedor de cuadrícula responsive: 1 columna en móviles, 3 en pantallas medianas o mayores. */}
        <div
          className="bg-card p-6 rounded-lg shadow-md hover:bg-theme cursor-pointer transition"
          onClick={() => setActiveModule('production', 'inventory')}
        >
          {/* Tarjeta interactiva para navegar al submódulo de inventario. */}
          <h3 className="text-xl font-bold text-theme mb-2">Gestión de Inventario</h3>
          {/* Título de la tarjeta con estilo de fuente en negrita y color personalizado. */}
          <p className="text-text">Crea, edita y elimina referencias de productos.</p>
          {/* Descripción breve de la funcionalidad del submódulo. */}
        </div>
        
        <div
          className="bg-card p-6 rounded-lg shadow-md hover:bg-theme cursor-pointer transition"
          onClick={() => setActiveModule('production', 'stickers')}
        >
          {/* Tarjeta interactiva para navegar al submódulo de stickers. */}
          <h3 className="text-xl font-bold text-theme mb-2">Generación de Stickers</h3>
          {/* Título de la tarjeta con estilo de fuente en negrita y color personalizado. */}
          <p className="text-text">Imprime stickers con códigos de barras para productos.</p>
          {/* Descripción breve de la funcionalidad del submódulo. */}
        </div>
        
        {/* 📦 NUEVA: Tarjeta para gestión de despachos */}
        <div
          className="bg-card p-6 rounded-lg shadow-md hover:bg-theme cursor-pointer transition"
          onClick={() => setActiveModule('production', 'deliveries')}
        >
          <h3 className="text-xl font-bold text-theme mb-2">Gestión de Despachos</h3>
          <p className="text-text">Administra envíos y entregas de pedidos a clientes.</p>
        </div>
      </div>
    );
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  // Retorna el JSX principal del componente Production.
  return (
    <div className="bg-background p-6 min-h-screen">
      {/* Contenedor principal con fondo neutral, padding y altura mínima de pantalla completa. */}
      <h2 className="text-2xl font-bold mb-3 flex flex-wrap items-center gap-2">
        <span className="w-8 h-8 text-theme inline-block align-middle flex-shrink-0">
          {/* Production icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <path fillRule="evenodd" d="M4.5 2.25a.75.75 0 000 1.5v16.5h-.75a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5h-.75V3.75a.75.75 0 000-1.5h-15zM9 6a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H9zm-.75 3.75A.75.75 0 019 9h1.5a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM9 12a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H9zm3.75-5.25A.75.75 0 0113.5 6H15a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM13.5 9a.75.75 0 000 1.5H15A.75.75 0 0015 9h-1.5zm-.75 3.75a.75.75 0 01.75-.75H15a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM9 19.5v-2.25a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v2.25a.75.75 0 01-.75.75h-4.5A.75.75 0 019 19.5z" clipRule="evenodd" />
          </svg>
        </span>
        <span className="flex-shrink-0">Módulo de Producción</span>
      </h2>
      {errorMessage && <p className="text-error-600 mb-4">{errorMessage}</p>}
      {/* Renderiza condicionalmente un mensaje de error en rojo si errorMessage no está vacío. */}
      {renderSubmodule()}
      {/* Invoca la función renderSubmodule para mostrar el contenido dinámico del submódulo. */}
    </div>
  );
};

// --- EXPORTACIÓN ---
// Exporta el componente Production como predeterminado para su uso en otros archivos.
export default Production;
