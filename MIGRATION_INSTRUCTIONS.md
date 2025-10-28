# 🔄 Migración Completa: user_profiles → users

## ✅ Estado Actual

- **RLS policies** ✅ Actualizadas para usar tabla `users`
- **Código de la aplicación** ✅ Actualizado para usar tabla `users`
- **Tabla users** ⏳ Necesita columnas adicionales
- **Tabla user_profiles** ❌ Lista para eliminar después de migrar datos

## 📋 Pasos para Completar la Migración

### 1. Ejecutar Migración de Estructura y Datos

Ejecuta el script `migrate_to_users_table.sql` en Supabase SQL Editor:

```sql
-- El script hace automáticamente:
-- ✓ Agrega columnas faltantes a users (first_name, last_name, bio, etc.)
-- ✓ Migra todos los datos de user_profiles a users
-- ✓ Verifica que tus datos estén correctos
```

### 2. Verificar Resultado

Después de ejecutar el script, deberías ver:

- ✅ Tus datos en la tabla `users` con first_name y last_name
- ✅ Estado: "Datos completos" o "Migración completada"

### 3. Probar la Aplicación

1. **Reinicia el servidor** de desarrollo (Ctrl+C y `npm run dev`)
2. **Prueba el login** - debería funcionar normalmente
3. **Prueba Settings > Mi Perfil** - debería permitir editar first_name/last_name
4. **Prueba WordPress integration** - debería poder guardar sin errores RLS

### 4. Solo DESPUÉS de que todo funcione

Una vez confirmado que todo funciona correctamente, elimina la tabla `user_profiles`:

```sql
-- ⚠️ SOLO ejecutar si todo funciona correctamente
DROP TABLE IF EXISTS user_profiles CASCADE;
```

## 🔧 Archivos Actualizados

### Frontend (React)

- ✅ `src/components/Settings.jsx` - UserProfileSection usa tabla `users`
- ✅ `src/App.jsx` - Autenticación y creación de usuarios usa `users`
- ✅ `src/components/Login.jsx` - Login busca usuarios en tabla `users`
- ✅ `src/components/CompanyRegistration.jsx` - Creación de usuarios usa `users`
- ✅ `src/context/CompanyContext.jsx` - Actualización de perfiles usa `users`

### Base de Datos

- ✅ `migrate_to_users_table.sql` - Script para migrar estructura y datos
- ✅ RLS policies actualizadas para usar `users`

## 🚨 Importante

1. **ORDEN CORRECTO**: Primero migración SQL → Reiniciar servidor → Probar → Eliminar user_profiles
2. **BACKUP**: Asegúrate de tener backup antes de eliminar user_profiles
3. **VERIFICATION**: Confirma que login, settings y web integrations funcionan
4. **ROLLBACK**: Si algo falla, los datos están en user_profiles hasta que lo elimines

## 🎯 Resultado Final

- ✅ Arquitectura limpia usando solo tabla `users`
- ✅ Web integrations funcionando sin errores RLS
- ✅ Multitenant funcionando correctamente
- ✅ Todas las funciones de perfil de usuario operativas

## 📝 Próximo Paso

**Ejecuta `migrate_to_users_table.sql` en Supabase SQL Editor y me avisas el resultado.**
