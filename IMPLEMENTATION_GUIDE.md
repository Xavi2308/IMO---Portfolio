# 🚀 GUÍA DE IMPLEMENTACIÓN DEL SISTEMA DE ONBOARDING

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### ✅ PASO 1: BASE DE DATOS
- [ ] **Ejecutar `database_improvements.sql`** en Supabase
- [ ] Verificar que se crearon las tablas:
  - `company_onboarding`
  - `subscription_history` 
  - `email_templates`
  - `notification_preferences`
  - `onboarding_analytics`
- [ ] Verificar que se agregaron las columnas nuevas a `companies` y `users`

### ✅ PASO 2: DEPENDENCIAS
- [ ] Instalar Material-UI: `npm install @mui/material @emotion/react @emotion/styled`
- [ ] Instalar iconos: `npm install @mui/icons-material`
- [ ] Instalar React Query: `npm install @tanstack/react-query@4`
- [ ] Verificar React Router: `npm list react-router-dom`

### ✅ PASO 3: CONFIGURAR REACT QUERY
En tu `src/index.js` o `src/main.jsx`, agrega:

```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Envolver tu App con QueryClientProvider
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### ✅ PASO 4: CONFIGURAR AUTHPROVIDER
En tu `src/index.js` o donde configures providers:

```javascript
import { AuthProvider } from './contexts/AuthContext';

// Envolver tu App con AuthProvider
<AuthProvider>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</AuthProvider>
```

### ✅ PASO 5: VERIFICAR ARCHIVOS CREADOS
Estos archivos ya están creados y listos:
- ✅ `src/services/onboardingService.js`
- ✅ `src/hooks/useOnboarding.js`
- ✅ `src/components/OnboardingProgress.jsx`
- ✅ `src/components/OnboardingDashboard.jsx`
- ✅ Actualizaciones en `SignUp.jsx`, `CompanyRegistration.jsx`, `PlanSelection.jsx`

### ✅ PASO 6: PROBAR EL FLUJO

#### 6.1 Registro Nuevo Usuario
1. Ve a `/signup`
2. Completa el formulario
3. Verifica que redirige a `/company-setup`
4. En base de datos: verifica que se creó el usuario en la tabla `users`

#### 6.2 Configuración de Empresa
1. En `/company-setup`, completa los datos
2. Verifica que redirige a `/plan-selection`
3. En base de datos: verifica que se creó la empresa y relación en `user_companies`

#### 6.3 Selección de Plan
1. En `/plan-selection`, selecciona un plan
2. Verifica que redirige a `/login`
3. En base de datos: verifica que se actualizó el plan en `companies`

#### 6.4 Onboarding Tracking
1. Verifica en la tabla `company_onboarding` que se registró el progreso
2. Verifica en `onboarding_analytics` que se registraron los eventos

### 🔧 PASO 7: CONFIGURACIONES ADICIONALES

#### 7.1 Actualizar supabaseClient.js
Asegúrate de que el import sea correcto:

```javascript
import { createClient } from '@supabase/supabase-js';

// Tu configuración existente...
export default supabase;
```

#### 7.2 Actualizar hooks existentes
Si tienes hooks de autenticación existentes, asegúrate de que no entren en conflicto con el nuevo `useAuth`.

#### 7.3 Rutas protegidas
El sistema ya incluye navegación automática según el estado del onboarding.

### 🚨 TROUBLESHOOTING

#### Error: "Cannot find module '@mui/material'"
```bash
npm install @mui/material @emotion/react @emotion/styled
```

#### Error: "useAuth must be used within an AuthProvider"
Verifica que tu App esté envuelta con `<AuthProvider>`.

#### Error: "Cannot read properties of undefined (reading 'id')"
Verifica que el usuario esté cargado antes de usar los hooks de onboarding.

#### Base de datos: "table does not exist"
Ejecuta el script `database_improvements.sql` en Supabase.

### 📊 VERIFICAR QUE TODO FUNCIONA

#### Test 1: Registro completo
1. Crear nuevo usuario en `/signup`
2. Completar `/company-setup`
3. Seleccionar plan en `/plan-selection`
4. Iniciar sesión en `/login`
5. Ver dashboard con progreso de onboarding

#### Test 2: Verificar base de datos
```sql
-- Verificar usuario
SELECT * FROM users WHERE email = 'test@example.com';

-- Verificar empresa
SELECT * FROM companies WHERE id = 'company-id-here';

-- Verificar onboarding
SELECT * FROM company_onboarding WHERE user_id = 'user-id-here';

-- Verificar analytics
SELECT * FROM onboarding_analytics WHERE user_id = 'user-id-here';
```

#### Test 3: Verificar componentes
1. Ve a `/onboarding-dashboard` (si estás autenticado)
2. Verifica que se muestra el progreso
3. Prueba la navegación entre pasos

### 🎯 PRÓXIMOS PASOS OPCIONALES

Una vez que el sistema base funcione, puedes agregar:

1. **Más pasos de onboarding**:
   - Verificación de email
   - Selección de industria
   - Invitación de equipo
   - Primera configuración de productos

2. **Notificaciones por email**:
   - Emails de bienvenida
   - Recordatorios de completar onboarding
   - Consejos según el progreso

3. **Analytics mejorados**:
   - Dashboards de progreso de onboarding
   - Identificar puntos donde los usuarios abandonan
   - A/B testing de pasos

### 📞 SOPORTE

Si tienes problemas:
1. Revisa la consola del navegador para errores
2. Verifica la pestaña Network para errores de API
3. Revisa los logs de Supabase
4. Verifica que todas las dependencias estén instaladas

¡El sistema está listo para implementar! 🚀