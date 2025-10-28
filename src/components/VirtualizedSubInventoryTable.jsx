import React, { memo, useMemo } from 'react';
import VirtualTable from './VirtualTable';

const VirtualizedSubInventoryTable = memo(({
  data,
  lang,
  translations,
  formatCurrency,
  formatDate,
  onEditClick,
  onDeleteClick,
  handleSort,
  sortField,
  sortOrder
}) => {
  // Memoize column definitions
  const columns = useMemo(() => [
    { 
      key: 'referencia', 
      title: translations[lang]?.reference || 'Referencia',
      width: 'w-1/6',
      className: 'px-4 py-2',
      render: (value) => value || 'N/A'
    },
    { 
      key: 'categoria', 
      title: translations[lang]?.category || 'Categoría',
      width: 'w-1/6',
      className: 'px-4 py-2',
      render: (value) => value || 'N/A'
    },
    { 
      key: 'color', 
      title: translations[lang]?.color || 'Color',
      width: 'w-1/6',
      className: 'px-4 py-2',
      render: (value) => value || 'N/A'
    },
    { 
      key: 'existencia_actual', 
      title: translations[lang]?.current_stock || 'Existencia Actual',
      width: 'w-1/6',
      className: 'px-4 py-2 text-right',
      render: (value) => value || 0
    },
    { 
      key: 'precio_venta', 
      title: translations[lang]?.sale_price || 'Precio Venta',
      width: 'w-1/6',
      className: 'px-4 py-2 text-right',
      render: (value) => formatCurrency(value)
    },
    { 
      key: 'created_at', 
      title: translations[lang]?.creation_date || 'Fecha Creación',
      width: 'w-1/6',
      className: 'px-4 py-2',
      render: (value) => formatDate(value)
    },
    { 
      key: 'actions', 
      title: translations[lang]?.actions || 'Acciones',
      width: 'w-1/6',
      className: 'px-4 py-2',
      render: (value, item) => (
        <div className="flex space-x-2">
          <button
            onClick={() => onEditClick(item)}
            className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
          >
            {translations[lang]?.edit || 'Editar'}
          </button>
          <button
            onClick={() => onDeleteClick(item.id)}
            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
          >
            {translations[lang]?.delete || 'Eliminar'}
          </button>
        </div>
      )
    }
  ], [lang, translations, formatCurrency, formatDate, onEditClick, onDeleteClick]);

  // Render VirtualTable with optimized props
  return (
    <div className="w-full border border-gray-300 rounded">
      <VirtualTable
        data={data}
        columns={columns}
        itemHeight={60}
        containerHeight={400}
        className="virtual-table-container"
        headerClassName="bg-gray-100 font-semibold border-b"
      />
    </div>
  );
});

VirtualizedSubInventoryTable.displayName = 'VirtualizedSubInventoryTable';

export default VirtualizedSubInventoryTable;
