import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Row, 
  Col, 
  Tag, 
  Alert, 
  Modal, 
  Typography, 
  List, 
  Divider,
  Spin
} from 'antd';
import { 
  CheckOutlined, 
  CrownOutlined, 
  RocketOutlined, 
  StarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useSubscriptionPlans, usePlanLimits } from '../hooks/usePlanLimits';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

const { Title, Text, Paragraph } = Typography;

/**
 * Página de actualización de planes
 */
export function PlanUpgrade() {
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { limits, getPlanInfo } = usePlanLimits();
  const { company } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    async function loadCurrentPlan() {
      const info = await getPlanInfo();
      setCurrentPlan(info);
    }
    loadCurrentPlan();
  }, [getPlanInfo]);

  const handleUpgrade = async (plan) => {
    setSelectedPlan(plan);
    setUpgradeModal(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan || !company?.id) return;

    setUpgrading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          plan_id: selectedPlan.id,
          subscription_type: selectedPlan.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id);

      if (error) throw error;

      // Recargar información del plan
      const info = await getPlanInfo();
      setCurrentPlan(info);
      
      setUpgradeModal(false);
      
      Modal.success({
        title: '¡Plan actualizado!',
        content: `Tu plan ha sido actualizado a ${selectedPlan.display_name} exitosamente.`,
      });

    } catch (error) {
      console.error('Error upgrading plan:', error);
      Modal.error({
        title: 'Error al actualizar',
        content: 'Hubo un problema al actualizar tu plan. Inténtalo nuevamente.',
      });
    } finally {
      setUpgrading(false);
    }
  };

  if (plansLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Cargando planes...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={2}>
          <CrownOutlined /> Planes de Suscripción
        </Title>
        <Paragraph style={{ fontSize: 16, color: '#666' }}>
          Elige el plan que mejor se adapte a las necesidades de tu empresa
        </Paragraph>
        
        {currentPlan && (
          <Alert
            type="info"
            icon={<InfoCircleOutlined />}
            message={`Plan Actual: ${currentPlan.subscription_plans?.display_name || currentPlan.subscription_type}`}
            style={{ maxWidth: 400, margin: '16px auto' }}
          />
        )}
      </div>

      <Row gutter={[24, 24]}>
        {plans.map((plan) => (
          <Col key={plan.id} xs={24} sm={12} lg={8} xl={6}>
            <PlanCard
              plan={plan}
              currentPlan={currentPlan}
              onUpgrade={() => handleUpgrade(plan)}
            />
          </Col>
        ))}
      </Row>

      <PlanComparisonTable plans={plans} style={{ marginTop: 40 }} />

      {/* Modal de confirmación */}
      <Modal
        title="Confirmar actualización"
        open={upgradeModal}
        onCancel={() => setUpgradeModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setUpgradeModal(false)}>
            Cancelar
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            loading={upgrading}
            onClick={confirmUpgrade}
          >
            Confirmar actualización
          </Button>
        ]}
      >
        {selectedPlan && (
          <div>
            <Paragraph>
              ¿Estás seguro de que deseas actualizar a <strong>{selectedPlan.display_name}</strong>?
            </Paragraph>
            <div style={{ background: '#f6f6f6', padding: 16, borderRadius: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                ${selectedPlan.price} / {selectedPlan.billing_period}
              </div>
              <div style={{ color: '#666', marginTop: 4 }}>
                {selectedPlan.description}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/**
 * Tarjeta individual de plan
 */
function PlanCard({ plan, currentPlan, onUpgrade }) {
  const isCurrentPlan = currentPlan?.plan_id === plan.id;
  const isUpgrade = currentPlan && plan.price > (currentPlan.subscription_plans?.price || 0);
  
  const getPlanIcon = (planName) => {
    const icons = {
      free: <StarOutlined />,
      basic: <CheckOutlined />,
      professional: <RocketOutlined />,
      premium: <CrownOutlined />,
      enterprise: <CrownOutlined />
    };
    return icons[planName.toLowerCase()] || <CheckOutlined />;
  };

  const getPlanColor = (planName) => {
    const colors = {
      free: '#52c41a',
      basic: '#1890ff',
      professional: '#722ed1',
      premium: '#fa8c16',
      enterprise: '#eb2f96'
    };
    return colors[planName.toLowerCase()] || '#1890ff';
  };

  return (
    <Card
      className={isCurrentPlan ? 'current-plan' : ''}
      style={{
        height: '100%',
        border: isCurrentPlan ? `2px solid ${getPlanColor(plan.name)}` : '1px solid #d9d9d9',
        position: 'relative'
      }}
    >
      {isCurrentPlan && (
        <div style={{
          position: 'absolute',
          top: -1,
          right: 16,
          background: getPlanColor(plan.name),
          color: 'white',
          padding: '4px 12px',
          borderRadius: '0 0 6px 6px',
          fontSize: 12,
          fontWeight: 'bold'
        }}>
          Plan Actual
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ 
          fontSize: 32, 
          color: getPlanColor(plan.name), 
          marginBottom: 8 
        }}>
          {getPlanIcon(plan.name)}
        </div>
        
        <Title level={4} style={{ margin: 0, color: getPlanColor(plan.name) }}>
          {plan.display_name}
        </Title>
        
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 'bold' }}>
            ${plan.price}
          </span>
          <span style={{ color: '#666' }}>
            / {plan.billing_period}
          </span>
        </div>
        
        {plan.description && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {plan.description}
          </Text>
        )}
      </div>

      <Divider />

      {/* Características */}
      <div style={{ marginBottom: 16 }}>
        <Title level={5}>Características:</Title>
        <List
          size="small"
          dataSource={plan.features || []}
          renderItem={feature => (
            <List.Item style={{ padding: '4px 0', border: 'none' }}>
              <CheckOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              <span style={{ fontSize: 12 }}>{feature}</span>
            </List.Item>
          )}
        />
      </div>

      {/* Límites */}
      {plan.limits && (
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>Límites:</Title>
          <div style={{ fontSize: 12 }}>
            {plan.limits.max_products !== -1 && (
              <div>📦 Productos: {plan.limits.max_products}</div>
            )}
            {plan.limits.max_users !== -1 && (
              <div>👥 Usuarios: {plan.limits.max_users}</div>
            )}
            {plan.limits.max_storage_mb !== -1 && (
              <div>💾 Almacenamiento: {plan.limits.max_storage_mb}MB</div>
            )}
            {(plan.limits.max_products === -1 && plan.limits.max_users === -1) && (
              <div style={{ color: '#52c41a', fontWeight: 'bold' }}>
                ∞ Recursos ilimitados
              </div>
            )}
          </div>
        </div>
      )}

      <Button
        type={isCurrentPlan ? "default" : "primary"}
        block
        disabled={isCurrentPlan}
        onClick={onUpgrade}
        style={{
          background: isCurrentPlan ? undefined : getPlanColor(plan.name),
          borderColor: getPlanColor(plan.name)
        }}
      >
        {isCurrentPlan ? 'Plan Actual' : isUpgrade ? 'Actualizar' : 'Seleccionar'}
      </Button>
    </Card>
  );
}

/**
 * Tabla de comparación de planes
 */
function PlanComparisonTable({ plans, style }) {
  if (!plans || plans.length === 0) return null;

  const features = [
    'Productos',
    'Usuarios', 
    'Almacenamiento',
    'Soporte',
    'Reportes',
    'Integraciones'
  ];

  return (
    <div style={style}>
      <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
        Comparación Detallada
      </Title>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>
                Característica
              </th>
              {plans.map(plan => (
                <th 
                  key={plan.id}
                  style={{ 
                    padding: 12, 
                    textAlign: 'center', 
                    borderBottom: '2px solid #f0f0f0',
                    minWidth: 120
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{plan.display_name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    ${plan.price}/{plan.billing_period}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
                <strong>Productos máximos</strong>
              </td>
              {plans.map(plan => (
                <td 
                  key={plan.id}
                  style={{ 
                    padding: 12, 
                    textAlign: 'center', 
                    borderBottom: '1px solid #f0f0f0' 
                  }}
                >
                  {plan.limits?.max_products === -1 ? (
                    <Tag color="green">Ilimitado</Tag>
                  ) : (
                    plan.limits?.max_products || 'N/A'
                  )}
                </td>
              ))}
            </tr>
            
            <tr>
              <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
                <strong>Usuarios máximos</strong>
              </td>
              {plans.map(plan => (
                <td 
                  key={plan.id}
                  style={{ 
                    padding: 12, 
                    textAlign: 'center', 
                    borderBottom: '1px solid #f0f0f0' 
                  }}
                >
                  {plan.limits?.max_users === -1 ? (
                    <Tag color="green">Ilimitado</Tag>
                  ) : (
                    plan.limits?.max_users || 'N/A'
                  )}
                </td>
              ))}
            </tr>
            
            <tr>
              <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
                <strong>Almacenamiento</strong>
              </td>
              {plans.map(plan => (
                <td 
                  key={plan.id}
                  style={{ 
                    padding: 12, 
                    textAlign: 'center', 
                    borderBottom: '1px solid #f0f0f0' 
                  }}
                >
                  {plan.limits?.max_storage_mb === -1 ? (
                    <Tag color="green">Ilimitado</Tag>
                  ) : (
                    `${plan.limits?.max_storage_mb || 0}MB`
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlanUpgrade;