/**
 * @file useOnboarding.js
 * @description Hook personalizado para manejar el estado del onboarding
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import onboardingService, { 
  ONBOARDING_STEPS,
  STEP_ORDER 
} from '../services/onboardingService';

// Mapeo de pasos a rutas
const STEP_ROUTES = {
  [ONBOARDING_STEPS.REGISTRATION]: '/signup',
  [ONBOARDING_STEPS.EMAIL_VERIFICATION]: '/verify-email',
  [ONBOARDING_STEPS.COMPANY_SETUP]: '/company-setup',
  [ONBOARDING_STEPS.INDUSTRY_SELECTION]: '/industry-selection',
  [ONBOARDING_STEPS.PLAN_SELECTION]: '/plan-selection',
  [ONBOARDING_STEPS.TEAM_INVITATION]: '/team-invitation',
  [ONBOARDING_STEPS.FIRST_PRODUCTS]: '/first-products',
  [ONBOARDING_STEPS.WELCOME_TOUR]: '/welcome-tour',
  [ONBOARDING_STEPS.COMPLETED]: '/dashboard'
};

export const useOnboarding = (companyId, userId) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Query para obtener estado del onboarding
  const {
    data: onboardingStatus,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['onboarding', companyId, userId],
    () => onboardingService.getOnboardingStatus(companyId, userId),
    {
      enabled: !!companyId && !!userId,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: 2,
      onError: (error) => {
        console.error('Error cargando estado de onboarding:', error);
      }
    }
  );

  // Mutation para actualizar paso
  const updateStepMutation = useMutation(
    ({ step, stepData }) => onboardingService.updateOnboardingStep(
      companyId, 
      userId, 
      step, 
      stepData
    ),
    {
      onSuccess: (data) => {
        // Actualizar cache
        queryClient.setQueryData(['onboarding', companyId, userId], data);
        console.log('✅ Paso actualizado:', data.current_step);
      },
      onError: (error) => {
        console.error('❌ Error actualizando paso:', error);
      }
    }
  );

  // Valores calculados
  const currentStep = onboardingStatus?.current_step || ONBOARDING_STEPS.REGISTRATION;
  const stepsCompleted = onboardingStatus?.steps_completed || [];
  const progress = onboardingService.calculateProgress(stepsCompleted);
  const nextStep = onboardingService.getNextStep(currentStep, stepsCompleted);
  const isCompleted = currentStep === ONBOARDING_STEPS.COMPLETED;
  const stepData = onboardingStatus?.step_data || {};

  // Funciones del hook
  const completeCurrentStep = useCallback(async (data = {}) => {
    if (!companyId || !userId || updateStepMutation.isLoading) return;

    try {
      setIsTransitioning(true);
      await updateStepMutation.mutateAsync({
        step: currentStep,
        stepData: data
      });
      
      console.log(`✅ Paso ${currentStep} completado`);
    } catch (error) {
      console.error('Error completando paso:', error);
      throw error;
    } finally {
      setIsTransitioning(false);
    }
  }, [companyId, userId, currentStep, updateStepMutation]);

  const moveToNextStep = useCallback(async (data = {}) => {
    if (!companyId || !userId || isTransitioning) return;

    try {
      setIsTransitioning(true);
      
      // Completar paso actual si no está completado
      if (!stepsCompleted.includes(currentStep)) {
        await updateStepMutation.mutateAsync({
          step: currentStep,
          stepData: data
        });
      }

      // Moverse al siguiente paso
      const next = onboardingService.getNextStep(currentStep, stepsCompleted);
      if (next !== currentStep) {
        await updateStepMutation.mutateAsync({
          step: next,
          stepData: {}
        });
      }

      console.log(`➡️ Moviendo de ${currentStep} a ${next}`);
      
    } catch (error) {
      console.error('Error moviendo al siguiente paso:', error);
      throw error;
    } finally {
      setIsTransitioning(false);
    }
  }, [companyId, userId, currentStep, stepsCompleted, isTransitioning, updateStepMutation]);

  const goToStep = useCallback(async (step, data = {}) => {
    if (!companyId || !userId || isTransitioning) return;

    try {
      setIsTransitioning(true);
      await updateStepMutation.mutateAsync({
        step,
        stepData: data
      });
      
      console.log(`🎯 Navegando directamente a paso: ${step}`);
    } catch (error) {
      console.error('Error navegando a paso:', error);
      throw error;
    } finally {
      setIsTransitioning(false);
    }
  }, [companyId, userId, isTransitioning, updateStepMutation]);

  const navigateToCurrentStep = useCallback(() => {
    const route = STEP_ROUTES[currentStep] || '/dashboard';
    navigate(route);
  }, [currentStep, navigate]);

  const navigateToNextStep = useCallback(() => {
    const route = STEP_ROUTES[nextStep] || '/dashboard';
    navigate(route);
  }, [nextStep, navigate]);

  const skipStep = useCallback(async (reason = 'user_skipped') => {
    if (!companyId || !userId || isTransitioning) return;

    try {
      setIsTransitioning(true);
      await updateStepMutation.mutateAsync({
        step: currentStep,
        stepData: {
          skipped: true,
          skip_reason: reason,
          skipped_at: new Date().toISOString()
        }
      });

      // Ir al siguiente paso
      const next = onboardingService.getNextStep(currentStep, stepsCompleted);
      if (next !== currentStep) {
        await updateStepMutation.mutateAsync({
          step: next,
          stepData: {}
        });
      }

      console.log(`⏭️ Paso ${currentStep} omitido: ${reason}`);
    } catch (error) {
      console.error('Error omitiendo paso:', error);
      throw error;
    } finally {
      setIsTransitioning(false);
    }
  }, [companyId, userId, currentStep, stepsCompleted, isTransitioning, updateStepMutation]);

  const resetOnboarding = useCallback(async () => {
    if (!companyId || !userId) return;

    try {
      await goToStep(ONBOARDING_STEPS.REGISTRATION, {
        reset: true,
        reset_at: new Date().toISOString()
      });
      
      console.log('🔄 Onboarding reiniciado');
    } catch (error) {
      console.error('Error reiniciando onboarding:', error);
      throw error;
    }
  }, [companyId, userId, goToStep]);

  // Información sobre pasos
  const getStepInfo = useCallback((step) => {
    const stepIndex = STEP_ORDER.indexOf(step);
    const isActive = step === currentStep;
    const isComplete = stepsCompleted.includes(step);
    const isPending = stepIndex > STEP_ORDER.indexOf(currentStep);
    
    return {
      step,
      index: stepIndex,
      route: STEP_ROUTES[step],
      isActive,
      isComplete,
      isPending,
      data: stepData[step] || {}
    };
  }, [currentStep, stepsCompleted, stepData]);

  const getAllStepsInfo = useCallback(() => {
    return STEP_ORDER.map(step => getStepInfo(step));
  }, [getStepInfo]);

  // Auto-navegación (opcional)
  const enableAutoNavigation = useCallback(() => {
    if (currentStep && !isTransitioning) {
      navigateToCurrentStep();
    }
  }, [currentStep, isTransitioning, navigateToCurrentStep]);

  return {
    // Estado
    onboardingStatus,
    currentStep,
    nextStep,
    stepsCompleted,
    progress,
    isCompleted,
    stepData,
    
    // Estados de carga
    isLoading,
    isTransitioning,
    isUpdating: updateStepMutation.isLoading,
    error,
    
    // Acciones principales
    completeCurrentStep,
    moveToNextStep,
    goToStep,
    skipStep,
    resetOnboarding,
    
    // Navegación
    navigateToCurrentStep,
    navigateToNextStep,
    enableAutoNavigation,
    
    // Información de pasos
    getStepInfo,
    getAllStepsInfo,
    
    // Utilidades
    refetch,
    ONBOARDING_STEPS,
    STEP_ORDER,
    STEP_ROUTES
  };
};

// Hook simplificado para componentes que solo necesitan verificar el estado
export const useOnboardingStatus = () => {
  const { user, companyId } = useAuth();
  
  const { 
    currentStep, 
    isCompleted, 
    progress,
    isLoading 
  } = useOnboarding(companyId, user?.id);

  return {
    currentStep,
    isCompleted,
    progress,
    isLoading,
    needsOnboarding: !isCompleted && !!user && !!companyId
  };
};

// Hook para verificar si se debe mostrar onboarding
export const useOnboardingGuard = () => {
  const navigate = useNavigate();
  const { needsOnboarding, currentStep, isLoading } = useOnboardingStatus();

  useEffect(() => {
    if (!isLoading && needsOnboarding && currentStep) {
      const route = STEP_ROUTES[currentStep];
      if (route && window.location.pathname !== route) {
        console.log('🔄 Redirigiendo a onboarding:', route);
        navigate(route);
      }
    }
  }, [needsOnboarding, currentStep, isLoading, navigate]);

  return {
    needsOnboarding,
    currentStep,
    isLoading
  };
};

export default useOnboarding;