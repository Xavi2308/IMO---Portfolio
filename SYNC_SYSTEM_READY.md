# 🚀 Sistema de Sincronización Automática WooCommerce

## ✅ Lo que hemos implementado:

### 1. **Sistema Flexible de Mapeo**

- **Por SKU** - Relaciona productos por código SKU
- **Por Nombre** - Relaciona productos por nombre exacto
- **Por Campo Personalizado** - Relaciona productos por un meta field de WooCommerce

### 2. **Sincronización Automática**

- ⏰ **Intervalos configurables** (cada 5-1440 minutos)
- 🔄 **Bidireccional** - IMO ↔ WooCommerce o solo en una dirección
- 📦 **Auto-creación** - Crea productos en WooCommerce si no existen
- 💰 **Sincronización de precios** con multiplicador configurable
- 📊 **Stock en tiempo real** - Suma de todas las tallas

### 3. **Configuración por Empresa**

- Cada empresa puede tener su propia configuración
- Método de mapeo personalizable
- Intervalos diferentes según necesidades
- Configuraciones de precios independientes

### 4. **Monitoreo y Logs**

- 📈 **Historial completo** de sincronizaciones
- ❌ **Registro de errores** detallado
- 📊 **Estadísticas** de productos procesados/actualizados/creados
- 🎯 **Dashboard visual** en Settings

## 📋 Pasos para Activar:

### 1. Ejecutar Script de Base de Datos

**Ejecuta `create_sync_logs_table.sql` en Supabase SQL Editor:**

```sql
-- Crea la tabla sync_logs y configuraciones necesarias
-- Ya está listo para ejecutar
```

### 2. Verificar Dependencias

Las dependencias ya están instaladas:

- ✅ @woocommerce/woocommerce-rest-api
- ✅ node-cron

### 3. Reiniciar Servidor

**Reinicia el servidor para cargar el nuevo código:**

```bash
# Detener servidor actual (Ctrl+C)
# Luego ejecutar:
npm run dev
```

### 4. Configurar Sincronización

1. **Ir a Settings** en la aplicación
2. **Buscar "Configuración de Sincronización Automática"**
3. **Seleccionar método de mapeo** (SKU recomendado)
4. **Configurar intervalo** (15 minutos recomendado)
5. **Activar opciones deseadas**
6. **Guardar configuración**

## 🎯 Cómo Funciona:

### Flujo Automático:

1. **Cada X minutos** el sistema ejecuta sincronización
2. **Obtiene productos de IMO** (activos de tu empresa)
3. **Busca en WooCommerce** usando el método configurado
4. **Actualiza stock** sumando todas las tallas
5. **Actualiza precios** si está habilitado
6. **Crea productos nuevos** si no existen y está activado
7. **Registra resultados** en el historial

### Mapeo Inteligente:

- **SKU**: Busca por `product.sku` en WooCommerce
- **Nombre**: Busca por coincidencia exacta de nombre
- **Campo Personalizado**: Busca por meta field que contenga el ID de IMO

### Sincronización de Stock:

- **Calcula stock total** sumando todas las tallas del producto
- **Actualiza cantidad** en WooCommerce
- **Cambia estado** (en stock / agotado) según umbral configurado

## 🔧 Configuraciones Avanzadas:

### Multiplicador de Precios

- **1.0** = Precio igual a IMO
- **1.2** = 20% más caro que IMO
- **0.8** = 20% más barato que IMO

### Direcciones de Sincronización

- **Bidireccional** = IMO ↔ WooCommerce (recomendado)
- **IMO → WooCommerce** = Solo actualiza WooCommerce
- **WooCommerce → IMO** = Solo actualiza IMO (próximamente)

### Campo Personalizado

Si usas mapeo por campo personalizado:

- **meta.\_imo_id** = Meta field llamado "\_imo_id"
- **meta.custom_product_id** = Meta field llamado "custom_product_id"

## 📊 Dashboard y Monitoreo:

El dashboard muestra:

- ✅ **Estado** de cada sincronización
- 📦 **Productos procesados/actualizados/creados**
- ❌ **Errores detallados** si los hay
- ⏰ **Fecha y hora** de cada ejecución
- 🔄 **Botón para sincronización manual**

## 🚨 Próximo Paso:

**Ejecuta `create_sync_logs_table.sql` en Supabase y me avisas el resultado para continuar con las pruebas.**
