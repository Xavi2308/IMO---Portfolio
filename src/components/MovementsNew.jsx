import React, { useState, useEffect, useMemo, useContext } from 'react';
import LanguageContext from '../context/LanguageContext';
import translations from '../translations';
import supabase from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const MovementsNew = ({ user }) => {
  const { lang } = useContext(LanguageContext);
  const { company } = useAuth();
  
  // Estados principales
  const [movements, setMovements] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    search: '',
    dateRange: 'today', // today, week, month, custom, all
    movementType: 'all', // all, entrada, salida, ajuste
    method: 'all', // all, manual, escaneo
    userId: 'all',
    startDate: '',
    endDate: ''
  });
  
  // Estados de UI
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState('table'); // table, timeline, grouped
  
  // Etiquetas dinámicas basadas en configuración de empresa
  const dynamicLabels = useMemo(() => {
    const productType = company?.settings?.product_type || 'custom';
    const hasSizes = company?.settings?.has_sizes || false;
    
    const labelsByType = {
      shoes: { units: 'pares', variations: 'tallas' },
      glasses: { units: 'unidades', variations: 'modelos' },
      clothing: { units: 'prendas', variations: 'tallas' },
      custom: { 
        units: hasSizes ? 'unidades' : 'productos',
        variations: hasSizes ? 'variaciones' : 'tipos'
      }
    };
    
    return labelsByType[productType] || labelsByType.custom;
  }, [company?.settings]);

  // Cargar datos
  useEffect(() => {
    loadMovements();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .order('username');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadMovements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Cargando movimientos...');
      
      let query = supabase
        .from('inventory_movements')
        .select(`
          *,
          users:user_id (
            id,
            username
          )
        `)
        .order('timestamp', { ascending: false });

      const { data, error, count } = await query;
      
      console.log('📊 Resultado de movimientos:', { data: data?.length || 0, error, count });
      
      if (error) {
        console.error('❌ Error en consulta de movimientos:', error);
        throw error;
      }
      
      const processedMovements = (data || []).map(movement => ({
        ...movement,
        details: safeParseJSON(movement.details),
        username: movement.users?.username || 'Usuario desconocido',
        formattedDate: new Date(movement.timestamp).toLocaleString('es-CO'),
        dayGroup: new Date(movement.timestamp).toLocaleDateString('es-CO')
      }));
      
      console.log('📊 Movimientos procesados:', processedMovements.length);
      setMovements(processedMovements);
    } catch (err) {
      console.error('Error loading movements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para parsear JSON
  const safeParseJSON = (jsonString) => {
    try {
      return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString || {};
    } catch {
      return {};
    }
  };

  // Filtrar movimientos
  const filteredMovements = useMemo(() => {
    let filtered = [...movements];
    
    // Filtro por búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(movement => 
        movement.username.toLowerCase().includes(searchLower) ||
        movement.movement_type.toLowerCase().includes(searchLower) ||
        movement.method.toLowerCase().includes(searchLower) ||
        (movement.details?.reference || '').toLowerCase().includes(searchLower) ||
        (movement.details?.color || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Filtro por fecha
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'custom':
          if (filters.startDate && filters.endDate) {
            const customStart = new Date(filters.startDate);
            const customEnd = new Date(filters.endDate);
            customEnd.setHours(23, 59, 59, 999);
            filtered = filtered.filter(movement => {
              const movementDate = new Date(movement.timestamp);
              return movementDate >= customStart && movementDate <= customEnd;
            });
          }
          break;
      }
      
      if (filters.dateRange !== 'custom') {
        filtered = filtered.filter(movement => 
          new Date(movement.timestamp) >= startDate
        );
      }
    }
    
    // Filtro por tipo de movimiento
    if (filters.movementType !== 'all') {
      filtered = filtered.filter(movement => 
        movement.movement_type === filters.movementType
      );
    }
    
    // Filtro por método
    if (filters.method !== 'all') {
      filtered = filtered.filter(movement => 
        movement.method === filters.method
      );
    }
    
    // Filtro por usuario
    if (filters.userId !== 'all') {
      filtered = filtered.filter(movement => 
        movement.user_id === filters.userId
      );
    }
    
    return filtered;
  }, [movements, filters]);

  // Paginación
  const paginatedMovements = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredMovements.slice(startIndex, startIndex + pageSize);
  }, [filteredMovements, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredMovements.length / pageSize);

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: filteredMovements.length,
      entrada: filteredMovements.filter(m => m.movement_type === 'entrada').length,
      salida: filteredMovements.filter(m => m.movement_type === 'salida').length,
      ajuste: filteredMovements.filter(m => m.movement_type === 'ajuste').length,
      manual: filteredMovements.filter(m => m.method === 'manual').length,
      escaneo: filteredMovements.filter(m => m.method === 'escaneo').length
    };
  }, [filteredMovements]);

  // Manejadores de eventos
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const toggleRowExpansion = (movementId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(movementId)) {
        newSet.delete(movementId);
      } else {
        newSet.add(movementId);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      dateRange: 'today',
      movementType: 'all',
      method: 'all',
      userId: 'all',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  const exportData = () => {
    const csvData = filteredMovements.map(movement => ({
      Fecha: movement.formattedDate,
      Usuario: movement.username,
      Tipo: movement.movement_type,
      Cantidad: movement.quantity,
      Método: movement.method,
      Referencia: movement.details?.reference || '',
      Color: movement.details?.color || '',
      Tallas: movement.details?.sizes ? 
        Object.entries(movement.details.sizes)
          .map(([size, qty]) => `${size}:${qty}`)
          .join('; ') : ''
    }));
    
    // Convertir a CSV y descargar
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `movimientos_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const convertToCSV = (data) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\\n');
    
    return csvContent;
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Obtener color del tipo de movimiento
  const getMovementTypeColor = (type) => {
    switch (type) {
      case 'entrada': return 'text-green-600 bg-green-100';
      case 'salida': return 'text-red-600 bg-red-100';
      case 'ajuste': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Obtener icono del tipo de movimiento
  const getMovementTypeIcon = (type) => {
    switch (type) {
      case 'entrada':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'salida':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
          </svg>
        );
      case 'ajuste':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text flex items-center gap-3">
            <div className="p-2 bg-theme rounded-lg">
              <svg className="w-8 h-8 text-text-inverted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            {translations[lang]?.movements_history || 'Historial de Movimientos'}
          </h1>
          <p className="text-text-muted mt-1">
            {translations[lang]?.movements_subtitle || 'Rastreo completo de todos los movimientos de inventario'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={exportData}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {translations[lang]?.export || 'Exportar'}
          </button>
          
          <button
            onClick={loadMovements}
            className="bg-theme text-text-inverted px-4 py-2 rounded-lg hover:bg-theme-hover transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {translations[lang]?.refresh || 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-card p-4 rounded-lg border border-default">
          <div className="text-2xl font-bold text-theme">{stats.total}</div>
          <div className="text-sm text-text-muted">Total</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-default">
          <div className="text-2xl font-bold text-green-600">{stats.entrada}</div>
          <div className="text-sm text-text-muted">Entradas</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-default">
          <div className="text-2xl font-bold text-red-600">{stats.salida}</div>
          <div className="text-sm text-text-muted">Salidas</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-default">
          <div className="text-2xl font-bold text-blue-600">{stats.ajuste}</div>
          <div className="text-sm text-text-muted">Ajustes</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-default">
          <div className="text-2xl font-bold text-purple-600">{stats.manual}</div>
          <div className="text-sm text-text-muted">Manual</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-default">
          <div className="text-2xl font-bold text-orange-600">{stats.escaneo}</div>
          <div className="text-sm text-text-muted">Escaneo</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card p-6 rounded-lg border border-default space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text">Filtros</h3>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-theme bg-theme-light hover:bg-theme-muted border border-theme rounded-md transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {translations[lang]?.clear_filters || 'Limpiar Filtros'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              {translations[lang]?.search || 'Buscar'}
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Referencia, color, usuario..."
              className="w-full px-3 py-2 border border-default rounded-lg bg-card text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-theme"
            />
          </div>
          
          {/* Rango de fechas */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              {translations[lang]?.date_range || 'Período'}
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="w-full px-3 py-2 border border-default rounded-lg bg-card text-text focus:outline-none focus:ring-2 focus:ring-theme"
            >
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
              <option value="custom">Personalizado</option>
              <option value="all">Todos</option>
            </select>
          </div>
          
          {/* Tipo de movimiento */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              {translations[lang]?.movement_type || 'Tipo'}
            </label>
            <select
              value={filters.movementType}
              onChange={(e) => handleFilterChange('movementType', e.target.value)}
              className="w-full px-3 py-2 border border-default rounded-lg bg-card text-text focus:outline-none focus:ring-2 focus:ring-theme"
            >
              <option value="all">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          
          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              {translations[lang]?.user || 'Usuario'}
            </label>
            <select
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              className="w-full px-3 py-2 border border-default rounded-lg bg-card text-text focus:outline-none focus:ring-2 focus:ring-theme"
            >
              <option value="all">Todos</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Fechas personalizadas */}
        {filters.dateRange === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-default">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                {translations[lang]?.start_date || 'Fecha Inicio'}
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-default rounded-lg bg-card text-text focus:outline-none focus:ring-2 focus:ring-theme"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                {translations[lang]?.end_date || 'Fecha Fin'}
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-default rounded-lg bg-card text-text focus:outline-none focus:ring-2 focus:ring-theme"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-card rounded-lg border border-default overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme text-text-inverted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Usuario</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Cantidad</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Método</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Producto</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-text-muted">
                    {translations[lang]?.no_movements || 'No se encontraron movimientos'}
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((movement) => (
                  <React.Fragment key={movement.id}>
                    <tr className="border-t border-default hover:bg-background-secondary transition-colors">
                      <td className="px-4 py-3 text-sm text-text">
                        <div className="font-medium">{movement.formattedDate}</div>
                        <div className="text-xs text-text-muted">{movement.dayGroup}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text">
                        {movement.username}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getMovementTypeColor(movement.movement_type)}`}>
                          {getMovementTypeIcon(movement.movement_type)}
                          {movement.movement_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text font-medium">
                        {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity} {dynamicLabels.units}
                      </td>
                      <td className="px-4 py-3 text-sm text-text">
                        <span className={`px-2 py-1 rounded text-xs ${movement.method === 'escaneo' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {movement.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text">
                        {movement.details?.reference && (
                          <div className="font-medium">{movement.details.reference}</div>
                        )}
                        {movement.details?.color && (
                          <div className="text-xs text-text-muted">{movement.details.color}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <button
                          onClick={() => toggleRowExpansion(movement.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-theme hover:text-theme-hover bg-theme-light hover:bg-theme-muted rounded-md transition-colors"
                          title="Ver detalles"
                        >
                          <span>Detalles</span>
                          <svg 
                            className={`w-3 h-3 transform transition-transform ${expandedRows.has(movement.id) ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    
                    {/* Fila expandida con detalles */}
                    {expandedRows.has(movement.id) && (
                      <tr className="border-t border-default bg-background-secondary">
                        <td colSpan="7" className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <h4 className="font-medium text-text mb-2">Información del Producto</h4>
                              <div className="space-y-1 text-text-muted">
                                <div><strong>Referencia:</strong> {movement.details?.reference || 'N/A'}</div>
                                <div><strong>Color:</strong> {movement.details?.color || 'N/A'}</div>
                                {movement.details?.size && (
                                  <div><strong>Talla:</strong> {movement.details.size}</div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-text mb-2">Detalles del Movimiento</h4>
                              <div className="space-y-1 text-text-muted">
                                <div><strong>ID Variación:</strong> {movement.variation_id || 'N/A'}</div>
                                <div><strong>Fecha completa:</strong> {new Date(movement.timestamp).toLocaleString('es-CO')}</div>
                                <div><strong>Método:</strong> {movement.method}</div>
                              </div>
                            </div>
                            
                            {movement.details?.sizes && (
                              <div>
                                <h4 className="font-medium text-text mb-2">{dynamicLabels.variations}</h4>
                                <div className="space-y-1 text-text-muted">
                                  {Object.entries(movement.details.sizes).map(([size, qty]) => (
                                    <div key={size}><strong>{size}:</strong> {qty} {dynamicLabels.units}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-default bg-background-secondary">
            <div className="flex items-center justify-between">
              <div className="text-sm text-text-muted">
                Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filteredMovements.length)} de {filteredMovements.length} movimientos
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-default rounded bg-card text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary transition-colors"
                >
                  Anterior
                </button>
                
                <span className="px-3 py-1 text-sm text-text">
                  Página {currentPage} de {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-default rounded bg-card text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovementsNew;
