import React from 'react';
import { usePlanLimits } from '../hooks/usePlanLimits';

// Componentes simples sin antd
const Alert = ({ type, message, description, style }) => (
  <div style={{ 
    padding: 12, 
    border: `1px solid ${type === 'error' ? '#ff4d4f' : '#faad14'}`,
    backgroundColor: type === 'error' ? '#fff2f0' : '#fffbe6',
    borderRadius: 6,
    ...style 
  }}>
    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{message}</div>
    {description && <div>{description}</div>}
  </div>
);

const Button = ({ children, type, onClick, style }) => (
  <button 
    onClick={onClick}
    style={{ 
      padding: '6px 12px',
      border: type === 'primary' ? 'none' : '1px solid #d9d9d9',
      backgroundColor: type === 'primary' ? '#1890ff' : 'white',
      color: type === 'primary' ? 'white' : 'black',
      borderRadius: 4,
      cursor: 'pointer',
      ...style 
    }}
  >
    {children}
  </button>
);

const Progress = ({ percent, size, status }) => (
  <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: 10, height: size === 'small' ? 6 : 10 }}>
    <div 
      style={{ 
        width: `${percent}%`, 
        backgroundColor: status === 'exception' ? '#ff4d4f' : status === 'active' ? '#faad14' : '#52c41a',
        height: '100%', 
        borderRadius: 10,
        transition: 'width 0.3s'
      }} 
    />
  </div>
);

/**
 * Componente para mostrar alertas de límites del plan
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

  const alertType = isAtLimit ? 'error' : 'warning';
  const icon = isAtLimit ? <ExclamationCircleOutlined /> : <InfoCircleOutlined />;

  const getResourceLabel = (type) => {
    const labels = {
      products: 'productos',
      users: 'usuarios',
      storage: 'almacenamiento'
    };
    return labels[type] || type;
  };

  return (
    <Alert
      type={alertType}
      style={style}
      message={
        isAtLimit 
          ? `Has alcanzado el límite de ${getResourceLabel(resourceType)}`
          : `Te acercas al límite de ${getResourceLabel(resourceType)}`
      }
      description={
        <div>
          <div style={{ marginBottom: 8 }}>
            {currentCount} de {maxAllowed} {getResourceLabel(resourceType)} utilizados
          </div>
          <Progress 
            percent={Math.min(percentage, 100)} 
            size="small"
            status={isAtLimit ? 'exception' : 'active'}
          />
          {isAtLimit && (
            <div style={{ marginTop: 8 }}>
              <Button 
                type="primary"
                onClick={() => window.open('/upgrade-plan', '_blank')}
              >
                Actualizar Plan
              </Button>
            </div>
          )}
        </div>
      }
    />
  );
}

/**
 * Widget de resumen de límites del plan
 */
export function PlanLimitsSummary({ className }) {
  const { limits, loading, getPlanInfo } = usePlanLimits();
  const [planInfo, setPlanInfo] = React.useState(null);

  React.useEffect(() => {
    async function loadPlanInfo() {
      const info = await getPlanInfo();
      setPlanInfo(info);
    }
    loadPlanInfo();
  }, [getPlanInfo]);

  if (loading || !limits || !planInfo) {
    return (
      <Card loading={true} className={className}>
        <Card.Meta title="Plan de Suscripción" />
      </Card>
    );
  }

  const plan = planInfo.subscription_plans;
  
  return (
    <Card 
      className={className}
      title="Plan de Suscripción"
      extra={
        <Button 
          type="link" 
          size="small"
          onClick={() => window.open('/plan-details', '_blank')}
        >
          Ver Detalles
        </Button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
          {plan?.display_name || planInfo.subscription_type}
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
          label="Productos"
          current={0} // Se actualizará con hook
          max={limits.max_products}
          resourceType="products"
        />

        {/* Usuarios */}
        <LimitItem 
          label="Usuarios"
          current={0} // Se actualizará con hook
          max={limits.max_users}
          resourceType="users"
        />

        {/* Almacenamiento */}
        <LimitItem 
          label="Almacenamiento"
          current={0} // Se calculará dinámicamente
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
    </Card>
  );
}

/**
 * Item individual de límite
 */
function LimitItem({ label, current, max, unit = '', resourceType }) {
  const [actualCurrent, setActualCurrent] = React.useState(current);
  const { getCurrentResourceCount } = usePlanLimits();

  React.useEffect(() => {
    async function fetchCurrent() {
      if (resourceType && resourceType !== 'storage') {
        const count = await getCurrentResourceCount(resourceType);
        setActualCurrent(count);
      }
    }
    fetchCurrent();
  }, [resourceType, getCurrentResourceCount]);

  const isUnlimited = max === -1;
  const percentage = isUnlimited ? 0 : (actualCurrent / max) * 100;
  const status = percentage >= 100 ? 'exception' : percentage >= 80 ? 'active' : 'normal';

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
        <Progress 
          percent={Math.min(percentage, 100)} 
          size="small"
          status={status}
          showInfo={false}
          strokeColor={
            status === 'exception' ? '#ff4d4f' : 
            status === 'active' ? '#faad14' : '#52c41a'
          }
        />
      )}
    </div>
  );
}

/**
 * Modal o componente de validación antes de crear recursos
 */
export function ResourceCreationGuard({ resourceType, onProceed, onCancel, children }) {
  const { canCreateResource, limits, loading } = usePlanLimits();
  const [canCreate, setCanCreate] = React.useState(null);

  React.useEffect(() => {
    async function checkLimit() {
      const valid = await canCreateResource(resourceType);
      setCanCreate(valid);
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
    <Alert
      type="error"
      showIcon
      message="Límite alcanzado"
      description={
        <div>
          <p>Has alcanzado el límite de tu plan actual para crear más {resourceType}.</p>
          <div style={{ marginTop: 12 }}>
            <Button 
              type="primary" 
              size="small"
              icon={<UpgradeOutlined />}
              onClick={() => window.open('/upgrade-plan', '_blank')}
              style={{ marginRight: 8 }}
            >
              Actualizar Plan
            </Button>
            <Button size="small" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      }
    />
  );
}

export default {
  PlanLimitAlert,
  PlanLimitsSummary,
  ResourceCreationGuard
};