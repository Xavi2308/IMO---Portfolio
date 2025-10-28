import React, { useState, useEffect, useContext } from 'react';
import LanguageContext from '../context/LanguageContext';
import translations from '../translations';
import { generatePalette, applyPaletteToCSS } from '../utils/generatePalette';
import { getTextContrastClass } from '../utils/getContrastYIQ';
import supabase from '../supabaseClient';
const languages = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
];

function Settings({ user, setThemeColor, setThemeMode }) {
  const { lang, setLang } = useContext(LanguageContext);
  const [settings, setSettings] = useState({
    themeColor: '#2E7D32',
    themeMode: 'light',
    suggestedSizes: { 34: 0, 35: 1, 36: 2, 37: 3, 38: 3, 39: 2, 40: 1, 41: 0 },
    notificationPrefs: { receiveSaleNotifications: true, receiveOrderNotifications: true, fromUsers: [] },
  });
  const [tempColor, setTempColor] = useState('#2E7D32'); // Color temporal para preview
  const [allUsers, setAllUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showThemeShowcase, setShowThemeShowcase] = useState(false);
  const sizes = ['34', '35', '36', '37', '38', '39', '40', '41'];

  // Utilidad para obtener el valor real de una variable CSS
  const getCssVar = (name) => {
    try {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    } catch (error) {
      return '#2E7D32';
    }
  };

  // Estado para forzar actualización de los colores de la paleta
  const [paletteColors, setPaletteColors] = useState([
    getCssVar('--theme-main'),
    getCssVar('--theme-c3'),
    getCssVar('--theme-c4'),
    getCssVar('--theme-c5'),
    getCssVar('--theme-c2')
  ]);

  // Efecto: actualiza los colores de la paleta cuando cambian las variables CSS
  useEffect(() => {
    const updatePalette = () => {
      setPaletteColors([
        getCssVar('--theme-main'),
        getCssVar('--theme-c3'),
        getCssVar('--theme-c4'),
        getCssVar('--theme-c5'),
        getCssVar('--theme-c2')
      ]);
    };
    // Actualizar al cargar
    updatePalette();
    // Actualizar cuando cambie el color del tema
    const timeout = setTimeout(updatePalette, 100);
    return () => clearTimeout(timeout);
  }, [settings.themeColor, settings.themeMode]);

  // Aplica la paleta generada a las variables CSS globales
  const applyPaletteToCSS = (mainColor) => {
    const palette = generatePalette(mainColor);
    
    // Actualizar variables CSS para modo claro
    let lightStyle = document.getElementById('dynamic-light-theme');
    if (!lightStyle) {
      lightStyle = document.createElement('style');
      lightStyle.id = 'dynamic-light-theme';
      document.head.appendChild(lightStyle);
    }
    
    lightStyle.innerHTML = `
      :root {
        --theme-color: ${palette.main};
        --theme-main: ${palette.main};
        --theme-color-hover: ${palette.hover || palette.themeColorHover};
        --theme-color-light: ${palette.light || palette.themeColorLight};
        --theme-color-dark: ${palette.dark || palette.themeColorDark};
        --theme-c1: ${palette.c1};
        --theme-c2: ${palette.c2};
        --theme-c3: ${palette.c3};
        --theme-c4: ${palette.c4};
        --theme-c5: ${palette.c5};
        --theme-matching-gradient: linear-gradient(90deg, ${palette.c1}, ${palette.c2}, ${palette.main}, ${palette.c3}, ${palette.c4}, ${palette.c5});
      }
    `;

    // Actualizar variables CSS para modo oscuro
    let darkStyle = document.getElementById('dynamic-dark-theme');
    if (!darkStyle) {
      darkStyle = document.createElement('style');
      darkStyle.id = 'dynamic-dark-theme';
      document.head.appendChild(darkStyle);
    }
    
    darkStyle.innerHTML = `
      .dark {
        --theme-color: ${palette.main};
        --theme-main: ${palette.main};
        --theme-color-hover: ${palette.hover || palette.themeColorHover};
        --theme-color-light: ${palette.light || palette.themeColorLight};
        --theme-color-dark: ${palette.dark || palette.themeColorDark};
        --theme-c1: ${palette.c1};
        --theme-c2: ${palette.c2};
        --theme-c3: ${palette.c3};
        --theme-c4: ${palette.c4};
        --theme-c5: ${palette.c5};
        --theme-matching-gradient: linear-gradient(90deg, ${palette.c1}, ${palette.c2}, ${palette.main}, ${palette.c3}, ${palette.c4}, ${palette.c5});
      }
    `;
  };

  useEffect(() => {
    if (user?.id) {
      const loadSettings = async () => {
        setLoading(true);
        setError(null);
        try {
          const { data, error: settingsError } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', [
              `theme_color_${user.id}`,
              `theme_mode_${user.id}`,
              `suggested_sizes_${user.id}`,
              `notification_prefs_${user.id}`,
              `lang_${user.id}`
            ]);
          if (settingsError) throw settingsError;

          const loadedSettings = {
            themeColor: '#2E7D32',
            themeMode: 'light',
            suggestedSizes: { 34: 0, 35: 1, 36: 2, 37: 3, 38: 3, 39: 2, 40: 1, 41: 0 },
            notificationPrefs: { receiveSaleNotifications: true, receiveOrderNotifications: true, fromUsers: [] },
            lang: 'es',
          };

          for (const setting of data) {
            if (setting.key === `theme_color_${user.id}`) {
              loadedSettings.themeColor = setting.value;
            }
            if (setting.key === `theme_mode_${user.id}`) {
              loadedSettings.themeMode = setting.value;
            }
            if (setting.key === `suggested_sizes_${user.id}`) {
              loadedSettings.suggestedSizes = JSON.parse(setting.value);
            }
            if (setting.key === `notification_prefs_${user.id}`) {
              loadedSettings.notificationPrefs = JSON.parse(setting.value);
            }
            if (setting.key === `lang_${user.id}`) {
              loadedSettings.lang = setting.value;
            }
          }

          setSettings(loadedSettings);
          setTempColor(loadedSettings.themeColor); // Sincronizar color temporal
          setThemeColor(loadedSettings.themeColor);
          setThemeMode(loadedSettings.themeMode);
          setLang(loadedSettings.lang);
          // Aplica la paleta al cargar settings
          applyPaletteToCSS(loadedSettings.themeColor);
        } catch (err) {
          console.error('Error al cargar configuraciones:', err);
          setError(`Error al cargar configuraciones: ${err.message}`);
        } finally {
          setLoading(false);
        }
      };

      const fetchUsers = async () => {
        try {
          const { data, error } = await supabase.from('users').select('id, username');
          if (error) throw error;
          setAllUsers(data);
        } catch (err) {
          setError(`Error al cargar usuarios: ${err.message}`);
        }
      };

      loadSettings();
      fetchUsers();
    }
  }, [user?.id, setThemeColor, setThemeMode, setLang]);

  const handleSettingsChange = (field, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      let current = newSettings;
      const path = field.split('.');
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newSettings;
    });
  };

  // Al cambiar el color principal, solo actualizar el estado temporal
  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setTempColor(newColor);
  };

  // Aplicar el color temporal al tema (para preview)
  const applyTempColor = () => {
    console.log('Applying temp color:', tempColor);
    
    // Actualizar el estado
    handleSettingsChange('themeColor', tempColor);
    setThemeColor(tempColor);
    
    // Aplicar inmediatamente a las variables CSS globales
    applyPaletteToCSS(tempColor);
    
    // También actualizar el localStorage para persistencia temporal
    localStorage.setItem('themeColor', tempColor);
    
    // Forzar actualización de la paleta visual
    const palette = generatePalette(tempColor);
    setPaletteColors([
      palette.c1,
      palette.c2,
      palette.main,
      palette.c3,
      palette.c4,
      palette.c5
    ]);
    
    // Forzar re-render del componente padre (disparar evento personalizado)
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { color: tempColor, palette } 
    }));
    
    console.log('Color applied globally');
  };

  // Descartar cambios y volver al color guardado
  const discardColorChanges = () => {
    console.log('Discarding color changes, reverting to:', settings.themeColor);
    
    setTempColor(settings.themeColor);
    
    // Reaplicar el color guardado a las variables CSS
    applyPaletteToCSS(settings.themeColor);
    
    // Restaurar localStorage
    localStorage.setItem('themeColor', settings.themeColor);
    
    // Restaurar paleta visual
    const palette = generatePalette(settings.themeColor);
    setPaletteColors([
      palette.c1,
      palette.c2,
      palette.main,
      palette.c3,
      palette.c4,
      palette.c5
    ]);
    
    // Forzar re-render
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { color: settings.themeColor, palette } 
    }));
    
    console.log('Reverted to saved color');
  };

  const handleThemeModeChange = (mode) => {
    handleSettingsChange('themeMode', mode);
    setThemeMode(mode);
    
    // Guardar el modo en localStorage
    localStorage.setItem('themeMode', mode);
    
    // Aplicar la clase al documento
    const htmlElement = document.documentElement;
    if (mode === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
    
    // Reaplicar la paleta de colores con el nuevo modo
    applyPaletteToCSS(settings.themeColor);
  };

  const handleSaveAllSettings = async () => {
    if (!user?.id) return;
    setSaveLoading(true);
    setError(null);
    try {
      const settingsToUpsert = [
        { key: `theme_color_${user.id}`, value: settings.themeColor, user_id: user.id },
        { key: `theme_mode_${user.id}`, value: settings.themeMode, user_id: user.id },
        { key: `notification_prefs_${user.id}`, value: JSON.stringify(settings.notificationPrefs), user_id: user.id },
      ];

      if (['admin', 'produccion'].includes(user.role)) {
        settingsToUpsert.push({
          key: `suggested_sizes_${user.id}`,
          value: JSON.stringify(settings.suggestedSizes),
          user_id: user.id,
        });
      }

      const { error } = await supabase.from('settings').upsert(settingsToUpsert, { onConflict: 'key' });
      if (error) throw error;
      
      alert('¡Todas las configuraciones se han guardado con éxito!');
      
      // Reload de la aplicación para asegurar que todos los cambios se apliquen correctamente
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Error al guardar configuraciones:', err);
      setError(`Error al guardar configuraciones: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
          <span className="text-text font-medium">Cargando configuraciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <label htmlFor="language-select" className="font-medium text-text">{translations[lang]?.language || 'Idioma de la aplicación'}:</label>
          <select
            id="language-select"
            value={lang}
            onChange={async e => {
              setLang(e.target.value);
              if (user?.id) {
                await supabase.from('settings').upsert([
                  { key: `lang_${user.id}`, value: e.target.value, user_id: user.id }
                ], { onConflict: 'key' });
              }
            }}
            className="p-2 border border-default rounded"
            style={{ minWidth: 120 }}
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
        <h1 className="text-2xl font-bold mb-3 flex flex-wrap items-center gap-2">
          <span className="w-8 h-8 text-theme inline-block align-middle flex-shrink-0">
            {/* Settings icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.570.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="flex-shrink-0">{translations[lang]?.settings || 'Configuración'}</span>
        </h1>
        <p className="text-muted">{translations[lang]?.welcome || 'Personaliza tu experiencia en la aplicación'}</p>
        {/* Preview visual de la paleta Matching Gradient */}
        <div className="flex gap-2 mt-4 mb-2">
          <div className="w-7 h-7 rounded-full border-2 border-white shadow" style={{background: 'var(--theme-c1)'}} title="C1 (oscuro)"></div>
          <div className="w-7 h-7 rounded-full border-2 border-white shadow" style={{background: 'var(--theme-c2)'}} title="C2"></div>
          <div className="w-7 h-7 rounded-full border-2 border-white shadow" style={{background: 'var(--theme-color)'}} title="Principal"></div>
          <div className="w-7 h-7 rounded-full border-2 border-white shadow" style={{background: 'var(--theme-c3)'}} title="C3"></div>
          <div className="w-7 h-7 rounded-full border-2 border-white shadow" style={{background: 'var(--theme-c4)'}} title="C4"></div>
          <div className="w-7 h-7 rounded-full border-2 border-white shadow" style={{background: 'var(--theme-c5)'}} title="C5 (claro)"></div>
          <div className="flex-1 h-7 rounded-full border-2 border-white shadow" style={{background: 'var(--theme-matching-gradient)'}} title="Matching Gradient"></div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Sección de Perfil de Usuario */}
        <UserProfileSection user={user} />
        
        <div className="bg-card rounded-xl border p-6 sm:p-8">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{background: 'linear-gradient(135deg, var(--theme-c3), var(--theme-c4))'}}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke="none" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">Modo de Tema</h2>
              <p className="text-muted text-sm">Cambia entre modo claro y oscuro</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => handleThemeModeChange('light')}
              className={`flex-1 p-3 rounded-lg text-center transition-all duration-200 ${
                settings.themeMode === 'light'
                  ? 'bg-theme-dark text-white shadow-md'
                  : 'bg-secondary-1 text-text hover:bg-secondary-2 hover:text-secondary-3'
              }`}
              disabled={user?.role === 'lector'}
            >
              Claro
            </button>
            <button
              onClick={() => handleThemeModeChange('dark')}
              className={`flex-1 p-3 rounded-lg text-center transition-all duration-200 ${
                settings.themeMode === 'dark'
                  ? 'bg-theme-dark text-white shadow-md'
                  : 'bg-secondary-1 text-text hover:bg-secondary-2 hover:text-secondary-3'
              }`}
              disabled={user?.role === 'lector'}
            >
              Oscuro
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6 sm:p-8">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ background: 'linear-gradient(135deg, var(--theme-color), var(--theme-c3))' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">Color del Tema</h2>
              <p className="text-muted text-sm">Personaliza el color principal de la interfaz</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="color"
                  value={tempColor}
                  onChange={handleColorChange}
                  className="w-12 h-12 border-2 border-muted rounded-lg cursor-pointer hover:border-text transition-colors"
                  disabled={user?.role === 'lector'}
                />
              </div>
              <div>
                <span className="text-sm font-mono text-text bg-muted px-3 py-1 rounded-md">{tempColor}</span>
              </div>
              
              {/* Botones de acción para el color */}
              {tempColor !== settings.themeColor && (
                <div className="flex space-x-2">
                  <button
                    onClick={applyTempColor}
                    className="px-3 py-1.5 bg-theme text-white text-sm font-medium rounded-lg hover:bg-theme-hover transition-colors"
                    title="Aplicar color para probarlo"
                  >
                    ✓ Aplicar
                  </button>
                  <button
                    onClick={discardColorChanges}
                    className="px-3 py-1.5 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors"
                    title="Descartar cambios"
                  >
                    ✗ Descartar
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="h-4 rounded-full shadow-inner" style={{ backgroundColor: tempColor }}></div>
              {tempColor !== settings.themeColor && (
                <p className="text-xs text-orange-600 mt-1">
                  💡 Color temporal - usa "Aplicar" para probarlo o "Guardar" para confirmar
                </p>
              )}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-border">
            <button
              onClick={() => setShowThemeShowcase(!showThemeShowcase)}
              className="flex items-center justify-between w-full p-3 bg-background-secondary rounded-lg hover:bg-hover-bg transition-colors"
            >
              <span className="text-text font-medium">
                <span className="mr-2">🎨</span>
                Vista Previa del Sistema de Temas
              </span>
              <svg 
                className={`w-5 h-5 text-text transition-transform ${showThemeShowcase ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showThemeShowcase && (
              <div className="mt-4 p-4 bg-background-secondary rounded-lg space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Color Palette */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-text">Paleta de Colores Activa</h3>
                    <div className="flex flex-wrap gap-3">
                      {paletteColors.map((color, index) => (
                        <div key={index} className="flex flex-col items-center space-y-2">
                          <div 
                            className="w-12 h-12 rounded-lg border-2 border-border shadow-default"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-text-muted font-mono">{color}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-3 bg-card rounded-lg border border-border">
                      <h4 className="font-medium text-text mb-2">Gradiente Temático</h4>
                      <div 
                        className="h-6 rounded-lg border border-border"
                        style={{ background: 'var(--theme-matching-gradient)' }}
                      />
                    </div>
                  </div>

                  {/* Button & Component Variants */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-text">Componentes del Sistema</h3>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn primary small">Primario</button>
                        <button className="btn secondary small">Secundario</button>
                        <button className="btn outline small">Outline</button>
                        <button className="btn ghost small">Ghost</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn success small">Éxito</button>
                        <button className="btn warning small">Advertencia</button>
                        <button className="btn error small">Error</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-text">Badges</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="badge primary">Primario</span>
                        <span className="badge secondary">Secundario</span>
                        <span className="badge success">Éxito</span>
                        <span className="badge warning">Advertencia</span>
                        <span className="badge error">Error</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card">
                      <div className="card-content">
                        <h4 className="font-medium text-text mb-1">Tarjeta Normal</h4>
                        <p className="text-text-muted text-sm">Ejemplo de tarjeta con el nuevo sistema de diseño.</p>
                      </div>
                    </div>
                    
                    <div className="card interactive">
                      <div className="card-content">
                        <h4 className="font-medium text-text mb-1">Tarjeta Interactiva</h4>
                        <p className="text-text-muted text-sm">Hover para ver efectos de transición.</p>
                      </div>
                    </div>
                    
                    <div className="card">
                      <div className="card-content space-y-2">
                        <h4 className="font-medium text-text mb-1">Formulario</h4>
                        <input type="text" placeholder="Campo de texto..." className="input w-full" />
                        <select className="select w-full">
                          <option>Seleccionar...</option>
                          <option>Opción 1</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {['admin', 'produccion'].includes(user.role) && (
          <div className="bg-card rounded-xl border p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mr-3" style={{background: 'linear-gradient(135deg, var(--theme-c3), var(--theme-c4))'}}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text">Tallas Sugeridas</h2>
                <p className="text-muted text-sm">Cantidades recomendadas para órdenes de stock</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {sizes.map(size => (
                <div key={size} className="bg-card rounded-lg p-4 text-center hover:bg-secondary-1 transition-colors">
                  <label className="block text-sm font-medium text-text mb-2">Talla {size}</label>
                  <input
                    type="number"
                    value={settings.suggestedSizes[size]}
                    onChange={(e) => handleSettingsChange(`suggestedSizes.${size}`, parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-center border border-secondary-2 rounded-md focus:ring-2 focus:ring-theme focus:border-theme transition-colors"
                    min="0"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl border p-6 sm:p-8">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{background: 'linear-gradient(135deg, var(--theme-secondary-2), var(--theme-secondary-4))'}}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">Notificaciones</h2>
              <p className="text-muted text-sm">Administra tus preferencias de notificaciones</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text">Notificaciones Generales</h3>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.notificationPrefs.receiveSaleNotifications}
                      onChange={(e) => handleSettingsChange('notificationPrefs.receiveSaleNotifications', e.target.checked)}
                      className="sr-only"
                      disabled={user?.role === 'lector'}
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      settings.notificationPrefs.receiveSaleNotifications ? 'bg-secondary-4 border-secondary-4' : 'border-secondary-2 group-hover:border-secondary-1'
                    }`}>
                      {settings.notificationPrefs.receiveSaleNotifications && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 text-text">Recibir notificaciones de ventas</span>
                </label>
                <label className="flex items-center cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.notificationPrefs.receiveOrderNotifications}
                      onChange={(e) => handleSettingsChange('notificationPrefs.receiveOrderNotifications', e.target.checked)}
                      className="sr-only"
                      disabled={user?.role === 'lector'}
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      settings.notificationPrefs.receiveOrderNotifications ? 'bg-secondary-4 border-secondary-4' : 'border-secondary-2 group-hover:border-secondary-1'
                    }`}>
                      {settings.notificationPrefs.receiveOrderNotifications && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 text-text">Recibir notificaciones de órdenes</span>
                </label>
              </div>
            </div>
            {allUsers.filter(u => u.id !== user.id).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-text">Bloquear Notificaciones de Usuarios</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allUsers.filter(u => u.id !== user.id).map(u => (
                    <label key={u.id} className="flex items-center cursor-pointer group p-3 rounded-lg hover:bg-muted transition-colors">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={settings.notificationPrefs.fromUsers.includes(u.id)}
                          onChange={(e) => {
                            const currentBlocked = settings.notificationPrefs.fromUsers || [];
                            const updatedUsers = e.target.checked
                              ? [...currentBlocked, u.id]
                              : currentBlocked.filter(id => id !== u.id);
                            handleSettingsChange('notificationPrefs.fromUsers', updatedUsers);
                          }}
                          className="sr-only"
                          disabled={user?.role === 'lector'}
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          settings.notificationPrefs.fromUsers.includes(u.id) ? 'bg-secondary-4 border-secondary-4' : 'border-secondary-2 group-hover:border-secondary-1'
                        }`}>
                          {settings.notificationPrefs.fromUsers.includes(u.id) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="ml-3 text-text text-sm">{u.username}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {user?.role !== 'lector' && (
        <div className="mt-8 sticky bottom-0 bg-card border-t py-4 flex justify-end">
          <button
            onClick={handleSaveAllSettings}
            disabled={saveLoading}
            className={`px-8 py-3 bg-theme text-white font-medium rounded-lg hover:bg-theme-hover focus:outline-none focus:ring-2 focus:ring-theme focus:ring-offset-2 transition-all ${
              saveLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
            }`}
          >
            {saveLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando cambios...
              </span>
            ) : (
              'Guardar todos los cambios'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Componente para la sección de perfil de usuario
const UserProfileSection = ({ user }) => {
  const [userInfo, setUserInfo] = useState({
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Efecto para sincronizar userInfo cuando cambie el usuario
  useEffect(() => {
    if (user) {
      setUserInfo({
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          username: userInfo.username.trim(),
          first_name: userInfo.first_name.trim(),
          last_name: userInfo.last_name.trim()
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          setMessage('⚠️ Este nombre de usuario ya está en uso.');
        } else {
          setMessage('❌ Error al actualizar el perfil.');
        }
        return;
      }

      setMessage('✅ Perfil actualizado correctamente');
      setIsEditing(false);
      
      // Limpiar cache del usuario para forzar recarga completa
      localStorage.removeItem('pear-user');
      
      // Recargar la página para actualizar el usuario en toda la app
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      setMessage('❌ Error inesperado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{background: 'linear-gradient(135deg, var(--theme-c3), var(--theme-c4))'}}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text">Mi Perfil</h2>
            <p className="text-muted text-sm">Actualiza tu información personal</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 text-sm font-medium text-theme bg-transparent border border-theme rounded-lg hover:bg-theme hover:text-white transition-colors"
        >
          {isEditing ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-2">Nombre de Usuario</label>
          {isEditing ? (
            <input
              type="text"
              value={userInfo.username}
              onChange={(e) => setUserInfo({...userInfo, username: e.target.value})}
              className="w-full px-3 py-2 border border-default rounded-lg focus:ring-2 focus:ring-theme focus:border-theme bg-background text-text"
              placeholder="Ej: Xavi"
            />
          ) : (
            <p className="px-3 py-2 bg-muted/30 rounded-lg text-text">{userInfo.username || 'Sin nombre de usuario'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-2">Email (solo lectura)</label>
          <p className="px-3 py-2 bg-muted/30 rounded-lg text-muted">{user?.email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-2">Nombre</label>
          {isEditing ? (
            <input
              type="text"
              value={userInfo.first_name}
              onChange={(e) => setUserInfo({...userInfo, first_name: e.target.value})}
              className="w-full px-3 py-2 border border-default rounded-lg focus:ring-2 focus:ring-theme focus:border-theme bg-background text-text"
              placeholder="Tu nombre"
            />
          ) : (
            <p className="px-3 py-2 bg-muted/30 rounded-lg text-text">{userInfo.first_name || 'Sin nombre'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-2">Apellido</label>
          {isEditing ? (
            <input
              type="text"
              value={userInfo.last_name}
              onChange={(e) => setUserInfo({...userInfo, last_name: e.target.value})}
              className="w-full px-3 py-2 border border-default rounded-lg focus:ring-2 focus:ring-theme focus:border-theme bg-background text-text"
              placeholder="Tu apellido"
            />
          ) : (
            <p className="px-3 py-2 bg-muted/30 rounded-lg text-text">{userInfo.last_name || 'Sin apellido'}</p>
          )}
        </div>
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {isEditing && (
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-theme text-white font-medium rounded-lg hover:bg-theme-hover focus:outline-none focus:ring-2 focus:ring-theme focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;