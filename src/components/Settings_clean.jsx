import React, { useState, useEffect, useContext } from 'react';
import LanguageContext from '../context/LanguageContext';
import translations from '../translations';
import { generatePalette, applyPaletteToCSS } from '../utils/generatePalette';
import { getTextContrastClass } from '../utils/getContrastYIQ';
import { supabase } from '../supabase';

const languages = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
];

const Settings = ({ user, setThemeColor, setThemeMode }) => {
  const { lang, setLang } = useContext(LanguageContext);
  const [settings, setSettings] = useState({
    themeColor: '#2E7D32',
    themeMode: 'light',
    suggestedSizes: { 34: 0, 35: 1, 36: 2, 37: 3, 38: 3, 39: 2, 40: 1, 41: 0 },
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

  // Función para obtener el color guardado
  const getSavedColor = () => {
    try {
      const savedColor = localStorage.getItem('themeColor');
      return savedColor || '#2E7D32';
    } catch (error) {
      return '#2E7D32';
    }
  };

  // Función para obtener el tema guardado
  const getSavedTheme = () => {
    try {
      const savedTheme = localStorage.getItem('themeMode');
      return savedTheme || 'light';
    } catch (error) {
      return 'light';
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', [
            `theme_color_${user.id}`,
            `theme_mode_${user.id}`,
            `suggested_sizes_${user.id}`,
            `lang_${user.id}`
          ]);
        if (settingsError) throw settingsError;

        const loadedSettings = {
          themeColor: '#2E7D32',
          themeMode: 'light',
          suggestedSizes: { 34: 0, 35: 1, 36: 2, 37: 3, 38: 3, 39: 2, 40: 1, 41: 0 },
          lang: 'es',
        };

        for (const setting of settingsData) {
          if (setting.key === `theme_color_${user.id}`) {
            loadedSettings.themeColor = setting.value;
          }
          if (setting.key === `theme_mode_${user.id}`) {
            loadedSettings.themeMode = setting.value;
          }
          if (setting.key === `suggested_sizes_${user.id}`) {
            loadedSettings.suggestedSizes = JSON.parse(setting.value);
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
        setAllUsers(data || []);
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
      }
    };

    loadSettings();
    fetchUsers();
  }, [user?.id, setThemeColor, setThemeMode, setLang]);

  const handleSettingsChange = (key, value) => {
    if (key.includes('.')) {
      const keys = key.split('.');
      setSettings(prevSettings => {
        const newSettings = { ...prevSettings };
        let current = newSettings;
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newSettings;
      });
    } else {
      setSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleColorChange = (newColor) => {
    setTempColor(newColor);
    setSettings(prev => ({ ...prev, themeColor: newColor }));
    setThemeColor(newColor);
    
    const palette = generatePalette(newColor);
    setPaletteColors([
      palette.main,
      palette.c3,
      palette.c4,
      palette.c5,
      palette.c2
    ]);

    applyPaletteToCSS(newColor);
  };

  const handleThemeModeChange = (mode) => {
    setSettings(prev => ({ ...prev, themeMode: mode }));
    setThemeMode(mode);
    
    // Cambiar la clase en el elemento raíz inmediatamente
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Guardar en localStorage
    localStorage.setItem('themeMode', mode);
    
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

    } catch (error) {
      console.error('Error:', error);
      setError(`Error al guardar: ${error.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Configuración de Tema */}
      <div className="bg-card rounded-xl border border-default p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-theme flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-text-inverted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">Personalización del Tema</h2>
              <p className="text-muted text-sm">Personaliza los colores y el aspecto de la aplicación</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Modo de tema */}
          <div>
            <h3 className="text-lg font-medium text-text mb-4">Modo de Tema</h3>
            <div className="flex space-x-4">
              {[
                { value: 'light', label: 'Claro', icon: '☀️' },
                { value: 'dark', label: 'Oscuro', icon: '🌙' }
              ].map((mode) => (
                <label key={mode.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="themeMode"
                    value={mode.value}
                    checked={settings.themeMode === mode.value}
                    onChange={(e) => handleThemeModeChange(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-all ${
                    settings.themeMode === mode.value
                      ? 'border-theme bg-theme/10 text-theme'
                      : 'border-default hover:border-theme/50'
                  }`}>
                    <span className="text-2xl">{mode.icon}</span>
                    <span className="font-medium">{mode.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Color principal */}
          <div>
            <h3 className="text-lg font-medium text-text mb-4">Color Principal</h3>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                value={tempColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-12 h-12 rounded-lg border-2 border-default cursor-pointer"
              />
              <input
                type="text"
                value={tempColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="px-3 py-2 border border-default rounded-lg focus:ring-2 focus:ring-theme focus:border-theme bg-background text-text flex-1 max-w-xs"
                placeholder="#2E7D32"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Idioma */}
      <div className="bg-card rounded-xl border border-default p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-theme flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-text-inverted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">Idioma</h2>
              <p className="text-muted text-sm">Selecciona el idioma de la interfaz</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => setLang(language.code)}
              className={`px-4 py-3 rounded-lg border transition-all text-center ${
                lang === language.code
                  ? 'border-theme bg-theme text-text-inverted'
                  : 'border-default hover:border-theme text-text hover:bg-theme/10'
              }`}
            >
              <div className="font-medium">{language.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Botón guardar todo */}
      <div className="bg-card rounded-xl border border-default p-6">
        <div className="flex justify-end">
          <button
            onClick={handleSaveAllSettings}
            disabled={saveLoading}
            className="px-6 py-3 bg-theme text-text-inverted font-medium rounded-lg hover:bg-theme-hover focus:outline-none focus:ring-2 focus:ring-theme focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {saveLoading ? 'Guardando...' : 'Guardar Todas las Configuraciones'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
