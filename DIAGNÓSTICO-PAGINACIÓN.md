# 🔍 DIAGNÓSTICO: Diferencias de Paginación entre SubInventory y StockView

## 📊 Problema Identificado:

- **SubInventory**: 7 páginas con 50 elementos = ~350 elementos totales
- **StockView**: 4 páginas con 50 elementos = ~200 elementos totales

## 🔍 Causas Principales:

### 1. **Diferentes tipos de conteo:**

- **SubInventory (`useInventoryGrouped`)**:

  - Cuenta productos DESPUÉS de agrupar por referencia-color
  - Cada grupo referencia-color = 1 elemento
  - Ejemplo: Producto "ABC123" con colores Rojo, Azul, Verde = 3 elementos

- **StockView (`useInventoryProducts`)**:
  - Cuenta productos ANTES de procesar
  - Cada producto individual = 1 elemento
  - Ejemplo: Producto "ABC123" con 3 colores = 1 elemento (pero se expande a 3 filas en UI)

### 2. **Consultas de base de datos diferentes:**

#### SubInventory Query:

```sql
SELECT products.*, variations.*
FROM products
INNER JOIN variations ON products.id = variations.product_id
-- Count se hace DESPUÉS del agrupamiento por referencia-color
```

#### StockView Query:

```sql
SELECT products.*, variations.*
FROM products
INNER JOIN variations ON products.id = variations.product_id
-- Count se hace directamente en productos
```

### 3. **Procesamiento de datos:**

- **SubInventory**: Agrupa variaciones → menos registros finales
- **StockView**: Mantiene productos con todas sus variaciones → más registros en UI

## ✅ Soluciones Aplicadas:

1. ✅ Estandarizado pageSize inicial a 50 en ambos componentes
2. ✅ Actualizado hook para usar pageSize = 50 por defecto

## 🎯 Resultado Esperado:

- Ahora ambos usan pageSize = 50 por defecto
- Las diferencias en número de páginas son normales debido a la naturaleza diferente de los datos:
  - SubInventory: Elementos agrupados (más páginas)
  - StockView: Productos base (menos páginas, más variaciones por producto)

## 📝 Notas:

- Esta diferencia es correcta y esperada
- Cada componente cuenta elementos de manera apropiada para su caso de uso
- SubInventory necesita mostrar cada combinación referencia-color
- StockView necesita mostrar productos con todas sus variaciones expandidas
