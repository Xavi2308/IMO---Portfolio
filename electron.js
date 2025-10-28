/**
 * @file main.js
 * @description Archivo principal de la aplicación Electron. Configura la ventana principal, establece la conexión con Supabase para la gestión de usuarios, maneja comunicaciones IPC con el frontend y proporciona funcionalidad para imprimir etiquetas. Este archivo es el punto de entrada del proceso principal de Electron.
 */

const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Variable que indica si la aplicación está en modo desarrollo
const isDev = !app.isPackaged;

// --- INICIO DE LA SECCIÓN DE CONFIGURACIÓN DE SUPABASE ADMIN ---
// Esta sección DEBE estar al principio del archivo.
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODAyMjU3OCwiZXhwIjoyMDYzNTk4NTc4fQ.tDy9qlbeW2RxP4YE_vb44vjZABcgkBWwhsQWhO-5U-k'; // <-- PEGA TU CLAVE DE SERVICIO (SERVICE_ROLE) AQUÍ

// Cliente de Supabase con permisos de administrador para operaciones backend
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
// --- FIN DE LA SECCIÓN DE CONFIGURACIÓN ---

/**
 * @description Crea y configura la ventana principal de la aplicación Electron.
 * @returns {void}
 */
function createWindow() {
  // --- CONFIGURACIÓN DE LA VENTANA ---
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // No mostrar hasta que esté lista
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Script de precarga para comunicación segura
      contextIsolation: true, // Aísla el contexto para mayor seguridad
      enableRemoteModule: false, // Desactiva módulos remotos por seguridad
      nodeIntegration: false, // Desactiva integración de Node.js en el renderer
      devTools: isDev, // Solo permitir DevTools en desarrollo
      backgroundThrottling: false, // Evita que se throttle cuando pierde foco
    },
  });

  // Mostrar la ventana cuando esté lista para evitar parpadeos
  win.once('ready-to-show', () => {
    win.show();
  });

  // Evitar recargas automáticas al perder/ganar foco
  win.on('blur', () => {
    console.log('🔄 Ventana perdió foco - manteniendo estado');
  });

  win.on('focus', () => {
    console.log('🔄 Ventana ganó foco - manteniendo estado');
  });

  // --- CARGA DEL CONTENIDO ---
  if (isDev) {
    // En modo desarrollo, carga el servidor de desarrollo
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools(); // Abre las herramientas de desarrollo
  } else {
    // En producción, carga el archivo HTML empaquetado
    win.loadFile(path.join(__dirname, 'index.html'));
    // NO abrir DevTools en producción para mejor experiencia de usuario
    // win.webContents.openDevTools(); // Comentado para producción
    // Manejo de errores de carga
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Error al cargar la app:', errorDescription, validatedURL);
      win.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="color:red;font-size:20px;padding:2em;">Error al cargar la app: ${errorDescription} <br>URL: ${validatedURL}</div>';
      `);
    });
  }
}

/**
 * @description Inicializa la aplicación cuando Electron está listo.
 * @returns {void}
 */
app.whenReady().then(() => {
  // --- CREACIÓN DE LA VENTANA ---
  createWindow();

  // --- CONFIGURACIÓN DE SEGURIDAD ---
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Establece la política de seguridad de contenido (CSP)
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://your-project.supabase.co wss://your-project.supabase.co;"
        ],
      },
    });
  });

  // --- MANEJO DE EVENTOS DE LA APLICACIÓN ---
  app.on('activate', () => {
    // Crea una nueva ventana si no hay ninguna abierta (comportamiento en macOS)
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/**
 * @description Cierra la aplicación cuando todas las ventanas están cerradas, excepto en macOS.
 * @returns {void}
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- INICIO DE MANEJADORES DE IPC PARA GESTIÓN DE USUARIOS ---

/**
 * @description Obtiene todos los usuarios de la tabla 'users' en Supabase.
 * @returns {Promise<Object[]>} Lista de usuarios.
 */
ipcMain.handle('users:get', async () => {
  // --- CONSULTA A SUPABASE ---
  const { data, error } = await supabaseAdmin.from('users').select('*');
  if (error) {
    console.error('Error en users:get:', error);
    throw error;
  }
  return data;
});

/**
 * @description Agrega un nuevo usuario en Supabase, creando primero el usuario en auth y luego en la tabla 'users'.
 * @param {Object} event - Evento IPC de Electron.
 * @param {Object} userData - Datos del usuario.
 * @param {string} userData.email - Correo electrónico del usuario.
 * @param {string} userData.password - Contraseña del usuario.
 * @param {string} userData.username - Nombre de usuario.
 * @param {string} userData.role - Rol del usuario.
 * @returns {Promise<Object>} Datos del usuario creado.
 */
ipcMain.handle('users:add', async (event, userData) => {
  const { email, password, username, role } = userData;

  // --- CREACIÓN DEL USUARIO EN AUTH ---
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Confirma automáticamente el correo
    user_metadata: { username: username }
  });
  if (authError) {
    console.error('Error en users:add (auth):', authError);
    throw authError;
  }

  // --- INSERCIÓN EN LA TABLA USERS ---
  const { error: insertError } = await supabaseAdmin.from('users').insert({
    id: authData.user.id,
    email,
    username,
    role
  });
  if (insertError) {
    // En caso de error, elimina el usuario de auth para mantener consistencia
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    console.error('Error en users:add (insert):', insertError);
    throw insertError;
  }

  return authData.user;
});

/**
 * @description Elimina un usuario de Supabase, desvinculando primero sus registros y luego eliminando el perfil y la autenticación.
 * @param {Object} event - Evento IPC de Electron.
 * @param {string} userId - ID del usuario a eliminar.
 * @returns {Promise<Object>} Objeto con la confirmación de éxito.
 */
ipcMain.handle('users:delete', async (event, userId) => {
  // Solo mostrar logs en desarrollo
  if (isDev) {
    console.log(`Petición de Electron para eliminar usuario: ${userId}`);
  }

  try {
    // --- DESVINCULACIÓN DE REGISTROS RELACIONADOS ---
    // Establece a null los campos que referencian al usuario
    await supabaseAdmin.from('sales').update({ created_by: null }).eq('created_by', userId);
    await supabaseAdmin.from('sales').update({ approved_by: null }).eq('approved_by', userId);
    await supabaseAdmin.from('orders').update({ user_id: null }).eq('user_id', userId);
    await supabaseAdmin.from('inventory_movements').update({ user_id: null }).eq('user_id', userId);
    await supabaseAdmin.from('notifications').update({ user_id: null }).eq('user_id', userId);

    // --- ELIMINACIÓN DEL PERFIL ---
    const { error: profileError } = await supabaseAdmin.from('users').delete().eq('id', userId);
    if (profileError) throw profileError;

    // --- ELIMINACIÓN DEL USUARIO DE AUTENTICACIÓN ---
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return { success: true };
  } catch (error) {
    console.error(`Error al eliminar usuario (electron):`, error);
    throw error; // Lanza el error para que el frontend lo pueda capturar
  }
});

// --- FIN DE MANEJADORES DE IPC ---

/**
 * @description Maneja la solicitud para imprimir una etiqueta con datos específicos.
 * @param {Object} event - Evento IPC de Electron.
 * @param {Object} stickerData - Datos de la solicitud de la etiqueta.
 * @param {string} stickerData.reference - Referencia del producto.
 * @param {string} stickerData.color - Color del producto.
 * @param {string} stickerData.size - Talla del producto.
 * @param {string} stickerData.barcode - Código de barras del producto.
 * @returns {void}
 */
ipcMain.on('print-sticker', (event, stickerData) => {
  // --- CREACIÓN DE LA VENTANA DE IMPRESIÓN ---
  const printWindow = new BrowserWindow({
    show: false, // No muestra la ventana para evitar parpadeos
    webPreferences: {
      preload: path.join(__dirname, 'public', 'preload.js'), // Usa el mismo
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // --- GENERACIÓN DEL CONTENIDO HTML ---
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 10mm; font-family: Arial, Arial; sans-serif; font-size: 10px; }
          .sticker { width: 30mm; height: 40mm; border: 1px solid #000; padding: 2mm; }
          .field { margin: 1mm 0; }
        </style>
      </head>
      <body>
        <div class="sticker">
          <div class="field">Ref: ${stickerData.reference}</div>
          <div class="field">Color: ${stickerData.color}</div>
          <div class="field">Talla: ${stickerData.size}</div>
          <div class="field">Código: ${stickerData.barcode}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  /**
   * @description Obtiene una imagen desde una URL y la convierte en formato Data URL.
   * @param {Object} event - Evento IPC de Electron.
   * @param {string} imageUrl - URL de la imagen a descargar.
   * @returns {Promise<string>} Data URL de la imagen.
   */
  ipcMain.handle('image:fetch', async (event, imageUrl) => {
    try {
      // --- DESCARGA DE LA IMAGEN ---
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer' // Pide la imagen como datos binarios
      });
      const buffer = Buffer.from(response.data, 'binary');
      const mimeType = response.headers['content-type'];
      const base64 = buffer.toString('base64');
      return `data:${mimeType};base64,${base64}`; // Convierte a Data URL
    } catch (error) {
      console.error('Error al descargar la imagen:', error.message);
      throw new Error('No se pudo descargar la imagen desde la URL.');
    }
  });

  // --- CARGA DEL CONTENIDO HTML EN LA VENTANA ---
  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  // --- IMPRESIÓN DEL CONTENIDO ---
  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print(
      {
        silent: true, // Imprime sin mostrar diálogo
        printBackground: true, // Incluye fondos
        deviceName: 'DigitalPOS', // Nombre de la impresora configurada
        pageSize: { width: 30, height: 40 }, // Tamaño en milímetros
      },
      (success, errorType) => {
        if (!success) console.error('Error al imprimir:', errorType);
        printWindow.close(); // Cierra la ventana tras la impresión
      }
    );
  });
});