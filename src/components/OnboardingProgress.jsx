/**
 * @file OnboardingProgress.jsx
 * @description Componente para mostrar el progreso del onboarding
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Chip,
  IconButton,
  Collapse,
  useTheme,
  alpha
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  ExpandMore,
  ExpandLess,
  Person,
  Email,
  Business,
  Category,
  Payment,
  Group,
  Inventory,
  Tour,
  Dashboard
} from '@mui/icons-material';
import { useOnboarding } from '../hooks/useOnboarding';

// Iconos para cada paso
const STEP_ICONS = {
  registration: Person,
  email_verification: Email,
  company_setup: Business,
  industry_selection: Category,
  plan_selection: Payment,
  team_invitation: Group,
  first_products: Inventory,
  welcome_tour: Tour,
  completed: Dashboard
};

// Títulos y descripciones
const STEP_CONFIG = {
  registration: {
    title: 'Registro de Usuario',
    description: 'Crea tu cuenta personal'
  },
  email_verification: {
    title: 'Verificación de Email',
    description: 'Confirma tu dirección de correo'
  },
  company_setup: {
    title: 'Configuración de Empresa',
    description: 'Configura los datos de tu empresa'
  },
  industry_selection: {
    title: 'Selección de Industria',
    description: 'Elige tu sector empresarial'
  },
  plan_selection: {
    title: 'Selección de Plan',
    description: 'Escoge tu plan de suscripción'
  },
  team_invitation: {
    title: 'Invitar Equipo',
    description: 'Invita a tu equipo de trabajo'
  },
  first_products: {
    title: 'Primeros Productos',
    description: 'Agrega tus primeros productos'
  },
  welcome_tour: {
    title: 'Tour de Bienvenida',
    description: 'Conoce las funcionalidades'
  },
  completed: {
    title: 'Completado',
    description: 'Onboarding finalizado exitosamente'
  }
};

const OnboardingProgress = ({ 
  companyId, 
  userId, 
  variant = 'full', // 'full', 'compact', 'mini'
  showActions = false,
  onStepClick = null,
  className = '',
  ...props 
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);
  
  const {
    currentStep,
    progress,
    getAllStepsInfo,
    isLoading,
    moveToNextStep,
    navigateToCurrentStep,
    isTransitioning
  } = useOnboarding(companyId, userId);

  const stepsInfo = getAllStepsInfo();

  if (isLoading) {
    return (
      <Paper sx={{ p: 2, ...props.sx }}>
        <Box display="flex" alignItems="center" gap={2}>
          <LinearProgress sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Cargando progreso...
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Versión mini - solo barra de progreso
  if (variant === 'mini') {
    return (
      <Box className={className} {...props}>
        <Box display="flex" alignItems="center" gap={2}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ 
              flex: 1, 
              height: 8, 
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 4
              }
            }}
          />
          <Typography variant="body2" fontWeight="bold" color="primary">
            {progress}%
          </Typography>
        </Box>
      </Box>
    );
  }

  // Versión compacta
  if (variant === 'compact') {
    return (
      <Paper 
        elevation={1} 
        className={className}
        sx={{ 
          p: 2, 
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          ...props.sx 
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="h6" color="primary">
            Progreso del Onboarding
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" fontWeight="bold" color="primary">
              {progress}%
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => setExpanded(!expanded)}
              sx={{ 
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            >
              <ExpandMore />
            </IconButton>
          </Box>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ 
            mb: 1,
            height: 8, 
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 4
            }
          }}
        />

        <Typography variant="body2" color="text.secondary">
          Paso actual: {STEP_CONFIG[currentStep]?.title || currentStep}
        </Typography>

        <Collapse in={expanded}>
          <Box mt={2}>
            {stepsInfo.slice(0, -1).map((stepInfo) => { // Excluir 'completed'
              const IconComponent = STEP_ICONS[stepInfo.step] || RadioButtonUnchecked;
              const config = STEP_CONFIG[stepInfo.step] || {};
              
              return (
                <Box 
                  key={stepInfo.step}
                  display="flex" 
                  alignItems="center" 
                  gap={2} 
                  py={1}
                  sx={{
                    cursor: onStepClick ? 'pointer' : 'default',
                    borderRadius: 1,
                    px: 1,
                    '&:hover': onStepClick ? {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05)
                    } : {}
                  }}
                  onClick={() => onStepClick?.(stepInfo.step)}
                >
                  {stepInfo.isComplete ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : stepInfo.isActive ? (
                    <IconComponent color="primary" fontSize="small" />
                  ) : (
                    <RadioButtonUnchecked color="disabled" fontSize="small" />
                  )}
                  
                  <Box flex={1}>
                    <Typography 
                      variant="body2" 
                      color={stepInfo.isActive ? 'primary' : stepInfo.isComplete ? 'success.main' : 'text.secondary'}
                      fontWeight={stepInfo.isActive ? 'bold' : 'normal'}
                    >
                      {config.title}
                    </Typography>
                  </Box>

                  {stepInfo.isActive && (
                    <Chip 
                      label="Actual" 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </Collapse>

        {showActions && (
          <Box mt={2} display="flex" gap={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={navigateToCurrentStep}
              disabled={isTransitioning}
            >
              Continuar
            </Button>
            {currentStep !== 'completed' && (
              <Button
                variant="text"
                size="small"
                onClick={moveToNextStep}
                disabled={isTransitioning}
              >
                Siguiente
              </Button>
            )}
          </Box>
        )}
      </Paper>
    );
  }

  // Versión completa con stepper
  return (
    <Paper 
      elevation={2} 
      className={className}
      sx={{ 
        p: 3, 
        borderRadius: 2,
        ...props.sx 
      }}
    >
      <Box mb={3}>
        <Typography variant="h5" gutterBottom color="primary" fontWeight="bold">
          Configuración Inicial
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={2}>
          Complete estos pasos para configurar completamente su cuenta
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ 
              flex: 1, 
              height: 10, 
              borderRadius: 5,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 5
              }
            }}
          />
          <Typography variant="h6" fontWeight="bold" color="primary">
            {progress}%
          </Typography>
        </Box>
      </Box>

      <Stepper orientation="vertical" activeStep={-1}>
        {stepsInfo.slice(0, -1).map((stepInfo, index) => { // Excluir 'completed'
          const IconComponent = STEP_ICONS[stepInfo.step] || RadioButtonUnchecked;
          const config = STEP_CONFIG[stepInfo.step] || {};
          
          return (
            <Step key={stepInfo.step} expanded>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: stepInfo.isComplete 
                        ? theme.palette.success.main
                        : stepInfo.isActive
                        ? theme.palette.primary.main
                        : alpha(theme.palette.text.disabled, 0.1),
                      color: stepInfo.isComplete || stepInfo.isActive
                        ? 'white'
                        : theme.palette.text.disabled,
                      cursor: onStepClick ? 'pointer' : 'default'
                    }}
                    onClick={() => onStepClick?.(stepInfo.step)}
                  >
                    {stepInfo.isComplete ? (
                      <CheckCircle />
                    ) : (
                      <IconComponent />
                    )}
                  </Box>
                )}
              >
                <Box ml={2}>
                  <Typography 
                    variant="h6" 
                    color={stepInfo.isActive ? 'primary' : stepInfo.isComplete ? 'success.main' : 'text.primary'}
                    fontWeight={stepInfo.isActive ? 'bold' : 'normal'}
                  >
                    {config.title}
                    {stepInfo.isActive && (
                      <Chip 
                        label="En progreso" 
                        size="small" 
                        color="primary" 
                        sx={{ ml: 1 }}
                      />
                    )}
                    {stepInfo.isComplete && (
                      <Chip 
                        label="Completado" 
                        size="small" 
                        color="success" 
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {config.description}
                  </Typography>
                  
                  {stepInfo.data?.completed_at && (
                    <Typography variant="caption" color="success.main">
                      Completado: {new Date(stepInfo.data.completed_at).toLocaleDateString()}
                    </Typography>
                  )}
                  
                  {stepInfo.data?.skipped && (
                    <Typography variant="caption" color="warning.main">
                      Omitido: {stepInfo.data.skip_reason || 'Sin razón especificada'}
                    </Typography>
                  )}
                </Box>
              </StepLabel>
              
              {stepInfo.isActive && showActions && (
                <StepContent>
                  <Box mt={2} display="flex" gap={1}>
                    <Button
                      variant="contained"
                      onClick={navigateToCurrentStep}
                      disabled={isTransitioning}
                    >
                      Continuar Paso
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={moveToNextStep}
                      disabled={isTransitioning}
                    >
                      Siguiente
                    </Button>
                  </Box>
                </StepContent>
              )}
            </Step>
          );
        })}
      </Stepper>

      {progress === 100 && (
        <Box 
          mt={3} 
          p={2} 
          bgcolor={alpha(theme.palette.success.main, 0.1)}
          borderRadius={2}
          border={`1px solid ${alpha(theme.palette.success.main, 0.3)}`}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <CheckCircle color="success" />
            <Box>
              <Typography variant="h6" color="success.main" fontWeight="bold">
                ¡Configuración Completada!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Su cuenta está lista para usar. ¡Bienvenido a la plataforma!
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default OnboardingProgress;