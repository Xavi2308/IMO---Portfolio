import React, { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Componente de tabla virtual optimizado para manejar grandes cantidades de datos
 * @param {Array} data - Array de datos a mostrar
 * @param {Array} columns - Configuración de columnas
 * @param {number} itemHeight - Altura de cada fila en pixels
 * @param {number} containerHeight - Altura del contenedor en pixels
 * @param {Function} renderRow - Función para renderizar cada fila
 */
const VirtualTable = ({
  data = [],
  columns = [],
  itemHeight = 50,
  containerHeight = 400,
  renderRow,
  className = '',
  headerClassName = '',
  onRowClick
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerElement, setContainerElement] = useState(null);

  // Calcular elementos visibles
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const visibleEnd = Math.min(visibleStart + visibleCount + 1, data.length);
    
    return {
      start: Math.max(0, visibleStart - 1), // Buffer de 1 elemento
      end: visibleEnd,
      count: visibleEnd - Math.max(0, visibleStart - 1)
    };
  }, [scrollTop, itemHeight, containerHeight, data.length]);

  // Elementos visibles
  const visibleItems = useMemo(() => {
    return data.slice(visibleRange.start, visibleRange.end);
  }, [data, visibleRange]);

  // Manejar scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Altura total del contenido
  const totalHeight = data.length * itemHeight;

  // Offset para posicionar correctamente los elementos visibles
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div className={`virtual-table-container ${className}`}>
      {/* Header */}
      <div className={`virtual-table-header ${headerClassName}`}>
        <div className="flex">
          {columns.map((column, index) => (
            <div
              key={column.key || index}
              className={`${column.className || ''} ${column.width || 'flex-1'}`}
              style={{ minWidth: column.minWidth }}
            >
              {column.title}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Body */}
      <div
        ref={setContainerElement}
        className="virtual-table-body overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Spacer para altura total */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Contenido visible */}
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.map((item, index) => {
              const actualIndex = visibleRange.start + index;
              return (
                <div
                  key={item.id || actualIndex}
                  className="virtual-table-row"
                  style={{ height: itemHeight }}
                  onClick={() => onRowClick?.(item, actualIndex)}
                >
                  {renderRow ? (
                    renderRow(item, actualIndex, columns)
                  ) : (
                    <div className="flex">
                      {columns.map((column, colIndex) => (
                        <div
                          key={column.key || colIndex}
                          className={`${column.className || ''} ${column.width || 'flex-1'}`}
                          style={{ minWidth: column.minWidth }}
                        >
                          {typeof column.render === 'function'
                            ? column.render(item[column.key], item, actualIndex)
                            : item[column.key]
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(VirtualTable);
