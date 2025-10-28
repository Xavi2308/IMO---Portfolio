import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import onboardingService from '../services/onboardingService';

const PlanSelection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userData = location.state;
  const { user, company } = useAuth();
  
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plans = [
    {
      id: 'free',
      plan_id: 'f0eb4da5-217d-4365-a84e-f401f1fae8f9',
      name: 'Prueba Gratuita',
      duration: '30 días gratis',
      price: '$0',
      features: [
        'Hasta 10 productos',
        'Gestión básica de inventario', 
        'Ventas y reportes básicos',
        'Soporte por email',
        'Prueba todas las funciones',
        'Sin compromiso'
      ],
      popular: true,
      color: 'from-green-400 to-emerald-500',
      buttonText: 'Comenzar Prueba Gratuita'
    },
    {
      id: 'basic',
      plan_id: '3f9da835-5427-433e-941a-2d072bf61a6c',
      name: 'Plan Básico',
      duration: 'Mensual',
      price: '$119.990',
      originalPrice: '$149.990',
      features: [
        'Hasta 100 productos',
        'Hasta 5 usuarios',
        'Gestión completa de inventario',
        'Reportes básicos',
        'Soporte prioritario',
        '1GB de almacenamiento'
      ],
      popular: false,
      color: 'from-blue-400 to-cyan-500',
      buttonText: 'Seleccionar Plan Básico'
    },
    {
      id: 'professional',
      plan_id: '53f8db32-d485-4214-86e7-265bd4037c78',
      name: 'Plan Profesional',
      duration: 'Mensual', 
      price: '$319.990',
      originalPrice: '$399.990',
      features: [
        'Hasta 1,000 productos',
        'Hasta 20 usuarios',
        'Reportes avanzados e integraciones',
        'Soporte prioritario 24/7',
        'API completa',
        '5GB de almacenamiento'
      ],
      popular: false,
      color: 'from-purple-400 to-pink-500',
      buttonText: 'Seleccionar Plan Profesional'
    }
  ];

  const handlePlanSelection = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('📋 Seleccionando plan:', selectedPlan);
      
      // Verificar datos de usuario
      if (!userData?.userId || !userData?.companyId) {
        throw new Error('Datos de usuario o empresa faltantes');
      }

      // Obtener información del plan seleccionado
      const selectedPlanInfo = plans.find(p => p.id === selectedPlan);
      
      // Actualizar el plan de la empresa
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          subscription_type: selectedPlan === 'free' ? 'trial' : selectedPlan,
          plan_id: selectedPlanInfo?.plan_id,
          updated_at: new Date().toISOString(),
          settings: {
            selected_plan: selectedPlan,
            plan_selected_date: new Date().toISOString(),
            plan_name: selectedPlanInfo?.name,
            trial_start: selectedPlan === 'free' ? new Date().toISOString() : undefined,
            trial_end: selectedPlan === 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined
          }
        })
        .eq('id', userData.companyId);

      if (updateError) {
        throw new Error(`Error actualizando plan: ${updateError.message}`);
      }

      console.log('✅ Plan actualizado correctamente');

      // Registrar cambio de plan en historial
      try {
        await onboardingService.recordPlanChange(
          userData.companyId,
          selectedPlanInfo.plan_id,
          null, // No hay plan previo
          'initial_selection',
          userData.userId,
          {
            plan_name: selectedPlanInfo.name,
            selection_method: 'onboarding'
          }
        );
      } catch (historyError) {
        console.warn('⚠️ Error registrando historial de plan:', historyError);
      }

      // Completar paso de selección de plan
      try {
        await onboardingService.updateOnboardingStep(
          userData.companyId,
          userData.userId,
          'plan_selection',
          {
            selected_plan: selectedPlan,
            plan_name: selectedPlanInfo?.name,
            plan_id: selectedPlanInfo?.plan_id
          }
        );

        // Completar todo el onboarding por ahora (se pueden agregar más pasos después)
        await onboardingService.updateOnboardingStep(
          userData.companyId,
          userData.userId,
          'completed',
          {
            completion_date: new Date().toISOString(),
            total_steps_completed: 3 // registration, company_setup, plan_selection
          }
        );
      } catch (onboardingError) {
        console.warn('⚠️ Error actualizando onboarding:', onboardingError);
      }

      // Mostrar mensaje de éxito y redirigir al login
      console.log('✅ Proceso de registro completado exitosamente');
      
      // Mostrar mensaje de bienvenida
      alert(`🎉 ¡Felicidades ${userData.firstName}!\n\nTu empresa "${userData.companyName}" ha sido configurada exitosamente con el plan ${plans.find(p => p.id === selectedPlan)?.name}.\n\nAhora puedes iniciar sesión y comenzar a usar IMO.`);
      
      // Redirigir al login para que el usuario inicie sesión
      navigate('/login', { replace: true });

    } catch (error) {
      console.error('❌ Error seleccionando plan:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Verificar que tenemos datos necesarios
  if (!userData?.userId || !userData?.companyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Error de sesión</h2>
          <p className="text-gray-600 mb-4">
            No se encontraron los datos necesarios. Por favor, completa el proceso de registro nuevamente.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Volver al Registro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 p-4">
      <div className="max-w-6xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-12">
          <img 
            src="/logo-removebg-preview.png" 
            alt="Logo IMO" 
            className="mx-auto h-16 w-auto mb-6"
          />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
            ¡Bienvenido a IMO!
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Hola <span className="font-semibold text-gray-800">{userData.firstName}</span>, tu empresa 
            <span className="font-semibold text-gray-800"> "{userData.companyName}" </span>
            ha sido creada exitosamente.
          </p>
          <p className="text-lg text-gray-500">
            Ahora selecciona el plan que mejor se adapte a tus necesidades
          </p>
        </div>

        {error && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 cursor-pointer ${
                selectedPlan === plan.id 
                  ? 'ring-4 ring-blue-500 ring-opacity-50' 
                  : ''
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0">
                  <div className={`bg-gradient-to-r ${plan.color} text-white text-center py-2 text-sm font-semibold`}>
                    🎉 ¡RECOMENDADO!
                  </div>
                </div>
              )}
              
              <div className={`p-8 ${plan.popular ? 'pt-16' : ''}`}>
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    {plan.originalPrice && (
                      <span className="text-lg text-gray-500 line-through ml-2">
                        {plan.originalPrice}
                      </span>
                    )}
                    <div className="text-sm text-gray-500">{plan.duration}</div>
                  </div>
                  
                  {plan.id === 'trial' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-green-800 font-medium">
                        ✨ Prueba todas las funciones sin costo por 30 días
                      </p>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg 
                          className="w-5 h-5 text-green-500 mt-0.5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M5 13l4 4L19 7" 
                          />
                        </svg>
                      </div>
                      <span className="ml-3 text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Select Button */}
                <div className="text-center">
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto mb-4 transition-all ${
                    selectedPlan === plan.id 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {selectedPlan === plan.id && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    selectedPlan === plan.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {selectedPlan === plan.id ? 'Seleccionado' : 'Seleccionar'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="text-center">
          <button
            onClick={handlePlanSelection}
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 px-12 rounded-2xl text-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none shadow-lg hover:shadow-xl"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Configurando tu cuenta...
              </>
            ) : (
              <>
                {plans.find(p => p.id === selectedPlan)?.buttonText || 'Continuar'}
                <svg className="ml-3 h-6 w-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-500 mt-6 max-w-2xl mx-auto">
            {selectedPlan === 'free' 
              ? 'Tendrás acceso completo por 30 días. Podrás cambiar o cancelar en cualquier momento.'
              : 'Podrás cambiar tu plan en cualquier momento desde la configuración de tu cuenta.'
            }
          </p>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 text-center">
          <div className="flex justify-center items-center space-x-8 text-gray-400">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.707-4.293a1 1 0 010 1.414L11.414 21.707a1 1 0 01-1.414 0L4.293 15.293a1 1 0 010-1.414z" />
              </svg>
              <span className="text-sm">Sin compromiso</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm">100% Seguro</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 3v2.25m0 13.5V21m9-9h-2.25m-13.5 0H3" />
              </svg>
              <span className="text-sm">Soporte 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanSelection;