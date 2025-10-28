// Utilidad para texto blanco o negro según fondo principal, y para muted
function getTextContrastClass(bgClass, forceBg, muted = false) {
  // muted: para textos secundarios
  if (muted) {
    if (forceBg === 'dark' || bgClass.includes('bg-theme-c1') || bgClass.includes('bg-theme-c2') || bgClass.includes('bg-background') || bgClass.includes('bg-card')) {
      return 'text-theme-c5'; // gris claro/blanco
    }
    return 'text-theme-c5'; // SIEMPRE BLANCO PARA EL SIDEBAR
  }
  if (forceBg === 'light') return 'text-theme-c5';
  if (forceBg === 'dark') return 'text-theme-c5';
  if (bgClass.includes('bg-theme-c1')) return 'text-theme-c5';
  if (bgClass.includes('bg-theme-c5')) return 'text-theme-c5';
  if (bgClass.includes('bg-card') || bgClass.includes('bg-background') || bgClass.includes('bg-theme-c3') || bgClass.includes('bg-theme-c4')) return 'text-theme-c5';
  return '';
}
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../supabaseClient';
import UserDebug from './UserDebug';
import MigrationTool from './MigrationTool';
import LazyLoadingSpinner from './LazyLoadingSpinner';

// 🚀 OPTIMIZACIÓN: Lazy loading de componentes principales
const SubInventoryManagement = lazy(() => import('./SubInventoryManagement'));
const UserManagement = lazy(() => import('./UserManagement'));
const MovementsNew = lazy(() => import('./MovementsNew'));
const Production = lazy(() => import('./Production'));
const StockView = lazy(() => import('./StockView'));
const Home = lazy(() => import('./Home'));
const Settings = lazy(() => import('./Settings'));
const Orders = lazy(() => import('./Orders'));
const Sales = lazy(() => import('./Sales'));
const SalesModule = lazy(() => import('./SalesModule'));
const Notifications = lazy(() => import('./Notifications'));
const CompanyStatus = lazy(() => import('./CompanyStatus'));
const DispatchRemissionGenerator = lazy(() => import('./DispatchRemissionGenerator'));
const OrdersSummary = lazy(() => import('./OrdersSummary'));
const DispatchModule = lazy(() => import('./DispatchModule'));
const Pendientes = lazy(() => import('./Pendientes'));
const HistorialDespachos = lazy(() => import('./HistorialDespachos'));
import Clientes from './Clientes';

