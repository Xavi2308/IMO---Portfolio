/**
 * @file StockOrderDetailsModal.jsx
 * @description Componente modal que muestra los detalles de un pedido de stock, incluyendo información del cliente, usuario, fechas, referencias solicitadas y observaciones. Permite cerrar el modal mediante un botón.
 */

import React, { useRef } from 'react';

/**
 * @description Componente funcional que renderiza un modal con los detalles de un pedido de stock. Si no hay pedido, retorna null. Muestra información como cliente, usuario, fechas y detalles de los ítems solicitados.
 * @param {Object} order - Objeto que contiene los datos del pedido de stock.
 * @param {Function} onClose - Función que se ejecuta al cerrar el modal.
 * @returns {JSX.Element|null} Elemento JSX que representa el modal o null si no hay pedido.
 */

function StockOrderDetailsModal({ order, onClose }) {
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
        <h3 className="text-2xl font-bold text-theme mb-4">Detalles de Pedido de Stock</h3>
        <div className="space-y-2">
          <p className="text-text"><strong>Cliente:</strong> {order.client_name}</p>
          <p className="text-text"><strong>Usuario:</strong> {order.user_id ? order.users?.username || 'Desconocido' : 'Sistema'}</p>
          <p className="text-text"><strong>Fecha de Creación:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
          <p className="text-text"><strong>Fecha Límite:</strong> {new Date(order.deadline).toLocaleDateString()}</p>
        </div>
        <h4 className="text-lg font-bold text-theme mt-6 mb-2">Referencia Solicitada</h4>
        <div className="max-h-64 overflow-y-auto pr-2">
          <div className="border border-secondary-2 p-3 rounded-xl bg-background-secondary">
            <p className="text-text"><strong>Referencia:</strong> {order.item.reference}</p>
            <p className="text-text"><strong>Color:</strong> {order.item.color}</p>
            <p className="text-text"><strong>Tallas:</strong> {Object.entries(order.item.sizes)
              .filter(([_, stock]) => stock > 0)
              .map(([size, stock]) => `${size}: ${stock}`)
              .join(', ')}</p>
            <p className="text-text"><strong>Observación:</strong> {order.item.observation || 'N/A'}</p>
          </div>
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

export default StockOrderDetailsModal;
