import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const CompanyStatus = () => {
  const { company } = useAuth();
  const [showTooltip, setShowTooltip] = useState(false);

  if (!company) return null;

  // Debug: ver qué datos tenemos (solo cuando company cambia)
  useEffect(() => {
    console.log('CompanyStatus - Company data:', {
      name: company.name,
      subscription_type: company.subscription_type,
      special_agreement: company.special_agreement,
      primary_color: company.primary_color
    });
  }, [company]);

  // Obtener color de estrella independiente del tema
  const getStarColor = () => {
    if (company.special_agreement) {
      return '#DAA520'; // Dorado fijo para plan fundador
    }
    
    switch (company.subscription_type) {
      case 'premium':
        return '#8B5CF6'; // Morado fijo para premium
      case 'standard':
        return '#3B82F6'; // Azul fijo para estándar
      case 'basic':
        return '#10B981'; // Verde fijo para básico
      default:
        return '#6B7280'; // Gris fijo para gratuito
    }
  };

  // Configuración de colores y estilos por plan
  const getPlanConfig = () => {
    if (company.special_agreement) {
      return {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        title: 'Fundador',
        subtitle: 'Plan Exclusivo',
        description: 'Plan especial para empresas fundadoras con acceso perpetuo gratuito.',
        features: ['Usuarios ilimitados', 'Todas las funciones premium', 'Soporte prioritario', 'Sin límites de almacenamiento', 'Acceso perpetuo sin costo'],
        cost: 'Gratuito'
      };
    }

    switch (company.subscription_type) {
      case 'premium':
        return {
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          title: 'Premium',
          subtitle: 'Plan Completo',
          description: 'Acceso completo a todas las funciones avanzadas.',
          features: ['Usuarios ilimitados', 'Campos personalizados', 'Integraciones', 'Reportes avanzados', 'Soporte prioritario', 'Control de acceso por roles'],
          cost: '$49/mes'
        };
      case 'standard':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Estándar',
          subtitle: 'Plan Intermedio',
          description: 'Funciones avanzadas para equipos medianos.',
          features: ['Hasta 5 usuarios', 'Campos personalizados', 'Exportación de datos', 'Reportes básicos'],
          cost: '$19/mes'
        };
      case 'basic':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Básico',
          subtitle: 'Plan Inicial',
          description: 'Funciones esenciales para equipos pequeños.',
          features: ['Hasta 2 usuarios', 'Inventario básico', 'Movimientos básicos'],
          cost: '$9/mes'
        };
      default: // free
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Gratuito',
          subtitle: 'Plan de Prueba',
          description: 'Prueba gratuita con funciones limitadas.',
          features: ['1 usuario', 'Inventario básico', '30 días de prueba'],
          cost: 'Gratis'
        };
    }
  };

  const config = getPlanConfig();
  const trialEndsAt = company.trial_ends_at ? new Date(company.trial_ends_at) : null;
  const daysLeft = trialEndsAt ? Math.ceil((trialEndsAt - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="relative">
      {/* Estrella con tooltip */}
      <div
        className="cursor-pointer transform hover:scale-110 transition-transform duration-200"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <svg
          className="w-7 h-7 drop-shadow-sm"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          style={{ color: getStarColor() }}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>

      {/* Tooltip mejorado */}
      {showTooltip && (
        <div className={`absolute right-0 top-10 w-80 ${config.bgColor} ${config.borderColor} border rounded-lg shadow-xl z-50 p-4`}>
          <div className="flex items-center space-x-2 mb-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: getStarColor() }}>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-800">{config.title}</h3>
              <p className="text-sm text-gray-600">{config.subtitle}</p>
              <p className="text-xs text-gray-500">{config.cost}</p>
            </div>
          </div>

          <p className="text-sm text-gray-700 mb-3">{config.description}</p>

          <div className="space-y-1 mb-3">
            <h4 className="text-sm font-medium text-gray-800">Características:</h4>
            {config.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* Información adicional */}
          <div className="border-t pt-3 mt-3 text-xs text-gray-600">
            <div className="flex justify-between items-center">
              <span>Empresa: {company.name}</span>
              <span>Usuarios: {company.max_users || 'Ilimitado'}</span>
            </div>
            {company.subscription_status === 'trial' && trialEndsAt && daysLeft > 0 && (
              <div className="mt-1 text-orange-600">
                ⏰ {daysLeft} días restantes de prueba
              </div>
            )}
            {company.special_agreement && (
              <div className="mt-1 text-yellow-600 font-medium">
                🏆 Plan Fundador - Acceso Perpetuo
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyStatus;
