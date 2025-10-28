# 🧹 GUÍA DE LIMPIEZA DE BASE DE DATOS PARA REDUCIR EGRESS

## 📋 **PASOS RECOMENDADOS**

### 1. **🔍 PRIMERO: ANÁLISIS**

Ejecuta `database_cleanup_analysis.sql` para identificar:

- Imágenes grandes o rotas
- Variaciones sin stock
- Datos históricos antiguos
- Referencias duplicadas
- Campos de texto largos

### 2. **🎯 IMPACTO ESTIMADO POR CATEGORÍA**

| Categoría                   | Impacto Egress | Seguridad     | Acción                       |
| --------------------------- | -------------- | ------------- | ---------------------------- |
| **Notificaciones antiguas** | ALTO           | ✅ MUY SEGURO | Eliminar >3 meses            |
| **Variaciones stock=0**     | MEDIO          | ✅ SEGURO     | Eliminar sin movimientos     |
| **URLs imágenes largas**    | ALTO           | ✅ SEGURO     | Limpiar base64/rotas         |
| **Movimientos >2 años**     | ALTO           | ⚠️ CUIDADO    | Archivar primero             |
| **Campos texto largos**     | MEDIO          | ✅ SEGURO     | Truncar a tamaños razonables |
| **Productos huérfanos**     | MEDIO          | ⚠️ REVISAR    | Solo si sin variaciones      |

### 3. **🚀 RECOMENDACIÓN DE EJECUCIÓN**

#### **FASE 1: Limpieza Segura (Ejecutar ya)**

```sql
-- 1. Notificaciones antiguas (SEGURO)
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '3 months';

-- 2. URLs de imagen problemáticas (SEGURO)
UPDATE products SET image_url = NULL WHERE
LENGTH(image_url) > 500 OR image_url LIKE 'data:image%';

-- 3. Truncar campos largos (SEGURO)
UPDATE products SET description = LEFT(description, 500);
```

#### **FASE 2: Limpieza Moderada (Revisar primero)**

```sql
-- 1. Variaciones sin stock antiguas
-- REVISAR: Ejecutar análisis primero
DELETE FROM variations WHERE stock = 0 AND created_at < NOW() - INTERVAL '6 months';

-- 2. Archivar movimientos antiguos
-- HACER BACKUP primero
```

#### **FASE 3: Optimización Avanzada (Con precaución)**

```sql
-- Solo después de confirmar que son datos realmente innecesarios
```

### 4. **📊 ESTIMACIÓN DE REDUCCIÓN DE EGRESS**

| Acción                         | Reducción Estimada |
| ------------------------------ | ------------------ |
| Limpiar notificaciones         | 5-15%              |
| Optimizar URLs imágenes        | 10-30%             |
| Eliminar variaciones sin stock | 15-25%             |
| Archivar movimientos antiguos  | 20-40%             |
| **TOTAL POTENCIAL**            | **50-80%**         |

### 5. **⚠️ PRECAUCIONES IMPORTANTES**

1. **SIEMPRE hacer backup** antes de cualquier DELETE
2. **Probar en desarrollo** primero
3. **Ejecutar análisis** antes de cada limpieza
4. **Revisar** que no afecte reportes históricos necesarios
5. **Documentar** qué se eliminó y cuándo

### 6. **🔄 MANTENIMIENTO CONTINUO**

- **Semanal**: Limpiar notificaciones >1 mes
- **Mensual**: Revisar variaciones sin stock >3 meses
- **Trimestral**: Archivar movimientos >1 año
- **Semestral**: Optimizar imágenes y campos largos

## 🎯 **¿Qué quieres hacer primero?**

**Opción A**: Ejecutar análisis para ver qué tanto hay que limpiar
**Opción B**: Empezar con limpieza segura (notificaciones + URLs)
**Opción C**: Enfoque específico en una categoría

¡Dime qué opción prefieres y te ayudo a ejecutarla!
