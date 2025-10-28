// Manual Completo del Software IMO
// Este es el manual de referencia completo que IMO AI usa para responder

const ImoManual = {
  es: {
    // ===== INVENTARIOS =====
    "crear producto": {
      titulo: "Crear Producto Nuevo",
      pasos: [
        "1. Ve al menú lateral izquierdo",
        "2. Clic en 'Inventario'",
        "3. Botón 'Nuevo Producto' (esquina superior derecha)",
        "4. Llena los campos: código único, nombre, descripción",
        "5. Agrega precio de compra y precio de venta",
        "6. Selecciona categoría y tallas si aplica",
        "7. Sube imagen del producto (opcional)",
        "8. Clic en 'Guardar'"
      ],
      ubicacion: "Menú lateral → Inventario → Nuevo Producto",
      notas: "El código debe ser único para cada producto"
    },

    "crear productos": {
      titulo: "Crear Producto Nuevo", 
      pasos: [
        "1. Ve al menú lateral izquierdo",
        "2. Clic en 'Inventario'",
        "3. Botón 'Nuevo Producto' (esquina superior derecha)",
        "4. Llena los campos: código único, nombre, descripción",
        "5. Agrega precio de compra y precio de venta",
        "6. Selecciona categoría y tallas si aplica",
        "7. Sube imagen del producto (opcional)",
        "8. Clic en 'Guardar'"
      ],
      ubicacion: "Menú lateral → Inventario → Nuevo Producto",
      notas: "El código debe ser único para cada producto"
    },

    "agregar producto": {
      titulo: "Crear Producto Nuevo",
      pasos: [
        "1. Ve al menú lateral izquierdo",
        "2. Clic en 'Inventario'",
        "3. Botón 'Nuevo Producto' (esquina superior derecha)",
        "4. Llena los campos: código único, nombre, descripción",
        "5. Agrega precio de compra y precio de venta",
        "6. Selecciona categoría y tallas si aplica",
        "7. Sube imagen del producto (opcional)",
        "8. Clic en 'Guardar'"
      ],
      ubicacion: "Menú lateral → Inventario → Nuevo Producto",
      notas: "El código debe ser único para cada producto"
    },

    "editar producto": {
      titulo: "Editar Producto Existente",
      pasos: [
        "1. Ve a Inventario",
        "2. Busca el producto en la lista",
        "3. Clic en el producto que quieres editar",
        "4. Botón 'Editar' (ícono de lápiz)",
        "5. Modifica los campos que necesites",
        "6. Clic en 'Guardar' para aplicar cambios"
      ],
      ubicacion: "Inventario → Seleccionar producto → Editar",
      notas: "Todos los cambios quedan registrados en el historial"
    },

    "eliminar producto": {
      titulo: "Eliminar Producto",
      pasos: [
        "1. Ve a Inventario",
        "2. Encuentra el producto en la lista",
        "3. Clic derecho sobre el producto",
        "4. Selecciona 'Eliminar' del menú contextual",
        "5. Confirma la acción en el diálogo"
      ],
      ubicacion: "Inventario → Clic derecho en producto → Eliminar",
      notas: "Solo se puede eliminar si no tiene movimientos recientes"
    },

    "buscar producto": {
      titulo: "Buscar Productos",
      pasos: [
        "1. Ve a la sección Inventario",
        "2. Usa el campo 'Buscar' en la parte superior",
        "3. Escribe código, nombre o descripción",
        "4. Presiona Enter o clic en la lupa",
        "5. También puedes usar el escáner (ícono de cámara)"
      ],
      ubicacion: "Inventario → Campo de búsqueda superior",
      notas: "La búsqueda funciona con códigos, nombres y descripciones"
    },

    "escanear producto": {
      titulo: "Escanear Código de Barras",
      pasos: [
        "1. Busca el ícono de escáner (cámara) en cualquier campo de búsqueda",
        "2. Clic en el ícono del escáner",
        "3. Apunta la cámara al código de barras",
        "4. El sistema lee automáticamente el código",
        "5. Se carga la información del producto"
      ],
      ubicacion: "Cualquier campo de búsqueda → Ícono de escáner",
      notas: "Funciona con códigos EAN, UPC y códigos personalizados"
    },

    "inventario fisico": {
      titulo: "Hacer Inventario Físico",
      pasos: [
        "1. Ve a Inventario",
        "2. Clic en 'Inventario Físico'",
        "3. Botón '+Nuevo Conteo'",
        "4. Selecciona la ubicación a inventariar",
        "5. Escanea productos o usa entrada manual",
        "6. Al terminar, clic en 'Finalizar Conteo'",
        "7. Revisa las diferencias encontradas",
        "8. Clic en 'Aplicar Ajustes' para actualizar el sistema"
      ],
      ubicacion: "Inventario → Inventario Físico → Nuevo Conteo",
      notas: "Las diferencias se registran automáticamente con motivos"
    },

    // ===== VENTAS =====
    "hacer venta": {
      titulo: "Procesar Nueva Venta",
      pasos: [
        "1. Ve al menú 'Ventas'",
        "2. Clic en 'Nueva Venta'",
        "3. Escanea producto o búscalo manualmente",
        "4. Ingresa la cantidad",
        "5. Agrega más productos si necesario",
        "6. Clic en 'Total'",
        "7. Selecciona método de pago (efectivo, tarjeta, etc.)",
        "8. Clic en 'Finalizar Venta'",
        "9. Se genera automáticamente el ticket"
      ],
      ubicacion: "Menú Ventas → Nueva Venta",
      notas: "El inventario se actualiza automáticamente"
    },

    "nueva venta": {
      titulo: "Procesar Nueva Venta",
      pasos: [
        "1. Ve al menú 'Ventas'",
        "2. Clic en 'Nueva Venta'",
        "3. Escanea producto o búscalo manualmente",
        "4. Ingresa la cantidad",
        "5. Agrega más productos si necesario",
        "6. Clic en 'Total'",
        "7. Selecciona método de pago (efectivo, tarjeta, etc.)",
        "8. Clic en 'Finalizar Venta'",
        "9. Se genera automáticamente el ticket"
      ],
      ubicacion: "Menú Ventas → Nueva Venta",
      notas: "El inventario se actualiza automáticamente"
    },

    "vender": {
      titulo: "Procesar Nueva Venta",
      pasos: [
        "1. Ve al menú 'Ventas'",
        "2. Clic en 'Nueva Venta'",
        "3. Escanea producto o búscalo manualmente",
        "4. Ingresa la cantidad",
        "5. Agrega más productos si necesario",
        "6. Clic en 'Total'",
        "7. Selecciona método de pago (efectivo, tarjeta, etc.)",
        "8. Clic en 'Finalizar Venta'",
        "9. Se genera automáticamente el ticket"
      ],
      ubicacion: "Menú Ventas → Nueva Venta",
      notas: "El inventario se actualiza automáticamente"
    },

    "devolver producto": {
      titulo: "Procesar Devolución",
      pasos: [
        "1. Ve a Ventas",
        "2. Clic en 'Buscar Venta'",
        "3. Ingresa número de ticket o busca por cliente",
        "4. Selecciona la venta",
        "5. Clic en 'Devolver'",
        "6. Selecciona los productos a devolver",
        "7. Ingresa el motivo de devolución",
        "8. Clic en 'Procesar Devolución'",
        "9. Los productos regresan automáticamente al inventario"
      ],
      ubicacion: "Ventas → Buscar Venta → Devolver",
      notas: "Se genera automáticamente una nota de crédito"
    },

    "crear cliente": {
      titulo: "Agregar Cliente Nuevo",
      pasos: [
        "1. Ve al menú 'Clientes'",
        "2. Clic en 'Nuevo Cliente'",
        "3. Llena los datos: nombre, teléfono, email",
        "4. Agrega dirección si es necesario",
        "5. Selecciona tipo de cliente (normal, VIP, mayorista)",
        "6. Clic en 'Guardar'",
        "7. El cliente queda disponible para futuras ventas"
      ],
      ubicacion: "Menú Clientes → Nuevo Cliente",
      notas: "Los clientes se pueden crear también durante una venta"
    },

    // ===== REPORTES =====
    "ver estadísticas": {
      titulo: "Ver Estadísticas de Ventas",
      pasos: [
        "1. Ve a la pantalla principal (Home)",
        "2. En el Dashboard verás las estadísticas principales:",
        "   - Ventas del día",
        "   - Ventas del mes",
        "   - Productos más vendidos",
        "   - Productos con stock bajo",
        "3. Para reportes detallados: Menú 'Reportes'",
        "4. Selecciona el tipo de reporte que necesites"
      ],
      ubicacion: "Home → Dashboard principal",
      notas: "Las estadísticas se actualizan en tiempo real"
    },

    "estadísticas de ventas": {
      titulo: "Ver Estadísticas de Ventas",
      pasos: [
        "1. Ve a la pantalla principal (Home)",
        "2. En el Dashboard verás las estadísticas principales:",
        "   - Ventas del día",
        "   - Ventas del mes", 
        "   - Productos más vendidos",
        "   - Productos con stock bajo",
        "3. Para reportes detallados: Menú 'Reportes'",
        "4. Selecciona el tipo de reporte que necesites"
      ],
      ubicacion: "Home → Dashboard principal",
      notas: "Las estadísticas se actualizan en tiempo real"
    },

    "reportes": {
      titulo: "Generar Reportes",
      pasos: [
        "1. Ve al menú 'Reportes'",
        "2. Selecciona el tipo de reporte:",
        "   - Reporte de Ventas",
        "   - Reporte de Inventario",
        "   - Reporte de Clientes",
        "3. Define el período (día, semana, mes)",
        "4. Clic en 'Generar Reporte'",
        "5. Para exportar: botón 'Exportar' (Excel, PDF, CSV)"
      ],
      ubicacion: "Menú Reportes",
      notas: "Los reportes se pueden programar para envío automático"
    },

    "reporte de ventas": {
      titulo: "Generar Reporte de Ventas",
      pasos: [
        "1. Ve al menú 'Reportes'",
        "2. Clic en 'Reporte de Ventas'",
        "3. Selecciona el período (hoy, semana, mes, personalizado)",
        "4. Elige filtros si necesarios (vendedor, producto, cliente)",
        "5. Clic en 'Generar'",
        "6. Ve el reporte en pantalla",
        "7. Para guardar: botón 'Exportar'"
      ],
      ubicacion: "Reportes → Reporte de Ventas",
      notas: "Incluye gráficos y tablas detalladas"
    },

    "dashboard": {
      titulo: "Dashboard Principal",
      pasos: [
        "1. El Dashboard se encuentra en la pantalla Home",
        "2. Es la primera pantalla que ves al iniciar sesión",
        "3. Muestra información en tiempo real:",
        "   - Ventas del día vs ayer",
        "   - Productos con stock bajo",
        "   - Órdenes pendientes",
        "   - Clientes nuevos",
        "4. Los widgets se pueden personalizar",
        "5. Clic en cualquier widget para ver detalles"
      ],
      ubicacion: "Home (pantalla principal)",
      notas: "Se actualiza automáticamente cada minuto"
    },

    // ===== CONFIGURACIÓN =====
    "crear usuario": {
      titulo: "Crear Usuario Nuevo",
      pasos: [
        "1. Ve al menú 'Configuración'",
        "2. Clic en 'Usuarios'",
        "3. Botón '+Nuevo Usuario'",
        "4. Llena los datos:",
        "   - Nombre completo",
        "   - Email (será su usuario)",
        "   - Contraseña",
        "   - Rol (Administrador, Gerente, Vendedor, Almacenista)",
        "5. Clic en 'Guardar'",
        "6. El usuario puede iniciar sesión inmediatamente"
      ],
      ubicacion: "Configuración → Usuarios → Nuevo Usuario",
      notas: "Cada rol tiene permisos específicos predefinidos"
    },

    "crear usuarios": {
      titulo: "Crear Usuario Nuevo",
      pasos: [
        "1. Ve al menú 'Configuración'",
        "2. Clic en 'Usuarios'",
        "3. Botón '+Nuevo Usuario'",
        "4. Llena los datos:",
        "   - Nombre completo",
        "   - Email (será su usuario)",
        "   - Contraseña",
        "   - Rol (Administrador, Gerente, Vendedor, Almacenista)",
        "5. Clic en 'Guardar'",
        "6. El usuario puede iniciar sesión inmediatamente"
      ],
      ubicacion: "Configuración → Usuarios → Nuevo Usuario",
      notas: "Cada rol tiene permisos específicos predefinidos"
    },

    "agregar usuario": {
      titulo: "Crear Usuario Nuevo",
      pasos: [
        "1. Ve al menú 'Configuración'",
        "2. Clic en 'Usuarios'",
        "3. Botón '+Nuevo Usuario'",
        "4. Llena los datos:",
        "   - Nombre completo",
        "   - Email (será su usuario)",
        "   - Contraseña",
        "   - Rol (Administrador, Gerente, Vendedor, Almacenista)",
        "5. Clic en 'Guardar'",
        "6. El usuario puede iniciar sesión inmediatamente"
      ],
      ubicacion: "Configuración → Usuarios → Nuevo Usuario",
      notas: "Cada rol tiene permisos específicos predefinidos"
    },

    "configurar empresa": {
      titulo: "Configurar Datos de Empresa",
      pasos: [
        "1. Ve a Configuración",
        "2. Clic en 'Empresa'",
        "3. En la pestaña 'Información General':",
        "   - Sube el logo de tu empresa",
        "   - Ingresa nombre comercial",
        "   - Agrega dirección completa",
        "   - Teléfonos y emails de contacto",
        "4. En 'Datos Fiscales' agrega RFC y régimen",
        "5. Clic en 'Guardar'",
        "6. Esta información aparecerá en facturas y reportes"
      ],
      ubicacion: "Configuración → Empresa",
      notas: "Los datos fiscales son necesarios para facturación electrónica"
    },

    "cambiar tema": {
      titulo: "Personalizar Apariencia",
      pasos: [
        "1. Ve a Configuración",
        "2. Clic en 'Personalización'",
        "3. En la sección 'Tema':",
        "   - Selecciona Modo Claro o Modo Oscuro",
        "   - Elige colores principales",
        "   - Selecciona colores complementarios",
        "4. Los cambios se aplican inmediatamente",
        "5. Clic en 'Guardar' para mantener la configuración"
      ],
      ubicacion: "Configuración → Personalización → Tema",
      notas: "Cada usuario puede tener su tema personalizado"
    },

    // ===== INTEGRACIONES =====
    "conectar tienda online": {
      titulo: "Conectar Tienda Online",
      pasos: [
        "1. Ve a Configuración",
        "2. Clic en 'Integraciones'",
        "3. Selecciona la plataforma:",
        "   - WooCommerce",
        "   - Shopify",
        "   - Magento",
        "4. Ingresa las credenciales de tu tienda",
        "5. Clic en 'Conectar y Probar'",
        "6. Si la conexión es exitosa, clic en 'Guardar'",
        "7. La sincronización se activa automáticamente"
      ],
      ubicacion: "Configuración → Integraciones",
      notas: "Los productos se sincronizan automáticamente cada 15 minutos"
    },

    "woocommerce": {
      titulo: "Integrar con WooCommerce",
      pasos: [
        "1. Ve a Configuración → Integraciones",
        "2. Selecciona 'WooCommerce'",
        "3. Necesitas estos datos de tu tienda:",
        "   - URL de tu sitio web",
        "   - Consumer Key",
        "   - Consumer Secret",
        "4. En tu WordPress: WooCommerce → Configuración → Avanzado → REST API",
        "5. Crea una nueva clave API",
        "6. Copia las credenciales a IMO",
        "7. Clic en 'Conectar'"
      ],
      ubicacion: "Configuración → Integraciones → WooCommerce",
      notas: "La sincronización es bidireccional automática"
    }
  }
};

export default ImoManual;
