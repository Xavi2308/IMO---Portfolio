/**
 * @file postcss.config.js
 * @description
 * Archivo de configuración para PostCSS en PearApp. Define los plugins principales utilizados en la cadena de procesamiento de CSS,
 * como Tailwind CSS y Autoprefixer, permitiendo la generación y compatibilidad de estilos modernos en la aplicación.
 */

/**
 * @description
 * Exporta la configuración de PostCSS, especificando los plugins a utilizar para el procesamiento de CSS.
 * @returns {Object} Objeto de configuración para PostCSS.
 */
module.exports = {
  // --- PLUGINS DE PROCESAMIENTO CSS ---
  plugins: {
    tailwindcss: {},    // Integra Tailwind CSS para utilidades y generación de clases
    autoprefixer: {},   // Añade prefijos automáticos para compatibilidad entre navegadores
  },
}
