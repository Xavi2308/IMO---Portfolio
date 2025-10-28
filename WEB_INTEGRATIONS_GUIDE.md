# Sistema de Integraciones Web - IMO

## 🎯 Características Principales

### ✅ **Plataformas Soportadas**

- **WordPress + WooCommerce** - Tiendas online más populares
- **Shopify** - Plataforma de e-commerce líder
- **Magento** - Solución empresarial de comercio electrónico

### 🔄 **Funcionalidades**

- **Sincronización de inventario** en tiempo real
- **Actualización automática** de productos y precios
- **Prueba de conexión** con validación de credenciales
- **Estado de conexión** visual (conectado/desconectado/error)
- **Configuración guiada** paso a paso
- **Seguridad RLS** - cada usuario solo ve sus integraciones

## 🚀 **Instalación y Configuración**

### 1. **Crear tabla en Supabase**

```sql
-- Ejecutar en SQL Editor de Supabase
CREATE TABLE IF NOT EXISTS web_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'disconnected',
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);
```

### 2. **Configurar políticas de seguridad**

```sql
ALTER TABLE web_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own integrations"
  ON web_integrations
  USING (auth.uid() = user_id);
```

### 3. **Acceder a las integraciones**

- Ve a **Settings** en IMO
- Busca la sección **"Integraciones Web"**
- Selecciona la plataforma que deseas configurar

## 🛍️ **WordPress + WooCommerce**

### **Paso 1: Configurar API REST**

1. Inicia sesión en tu WordPress
2. Ve a `WooCommerce → Configuración → Avanzado → API REST`
3. Haz clic en **"Agregar clave"**

### **Paso 2: Crear credenciales**

- **Descripción**: `IMO Integration`
- **Usuario**: Tu usuario administrador
- **Permisos**: `Lectura/Escritura`
- Haz clic en **"Generar clave API"**

### **Paso 3: Configurar en IMO**

```
URL: https://tudominio.com
Consumer Key: ck_xxxxxxxxxxxxxxxxxx
Consumer Secret: cs_xxxxxxxxxxxxxxxxxx
```

### **Datos que se sincronizan:**

- ✅ Productos y variaciones
- ✅ Stock disponible
- ✅ Precios (detal y mayorista)
- ✅ Imágenes de productos
- ✅ Categorías

## 🛒 **Shopify**

### **Paso 1: Crear aplicación privada**

1. Ve a `Aplicaciones → Desarrollar aplicaciones`
2. Haz clic en **"Crear aplicación privada"**
3. Configura nombre: `IMO Sync`

### **Paso 2: Configurar permisos**

Habilita acceso para:

- **Productos**: Lectura y escritura
- **Inventario**: Lectura y escritura
- **Pedidos**: Solo lectura
- **Clientes**: Solo lectura

### **Paso 3: Configurar en IMO**

```
Nombre de tienda: mi-tienda (sin .myshopify.com)
API Key: Tu clave privada
Access Token: Token generado
```

## 🏪 **Magento Commerce**

### **Paso 1: Crear integración**

1. Ve a `Sistema → Integraciones → Agregar Nueva`
2. Nombre: `IMO Integration`
3. Activa los recursos necesarios

### **Paso 2: Configurar recursos**

Habilita:

- `Catalog → Products`
- `Sales → Orders`
- `Inventory → Stock Items`
- `Customers → All Customers`

### **Paso 3: Configurar en IMO**

```
URL: https://tutienda.com
API Token: Token generado automáticamente
```

## 🔧 **Funciones del Sistema**

### **Prueba de conexión**

```javascript
// El sistema valida automáticamente:
testWordPressConnection(config); // Para WordPress
testShopifyConnection(config); // Para Shopify
testMagentoConnection(config); // Para Magento
```

### **Estados de conexión**

- 🟢 **Conectado** - API funcional, sincronización activa
- 🔴 **Error** - Problemas de autenticación o conexión
- ⚪ **Desconectado** - No configurado o desactivado

### **Sincronización automática**

- **Inventario**: Actualización cada 15 minutos
- **Precios**: En tiempo real al modificar en IMO
- **Productos nuevos**: Sincronización diaria
- **Órdenes**: Importación cada 5 minutos

## 🔒 **Seguridad**

### **Datos encriptados**

- Las credenciales se almacenan encriptadas
- Comunicación HTTPS únicamente
- Tokens con permisos limitados

### **Políticas RLS**

- Cada usuario solo ve sus integraciones
- Auditoría completa de cambios
- Tokens renovables

## 📊 **Monitoreo y Logs**

### **Estado de sincronización**

```sql
SELECT platform, status, last_sync
FROM web_integrations
WHERE user_id = auth.uid();
```

### **Logs de actividad**

- Conexiones exitosas/fallidas
- Productos sincronizados
- Errores de API
- Cambios de configuración

## 🚨 **Resolución de Problemas**

### **Error de conexión**

1. ✅ Verifica que la URL sea correcta
2. ✅ Confirma que las credenciales estén activas
3. ✅ Revisa los permisos de la API
4. ✅ Prueba la conexión desde el navegador

### **Sincronización lenta**

1. Revisa la velocidad de internet
2. Verifica la carga del servidor
3. Reduce la frecuencia de sincronización
4. Optimiza la base de datos

### **Productos no aparecen**

1. Confirma que estén publicados
2. Verifica las categorías
3. Revisa los filtros de sincronización
4. Chequea el stock disponible

## 📈 **Próximas Funcionalidades**

- **PrestaShop** - Integración europea popular
- **OpenCart** - Plataforma open source
- **BigCommerce** - Solución empresarial
- **Synchronización bidireccional** avanzada
- **Webhooks** para actualización instantánea
- **Análisis de ventas** cross-platform

## 🎓 **Guías Paso a Paso**

El sistema incluye guías interactivas con:

- **Screenshots** de cada paso
- **Código de ejemplo** para configuración
- **Videos tutoriales** embebidos
- **Troubleshooting** específico por plataforma
- **Plantillas** de configuración

---

**¿Necesitas ayuda?** El sistema incluye soporte técnico integrado y documentación en tiempo real.
