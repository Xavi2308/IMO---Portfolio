// src/utils/generatePalette.js
import { interpolate, formatHex } from 'culori';

/**
 * Genera una paleta de 6 colores tipo "Matching Gradient" como MyColorSpace.
 * @param {string} mainColor - Color principal en HEX.
 * @returns {Object} Paleta de 6 colores { main, c1, c2, c3, c4, c5 }
 */
export function generatePalette(mainColor) {
  // Matching Gradient: de oscuro a claro pasando por el color principal
  const stops = [
    '#0f172a',  // Más oscuro para mejor contraste
    interpolate([mainColor, '#1e293b'], 'lch')(0.3),
    mainColor,
    interpolate([mainColor, '#f8fafc'], 'lch')(0.3),
    interpolate([mainColor, '#f8fafc'], 'lch')(0.6),
    '#f8fafc'   // Más claro para mejor contraste
  ];
  const palette = stops.map(c => formatHex(c));

  // Calcular color hover: versión más saturada y ligeramente más oscura
  const hoverColor = interpolate([mainColor, palette[1]], 'lch')(0.2);
  const hoverFormatted = formatHex(hoverColor);
  
  // Calcular color light: versión muy diluida para fondos
  const lightColor = interpolate([mainColor, '#f8fafc'], 'lch')(0.9);
  const lightFormatted = formatHex(lightColor);
  
  // Calcular color dark: versión más oscura para variantes
  const darkColor = interpolate([mainColor, '#1e293b'], 'lch')(0.3);
  const darkFormatted = formatHex(darkColor);

  return {
    main: palette[2],
    c1: palette[0],
    c2: palette[1],
    c3: palette[3],
    c4: palette[4],
    c5: palette[5],
    all: palette,
    hover: hoverFormatted,
    light: lightFormatted,
    dark: darkFormatted,
    // Mantener compatibilidad con código existente
    themeColorHover: hoverFormatted,
    themeColorLight: lightFormatted,
    themeColorDark: darkFormatted
  };
}

/**
 * Genera colores semánticos basados en el color principal
 * @param {string} mainColor - Color principal en HEX
 * @returns {Object} Objeto con colores semánticos
 */
export function generateSemanticColors(mainColor) {
  const palette = generatePalette(mainColor);
  
  return {
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: '#ef4444',
    errorLight: '#fee2e2',
    info: '#3b82f6',
    infoLight: '#dbeafe',
    primary: palette.main,
    primaryLight: palette.light,
    secondary: palette.c3,
    secondaryLight: interpolate([palette.c3, '#f8fafc'], 'lch')(0.8)
  };
}

/**
 * Aplica la paleta generada a las propiedades CSS personalizadas
 * @param {string} mainColor - Color principal en HEX
 * @param {boolean} isDark - Si es modo oscuro
 */
export function applyPaletteToCSS(mainColor, isDark = false) {
  console.log('applyPaletteToCSS called with:', mainColor);
  
  const palette = generatePalette(mainColor);
  const semantic = generateSemanticColors(mainColor);
  
  console.log('Generated palette:', palette);
  
  // Seleccionar el elemento raíz apropiado
  const root = isDark ? 
    document.documentElement : 
    document.documentElement;
  
  // Aplicar variables CSS
  const cssVars = {
    '--theme-color': palette.main,
    '--theme-main': palette.main,
    '--theme-color-hover': palette.hover,
    '--theme-color-light': palette.light,
    '--theme-color-dark': palette.dark,
    '--theme-c1': palette.c1,
    '--theme-c2': palette.c2,
    '--theme-c3': palette.c3,
    '--theme-c4': palette.c4,
    '--theme-c5': palette.c5,
    '--theme-matching-gradient': `linear-gradient(90deg, ${palette.c1}, ${palette.c2}, ${palette.main}, ${palette.c3}, ${palette.c4}, ${palette.c5})`,
    '--success': semantic.success,
    '--success-light': semantic.successLight,
    '--warning': semantic.warning,
    '--warning-light': semantic.warningLight,
    '--error': semantic.error,
    '--error-light': semantic.errorLight,
    '--info': semantic.info,
    '--info-light': semantic.infoLight,
  };
  
  // Aplicar las variables al elemento raíz
  Object.entries(cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  console.log('CSS variables applied to document root');
}
