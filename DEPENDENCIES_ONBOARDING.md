# 📦 NUEVAS DEPENDENCIAS NECESARIAS

Para que el sistema de onboarding funcione correctamente, verifica que tienes estas dependencias instaladas en tu `package.json`:

## React Query (Para hooks de datos)
```bash
npm install @tanstack/react-query@4
```

## Material-UI (Para componentes de onboarding)
```bash
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material
```

## React Router (Ya lo tienes, pero verifica la versión)
```bash
npm install react-router-dom@6
```

## Verificar package.json
Agrega estas dependencias si no las tienes:

```json
{
  "dependencies": {
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "@tanstack/react-query": "^4.36.1",
    "react-router-dom": "^6.15.0"
  }
}
```

## Scripts de Instalación Rápida

### Windows (PowerShell)
```powershell
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @tanstack/react-query@4
```

### Linux/Mac
```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @tanstack/react-query@4
```

## Configuración adicional

Si usas Material-UI por primera vez, también instala:

```bash
npm install @fontsource/roboto  # Para fuentes
```

Y agrega en tu `src/index.js` o `src/main.jsx`:

```javascript
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
```