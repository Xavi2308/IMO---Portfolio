/\*\*

- @file package.json
- @description
- Archivo de configuración principal para la gestión de dependencias, scripts y metadatos del proyecto IMO.
- Define información del proyecto, scripts de automatización, dependencias, configuración de build y compatibilidad de navegadores.
- Es fundamental para la instalación, ejecución y empaquetado de la aplicación.
  _/
  {
  "name": "imo", // Nombre del proyecto
  "version": "1.0.0", // Versión actual del proyecto
  "description": "Sistema de inventario de sandalias y ropa", // Breve descripción del propósito de la app
  "author": "Xavier", // Autor principal del proyecto
  "homepage": "./", // Ruta base para recursos estáticos
  "main": "build/electron.js", // Punto de entrada principal para Electron (diferente al de React)
  // --- SCRIPTS DE AUTOMATIZACIÓN ---
  "scripts": { // Colección de scripts para automatizar tareas comunes del ciclo de vida del proyecto
  "start": "react-scripts start", // Inicia la app en modo desarrollo (cliente React)
  "build": "react-scripts build", // Genera la build de producción del cliente
  "electron": "electron electron.js", // Lanza la app en modo Electron
  "electron-pack": "electron-builder", // Empaqueta la app Electron para distribución
  "server": "cd server && node index.js", // Inicia el servidor backend Node.js
  "dev": "concurrently \"npm run server\" \"npm run client\"", // Ejecuta servidor y cliente en paralelo
  "test": "echo \"Error: no test specified\" && exit 1", // Placeholder para tests (no implementado)
  "client": "react-scripts start", // Alias para iniciar el cliente React
  "dist": "npm run build && electron-builder", // Build de cliente y empaquetado Electron
  "postbuild": "copy electron.js build\\electron.js && xcopy server build\\server /s /i /y" // Copia archivos necesarios tras build
  // El script postbuild asegura que los archivos de Electron y backend estén presentes en la build final
  },
  // --- DEPENDENCIAS DE PRODUCCIÓN ---
  "dependencies": { // Lista de dependencias requeridas para la ejecución de IMO en producción
  "@supabase/supabase-js": "^2.50.0", // Cliente para integración con Supabase
  "autoprefixer": "^10.4.20", // Añade prefijos CSS automáticamente
  "axios": "^1.9.0", // Cliente HTTP para peticiones API
  "bcryptjs": "^3.0.2", // Hashing de contraseñas
  "chart.js": "^4.4.9", // Gráficas y visualización de datos
  "electron-is-dev": "^3.0.1", // Detecta modo desarrollo en Electron
  "lucide-react": "^0.511.0", // Iconos SVG para React
  "node-thermal-printer": "^4.4.5", // Impresión térmica desde Node.js
  "postcss": "^8.4.41", // Procesador de CSS
  "react": "^19.1.0", // Librería principal de React
  "react-beautiful-dnd": "^13.1.1", // Drag & drop en React
  "react-chartjs-2": "^5.3.0", // Integración de Chart.js con React
  "react-dom": "^19.1.0", // Renderizado de componentes React
  "react-draggable": "^4.4.6", // Arrastrar elementos en React
  "react-modal": "^3.16.3", // Modales accesibles en React
  "react-pro-sidebar": "^1.1.0", // Sidebar profesional para React
  "react-resizable": "^3.0.5", // Redimensionar elementos en React
  "react-router-dom": "^7.6.1", // Enrutamiento en aplicaciones React
  "tailwindcss": "^3.4.10", // Framework de utilidades CSS
  "ws": "^8.18.2", // WebSockets para Node.js
  "xlsx": "^0.18.5" // Manipulación de archivos Excel
  },
  // --- DEPENDENCIAS DE DESARROLLO ---
  "devDependencies": { // Paquetes necesarios solo para el desarrollo y construcción de IMO
  "concurrently": "^8.2.2", // Ejecuta múltiples comandos en paralelo
  "electron": "^31.7.7", // Framework principal de Electron
  "electron-builder": "^24.13.3", // Empaquetador de apps Electron
  "electron-reload": "^2.0.0-alpha.1", // Recarga automática en desarrollo Electron
  "react-scripts": "^5.0.1", // Scripts y configuración para React
  "wait-on": "^7.2.0" // Espera a recursos antes de ejecutar comandos
  },
  // --- CONFIGURACIÓN DE EMPAQUETADO (ELECTRON BUILDER) ---
  "build": { // Configuración específica para el empaquetado y distribución de la app con Electron Builder
  "appId": "com.imo", // Identificador único de la app
  "productName": "IMO", // Nombre comercial de la app
  "directories": {
  "output": "dist" // Carpeta de salida para builds
  },
  "files": [
  "build/\*\*/_", // Incluye todos los archivos de build
  "package.json" // Incluye el package.json para dependencias
  ],
  "win": {
  "target": "nsis" // Instalador para Windows usando NSIS
  }
  },
  // --- CONFIGURACIÓN DE COMPATIBILIDAD DE NAVEGADORES ---
  "browserslist": { // Define los navegadores soportados para producción y desarrollo
  "production": [
  ">0.2%", // Navegadores con más del 0.2% de uso global
  "not dead", // Excluye navegadores obsoletos
  "not op_mini all" // Excluye Opera Mini
  ],
  "development": [
  "last 1 chrome version", // Última versión de Chrome
  "last 1 firefox version", // Última versión de Firefox
  "last 1 safari version" // Última versión de Safari
  ]
  }
  }
