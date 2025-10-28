/**
 * @file OnboardingDashboard.jsx
 * @description Dashboard principal con integración de onboarding
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  useTheme,
  alpha
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CheckCircle,
  PlayCircle,
  Settings,
  Group,
  Inventory,
  Analytics,
  Close
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding, useOnboardingStatus } from '../hooks/useOnboarding';
import OnboardingProgress from './OnboardingProgress';

const OnboardingDashboard = () => {
  const theme = useTheme();
  const { user, company } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);

  const {
    currentStep,
    isCompleted,
    progress,
    needsOnboarding,
    isLoading
  } = useOnboardingStatus();

  const {
    navigateToCurrentStep,
    enableAutoNavigation
  } = useOnboarding(company?.id, user?.id);

  // Quick actions para usuarios nuevos
  const quickActions = [
    {
      id: 'products',
      title: 'Agregar Productos',
      description: 'Comienza agregando tus primeros productos al inventario',
      icon: Inventory,
      color: 'primary',
      route: '/products/new',
      completed: false
    },
    {
      id: 'team',
      title: 'Invitar Equipo',
      description: 'Invita a tu equipo para colaborar en el inventario',
      icon: Group,
      color: 'secondary',
      route: '/team/invite',
      completed: false
    },
    {
      id: 'settings',
      title: 'Configurar Sistema',
      description: 'Personaliza la configuración según tu negocio',
      icon: Settings,
      color: 'info',
      route: '/settings',
      completed: false
    },
    {
      id: 'reports',
      title: 'Ver Reportes',
      description: 'Explora los reportes y analytics disponibles',
      icon: Analytics,
      color: 'success',
      route: '/reports',
      completed: false
    }
  ];

  const handleStartOnboarding = () => {
    if (currentStep && currentStep !== 'completed') {
      navigateToCurrentStep();
    }
  };

  const handleQuickAction = (action) => {
    setSelectedAction(action);
    // Aquí podrías navegar a la ruta correspondiente
    console.log('Navegando a:', action.route);
  };

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography variant="h6" color="text.secondary">
            Cargando dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header de bienvenida */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom color="primary" fontWeight="bold">
          ¡Bienvenido a IMO! 👋
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Hola {user?.first_name}, estás en {company?.name || 'tu empresa'}
        </Typography>
      </Box>

      {/* Alerta de onboarding si no está completado */}
      {needsOnboarding && !isCompleted && (
        <Fade in timeout={800}>
          <Alert 
            severity="info" 
            sx={{ 
              mb: 4,
              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
              borderRadius: 2
            }}
            action={
              <Box display="flex" gap={1}>
                <Button 
                  color="info" 
                  size="small" 
                  variant="outlined"
                  onClick={handleStartOnboarding}
                  startIcon={<PlayCircle />}
                >
                  Continuar
                </Button>
                <Button 
                  color="info" 
                  size="small"
                  onClick={() => setShowOnboarding(true)}
                >
                  Ver Progreso
                </Button>
              </Box>
            }
          >
            <Typography variant="body1" fontWeight="medium">
              Configuración Pendiente ({progress}% completado)
            </Typography>
            <Typography variant="body2">
              Completa la configuración inicial para aprovechar al máximo todas las funcionalidades.
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* Progreso mini si no está completado */}
      {needsOnboarding && !showOnboarding && (
        <Box mb={4}>
          <OnboardingProgress
            companyId={company?.id}
            userId={user?.id}
            variant="mini"
          />
        </Box>
      )}

      <Grid container spacing={4}>
        {/* Stats principales */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Productos
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        0
                      </Typography>
                    </Box>
                    <Inventory color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Usuarios
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        1
                      </Typography>
                    </Box>
                    <Group color="secondary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Ventas
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        $0
                      </Typography>
                    </Box>
                    <Analytics color="success" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Panel de acciones rápidas */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
              Acciones Rápidas
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Configuraciones recomendadas para comenzar
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={2}>
              {quickActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outlined"
                    fullWidth
                    onClick={() => handleQuickAction(action)}
                    startIcon={<IconComponent />}
                    sx={{
                      justifyContent: 'flex-start',
                      p: 2,
                      textAlign: 'left',
                      borderColor: alpha(theme.palette[action.color].main, 0.3),
                      '&:hover': {
                        borderColor: theme.palette[action.color].main,
                        backgroundColor: alpha(theme.palette[action.color].main, 0.05)
                      }
                    }}
                  >
                    <Box ml={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {action.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {action.description}
                      </Typography>
                    </Box>
                  </Button>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Mensaje de completado */}
        {isCompleted && (
          <Grid item xs={12}>
            <Fade in timeout={1000}>
              <Alert 
                severity="success" 
                sx={{ 
                  border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                  borderRadius: 2
                }}
                icon={<CheckCircle />}
              >
                <Typography variant="body1" fontWeight="medium">
                  ¡Configuración Completada! 🎉
                </Typography>
                <Typography variant="body2">
                  Tu cuenta está completamente configurada. ¡Ya puedes comenzar a usar todas las funcionalidades de IMO!
                </Typography>
              </Alert>
            </Fade>
          </Grid>
        )}
      </Grid>

      {/* Dialog de progreso de onboarding */}
      <Dialog 
        open={showOnboarding} 
        onClose={handleCloseOnboarding}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" component="div">
              Progreso de Configuración
            </Typography>
            <Button 
              onClick={handleCloseOnboarding}
              color="inherit"
              size="small"
            >
              <Close />
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <OnboardingProgress
            companyId={company?.id}
            userId={user?.id}
            variant="full"
            showActions={true}
            onStepClick={(step) => {
              console.log('Navegando a paso:', step);
              handleCloseOnboarding();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOnboarding}>
            Cerrar
          </Button>
          {!isCompleted && (
            <Button 
              variant="contained" 
              onClick={() => {
                handleStartOnboarding();
                handleCloseOnboarding();
              }}
            >
              Continuar Configuración
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OnboardingDashboard;