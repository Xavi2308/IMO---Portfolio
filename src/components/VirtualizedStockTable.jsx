import React, { useState, useMemo, useCallback } from 'react';
import VirtualTable from './VirtualTable';

/**
 * Componente de tabla virtualizada optimizada para StockView
 * Solo renderiza las filas visibles para mejorar el rendimiento
 */
const VirtualizedStockTable = ({
  filteredGroupedProducts,
  sizes,
  user,
  expandedRowKey,
  setExpandedRowKey,
  inProcessOrders,
  selectedProducts,
  handleProductSelect,
  setSelectedProductForUpload,
  openPopup,
  setShowImageUpload,
  handleRowClick,
  sortConfig,
  handleSort,
  tableRef
}) => {
  const [containerHeight] = useState(600); // Altura fija del contenedor
  const itemHeight = 80; // Altura estimada por fila

  // Preparar columnas para VirtualTable
  const columns = useMemo(() => [
    { key: 'image', title: 'Imagen', width: 'w-16', className: 'text-center' },
    { key: 'reference', title: 'Referencia', width: 'w-32', className: 'text-center' },
    { key: 'color', title: 'Color', width: 'w-32', className: 'text-center' },
    ...sizes.map(size => ({
      key: `size_${size}`,
      title: size,
      width: 'w-16',
      className: 'text-center'
    })),
    { key: 'inProcess', title: 'En Proceso', width: 'w-20', className: 'text-center' },
    ...(user?.role !== 'lector' ? [{ key: 'upload', title: 'Subir', width: 'w-16', className: 'text-center' }] : [])
  ], [sizes, user?.role]);

  // Función para renderizar cada fila
  const renderRow = useCallback((group, index, columns) => {
    const rowKey = `${group.reference}-${group.color}`;
    const isExpanded = expandedRowKey === rowKey;
    const relevantOrders = inProcessOrders.filter(order =>
      order.items.some(item => item.reference === group.reference && item.color === group.color)
    );
    const totalInProcess = relevantOrders.flatMap(order => order.items)
      .filter(item => item.reference === group.reference && item.color === group.color)
      .reduce((sum, item) => sum + Object.values(item.sizes).reduce((s, q) => s + q, 0), 0);

    return (
      <div className="flex w-full border-t border-default hover:bg-background-secondary transition-colors cursor-pointer"
           onClick={() => handleRowClick(rowKey)}>
        {/* Imagen */}
        <div className="w-16 p-1 text-center flex items-center justify-center">
          <div className="cursor-pointer" onClick={user?.role !== 'lector' ? (e) => {
            e.stopPropagation();
            setSelectedProductForUpload(group);
            openPopup(setShowImageUpload);
          } : undefined}>
            {group.image_url ? (
              <img 
                src={group.image_url} 
                alt={`${group.reference} ${group.color}`} 
                className="w-10 h-10 object-cover rounded mx-auto" 
                onError={(e) => (e.target.src = 'https://placehold.co/48x48/EFEFEF/AAAAAA&text=No+Img')} 
              />
            ) : (
              <div className="w-10 h-10 bg-card flex items-center justify-center rounded text-xs text-center text-text-muted mx-auto">
                Sin imagen
              </div>
            )}
          </div>
        </div>

        {/* Referencia */}
        <div className="w-32 p-1 text-center flex items-center justify-center">
          <span className="table-cell-truncate">{group.reference}</span>
        </div>

        {/* Color */}
        <div className="w-32 p-1 text-center flex items-center justify-center">
          <span className="table-cell-truncate">{group.color}</span>
        </div>

        {/* Tallas */}
        {sizes.map((size) => (
          <div key={size} className="w-16 p-1 text-center flex items-center justify-center relative">
            <span className="highlight absolute inset-0 hidden z-5"></span>
            <span className="relative z-15">{group.sizes[size] || 0}</span>
          </div>
        ))}

        {/* En Proceso */}
        <div className={`w-20 p-1 text-center flex items-center justify-center ${
          totalInProcess > 0 ? 'text-theme font-bold' : 'text-text-muted'
        }`}>
          {totalInProcess}
        </div>

        {/* Botón Subir (solo si no es lector) */}
        {user?.role !== 'lector' && (
          <div className="w-16 p-1 text-center flex items-center justify-center">
            <button
              onClick={e => {
                e.stopPropagation();
                setSelectedProductForUpload(group);
                openPopup(setShowImageUpload);
              }}
              className="bg-theme text-text-inverted px-2 py-1 text-xs rounded shadow-default hover:bg-theme-hover transition-all"
              title="Subir imagen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }, [
    expandedRowKey, inProcessOrders, sizes, user?.role, 
    setSelectedProductForUpload, openPopup, setShowImageUpload, handleRowClick
  ]);

  // Header personalizado
  const HeaderComponent = useMemo(() => (
    <div className="flex w-full bg-theme text-text-inverted sticky top-0 z-20">
      <div className="w-16 p-1 text-center border-r border-default">Imagen</div>
      <div className="w-32 p-1 text-center border-r border-default">
        <div className="flex items-center justify-center w-full">
          <span>Referencia</span>
          <button onClick={() => handleSort('reference')} className="focus:outline-none p-1 ml-1">
            {sortConfig.reference.direction === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
      <div className="w-32 p-1 text-center border-r border-default">
        <div className="flex items-center justify-center w-full">
          <span>Color</span>
          <button onClick={() => handleSort('color')} className="focus:outline-none p-1 ml-1">
            {sortConfig.color.direction === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
      {sizes.map((size) => (
        <div key={size} className="w-16 p-1 text-center border-r border-default">
          {size}
        </div>
      ))}
      <div className="w-20 p-1 text-center border-r border-default">En Proceso</div>
      {user?.role !== 'lector' && (
        <div className="w-16 p-1 text-center">Subir</div>
      )}
    </div>
  ), [sizes, user?.role, sortConfig, handleSort]);

  return (
    <div className="virtualized-stock-table">
      {HeaderComponent}
      <VirtualTable
        data={filteredGroupedProducts}
        columns={columns}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderRow={renderRow}
        onRowClick={(item) => handleRowClick(`${item.reference}-${item.color}`)}
        className="border border-default rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default React.memo(VirtualizedStockTable);