function MainInterface({ user, setUser }) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    return localStorage.getItem('isSidebarVisible') === 'false' ? false : true;
  });
  const [activeModule, setActiveModule] = useState(() => localStorage.getItem('activeModule') || 'home');
  const [productionSubmenuOpen, setProductionSubmenuOpen] = useState(false);
  const [salesSubmenuOpen, setSalesSubmenuOpen] = useState(false);
  const [despachosSubmenuOpen, setDespachosSubmenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  // themeColor y themeMode ahora se gestionan globalmente y se aplican como variables CSS desde App.jsx
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('themeColor') || '#2E7D32');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'light');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // --- LISTENER PARA CAMBIOS DE TEMA ---
  useEffect(() => {
    const handleThemeChange = (event) => {
      console.log('MainInterface: Evento de cambio de tema recibido:', event.detail);
      const { color } = event.detail;
      setThemeColor(color);
    };

    window.addEventListener('themeChanged', handleThemeChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarVisible(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cerrar todos los submenús cuando el sidebar no esté visible o esté en modo móvil
  useEffect(() => {
    if (!isSidebarVisible || isMobile) {
      setProductionSubmenuOpen(false);
      setSalesSubmenuOpen(false);
      setDespachosSubmenuOpen(false);
    }
  }, [isSidebarVisible, isMobile]);

  useEffect(() => {
    localStorage.setItem('activeModule', activeModule);
  }, [activeModule]);

  useEffect(() => {
    const loadTheme = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', [`theme_color_${user.id}`, `theme_mode_${user.id}`]);
          if (error && error.code !== 'PGRST116') {
            throw new Error(error.message);
          }
          data.forEach(({ key, value }) => {
            if (key === `theme_color_${user.id}`) {
              setThemeColor(value);
              localStorage.setItem('themeColor', value);
            }
            if (key === `theme_mode_${user.id}`) {
              setThemeMode(value);
              localStorage.setItem('themeMode', value);
            }
          });
        } catch (err) {
          console.error('Error al cargar el tema:', err);
        }
      }
    };
    loadTheme();
  }, [user?.id]);

  // Las variables CSS de la paleta y el gradiente ya se aplican globalmente desde App.jsx

  useEffect(() => {
    localStorage.setItem('isSidebarVisible', isSidebarVisible);
  }, [isSidebarVisible]);

  const handleLogout = async () => {
    // Mostrar confirmación antes de cerrar sesión
    const confirmLogout = window.confirm('¿Estás seguro de que quieres cerrar sesión?');
    
    if (confirmLogout) {
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  const messages = [
    'Confía en el Señor con todo tu corazón y no te apoyes en tu propia prudencia.',
    'Encomienda al Señor tu camino; confía en Él, y Él actuará.',
    'Los que confían en el Señor son como el monte de Sion, que no se mueve, sino que permanece para siempre.',
    'Tú guardarás en completa paz a aquel cuyo pensamiento en ti persevera, porque en ti ha confiado.',
    'Echa sobre Él toda tu ansiedad, porque Él cuida de ti.',
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  const logMovement = async (variationId, movementType, quantity, method, details) => {
    try {
      const validMethods = ['manual', 'escaneo'];
      const sanitizedMethod = validMethods.includes(method?.toLowerCase()) ? method.toLowerCase() : 'escaneo';
      const payload = {
        variation_id: variationId || null,
        user_id: user?.id || null,
        movement_type: movementType,
        quantity: parseInt(quantity) || 0,
        timestamp: new Date().toISOString(),
        method: sanitizedMethod,
        details: details ? JSON.stringify(details) : '{}'
      };
      const { error } = await supabase.from('inventory_movements').insert(payload);
      if (error) throw error;
    } catch (err) {
      console.error('Error logging movement:', err);
      setErrorMessage(`Error logging movement: ${err.message}`);
    }
  };

  const menuItems = [
    { id: 'home', label: 'Inicio', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', roles: ['admin', 'produccion', 'vendedor', 'lector', 'auxiliar_logistico'] },
    { id: 'production', label: 'Producción', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m4-6h4m-4 0a2 2 0 00-2 2v2m4 0V5a2 2 0 00-2-2', roles: ['admin', 'produccion'], hasSubmenu: true },
    { id: 'users', label: 'Usuarios', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', roles: ['admin'] },
    { id: 'movements', label: 'Movimientos', icon: 'M9 5H5v4M5 19h4m6-14h4v4m-4 10h4M5 5l14 14', roles: ['admin', 'lector'] },
    { id: 'despachos', label: 'Despachos', icon: 'M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h4a1 1 0 011 1v11a3 3 0 01-3 3H5a3 3 0 01-3-3V8a1 1 0 011-1h4zm2 0h4V4h-4v3z', roles: ['admin', 'produccion', 'vendedor', 'lector', 'auxiliar_logistico'], hasSubmenu: true },
    { id: 'sales', label: 'Ventas', iconType: 'custom', roles: ['admin', 'vendedor', 'lector'], hasSubmenu: true },
  ];

  // Avatar color: usa la variable de la paleta secundaria
  const generateAvatarColor = () => {
    // Usa --theme-secondary-1 para el fondo del avatar
    return 'var(--theme-secondary-1)';
  };

  const renderModule = () => {
    const moduleContent = () => {
      switch (activeModule) {
        case 'home':
          return <Home user={user} />;
        case 'production':
          if (['admin', 'produccion'].includes(user?.role)) {
            return (
              <Production
                user={user}
                logMovement={logMovement}
                setError={setErrorMessage}
                errorMessage={errorMessage}
                activeSubmodule={'inventory'}
                setActiveModule={setActiveModule}
              />
            );
          }
          return <AccessDenied />;
        case 'inventory':
          if (['admin', 'produccion'].includes(user?.role)) {
            return (
              <SubInventoryManagement
                logMovement={logMovement}
                setError={setErrorMessage}
                errorMessage={errorMessage}
                setShowInventory={() => setActiveModule('production')}
                user={user}
              />
            );
          }
          return <AccessDenied />;
        case 'users':
          if (user?.role === 'admin') {
            return <UserManagement />;
          }
          return <AccessDenied />;
        case 'movements':
          if (['admin', 'lector'].includes(user?.role)) {
            return <MovementsNew />;
          }
          return <AccessDenied />;
        case 'despachos':
          if (['admin', 'produccion', 'vendedor', 'lector', 'auxiliar_logistico'].includes(user?.role)) {
            return <DispatchModule user={user} />;
          }
          return <AccessDenied />;
        case 'resumen-ordenes':
          if (['admin', 'produccion', 'vendedor', 'lector', 'auxiliar_logistico'].includes(user?.role)) {
            return <OrdersSummary user={user} />;
          }
          return <AccessDenied />;
        case 'pendientes':
          if (['admin', 'produccion', 'vendedor', 'lector', 'auxiliar_logistico'].includes(user?.role)) {
            return <Pendientes user={user} />;
          }
          return <AccessDenied />;
        case 'historial':
          if (['admin', 'produccion', 'vendedor', 'lector', 'auxiliar_logistico'].includes(user?.role)) {
            return <HistorialDespachos />;
          }
          return <AccessDenied />;
        case 'stock':
          if (['admin', 'vendedor', 'lector'].includes(user?.role)) {
            return <StockView setError={setErrorMessage} errorMessage={errorMessage} user={user} setActiveModule={setActiveModule} />;
          }
          return <AccessDenied />;
        case 'clientes':
          return <Clientes user={user} />;
        case 'orders':
          return <Orders user={user} />;
        case 'sales':
          if (['admin', 'vendedor', 'lector'].includes(user?.role)) {
            return <SalesModule user={user} setError={setErrorMessage} errorMessage={errorMessage} setActiveModule={setActiveModule} />;
          }
          return <AccessDenied />;
        case 'sales-history':
          if (['admin', 'vendedor', 'lector'].includes(user?.role)) {
            return <Sales user={user} setError={setErrorMessage} errorMessage={errorMessage} />;
          }
          return <AccessDenied />;
        case 'settings':
          return <Settings setThemeColor={setThemeColor} setThemeMode={setThemeMode} user={user} />;
        default:
          return (
            <div className="max-w-4xl mx-auto text-center">
              <h2 className={`text-3xl font-light mb-4 ${getTextContrastClass('bg-background')}`}> 
                Bienvenido, <span className="font-medium" style={{ color: 'var(--theme-color)' }}>
                  {user?.username || user?.first_name || 'Usuario'}
                </span>
              </h2>
              <div className="bg-card rounded-xl shadow-sm border border-default p-6 max-w-2xl mx-auto">
                <p className={`italic leading-relaxed ${getTextContrastClass('bg-card', undefined, true)}`}>{randomMessage}</p>
              </div>
            </div>
          );
      }
    };

    return (
      <Suspense fallback={<LazyLoadingSpinner message={`Cargando ${activeModule}...`} />}>
        {moduleContent()}
      </Suspense>
    );
  };

  const AccessDenied = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className={`text-lg font-medium mb-2 ${getTextContrastClass('bg-card')}`}>Acceso Denegado</h3>
        <p className={getTextContrastClass('bg-card', undefined, true)}>No tienes permisos para acceder a esta sección.</p>
      </div>
    </div>
  );

  const SidebarButton = ({ item, isCollapsed }) => {
    const isActive = activeModule === item.id || 
      (item.hasSubmenu && item.id === 'production' && (activeModule === 'production' || activeModule === 'inventory')) ||
      (item.hasSubmenu && item.id === 'sales' && (activeModule === 'sales' || activeModule === 'clientes' || activeModule === 'stock' || activeModule === 'orders')) ||
      (item.hasSubmenu && item.id === 'despachos' && (activeModule === 'despachos' || activeModule === 'resumen-ordenes' || activeModule === 'pendientes' || activeModule === 'historial'));
    const hasAccess = item.roles.includes(user?.role);
    if (!hasAccess) return null;

    return (
      <li className="relative">
        <button
          onClick={() => {
            if (item.hasSubmenu) {
              if (isCollapsed) {
                if (item.id === 'production') {
                  setActiveModule('inventory');
                } else if (item.id === 'sales') {
                  setActiveModule('sales');
                } else if (item.id === 'despachos') {
                  setActiveModule('despachos');
                }
                if (isMobile) setIsSidebarVisible(false);
              } else {
                if (item.id === 'production') {
                  // Cerrar otros submenús antes de abrir/cerrar este
                  setSalesSubmenuOpen(false);
                  setDespachosSubmenuOpen(false);
                  setProductionSubmenuOpen(!productionSubmenuOpen);
                } else if (item.id === 'sales') {
                  // Cerrar otros submenús antes de abrir/cerrar este
                  setProductionSubmenuOpen(false);
                  setDespachosSubmenuOpen(false);
                  setSalesSubmenuOpen(!salesSubmenuOpen);
                } else if (item.id === 'despachos') {
                  // Cerrar otros submenús antes de abrir/cerrar este
                  setProductionSubmenuOpen(false);
                  setSalesSubmenuOpen(false);
                  setDespachosSubmenuOpen(!despachosSubmenuOpen);
                }
              }
            } else {
              setActiveModule(item.id);
              if (isMobile) setIsSidebarVisible(false);
            }
          }}
          className={`group flex ${isCollapsed ? 'justify-center items-center' : 'items-center justify-start'} w-full p-3 rounded-xl transition-all duration-200 font-medium sidebar-btn`}
          style={{
            background: isActive ? 'var(--theme-main)' : 'transparent',
            color: isActive ? 'var(--text-inverted)' : 'var(--theme-c5)',
          }}
        >
          {item.iconType === 'custom' ? (
            <svg className={`w-5 h-5 flex-shrink-0${!isCollapsed ? ' mr-3' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor">
              <path d="M312 24l0 10.5c6.4 1.2 12.6 2.7 18.2 4.2c12.8 3.4 20.4 16.6 17 29.4s-16.6 20.4-29.4 17c-10.9-2.9-21.1-4.9-30.2-5c-7.3-.1-14.7 1.7-19.4 4.4c-2.1 1.3-3.1 2.4-3.5 3c-.3 .5-.7 1.2-.7 2.8c0 .3 0 .5 0 .6c.2 .2 .9 1.2 3.3 2.6c5.8 3.5 14.4 6.2 27.4 10.1l.9 .3s0 0 0 0c11.1 3.3 25.9 7.8 37.9 15.3c13.7 8.6 26.1 22.9 26.4 44.9c.3 22.5-11.4 38.9-26.7 48.5c-6.7 4.1-13.9 7-21.3 8.8l0 10.6c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-11.4c-9.5-2.3-18.2-5.3-25.6-7.8c-2.1-.7-4.1-1.4-6-2c-12.6-4.2-19.4-17.8-15.2-30.4s17.8-19.4 30.4-15.2c2.6 .9 5 1.7 7.3 2.5c13.6 4.6 23.4 7.9 33.9 8.3c8 .3 15.1-1.6 19.2-4.1c1.9-1.2 2.8-2.2 3.2-2.9c.4-.6 .9-1.8 .8-4.1l0-.2c0-1 0-2.1-4-4.6c-5.7-3.6-14.3-6.4-27.1-10.3l-1.9-.6c-10.8-3.2-25-7.5-36.4-14.4c-13.5-8.1-26.5-22-26.6-44.1c-.1-22.9 12.9-38.6 27.7-47.4c6.4-3.8 13.3-6.4 20.2-8.2L264 24c0-13.3 10.7-24 24-24s24 10.7 24 24zM568.2 336.3c13.1 17.8 9.3 42.8-8.5 55.9L433.1 485.5c-23.4 17.2-51.6 26.5-80.7 26.5L192 512 32 512c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l36.8 0 44.9-36c22.7-18.2 50.9-28 80-28l78.3 0 16 0 64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0-16 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l120.6 0 119.7-88.2c17.8-13.1 42.8-9.3 55.9 8.5zM193.6 384c0 0 0 0 0 0l-.9 0c.3 0 .6 0 .9 0z" />
            </svg>
          ) : (
            <svg className={`w-5 h-5 flex-shrink-0${!isCollapsed ? ' mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
            </svg>
          )}
          {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
          {!isCollapsed && item.hasSubmenu && (
            <svg className={`w-4 h-4 ml-auto transform transition-transform ${
              (item.id === 'production' && productionSubmenuOpen) || 
              (item.id === 'sales' && salesSubmenuOpen) ||
              (item.id === 'despachos' && despachosSubmenuOpen) ? 'rotate-180' : ''
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          )}
          {isCollapsed && (
            <span className="absolute left-full ml-2 px-2 py-1 bg-theme-main text-text-inverted text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              {item.label}
            </span>
          )}
        </button>
        {!isCollapsed && item.hasSubmenu && item.id === 'production' && productionSubmenuOpen && (
          <ul className="ml-8 mt-2 space-y-1">
            <li className="relative">
              <button
                onClick={() => {
                  setActiveModule('inventory');
                  if (isMobile) setIsSidebarVisible(false);
                }}
                className={`group flex items-center justify-start w-full p-2 rounded-lg transition-all duration-200 sidebar-btn-sub`}
                style={{
                  background: activeModule === 'inventory' ? 'var(--theme-main)' : 'transparent',
                  color: activeModule === 'inventory' ? 'var(--text-inverted)' : 'var(--text-muted)',
                }}
              >
                <div className={`w-2 h-2 rounded-full mr-3 ${activeModule === 'inventory' ? 'bg-text-inverted' : 'bg-text-muted'}`}></div>
                <span className="text-sm font-medium">Ges. de Inventarios</span>
              </button>
            </li>
          </ul>
        )}
        {!isCollapsed && item.hasSubmenu && item.id === 'sales' && salesSubmenuOpen && (
          <ul className="ml-8 mt-2 space-y-1">
            <li className="relative">
              <button
                onClick={() => {
                  setActiveModule('sales');
                  if (isMobile) setIsSidebarVisible(false);
                }}
                className={`group flex items-center justify-start w-full p-2 rounded-lg transition-all duration-200 sidebar-btn-sub`}
                style={{
                  background: activeModule === 'sales' ? 'var(--theme-main)' : 'transparent',
                  color: activeModule === 'sales' ? 'var(--text-inverted)' : 'var(--text-muted)',
                }}
              >
                <div className={`w-2 h-2 rounded-full mr-3 ${activeModule === 'sales' ? 'bg-text-inverted' : 'bg-text-muted'}`}></div>
                <span className="text-sm font-medium">Ventas</span>
              </button>
            </li>
            <li className="relative">
              <button
                onClick={() => {
                  setActiveModule('clientes');
                  if (isMobile) setIsSidebarVisible(false);
                }}
                className={`group flex items-center justify-start w-full p-2 rounded-lg transition-all duration-200 sidebar-btn-sub`}
                style={{
                  background: activeModule === 'clientes' ? 'var(--theme-main)' : 'transparent',
                  color: activeModule === 'clientes' ? 'var(--text-inverted)' : 'var(--text-muted)',
                }}
              >
                <div className={`w-2 h-2 rounded-full mr-3 ${activeModule === 'clientes' ? 'bg-text-inverted' : 'bg-text-muted'}`}></div>
                <span className="text-sm font-medium">Clientes</span>
              </button>
            </li>
            <li className="relative">
              <button
                onClick={() => {
                  setActiveModule('stock');
                  if (isMobile) setIsSidebarVisible(false);
                }}
                className={`group flex items-center justify-start w-full p-2 rounded-lg transition-all duration-200 sidebar-btn-sub`}
                style={{
                  background: activeModule === 'stock' ? 'var(--theme-main)' : 'transparent',
                  color: activeModule === 'stock' ? 'var(--text-inverted)' : 'var(--text-muted)',
                }}
              >
                <div className={`w-2 h-2 rounded-full mr-3 ${activeModule === 'stock' ? 'bg-text-inverted' : 'bg-text-muted'}`}></div>
                <span className="text-sm font-medium">Stock</span>
              </button>
            </li>
            <li className="relative">
              <button
                onClick={() => {
                  setActiveModule('orders');
                  if (isMobile) setIsSidebarVisible(false);
                }}
                className={`group flex items-center justify-start w-full p-2 rounded-lg transition-all duration-200 sidebar-btn-sub`}
                style={{
                  background: activeModule === 'orders' ? 'var(--theme-main)' : 'transparent',
                  color: activeModule === 'orders' ? 'var(--text-inverted)' : 'var(--text-muted)',
                }}
              >
                <div className={`w-2 h-2 rounded-full mr-3 ${activeModule === 'orders' ? 'bg-text-inverted' : 'bg-text-muted'}`}></div>
                <span className="text-sm font-medium">Pedidos</span>
              </button>
            </li>
          </ul>
        )}
        {!isCollapsed && item.hasSubmenu && item.id === 'despachos' && despachosSubmenuOpen && (
          <ul className="ml-8 mt-2 space-y-1">
            <li className="relative">
              <button
                onClick={() => {
                  setActiveModule('despachos');
                  if (isMobile) setIsSidebarVisible(false);
                }}
                className={`group flex items-center justify-start w-full p-2 rounded-lg transition-all duration-200 sidebar-btn-sub`}
                style={{
                  background: activeModule === 'despachos' ? 'var(--theme-main)' : 'transparent',
                  color: activeModule === 'despachos' ? 'var(--text-inverted)' : 'var(--text-muted)',
                }}
              >
                <div className={`w-2 h-2 rounded-full mr-3 ${activeModule === 'despachos' ? 'bg-text-inverted' : 'bg-text-muted'}`}></div>
                <span className="text-sm font-medium">Despachos</span>
              </button>
            </li>
            <li className="relative">
              <button
                onClick={() => {
                  setActiveModule('resumen-ordenes');
                  if (isMobile) setIsSidebarVisible(false);
                }}
                className={`group flex items-center justify-start w-full p-2 rounded-lg transition-all duration-200 sidebar-btn-sub`}
                style={{
                  background: activeModule === 'resumen-ordenes' ? 'var(--theme-main)' : 'transparent',
                  color: activeModule === 'resumen-ordenes' ? 'var(--text-inverted)' : 'var(--text-muted)',
                }}
              >
                <div className={`w-2 h-2 rounded-full mr-3 ${activeModule === 'resumen-ordenes' ? 'bg-text-inverted' : 'bg-text-muted'}`}></div>
                <span className="text-sm font-medium">Resumen de Órdenes</span>
              </button>
            </li>
            <li className="relative">
              <button
                onClick={() => {
                  setActiveModule('pendientes');
                  if (isMobile) setIsSidebarVisible(false);
                }}
                className={`group flex items-center justify-start w-full p-2 rounded-lg transition-all duration-200 sidebar-btn-sub`}
                style={{
                  background: activeModule === 'pendientes' ? 'var(--theme-main)' : 'transparent',
                  color: activeModule === 'pendientes' ? 'var(--text-inverted)' : 'var(--text-muted)',
                }}
              >
                <div className={`w-2 h-2 rounded-full mr-3 ${activeModule === 'pendientes' ? 'bg-text-inverted' : 'bg-text-muted'}`}></div>
                <span className="text-sm font-medium">Pendientes</span>
              </button>
            </li>
            <li className="relative">
              <button
                onClick={() => {
                  setActiveModule('historial');
                  if (isMobile) setIsSidebarVisible(false);
                }}
                className={`group flex items-center justify-start w-full p-2 rounded-lg transition-all duration-200 sidebar-btn-sub`}
                style={{
                  background: activeModule === 'historial' ? 'var(--theme-main)' : 'transparent',
                  color: activeModule === 'historial' ? 'var(--text-inverted)' : 'var(--text-muted)',
                }}
              >
                <div className={`w-2 h-2 rounded-full mr-3 ${activeModule === 'historial' ? 'bg-text-inverted' : 'bg-text-muted'}`}></div>
                <span className="text-sm font-medium">Historial</span>
              </button>
            </li>
          </ul>
        )}
      </li>
    );
  };

  const Sidebar = ({ isCollapsed }) => (
    <div
      className={`fixed inset-y-0 left-0 z-30 border-r border-default transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } ${isMobile && !isSidebarVisible ? '-translate-x-full' : 'translate-x-0'}`}
      style={{ top: '4rem', height: 'calc(100vh - 4rem)', background: 'var(--theme-c2, #f5f5f5)' }}
    >
      <nav className="flex flex-col h-full">
        {/* User Info Section - Movido más abajo para mejor armonía visual */}
        <div className="mb-6 pt-6 border-b border-default pb-4 px-3">
          <div className={`relative ${isCollapsed ? 'flex justify-center items-center' : 'flex items-center justify-start px-3'}`} style={{ minHeight: '56px' }}>
            <div
              className="w-12 h-12 min-w-[3rem] min-h-[3rem] aspect-square rounded-full flex items-center justify-center text-lg font-semibold shadow text-theme-c5 overflow-visible"
              style={{ background: generateAvatarColor() }}
            >
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <div className="ml-4">
                <p className={`text-base font-semibold ${getTextContrastClass('bg-card')} mb-1`}>{user?.username?.split('@')[0] || 'Usuario'}</p>
                <p className={`text-sm ${getTextContrastClass('bg-card', null, true)} opacity-75`}>{user?.role || 'N/A'}</p>
              </div>
            )}
            {isCollapsed && (
              <span className={`absolute left-full ml-2 px-3 py-2 bg-theme-main text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${getTextContrastClass('bg-theme-main', 'light')}`}> 
                {user?.username?.split('@')[0] || 'Usuario'}
              </span>
            )}
          </div>
        </div>
        
        {/* Scrollable menu container */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 sidebar-scroll">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <SidebarButton key={item.id} item={item} isCollapsed={isCollapsed} />
            ))}
          </ul>
        </div>
        
        {/* Settings section fixed at bottom */}
        <div className="border-t border-default pt-3 mt-4 px-3">
          <div className="relative">
            <button
              onClick={() => {
                setActiveModule('settings');
                if (isMobile) setIsSidebarVisible(false);
              }}
              className={`group flex ${isCollapsed ? 'justify-center items-center' : 'items-center justify-start'} w-full p-3 rounded-xl transition-all duration-200 sidebar-btn`}
              style={{
                background: activeModule === 'settings' ? 'var(--theme-main)' : 'transparent',
                color: activeModule === 'settings' ? 'var(--text-inverted)' : 'var(--theme-c5)',
              }}
            >
              <svg className={`w-5 h-5 flex-shrink-0${!isCollapsed ? ' mr-3' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {!isCollapsed && <span className="text-sm font-medium">Configuración</span>}
              {isCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-theme-main text-text-inverted text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  Configuración
                </span>
              )}
            </button>
          </div>
          <div className="relative">
            <button
              onClick={handleLogout}
              className={`group flex items-center justify-start w-full p-3 rounded-xl transition-all duration-200 font-medium hover:bg-secondary-4/80 hover:text-secondary-4 hover:shadow-sm ${isCollapsed ? '' : 'mt-2'}`}
              style={{ background: 'transparent', color: 'var(--theme-c5)' }}
            >
              <svg className={`${isCollapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!isCollapsed && <span className={`text-sm font-medium ${getTextContrastClass('bg-card')}`}>Cerrar Sesión</span>}
              {isCollapsed && (
                <span className={`absolute left-full ml-2 px-2 py-1 bg-secondary-4 text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${getTextContrastClass('bg-secondary-4', 'light')}`}> 
                  Cerrar Sesión
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-x-hidden">
      {/* Fondo decorativo dinámico SOLO para el fondo global */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-[pulse_4s_ease-in-out_infinite]"
          style={{ background: 'linear-gradient(135deg, var(--theme-c1), var(--theme-c3), var(--theme-c5))' }}></div>
        <div className="absolute bottom-0 right-0 w-[24rem] h-[24rem] rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-[pulse_5s_ease-in-out_infinite]"
          style={{ background: 'linear-gradient(45deg, var(--theme-c4), var(--theme-main), var(--theme-c2))' }}></div>
      </div>
      <header
        className="fixed top-0 left-0 right-0 z-40 text-text-inverted shadow-lg backdrop-blur-xl border-b border-default"
        style={{ background: 'linear-gradient(90deg, var(--theme-main) 60%, var(--theme-c2) 100%)' }}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarVisible(!isSidebarVisible)}
              className="p-2 rounded-lg hover:bg-secondary-1/30 transition-colors border border-transparent hover:border-secondary-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isSidebarVisible ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <img src={require('../logo/logo-IMO.svg').default} alt="Logo" className="max-h-50 w-auto drop-shadow inline" style={{maxHeight: '48px'}} />
              <h1 className="text-3xl font-extrabold tracking-tight text-shadow-sm" style={{color:'var(--theme-c5)'}}>IMO</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Estrella de estado premium */}
            <CompanyStatus />
            
            {/* Campana de notificaciones */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-secondary-2/30 transition-colors border border-transparent hover:border-secondary-2 relative"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-5-5.917V5a2 2 0 10-2 0v.083A6.002 6.002 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {showNotifications && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-theme-c5 rounded-full animate-ping"></span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-card rounded-xl shadow-xl border border-secondary-2 z-50">
                  <Notifications user={user} setError={setErrorMessage} setActiveModule={setActiveModule} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {isMobile && isSidebarVisible && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-20 transition-opacity duration-300"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      <div className="flex flex-1" style={{ paddingTop: '100px' }}>
        <Sidebar isCollapsed={!isSidebarVisible} />
        <main
          className={`flex-1 transition-all duration-300 ${
            isMobile ? 'ml-0' : isSidebarVisible ? 'ml-64' : 'ml-16'
          }`}
        >
          <div className="p-3 max-w-full mx-auto">
            {errorMessage && (
              <div className="mb-6 bg-secondary-4/10 border border-secondary-4 text-secondary-4 px-4 py-3 rounded-xl flex items-center shadow">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{errorMessage}</span>
                <button onClick={() => setErrorMessage(null)} className="ml-auto hover:text-theme">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
            {renderModule()}
          </div>
        </main>
      </div>
      
      {/* Debug temporal */}
      <UserDebug />
      <MigrationTool />
    </div>
  );
}

export default MainInterface;