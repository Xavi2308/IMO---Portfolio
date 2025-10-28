import React, { useState } from 'react';
import { useMinimizedSales } from '../contexts/MinimizedSalesContext';

const MinimizedSalesTaskbar = ({ onRestoreSale }) => {
  const { sales, removeMinimizedSale, setActiveSale } = useMinimizedSales();
  const [expandedSale, setExpandedSale] = useState(null);

  // Si no hay ventas, no mostrar la barra
  if (sales.length === 0) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalItems = (items) => {
    return items.reduce((sum, item) => {
      const itemTotal = Object.values(item.sizes || {}).reduce((a, b) => a + (b || 0), 0);
      return sum + itemTotal;
    }, 0);
  };

  const handleRestoreSale = (sale) => {
    setActiveSale(sale.id);
    onRestoreSale?.(sale);
  };

  const handleRemoveSale = (e, saleId) => {
    e.stopPropagation();
    removeMinimizedSale(saleId);
  };

  const toggleSalePreview = (e, saleId) => {
    e.stopPropagation();
    setExpandedSale(expandedSale === saleId ? null : saleId);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-default shadow-lg z-40">
      <div className="px-4 py-2">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <span className="text-sm font-medium text-text-muted whitespace-nowrap">
            Ventas activas ({sales.length}):
          </span>
          
          {sales.map((sale) => (
            <div key={sale.id} className="relative">
              {/* Botón principal de la venta */}
              <div 
                className="flex items-center space-x-2 bg-theme text-text-inverted px-3 py-2 rounded-lg cursor-pointer hover:bg-theme-hover transition-colors min-w-max group"
                onClick={() => handleRestoreSale(sale)}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{sale.title}</span>
                  <span className="text-xs opacity-75">
                    {sale.items.length} items • {formatPrice(sale.total)} • {formatTime(sale.createdAt)}
                  </span>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => toggleSalePreview(e, sale.id)}
                    className="p-1 hover:bg-white/20 rounded"
                    title="Vista previa"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleRemoveSale(e, sale.id)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-300 hover:text-red-200"
                    title="Cerrar venta"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Vista previa expandida */}
              {expandedSale === sale.id && (
                <div className="absolute bottom-full left-0 mb-2 bg-card border border-default rounded-lg shadow-xl p-4 min-w-80 z-50">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-text">{sale.title}</h4>
                        <p className="text-sm text-text-muted">
                          Creada: {new Date(sale.createdAt).toLocaleString('es-CO')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => toggleSalePreview(e, sale.id)}
                        className="text-text-muted hover:text-text"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Cliente */}
                    {sale.customer && (
                      <div>
                        <span className="text-sm font-medium text-text">Cliente: </span>
                        <span className="text-sm text-text-muted">{sale.customer}</span>
                      </div>
                    )}

                    {/* Items */}
                    <div>
                      <h5 className="text-sm font-medium text-text mb-2">
                        Productos ({sale.items.length}):
                      </h5>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {sale.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm bg-background p-2 rounded">
                            <div>
                              <span className="font-medium">{item.reference}</span>
                              {item.color && <span className="text-text-muted"> • {item.color}</span>}
                            </div>
                            <div className="text-right">
                              <div className="text-text-muted">
                                {getTotalItems([item])} unidades
                              </div>
                              {item.sizes && Object.entries(item.sizes).some(([_, qty]) => qty > 0) && (
                                <div className="text-xs text-text-muted">
                                  {Object.entries(item.sizes)
                                    .filter(([_, qty]) => qty > 0)
                                    .map(([size, qty]) => `${size}(${qty})`)
                                    .join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="pt-2 border-t border-default">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-text">Total:</span>
                        <span className="font-bold text-theme">{formatPrice(sale.total)}</span>
                      </div>
                      <div className="text-sm text-text-muted">
                        {getTotalItems(sale.items)} unidades totales
                      </div>
                    </div>

                    {/* Botón de continuar */}
                    <button
                      onClick={() => handleRestoreSale(sale)}
                      className="w-full bg-theme text-text-inverted py-2 px-4 rounded hover:bg-theme-hover transition-colors"
                    >
                      Continuar con esta venta
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MinimizedSalesTaskbar;
