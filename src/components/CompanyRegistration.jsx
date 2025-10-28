import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import onboardingService from '../services/onboardingService';

const CompanyRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userData = location.state;
  const { user, setCompany } = useAuth();
  const [formData, setFormData] = useState({
    // Datos de la empresa
    companyName: '',
    companyCode: '',
    industry: 'retail',
    
    // Datos del administrador (pre-llenados del registro)
    adminEmail: userData?.email || '',
    adminFirstName: userData?.firstName || '',
    adminLastName: userData?.lastName || '',
    adminPhone: '',
    
    // Configuración inicial
    productType: 'shoes', // Por defecto calzado
    expectedUsers: 5,
    
    // Términos y condiciones
    acceptTerms: false,
    acceptMarketing: false
  });

  // Actualizar datos cuando lleguen del state
  useEffect(() => {
    if (userData) {
      setFormData(prev => ({
        ...prev,
        adminEmail: userData.email || '',
        adminFirstName: userData.firstName || '',
        adminLastName: userData.lastName || ''
      }));
    }
  }, [userData]);

  // Efecto para verificar que tenemos datos de usuario
  useEffect(() => {
    if (!userData?.userId) {
      console.error('❌ No hay datos de usuario, redirigiendo a registro');
      navigate('/signup');
    }
  }, [userData, navigate]);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);

  const industries = [
    { value: 'retail', label: 'Comercio / Retail' },
    { value: 'manufacturing', label: 'Manufactura' },
    { value: 'fashion', label: 'Moda y Textiles' },
    { value: 'footwear', label: 'Calzado' },
    { value: 'accessories', label: 'Accesorios' },
    { value: 'other', label: 'Otro' }
  ];

  const productTypes = [
    { value: 'shoes', label: 'Calzado', description: 'Zapatos, tenis, botas, etc.' },
    { value: 'clothing', label: 'Ropa', description: 'Camisas, pantalones, vestidos, etc.' },
    { value: 'accessories', label: 'Accesorios', description: 'Bolsos, cinturones, joyería, etc.' },
    { value: 'custom', label: 'Personalizado', description: 'Define tus propios campos' }
  ];

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'El nombre de la empresa es requerido';
    }
    
    if (!formData.companyCode.trim()) {
      newErrors.companyCode = 'El código de empresa es requerido';
    } else if (!/^[A-Za-z0-9]{2,10}$/.test(formData.companyCode)) {
      newErrors.companyCode = 'El código debe tener 2-10 caracteres alfanuméricos';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Email inválido';
    }
    
    if (!formData.adminPassword.trim()) {
      newErrors.adminPassword = 'La contraseña es requerida';
    } else if (formData.adminPassword.length < 6) {
      newErrors.adminPassword = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (!formData.adminFirstName.trim()) {
      newErrors.adminFirstName = 'El nombre es requerido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Debes aceptar los términos y condiciones';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    
    setLoading(true);
    try {
      console.log('🏢 Iniciando creación de empresa...');
      
      // Verificar que tenemos datos de usuario del registro anterior
      if (!userData?.userId) {
        throw new Error('No se encontraron datos de usuario. Por favor, regístrate nuevamente.');
      }

      // 1. Crear empresa
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.companyName,
          code: formData.companyCode.toUpperCase(),
          description: `Empresa de ${formData.industry} - ${formData.productType}`,
          subscription_type: 'free', // Plan gratuito inicial  
          subscription_status: 'active',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
          max_users: formData.expectedUsers,
          currency: 'COP',
          language: 'es',
          timezone: 'America/Bogota',
          settings: {
            industry: formData.industry,
            product_type: formData.productType,
            trial_start: new Date().toISOString(),
            expected_users: formData.expectedUsers
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (companyError) {
        console.error('❌ Error creando empresa:', companyError);
        throw new Error(`Error creando empresa: ${companyError.message}`);
      }
      
      console.log('✅ Empresa creada:', company.id);

      // 2. Actualizar el usuario con la empresa
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ 
          company_id: company.id,
          role: 'admin' // El primer usuario es admin
        })
        .eq('id', userData.userId);

      if (updateUserError) {
        console.error('❌ Error actualizando usuario:', updateUserError);
        console.error('❌ Detalles del error:', updateUserError);
        // No lanzar error aquí, intentar continuar
      } else {
        console.log('✅ Usuario actualizado con empresa');
      }

      // 3. Crear relación en user_companies (intentar, pero no es crítico)
      try {
        const { error: userCompanyError } = await supabase
          .from('user_companies')
          .insert({
            user_id: userData.userId,
            company_id: company.id,
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (userCompanyError) {
          console.warn('⚠️ Error creando relación user_company (no crítico):', userCompanyError);
        } else {
          console.log('✅ Relación user_company creada');
        }
      } catch (relationError) {
        console.warn('⚠️ Tabla user_companies puede no existir:', relationError);
      }

      // 4. Las configuraciones ya se guardaron en el campo settings de companies
      console.log('✅ Configuraciones guardadas en campo settings de empresa');

      // 5. Crear tablas/campos por defecto según el tipo de producto
      await createDefaultProductStructure(formData.productType, company.id);
      
      // 6. Crear registro de onboarding (opcional si las tablas no existen)
      try {
        await onboardingService.createOnboardingRecord(company.id, userData.userId);
        console.log('✅ Registro de onboarding creado');
        
        // Marcar paso de configuración de empresa como completado
        await onboardingService.updateOnboardingStep(
          company.id, 
          userData.userId, 
          'company_setup', 
          {
            company_name: formData.companyName,
            company_code: formData.companyCode,
            industry: formData.industry,
            product_type: formData.productType,
            expected_users: formData.expectedUsers
          }
        );
      } catch (onboardingError) {
        console.warn('⚠️ Error configurando onboarding (tablas pueden no existir):', onboardingError);
        // No es crítico para el flujo principal - continuar sin onboarding
      }
      
      // 7. Actualizar contexto de empresa
      setCompany(company);
      
      console.log('✅ Empresa configurada completamente');
      
      // 8. Redirigir a selección de plan
      navigate('/plan-selection', { 
        state: { 
          userId: userData.userId,
          companyId: company.id,
          companyName: company.name,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          onboardingStep: 'plan_selection'
        } 
      });

    } catch (error) {
      console.error('❌ Error en handleSubmit:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Función para crear estructura por defecto de productos
  const createDefaultProductStructure = async (productType, companyId) => {
    try {
      // Esta función puede expandirse para crear campos personalizados
      // o configuraciones específicas según el tipo de producto
      console.log(`📋 Configurando estructura para tipo: ${productType}`);
      
      // Por ahora solo registramos que se configuró
      // En el futuro se pueden agregar campos personalizados aquí
      
    } catch (error) {
      console.warn('⚠️ Error configurando estructura de productos:', error);
      // No es crítico
    }
  };

  const getDefaultFieldsForProductType = (productType, companyId) => {
    const baseFields = [
      { company_id: companyId, field_name: 'reference', field_label: 'Referencia', field_type: 'text', is_required: true, field_order: 1 },
      { company_id: companyId, field_name: 'price_r', field_label: 'Precio Detal', field_type: 'number', is_required: true, field_order: 9 }
    ];

    switch (productType) {
      case 'shoes':
        return [
          ...baseFields,
          { company_id: companyId, field_name: 'color', field_label: 'Color', field_type: 'text', is_required: false, field_order: 2 },
          { company_id: companyId, field_name: 'size', field_label: 'Talla', field_type: 'text', is_required: false, field_order: 3 },
          { company_id: companyId, field_name: 'brand', field_label: 'Marca', field_type: 'text', is_required: false, field_order: 4 },
          { company_id: companyId, field_name: 'material', field_label: 'Material', field_type: 'text', is_required: false, field_order: 5 }
        ];
      case 'clothing':
        return [
          ...baseFields,
          { company_id: companyId, field_name: 'color', field_label: 'Color', field_type: 'text', is_required: false, field_order: 2 },
          { company_id: companyId, field_name: 'size', field_label: 'Talla', field_type: 'text', is_required: false, field_order: 3 },
          { company_id: companyId, field_name: 'fabric', field_label: 'Tela', field_type: 'text', is_required: false, field_order: 4 }
        ];
      case 'accessories':
        return [
          ...baseFields,
          { company_id: companyId, field_name: 'color', field_label: 'Color', field_type: 'text', is_required: false, field_order: 2 },
          { company_id: companyId, field_name: 'material', field_label: 'Material', field_type: 'text', is_required: false, field_order: 3 }
        ];
      default:
        return baseFields;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Registra tu Empresa
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Comienza tu prueba gratuita de 30 días
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8">
          {/* Indicador de pasos */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s <= step ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {s}
                </div>
                {s < 3 && <div className={`w-16 h-1 mx-2 ${s < step ? 'bg-blue-600' : 'bg-gray-300'}`} />}
              </div>
            ))}
          </div>

          {/* Paso 1: Información de la empresa */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Información de la Empresa</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre de la Empresa *</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Mi Empresa S.A.S"
                />
                {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Código de Empresa *</label>
                <input
                  type="text"
                  name="companyCode"
                  value={formData.companyCode}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="MIEMPRESA"
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.companyCode && <p className="mt-1 text-sm text-red-600">{errors.companyCode}</p>}
                <p className="mt-1 text-xs text-gray-500">Código único para identificar tu empresa</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Industria</label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {industries.map(industry => (
                    <option key={industry.value} value={industry.value}>{industry.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => validateStep1() && setStep(2)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Datos del administrador */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Datos del Administrador</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                  <input
                    type="text"
                    name="adminFirstName"
                    value={formData.adminFirstName}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.adminFirstName && <p className="mt-1 text-sm text-red-600">{errors.adminFirstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Apellido</label>
                  <input
                    type="text"
                    name="adminLastName"
                    value={formData.adminLastName}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.adminEmail && <p className="mt-1 text-sm text-red-600">{errors.adminEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contraseña *</label>
                <input
                  type="password"
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.adminPassword && <p className="mt-1 text-sm text-red-600">{errors.adminPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input
                  type="tel"
                  name="adminPhone"
                  value={formData.adminPhone}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
                >
                  Anterior
                </button>
                <button
                  onClick={() => validateStep2() && setStep(3)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Configuración y términos */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Configuración Final</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de Producto Principal</label>
                <div className="mt-2 space-y-2">
                  {productTypes.map(type => (
                    <label key={type.value} className="flex items-start">
                      <input
                        type="radio"
                        name="productType"
                        value={type.value}
                        checked={formData.productType === type.value}
                        onChange={handleChange}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Número esperado de usuarios</label>
                <select
                  name="expectedUsers"
                  value={formData.expectedUsers}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={5}>1-5 usuarios</option>
                  <option value={10}>6-10 usuarios</option>
                  <option value={25}>11-25 usuarios</option>
                  <option value={50}>26-50 usuarios</option>
                  <option value={100}>Más de 50 usuarios</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="mt-1 mr-3"
                  />
                  <span className="text-sm">
                    Acepto los <a href="#" className="text-blue-600 hover:underline">términos y condiciones</a> *
                  </span>
                </label>
                {errors.acceptTerms && <p className="text-sm text-red-600">{errors.acceptTerms}</p>}

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="acceptMarketing"
                    checked={formData.acceptMarketing}
                    onChange={handleChange}
                    className="mt-1 mr-3"
                  />
                  <span className="text-sm">
                    Acepto recibir comunicaciones de marketing y actualizaciones del producto
                  </span>
                </label>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
                >
                  Anterior
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-green-600 text-white px-8 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creando cuenta...' : 'Crear Empresa'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tienes una cuenta? {' '}
            <a href="/login" className="text-blue-600 hover:underline font-medium">
              Inicia sesión aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanyRegistration;
