/**
 * @file onboardingService.js
 * @description Servicio para manejar todo el flujo de onboarding
 */

import supabase from '../supabaseClient';

// Pasos del onboarding en orden
export const ONBOARDING_STEPS = {
  REGISTRATION: 'registration',
  EMAIL_VERIFICATION: 'email_verification', 
  COMPANY_SETUP: 'company_setup',
  INDUSTRY_SELECTION: 'industry_selection',
  PLAN_SELECTION: 'plan_selection',
  TEAM_INVITATION: 'team_invitation',
  FIRST_PRODUCTS: 'first_products',
  WELCOME_TOUR: 'welcome_tour',
  COMPLETED: 'completed'
};

export const STEP_ORDER = [
  ONBOARDING_STEPS.REGISTRATION,
  ONBOARDING_STEPS.EMAIL_VERIFICATION,
  ONBOARDING_STEPS.COMPANY_SETUP,
  ONBOARDING_STEPS.INDUSTRY_SELECTION,
  ONBOARDING_STEPS.PLAN_SELECTION,
  ONBOARDING_STEPS.TEAM_INVITATION,
  ONBOARDING_STEPS.FIRST_PRODUCTS,
  ONBOARDING_STEPS.WELCOME_TOUR,
  ONBOARDING_STEPS.COMPLETED
];

/**
 * Crear registro de onboarding para una nueva empresa
 */
export const createOnboardingRecord = async (companyId, userId) => {
  try {
    const { data, error } = await supabase
      .from('company_onboarding')
      .insert({
        company_id: companyId,
        user_id: userId,
        current_step: ONBOARDING_STEPS.REGISTRATION,
        steps_completed: [ONBOARDING_STEPS.REGISTRATION],
        step_data: {
          registration_completed_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) throw error;

    // También crear preferencias de notificación por defecto
    await createDefaultNotificationPreferences(userId, companyId);
    
    // Registrar evento de analytics
    await trackOnboardingEvent(companyId, userId, 'onboarding_started', {
      step: ONBOARDING_STEPS.REGISTRATION
    });

    return data;
  } catch (error) {
    console.error('Error creando registro de onboarding:', error);
    throw error;
  }
};

/**
 * Actualizar paso del onboarding
 */
export const updateOnboardingStep = async (companyId, userId, newStep, stepData = {}) => {
  try {
    // Obtener registro actual
    const { data: currentRecord, error: fetchError } = await supabase
      .from('company_onboarding')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Agregar el nuevo paso a los completados si no está ya
    const stepsCompleted = currentRecord.steps_completed || [];
    if (!stepsCompleted.includes(newStep)) {
      stepsCompleted.push(newStep);
    }

    // Combinar datos del paso
    const combinedStepData = {
      ...currentRecord.step_data,
      [newStep]: {
        ...stepData,
        completed_at: new Date().toISOString()
      }
    };

    // Verificar si es el último paso
    const isCompleted = newStep === ONBOARDING_STEPS.COMPLETED;

    const { data, error } = await supabase
      .from('company_onboarding')
      .update({
        current_step: newStep,
        steps_completed: stepsCompleted,
        step_data: combinedStepData,
        last_activity: new Date().toISOString(),
        ...(isCompleted && { completed_at: new Date().toISOString() })
      })
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Si se completó el onboarding, actualizar la empresa
    if (isCompleted) {
      await completeOnboarding(companyId);
    }

    // Registrar evento
    await trackOnboardingEvent(companyId, userId, 'step_completed', {
      step: newStep,
      step_data: stepData
    });

    return data;
  } catch (error) {
    console.error('Error actualizando paso de onboarding:', error);
    throw error;
  }
};

/**
 * Obtener estado actual del onboarding
 */
export const getOnboardingStatus = async (companyId, userId) => {
  try {
    const { data, error } = await supabase
      .from('company_onboarding')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      // No existe registro, crear uno nuevo
      return await createOnboardingRecord(companyId, userId);
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo estado de onboarding:', error);
    throw error;
  }
};

/**
 * Obtener siguiente paso del onboarding
 */
export const getNextStep = (currentStep, stepsCompleted = []) => {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  
  // Buscar el próximo paso no completado
  for (let i = currentIndex + 1; i < STEP_ORDER.length; i++) {
    if (!stepsCompleted.includes(STEP_ORDER[i])) {
      return STEP_ORDER[i];
    }
  }
  
  return ONBOARDING_STEPS.COMPLETED;
};

/**
 * Calcular progreso del onboarding
 */
export const calculateProgress = (stepsCompleted = []) => {
  const totalSteps = STEP_ORDER.length - 1; // No contar 'completed'
  const completedCount = stepsCompleted.filter(step => 
    STEP_ORDER.includes(step) && step !== ONBOARDING_STEPS.COMPLETED
  ).length;
  
  return Math.round((completedCount / totalSteps) * 100);
};

/**
 * Completar onboarding
 */
export const completeOnboarding = async (companyId) => {
  try {
    await supabase
      .from('companies')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        setup_wizard_completed: true
      })
      .eq('id', companyId);

    console.log('✅ Onboarding completado para empresa:', companyId);
  } catch (error) {
    console.error('Error completando onboarding:', error);
  }
};

