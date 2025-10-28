
import React, { useRef } from 'react';

function OrderDetailsModal({ order, onClose, getDaysSinceAccepted, getDaysUntilDeadline }) {
  const modalRef = useRef(null);
  if (!order) return null;

  // Cierra el modal si se hace click fuera de la tarjeta
  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-card p-8 rounded-2xl w-full max-w-lg shadow-2xl border border-secondary-2 animate-fade-in"
        style={{ boxShadow: '0 8px 32px 0 var(--shadow, rgba(0,0,0,0.18))', background: 'var(--card, #222c)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-theme mb-4">Detalles del Pedido</h3>
        <div className="space-y-2">
          <p className="text-text"><strong>Cliente:</strong> {order.client_name}</p>
          <p className="text-text"><strong>Usuario:</strong> {order.user_id ? order.users?.username || 'Desconocido' : 'Sistema'}</p>
          <p className="text-text"><strong>Fecha de Creación:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
          <p className="text-text"><strong>Fecha Límite:</strong> {new Date(order.deadline).toLocaleDateString()}</p>
          {order.status === 'in_process' && (
            <>
              <p className="text-text"><strong>Fecha de Inicio:</strong> {new Date(order.accepted_at).toLocaleDateString()}</p>
              <p className="text-text"><strong>Días Transcurridos:</strong> {getDaysSinceAccepted(order.accepted_at)}</p>
              <p className="text-text"><strong>Días Restantes:</strong> {getDaysUntilDeadline(order.deadline)}</p>
            </>
          )}
          {order.status === 'completed' && (
            <p className="text-text"><strong>Fecha de Completado:</strong> {new Date(order.completed_at).toLocaleDateString()}</p>
          )}
          <p className="text-text"><strong>Observaciones:</strong> {order.observations || 'N/A'}</p>
        </div>
        <h4 className="text-lg font-bold text-theme mt-6 mb-2">Referencias Solicitadas</h4>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {order.items.map((item, index) => (
            <div key={index} className="border border-secondary-2 p-3 rounded-xl bg-background-secondary">
              <p className="text-text"><strong>Referencia:</strong> {item.reference}</p>
              <p className="text-text"><strong>Color:</strong> {item.color}</p>
              <p className="text-text"><strong>Tallas:</strong> {Object.entries(item.sizes)
                .filter(([_, stock]) => stock > 0)
                .map(([size, stock]) => `${size}: ${stock}`)
                .join(', ')}</p>
              <p className="text-text"><strong>Observación:</strong> {item.observation || 'N/A'}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="bg-theme text-text-inverted px-6 py-2 rounded-lg font-semibold shadow hover:bg-theme-hover transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
