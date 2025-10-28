// ========================================
// COMPONENTE DE GESTIÓN DE DESPACHOS
// ========================================

import React, { useState, useEffect } from 'react';
import useDispatches from '../hooks/useDispatches';
import useCustomerAccounts from '../hooks/useCustomerAccounts';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

const DeliveryModule = ({ user }) => {
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDispatchData, setNewDispatchData] = useState({
    accountId: '',
    deliveryAddress: '',
    notes: '',
    scheduledDate: ''
  });

  const { 
    dispatches, 
    loading: dispatchesLoading, 
    createDispatch,
    confirmDispatchItem,
    assignDispatchUser,
    getPendingDispatches,
    fetchDispatches,
    error: dispatchError
  } = useDispatches();
  
  const { accounts, loading: accountsLoading, fetchAccounts } = useCustomerAccounts();
  const { company } = useAuth();

  // Filtrar cuentas que tienen despacho solicitado
  const accountsReadyForDispatch = accounts.filter(acc => 
    acc.dispatch_requested && acc.status === 'pending_dispatch'
  );

  // Crear nuevo despacho
  const handleCreateDispatch = async () => {
    if (!newDispatchData.accountId) {
      alert('Por favor selecciona una cuenta');
      return;
    }

    try {
      await createDispatch(newDispatchData.accountId, user?.id);

      // Resetear formulario y cerrar modal
      setNewDispatchData({
        accountId: '',
        deliveryAddress: '',
        notes: '',
        scheduledDate: ''
      });
      setShowCreateModal(false);
      
      alert('Despacho creado exitosamente');
    } catch (error) {
      console.error('Error creating dispatch:', error);
      alert('Error al crear el despacho');
    }
  };

  // Actualizar estado de despacho
  const handleStatusUpdate = async (dispatchId, newStatus) => {
    try {
      const { error } = await supabase
        .from('dispatches')
        .update({ status: newStatus })
        .eq('id', dispatchId);
      
      if (error) throw error;
      
      // Actualizar la lista de despachos
      await fetchDispatches();
      alert(`Despacho marcado como ${getStatusLabel(newStatus)}`);
    } catch (error) {
      console.error('Error updating dispatch status:', error);
      alert('Error al actualizar el estado del despacho');
    }
  };

  // Obtener etiqueta del estado
  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Pendiente',
      'in_transit': 'En tránsito',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  };

  // Obtener color del estado
  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in_transit': 'bg-blue-100 text-blue-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Si hay error del sistema de despachos
  if (dispatchError) {
    return (
      <div className="bg-card rounded-lg border border-default p-6">
        <div className="text-center py-8">
          <div className="mb-4">
            <svg className="w-16 h-16 text-orange-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text mb-2">Sistema de Despachos</h3>
          <div className="max-w-md mx-auto">
            <p className="text-text-muted mb-4 text-sm leading-relaxed">
              {dispatchError}
            </p>
            {dispatchError.includes('no configurado') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-blue-800 mb-2">📋 Para configurar:</h4>
                <ol className="text-xs text-blue-700 space-y-1">
                  <li>1. Abrir Supabase Dashboard</li>
                  <li>2. Ir a SQL Editor</li>
                  <li>3. Ejecutar: SETUP_DISPATCH_SYSTEM_COMPLETE.sql</li>
                  <li>4. Refrescar esta página</li>
                </ol>
              </div>
            )}
            {dispatchError.includes('recursión') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-red-800 mb-2">🔧 Para corregir recursión RLS:</h4>
                <ol className="text-xs text-red-700 space-y-1">
                  <li>1. Abrir Supabase Dashboard</li>
                  <li>2. Ir a SQL Editor</li>
                  <li>3. Ejecutar: FIX_RLS_RECURSION.sql</li>
                  <li>4. Refrescar esta página</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (dispatchesLoading || accountsLoading) {
    return (
      <div className="bg-card rounded-lg border border-default p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-default p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V7M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text">Gestión de Despachos</h2>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={async () => {
              console.log('🔄 Recarga manual iniciada...');
              await fetchDispatches();
              await fetchAccounts();
              console.log('🔄 Recarga manual completada');
            }}
            className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            🔄 Recargar
          </button>
          
          {accountsReadyForDispatch.length > 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-theme text-text-inverted px-4 py-2 rounded-lg hover:bg-theme-hover transition-colors"
            >
              Crear Despacho
            </button>
          )}
        </div>
      </div>

      {/* Botón de prueba - Solo cuando no hay datos */}
      {accountsReadyForDispatch.length === 0 && dispatches.length === 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-800 mb-2">🚀 Crear datos de prueba</h3>
          <p className="text-sm text-blue-600 mb-3">
            No hay cuentas ni despachos. Crea datos de prueba para probar el sistema.
          </p>
          <button
            onClick={async () => {
              try {
                console.log('🔍 Iniciando creación de datos de prueba...');
                console.log('Company:', company);
                console.log('User:', user);

                // Generar número de cuenta manualmente si la función no funciona
                let accountNumber;
                try {
                  console.log('🔍 Intentando usar función get_next_consecutive...');
                  const { data: consecutiveData, error: consecutiveError } = await supabase.rpc('get_next_consecutive', {
                    p_type: 'account',
                    p_company_id: company.id
                  });
                  
                  if (consecutiveError) {
                    console.log('❌ Error en función consecutivo:', consecutiveError);
                    throw consecutiveError;
                  }
                  
                  console.log('✅ Función consecutivo devolvió:', consecutiveData);
                  accountNumber = consecutiveData;
                } catch (consecutiveError) {
                  console.log('⚠️ Función consecutivo no disponible, generando manualmente');
                  console.log('Error:', consecutiveError);
                  // Generar número manual como fallback
                  const timestamp = Date.now().toString().slice(-6);
                  accountNumber = `CTA-${timestamp}`;
                  console.log('✅ Número generado manualmente:', accountNumber);
                }

                // Verificar que accountNumber no sea null/undefined
                if (!accountNumber) {
                  throw new Error('No se pudo generar número de cuenta');
                }

                console.log('🔍 Creando cliente con accountNumber:', accountNumber);

                // Crear cliente de prueba
                const { data: customer, error: customerError } = await supabase
                  .from('customers')
                  .insert({
                    name: 'Cliente Prueba Despacho',
                    document: `TEST-${Date.now()}`,
                    phone: '300-123-4567',
                    city: 'Bogotá',
                    address: 'Calle 123 #45-67',
                    company_id: company.id
                  })
                  .select()
                  .single();

                if (customerError) {
                  console.log('❌ Error creando cliente:', customerError);
                  throw customerError;
                }
                console.log('✅ Cliente creado:', customer);

                // Verificar datos antes de crear cuenta
                const accountData = {
                  customer_id: customer.id,
                  company_id: company.id,
                  account_number: accountNumber,
                  status: 'pending_dispatch',
                  total_value: 150000,
                  balance: -150000,
                  dispatch_requested: true,
                  created_by: user?.id
                };
                
                console.log('🔍 Datos de cuenta a crear:', accountData);
                
                // Verificar que ningún campo requerido sea null
                if (!accountData.customer_id || !accountData.company_id || !accountData.account_number) {
                  throw new Error(`Datos incompletos: customer_id=${accountData.customer_id}, company_id=${accountData.company_id}, account_number=${accountData.account_number}`);
                }

                // Crear cuenta para el cliente
                const { data: account, error: accountError } = await supabase
                  .from('customer_accounts')
                  .insert(accountData)
                  .select()
                  .single();

                if (accountError) {
                  console.log('❌ Error creando cuenta:', accountError);
                  throw accountError;
                }
                console.log('✅ Cuenta creada:', account);

                alert('✅ Datos de prueba creados exitosamente');
                // Recargar AMBOS: despachos Y cuentas
                console.log('🔄 Recargando datos...');
                await fetchDispatches();
                
                // También recargar las cuentas
                if (fetchAccounts) {
                  console.log('🔄 Recargando cuentas...');
                  await fetchAccounts();
                }
              } catch (error) {
                console.error('❌ Error completo:', error);
                alert('❌ Error al crear datos de prueba: ' + error.message);
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🧪 Crear Datos de Prueba
          </button>
        </div>
      )}

      {/* Cuentas listas para despacho */}
      {accountsReadyForDispatch.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-medium text-yellow-800 mb-2">
            Cuentas listas para despacho ({accountsReadyForDispatch.length})
          </h3>
          <div className="space-y-2">
            {accountsReadyForDispatch.slice(0, 3).map(account => (
              <div key={account.id} className="flex justify-between items-center text-sm p-2 bg-white rounded border">
                <div>
                  <span className="text-yellow-700 font-medium">
                    {account.customers.name} - {account.account_number}
                  </span>
                  <br />
                  <span className="text-xs text-gray-500">
                    ${account.total_value?.toLocaleString('es-CO') || '0'}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    try {
                      console.log('🚀 Creando despacho para cuenta:', account.id);
                      await createDispatch(account.id, user?.id);
                      alert('✅ Despacho creado exitosamente');
                      // Recargar datos
                      await fetchDispatches();
                    } catch (error) {
                      console.error('❌ Error creando despacho:', error);
                      alert('❌ Error al crear despacho: ' + error.message);
                    }
                  }}
                  className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700 transition-colors"
                >
                  Crear Despacho
                </button>
              </div>
            ))}
            {accountsReadyForDispatch.length > 3 && (
              <p className="text-xs text-yellow-600">
                +{accountsReadyForDispatch.length - 3} cuentas más...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lista de despachos */}
      <div className="space-y-4">
        {dispatches.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V7M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            <p className="text-text-muted">No hay despachos registrados</p>
          </div>
        ) : (
          dispatches.slice(0, 10).map(dispatch => (
            <div key={dispatch.id} className="border border-default rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium text-text">
                    {dispatch.customer_accounts.customers.name}
                  </h3>
                  <p className="text-sm text-text-muted">
                    Despacho: {dispatch.dispatch_number}
                  </p>
                  <p className="text-sm text-text-muted">
                    Cuenta: {dispatch.customer_accounts.account_number}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(dispatch.status)}`}>
                  {getStatusLabel(dispatch.status)}
                </span>
              </div>
              
              <div className="text-sm text-text-muted mb-3">
                <p>Dirección: {dispatch.delivery_address}</p>
                {dispatch.notes && <p>Notas: {dispatch.notes}</p>}
                <p>Fecha: {new Date(dispatch.dispatch_date).toLocaleDateString('es-CO')}</p>
              </div>
              
              {/* Acciones según el estado */}
              {dispatch.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate(dispatch.id, 'in_transit')}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Marcar en tránsito
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(dispatch.id, 'delivered')}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Marcar entregado
                  </button>
                </div>
              )}
              
              {dispatch.status === 'in_transit' && (
                <button
                  onClick={() => handleStatusUpdate(dispatch.id, 'delivered')}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Marcar entregado
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal para crear despacho */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text mb-4">Crear Nuevo Despacho</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Cuenta del cliente *
                </label>
                <select
                  value={newDispatchData.accountId}
                  onChange={(e) => setNewDispatchData(prev => ({
                    ...prev,
                    accountId: e.target.value
                  }))}
                  className="w-full border border-default rounded-lg px-3 py-2"
                >
                  <option value="">Selecciona una cuenta</option>
                  {accountsReadyForDispatch.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.customers.name} - {account.account_number}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Dirección de entrega *
                </label>
                <textarea
                  value={newDispatchData.deliveryAddress}
                  onChange={(e) => setNewDispatchData(prev => ({
                    ...prev,
                    deliveryAddress: e.target.value
                  }))}
                  className="w-full border border-default rounded-lg px-3 py-2"
                  rows="3"
                  placeholder="Ingresa la dirección de entrega completa"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Fecha programada
                </label>
                <input
                  type="date"
                  value={newDispatchData.scheduledDate}
                  onChange={(e) => setNewDispatchData(prev => ({
                    ...prev,
                    scheduledDate: e.target.value
                  }))}
                  className="w-full border border-default rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Notas adicionales
                </label>
                <textarea
                  value={newDispatchData.notes}
                  onChange={(e) => setNewDispatchData(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  className="w-full border border-default rounded-lg px-3 py-2"
                  rows="2"
                  placeholder="Notas opcionales..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateDispatch}
                className="bg-theme text-text-inverted px-4 py-2 rounded-lg hover:bg-theme-hover flex-1"
              >
                Crear Despacho
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryModule;