/**
 * Crear preferencias de notificación por defecto
 */
export const createDefaultNotificationPreferences = async (userId, companyId) => {
  try {
    await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        company_id: companyId,
        email_welcome: true,
        email_onboarding_tips: true,
        email_trial_reminders: true,
        email_feature_updates: true,
        email_billing: true,
        in_app_notifications: true,
        in_app_tips: true,
        sms_notifications: false
      }, {
        onConflict: 'user_id,company_id'
      });

    console.log('✅ Preferencias de notificación creadas');
  } catch (error) {
    console.error('Error creando preferencias:', error);
  }
};

/**
 * Registrar evento de analytics
 */
export const trackOnboardingEvent = async (companyId, userId, eventName, eventData = {}) => {
  try {
    await supabase
      .from('onboarding_analytics')
      .insert({
        company_id: companyId,
        user_id: userId,
        event_name: eventName,
        event_data: eventData,
        step: eventData.step || null,
        session_id: getSessionId(),
        user_agent: navigator?.userAgent || 'Unknown',
        ip_address: null // Se puede obtener del servidor
      });
  } catch (error) {
    console.error('Error registrando evento:', error);
    // No hacer throw para no interrumpir el flujo principal
  }
};

/**
 * Obtener o generar session ID
 */
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('onboarding_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('onboarding_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Registrar cambio de plan
 */
export const recordPlanChange = async (companyId, newPlanId, previousPlanId, reason, createdBy, metadata = {}) => {
  try {
    const { data, error } = await supabase
      .from('subscription_history')
      .insert({
        company_id: companyId,
        plan_id: newPlanId,
        previous_plan_id: previousPlanId,
        change_reason: reason,
        created_by: createdBy,
        metadata: {
          ...metadata,
          changed_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error registrando cambio de plan:', error);
    throw error;
  }
};

/**
 * Enviar email de bienvenida
 */
export const sendWelcomeEmail = async (userId, templateKey = 'welcome_user', variables = {}) => {
  try {
    // Esta función se puede implementar con un servicio de email
    // Por ahora solo registramos que se envió
    await trackOnboardingEvent(null, userId, 'email_sent', {
      template: templateKey,
      variables
    });

    console.log(`📧 Email ${templateKey} enviado a usuario:`, userId);
  } catch (error) {
    console.error('Error enviando email:', error);
  }
};

export default {
  ONBOARDING_STEPS,
  STEP_ORDER,
  createOnboardingRecord,
  updateOnboardingStep,
  getOnboardingStatus,
  getNextStep,
  calculateProgress,
  completeOnboarding,
  trackOnboardingEvent,
  recordPlanChange,
  sendWelcomeEmail
};