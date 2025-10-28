/**
 * Utility function to determine text contrast based on background color
 * Uses YIQ color space for better contrast detection
 */

export function getContrastYIQ(hexcolor) {
  // Remove # if present
  hexcolor = hexcolor.replace('#', '');
  
  // If short format (#abc), expand to #aabbcc
  if (hexcolor.length === 3) {
    hexcolor = hexcolor.split('').map(x => x + x).join('');
  }
  
  // Convert to RGB
  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);
  
  // YIQ formula for luminance
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Return appropriate text color
  return yiq >= 128 ? '#111827' : '#f8fafc';
}

/**
 * Enhanced text contrast utility for theme-based applications
 * @param {string} bgClass - CSS class name for background
 * @param {string} forceBg - Force light/dark background
 * @param {boolean} muted - Whether to use muted text color
 * @returns {string} CSS class name for text color
 */
export function getTextContrastClass(bgClass, forceBg, muted = false) {
  // Handle forced backgrounds
  if (forceBg === 'light') {
    return muted ? 'text-text-secondary' : 'text-text';
  }
  
  if (forceBg === 'dark') {
    return muted ? 'text-text-muted' : 'text-inverted';
  }
  
  // Handle theme-based backgrounds
  const themeBackgrounds = {
    'bg-theme': 'text-inverted',
    'bg-theme-dark': 'text-inverted',
    'bg-theme-light': 'text-theme',
    'bg-theme-c1': 'text-inverted',
    'bg-theme-c2': 'text-inverted',
    'bg-theme-c3': 'text-text',
    'bg-theme-c4': 'text-text',
    'bg-theme-c5': 'text-text',
    'bg-success': 'text-inverted',
    'bg-warning': 'text-inverted',
    'bg-error': 'text-inverted',
    'bg-info': 'text-inverted',
    'bg-background': muted ? 'text-text-muted' : 'text-text',
    'bg-background-secondary': muted ? 'text-text-muted' : 'text-text',
    'bg-background-tertiary': muted ? 'text-text-muted' : 'text-text',
    'bg-card': muted ? 'text-text-muted' : 'text-text',
  };
  
  // Check for exact match first
  if (themeBackgrounds[bgClass]) {
    return themeBackgrounds[bgClass];
  }
  
  // Check for partial matches
  for (const [bg, textClass] of Object.entries(themeBackgrounds)) {
    if (bgClass.includes(bg)) {
      return textClass;
    }
  }
  
  // Default fallback
  return muted ? 'text-text-muted' : 'text-text';
}

/**
 * Get appropriate text color for a given background color
 * @param {string} backgroundColor - Background color (hex, rgb, or CSS variable)
 * @param {boolean} muted - Whether to use muted text color
 * @returns {string} CSS class name for text color
 */
export function getTextColorForBackground(backgroundColor, muted = false) {
  // Handle CSS variables
  if (backgroundColor.startsWith('var(')) {
    const varName = backgroundColor.replace('var(', '').replace(')', '');
    
    // Map CSS variables to appropriate text colors
    const variableMap = {
      '--theme-main': 'text-inverted',
      '--theme-color': 'text-inverted',
      '--theme-color-dark': 'text-inverted',
      '--theme-c1': 'text-inverted',
      '--theme-c2': 'text-inverted',
      '--theme-c3': 'text-text',
      '--theme-c4': 'text-text',
      '--theme-c5': 'text-text',
      '--success': 'text-inverted',
      '--warning': 'text-inverted',
      '--error': 'text-inverted',
      '--info': 'text-inverted',
      '--background': muted ? 'text-text-muted' : 'text-text',
      '--background-secondary': muted ? 'text-text-muted' : 'text-text',
      '--background-tertiary': muted ? 'text-text-muted' : 'text-text',
      '--card': muted ? 'text-text-muted' : 'text-text',
    };
    
    return variableMap[varName] || (muted ? 'text-text-muted' : 'text-text');
  }
  
  // Handle hex colors
  if (backgroundColor.startsWith('#')) {
    const contrastColor = getContrastYIQ(backgroundColor);
    return contrastColor === '#111827' ? 'text-text' : 'text-inverted';
  }
  
  // Default fallback
  return muted ? 'text-text-muted' : 'text-text';
}
