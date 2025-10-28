import React from 'react';
import { usePlanLimits } from '../hooks/usePlanLimits';

/**
 * Componente simple para mostrar alertas de límites del plan (sin dependencia de antd)
 */
export function PlanLimitAlert({ resourceType, currentCount, style }) {
  const { limits, loading } = usePlanLimits();

  if (loading || !limits) {
    return null;
  }

  const maxAllowed = limits[`max_${resourceType}`];
  
  // Si es ilimitado, no mostrar alerta
  if (maxAllowed === -1) {
    return null;
  }

  const percentage = (currentCount / maxAllowed) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  if (!isNearLimit) {
    return null;
  }

  const getResourceLabel = (type) => {
    const labels = {
      products: 'productos',
      users: 'usuarios',
      storage: 'almacenamiento'
    };
    return labels[type] || type;
  };

  const alertStyle = {
    padding: 16,
    border: `1px solid ${isAtLimit ? '#ff4d4f' : '#faad14'}`,
    backgroundColor: isAtLimit ? '#fff2f0' : '#fffbe6',
    borderRadius: 6,
    marginBottom: 8,
    ...style
  };

  const progressStyle = {
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    height: 8,
    marginTop: 8,
    marginBottom: 8
  };

  const progressFillStyle = {
    width: `${Math.min(percentage, 100)}%`,
    backgroundColor: isAtLimit ? '#ff4d4f' : '#faad14',
    height: '100%',
    borderRadius: 10,
    transition: 'width 0.3s'
  };

  return (
    <div style={alertStyle}>
      <div style={{ fontWeight: 'bold', marginBottom: 8, color: isAtLimit ? '#ff4d4f' : '#faad14' }}>
        {isAtLimit 
          ? `⚠️ Has alcanzado el límite de ${getResourceLabel(resourceType)}`
          : `📊 Te acercas al límite de ${getResourceLabel(resourceType)}`}
      </div>
      
      <div style={{ marginBottom: 8 }}>
        {currentCount} de {maxAllowed} {getResourceLabel(resourceType)} utilizados
      </div>
      
      <div style={progressStyle}>
        <div style={progressFillStyle} />
      </div>
      
      {isAtLimit && (
        <div style={{ marginTop: 12 }}>
          <button 
            onClick={() => window.open('/upgrade-plan', '_blank')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            🚀 Actualizar Plan
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Widget simple de resumen de límites del plan
 */
export function PlanLimitsSummary({ className, style }) {
  const { limits, loading, getPlanInfo } = usePlanLimits();
  const [planInfo, setPlanInfo] = React.useState(null);

  React.useEffect(() => {
    async function loadPlanInfo() {
      if (getPlanInfo) {
        const info = await getPlanInfo();
        setPlanInfo(info);
      }
    }
    loadPlanInfo();
  }, [getPlanInfo]);

  if (loading || !limits) {
    return (
      <div style={{ padding: 16, border: '1px solid #d9d9d9', borderRadius: 6, ...style }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Plan de Suscripción</div>
        <div>Cargando...</div>
      </div>
    );
  }

  const plan = planInfo?.subscription_plans;
  
  const cardStyle = {
    padding: 16,
    border: '1px solid #d9d9d9',
    borderRadius: 6,
    backgroundColor: 'white',
    ...style
  };

  return (
    <div className={className} style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold' }}>Plan de Suscripción</div>
        <button 
          onClick={() => window.open('/plan-details', '_blank')}
          style={{
            background: 'none',
            border: 'none',
            color: '#1890ff',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Ver Detalles
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
          {plan?.display_name || planInfo?.subscription_type || 'Plan Actual'}
        </div>
        {plan?.description && (
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            {plan.description}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {/* Productos */}
        <LimitItem 
          label="📦 Productos"
          max={limits.max_products}
          resourceType="products"
        />

        {/* Usuarios */}
        <LimitItem 
          label="👥 Usuarios"
          max={limits.max_users}
          resourceType="users"
        />

        {/* Almacenamiento */}
        <LimitItem 
          label="💾 Almacenamiento"
          max={limits.max_storage_mb}
          unit="MB"
          resourceType="storage"
        />
      </div>

      {plan?.price && (
        <div style={{ 
          marginTop: 16, 
          paddingTop: 12, 
          borderTop: '1px solid #f0f0f0',
          fontSize: 14,
          color: '#666'
        }}>
          <strong>${plan.price}</strong> / {plan.billing_period}
        </div>
      )}
    </div>
  );
}

/**
 * Item individual de límite
 */
function LimitItem({ label, max, unit = '', resourceType }) {
  const [actualCurrent, setActualCurrent] = React.useState(0);
  const { getCurrentResourceCount } = usePlanLimits();

  React.useEffect(() => {
    async function fetchCurrent() {
      if (resourceType && resourceType !== 'storage' && getCurrentResourceCount) {
        const count = await getCurrentResourceCount(resourceType);
        setActualCurrent(count);
      }
    }
    fetchCurrent();
  }, [resourceType, getCurrentResourceCount]);

  const isUnlimited = max === -1;
  const percentage = isUnlimited ? 0 : (actualCurrent / max) * 100;

  const getStatusColor = () => {
    if (percentage >= 100) return '#ff4d4f';
    if (percentage >= 80) return '#faad14';
    return '#52c41a';
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: 4,
        fontSize: 13
      }}>
        <span>{label}</span>
        <span style={{ color: '#666' }}>
          {actualCurrent} {unit} {!isUnlimited && `/ ${max} ${unit}`}
          {isUnlimited && <span style={{ color: '#52c41a' }}>∞</span>}
        </span>
      </div>
      {!isUnlimited && (
        <div style={{
          width: '100%',
          backgroundColor: '#f0f0f0',
          borderRadius: 10,
          height: 6
        }}>
          <div 
            style={{
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: getStatusColor(),
              height: '100%',
              borderRadius: 10,
              transition: 'width 0.3s'
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Componente de validación antes de crear recursos
 */
export function ResourceCreationGuard({ resourceType, onProceed, onCancel, children }) {
  const { canCreateResource, limits, loading } = usePlanLimits();
  const [canCreate, setCanCreate] = React.useState(null);

  React.useEffect(() => {
    async function checkLimit() {
      if (canCreateResource) {
        const valid = await canCreateResource(resourceType);
        setCanCreate(valid);
      }
    }
    checkLimit();
  }, [resourceType, canCreateResource]);

  if (loading || canCreate === null) {
    return children;
  }

  if (canCreate) {
    return children;
  }

  // Si no puede crear, mostrar mensaje de límite alcanzado
  return (
    <div style={{
      padding: 16,
      border: '1px solid #ff4d4f',
      backgroundColor: '#fff2f0',
      borderRadius: 6,
      textAlign: 'center'
    }}>
      <div style={{ fontWeight: 'bold', color: '#ff4d4f', marginBottom: 8 }}>
        ⚠️ Límite alcanzado
      </div>
      
      <p>Has alcanzado el límite de tu plan actual para crear más {resourceType}.</p>
      
      <div style={{ marginTop: 12 }}>
        <button 
          onClick={() => window.open('/upgrade-plan', '_blank')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            marginRight: 8
          }}
        >
          🚀 Actualizar Plan
        </button>
        
        <button 
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: 'white',
            color: '#666',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default {
  PlanLimitAlert,
  PlanLimitsSummary,
  ResourceCreationGuard
};