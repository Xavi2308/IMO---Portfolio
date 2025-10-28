import React, { useState } from 'react';

const IntegrationGuides = () => {
  const [activeGuide, setActiveGuide] = useState(null);

  const guides = {
    wordpress: {
      title: 'WordPress + WooCommerce',
      icon: '🛍️',
      steps: [
        {
          title: 'Acceder al Panel de Administración',
          content: 'Inicia sesión en tu sitio WordPress como administrador.',
          image: '/guides/wp-login.jpg'
        },
        {
          title: 'Ir a Configuración de WooCommerce',
          content: 'Ve a WooCommerce → Configuración → Avanzado → API REST.',
          code: 'WooCommerce → Settings → Advanced → REST API'
        },
        {
          title: 'Crear Nueva Clave API',
          content: 'Haz clic en "Agregar clave" y configura los permisos.',
          details: [
            'Descripción: "IMO Integration"',
            'Usuario: Selecciona tu usuario administrador',
            'Permisos: Lectura/Escritura',
            'Haz clic en "Generar clave API"'
          ]
        },
        {
          title: 'Copiar Credenciales',
          content: 'Guarda el Consumer Key y Consumer Secret que se generan.',
          warning: '⚠️ Guarda estas credenciales de forma segura. No se mostrarán nuevamente.'
        },
        {
          title: 'Configurar en IMO',
          content: 'Pega las credenciales en la configuración de WordPress en IMO.',
          fields: [
            'URL: https://tudominio.com',
            'Consumer Key: ck_xxxxxxxxxx',
            'Consumer Secret: cs_xxxxxxxxxx'
          ]
        }
      ],
      benefits: [
        'Sincronización automática de inventario',
        'Actualización de precios en tiempo real',
        'Gestión centralizada desde IMO',
        'Notificaciones de ventas'
      ]
    },
    shopify: {
      title: 'Shopify',
      icon: '🛒',
      steps: [
        {
          title: 'Acceder al Panel de Shopify',
          content: 'Inicia sesión en tu cuenta de Shopify.',
          url: 'https://partners.shopify.com'
        },
        {
          title: 'Crear Aplicación Privada',
          content: 'Ve a Aplicaciones → Desarrollar aplicaciones → Crear aplicación privada.',
          note: 'Si no ves esta opción, ve a Configuración → Aplicaciones y ventas → Desarrollar aplicaciones'
        },
        {
          title: 'Configurar Permisos',
          content: 'Habilita los permisos necesarios para productos e inventario.',
          permissions: [
            'Productos: Lectura y escritura',
            'Inventario: Lectura y escritura',
            'Pedidos: Lectura',
            'Clientes: Lectura'
          ]
        },
        {
          title: 'Generar Credenciales',
          content: 'Guarda el nombre de la tienda y el token de acceso.',
          example: 'Tu tienda: mi-tienda.myshopify.com → Nombre: "mi-tienda"'
        }
      ],
      benefits: [
        'Sincronización bidireccional',
        'Actualizaciones automáticas de stock',
        'Compatible con Shopify Plus',
        'Soporte para variantes de producto'
      ]
    },
    magento: {
      title: 'Magento Commerce',
      icon: '🏪',
      steps: [
        {
          title: 'Acceder al Admin Panel',
          content: 'Inicia sesión en el panel de administración de Magento.'
        },
        {
          title: 'Crear Nueva Integración',
          content: 'Ve a Sistema → Integraciones → Agregar Nueva Integración.',
          path: 'System → Integrations → Add New Integration'
        },
        {
          title: 'Configurar Recursos API',
          content: 'Habilita los recursos necesarios para productos y inventario.',
          resources: [
            'Catalog → Products',
            'Sales → Orders',
            'Inventory → Stock Items',
            'Customers → All Customers'
          ]
        },
        {
          title: 'Activar Integración',
          content: 'Guarda y activa la integración para obtener el token.',
          note: 'El token se genera automáticamente al activar la integración.'
        }
      ],
      benefits: [
        'Compatible con Magento 2.x',
        'Soporte para múltiples tiendas',
        'Gestión avanzada de inventario',
        'Integración con ERP'
      ]
    }
  };

  const GuideModal = ({ guide, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto border border-default">
        <div className="sticky top-0 bg-card border-b border-default px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text flex items-center">
            <span className="text-3xl mr-3">{guide.icon}</span>
            Configurar {guide.title}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4 text-text">Pasos de configuración:</h3>
              <div className="space-y-6">
                {guide.steps.map((step, index) => (
                  <div key={index} className="flex">
                    <div className="flex-shrink-0 w-8 h-8 bg-theme text-text-inverted rounded-full flex items-center justify-center font-bold mr-4">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-text mb-2">{step.title}</h4>
                      <p className="text-text-muted mb-3">{step.content}</p>
                      
                      {step.code && (
                        <div className="bg-background-secondary p-3 rounded-lg font-mono text-sm text-text border border-default">
                          {step.code}
                        </div>
                      )}
                      
                      {step.details && (
                        <ul className="list-disc list-inside text-sm text-text-muted space-y-1">
                          {step.details.map((detail, i) => (
                            <li key={i}>{detail}</li>
                          ))}
                        </ul>
                      )}
                      
                      {step.fields && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                          <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">Configuración:</p>
                          {step.fields.map((field, i) => (
                            <div key={i} className="font-mono text-sm text-blue-700 dark:text-blue-300">{field}</div>
                          ))}
                        </div>
                      )}
                      
                      {step.permissions && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-700">
                          <p className="font-medium text-green-800 dark:text-green-200 mb-2">Permisos requeridos:</p>
                          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                            {step.permissions.map((perm, i) => (
                              <li key={i}>• {perm}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {step.warning && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 p-3 rounded-lg">
                          <p className="text-yellow-800 dark:text-yellow-200 text-sm">{step.warning}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-background-secondary p-4 rounded-lg sticky top-4 border border-default">
                <h4 className="font-semibold mb-3 text-text">Beneficios de la integración:</h4>
                <ul className="space-y-2">
                  {guide.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text">{benefit}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-600">
                  <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">¿Necesitas ayuda?</h5>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Si tienes problemas con la configuración, contacta nuestro soporte técnico.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(guides).map(([key, guide]) => (
          <button
            key={key}
            onClick={() => setActiveGuide(guide)}
            className="inline-flex items-center px-4 py-2 text-sm bg-theme hover:bg-theme-hover text-text-inverted rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="mr-2">{guide.icon}</span>
            Guía para {guide.title}
          </button>
        ))}
      </div>

      {activeGuide && (
        <GuideModal 
          guide={activeGuide} 
          onClose={() => setActiveGuide(null)} 
        />
      )}
    </div>
  );
};

export default IntegrationGuides;
