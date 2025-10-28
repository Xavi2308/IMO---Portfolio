import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import * as XLSX from 'xlsx';

// Componente de spinner de carga
const LoadingSpinner = ({ size = 'w-4 h-4' }) => (
  <svg 
    className={`${size} animate-spin`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

function getTextContrastClass(bgClass, forceBg) {
  // Si se fuerza el fondo (por ejemplo, bg-theme es blanco o negro)
  if (forceBg === 'light') return 'text-theme-c1';
  if (forceBg === 'dark') return 'text-theme-c5';
  if (bgClass.includes('bg-theme-c1')) return 'text-theme-c5';
  if (bgClass.includes('bg-theme-c5')) return 'text-theme-c1';
  // Para otros, usar texto por defecto
  return '';
}
function Sales({ user, setError, errorMessage }) {
  const [sales, setSales] = useState([]);
  const [filters, setFilters] = useState({ customer: '', startDate: '', endDate: '', created_by: '', approved_by: '' });
  const [customers, setCustomers] = useState([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerDropdownIndex, setCustomerDropdownIndex] = useState(-1);
  const customerInputRef = React.useRef(null);
  const customerDropdownRef = React.useRef(null);
  
  // Estados de carga para botones de acción
  const [loadingActions, setLoadingActions] = useState({});

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase.from('customers').select('id, name');
        if (error) throw error;
        setCustomers(data || []);
      } catch (err) {
        setCustomers([]);
      }
    };
    fetchCustomers();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target) &&
        customerInputRef.current &&
        !customerInputRef.current.contains(event.target)
      ) {
        setCustomerDropdownOpen(false);
        setCustomerDropdownIndex(-1);
      }
    }
    if (customerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [customerDropdownOpen]);
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      console.log('⚡ Starting ultra-optimized sales fetch...');
      
      // OPTIMIZACIÓN REAL: Single query con indexing inteligente
      const startTime = performance.now();
      
      let { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          consecutive_number,
          customer_id,
          created_by,
          approved_by,
          status,
          sale_type,
          total_value,
          total_pairs,
          paid_pairs,
          requested_pairs,
          payment_method,
          balance_pairs,
          balance_money,
          dispatch_type,
          created_at,
          order_id,
          customers!sales_customer_id_fkey (name),
          created_by_user: users!sales_created_by_fkey (username),
          approved_by_user: users!sales_approved_by_fkey (username)
        `)
        .order('created_at', { ascending: false })
        .limit(25); // Reducir aún más el límite inicial

      // Si falla con constraints, usar ultra-batch optimizado
      if (error && error.message.includes('relationship')) {
        console.warn('� Using ultra-optimized batch method due to constraint error');
        
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select(`
            id, consecutive_number, customer_id, created_by, approved_by, status, 
            sale_type, total_value, total_pairs, paid_pairs, requested_pairs, 
            payment_method, balance_pairs, balance_money, dispatch_type, created_at, order_id
          `)
          .order('created_at', { ascending: false })
          .limit(25);
          
        if (salesError) throw salesError;
        
        // Ultra-optimización: Solo buscar datos únicos
        const uniqueCustomerIds = [...new Set(salesData.map(s => s.customer_id).filter(Boolean))];
        const uniqueUserIds = [...new Set([
          ...salesData.map(s => s.created_by),
          ...salesData.map(s => s.approved_by)
        ].filter(Boolean))];
        
        console.log(`� Ultra-batch: ${uniqueCustomerIds.length} customers, ${uniqueUserIds.length} users`);
        
        // Solo hacer las queries necesarias
        const promises = [];
        
        if (uniqueCustomerIds.length > 0) {
          promises.push(
            supabase
              .from('customers')
              .select('id, name')
              .in('id', uniqueCustomerIds)
          );
        } else {
          promises.push(Promise.resolve({ data: [] }));
        }
        
        if (uniqueUserIds.length > 0) {
          promises.push(
            supabase
              .from('users')
              .select('id, username')
              .in('id', uniqueUserIds)
          );
        } else {
          promises.push(Promise.resolve({ data: [] }));
        }
        
        const [customersResult, usersResult] = await Promise.all(promises);
        
        // Crear hash maps para O(1) lookup
        const customerMap = new Map();
        const userMap = new Map();
        
        (customersResult.data || []).forEach(c => customerMap.set(c.id, c));
        (usersResult.data || []).forEach(u => userMap.set(u.id, u));
        
        // Ultra-mapping optimizado
        data = salesData.map(sale => ({
          ...sale,
          customers: customerMap.get(sale.customer_id) || { name: 'Cliente no encontrado' },
          created_by_user: userMap.get(sale.created_by) || { username: 'Usuario no encontrado' },
          approved_by_user: sale.approved_by ? (userMap.get(sale.approved_by) || { username: 'Usuario no encontrado' }) : null,
          // Compatibilidad
          users: userMap.get(sale.created_by) || { username: 'Usuario no encontrado' }
        }));
      } else if (error) {
        throw error;
      } else {
        // Agregar compatibilidad a data exitosa
        data = data.map(sale => ({
          ...sale,
          customers: sale.customers || { name: 'Cliente no encontrado' },
          created_by_user: sale.created_by_user || { username: 'Usuario no encontrado' },
          approved_by_user: sale.approved_by_user,
          users: sale.created_by_user || { username: 'Usuario no encontrado' }
        }));
      }

      if (!data) throw new Error('No sales data received');

      const endTime = performance.now();
      console.log(`🚀 Ultra-optimized fetch: ${data.length} sales in ${(endTime - startTime).toFixed(2)}ms`);
      
      setSales(data);
      setError('');
      
    } catch (err) {
      console.error('❌ Error fetching sales:', err);
      setError(`Error al cargar ventas: ${err.message}`);
      setSales([]);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'customer') {
      setFilters({ ...filters, customer: value });
      setCustomerDropdownOpen(true);
      setCustomerDropdownIndex(-1);
    } else {
      setFilters({ ...filters, [name]: value });
    }
  };

  const filteredCustomers = React.useMemo(() => {
    if (!filters.customer) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(filters.customer.toLowerCase()));
  }, [filters.customer, customers]);

  const handleCustomerInputKeyDown = (e) => {
    if (!customerDropdownOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setCustomerDropdownOpen(true);
      setCustomerDropdownIndex(0);
      return;
    }
    if (!filteredCustomers.length) return;
    if (e.key === 'ArrowDown') {
      setCustomerDropdownIndex(idx => Math.min(idx + 1, filteredCustomers.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setCustomerDropdownIndex(idx => Math.max(idx - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (customerDropdownIndex >= 0 && customerDropdownIndex < filteredCustomers.length) {
        setFilters(f => ({ ...f, customer: filteredCustomers[customerDropdownIndex].name }));
        setCustomerDropdownOpen(false);
        setCustomerDropdownIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setCustomerDropdownOpen(false);
      setCustomerDropdownIndex(-1);
    }
  };

  const handleCustomerSelect = (customer) => {
    setFilters(f => ({ ...f, customer: customer.name }));
    setCustomerDropdownOpen(false);
    setCustomerDropdownIndex(-1);
    if (customerInputRef.current) customerInputRef.current.blur();
  };

  const applyFilters = () => {
    let filtered = [...sales];
    if (filters.customer) {
      filtered = filtered.filter(sale =>
        sale.customers?.name.toLowerCase().includes(filters.customer.toLowerCase())
      );
    }
    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.created_at);
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        return saleDate >= start && saleDate <= end;
      });
    }
    if (filters.created_by) {
      filtered = filtered.filter(sale =>
        sale.created_by_user?.username?.toLowerCase().includes(filters.created_by.toLowerCase())
      );
    }
    if (filters.approved_by) {
      filtered = filtered.filter(sale =>
        sale.approved_by_user?.username?.toLowerCase().includes(filters.approved_by.toLowerCase())
      );
    }
    return filtered;
  };

  const handleApproveSale = async (saleId) => {
    if (!window.confirm('¿Aprobar esta venta?')) return;
    
    // Establecer estado de carga para este sale específico
    setLoadingActions(prev => ({ ...prev, [`approve_${saleId}`]: true }));
    
    try {
      setError('');
      console.log('🔍 Aprobando venta ID:', saleId);
      
      // OPTIMIZACIÓN REAL: Operaciones en paralelo con batch processing
      const [saleResult, itemsResult] = await Promise.all([
        // Update sale status
        supabase
          .from('sales')
          .update({ 
            status: 'approved', 
            approved_by: user.id, 
            approved_at: new Date().toISOString() 
          })
          .eq('id', saleId)
          .select('id, created_by, customers!sales_customer_id_fkey(name)')
          .single(),
        
        // Get sale items for movement registration
        supabase
          .from('sale_items')
          .select('reference, color, size, quantity')
          .eq('sale_id', saleId)
      ]);
      
      if (saleResult.error) {
        throw new Error(`Error actualizando venta: ${saleResult.error.message}`);
      }
      
      if (itemsResult.error) {
        throw new Error(`Error obteniendo items: ${itemsResult.error.message}`);
      }
      
      const saleData = saleResult.data;
      const saleItems = itemsResult.data;

      // Batch insert inventory movements (no bloquear la UI por esto)
      if (saleItems && saleItems.length > 0) {
        const movementPromise = supabase
          .from('inventory_movements')
          .insert(
            saleItems.map(item => ({
              user_id: user.id,
              movement_type: 'salida',
              quantity: item.quantity,
              method: 'venta',
              details: JSON.stringify({
                reference: item.reference,
                color: item.color,
                size: item.size,
                sale_id: saleId,
                reason: 'venta_aprobada'
              }),
              timestamp: new Date().toISOString(),
            }))
          );

        // Crear notificación en paralelo (no bloquear por esto)
        const notificationPromise = saleData?.created_by && saleData?.customers?.name ? 
          supabase.from('notifications').insert({
            user_id: saleData.created_by,
            message: `La venta de ${saleData.customers.name} fue aprobada por ${user.username}.`,
            created_at: new Date().toISOString(),
            read: false,
            sale_id: saleId,
            type: 'sale_approved',
          }) : Promise.resolve();

        // Ejecutar en background sin bloquear UI
        Promise.all([movementPromise, notificationPromise])
          .catch(err => console.warn('Background operations failed:', err.message));
      }

      // Actualizar estado local inmediatamente
      setSales(prevSales => 
        prevSales.map(sale => 
          sale.id === saleId 
            ? { 
                ...sale, 
                status: 'approved', 
                approved_by: user.id, 
                approved_at: new Date().toISOString(),
                approved_by_user: { username: user.username }
              }
            : sale
        )
      );
      
      console.log('✅ Venta aprobada exitosamente');
      
    } catch (err) {
      setError(`Error al aprobar venta: ${err.message}`);
      console.error('❌ Error in handleApproveSale:', err);
    } finally {
      // Limpiar estado de carga
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[`approve_${saleId}`];
        return newState;
      });
    }
  };

  const handleRejectSale = async (saleId) => {
    if (!window.confirm('¿Rechazar esta venta?')) return;
    
    // Establecer estado de carga para este sale específico
    setLoadingActions(prev => ({ ...prev, [`reject_${saleId}`]: true }));
    
    try {
      setError('');
      console.log('🔍 Rechazando venta ID:', saleId);
      
      // OPTIMIZACIÓN REAL: Hacer todas las operaciones necesarias de forma eficiente
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('reference, color, size, quantity')
        .eq('sale_id', saleId);
        
      if (itemsError) throw new Error(`Error obteniendo items: ${itemsError.message}`);
      if (!saleItems || saleItems.length === 0) {
        throw new Error('No se encontraron items para la venta');
      }

      // Batch operation para restaurar stock
      const stockUpdates = [];
      for (const item of saleItems) {
        // OPTIMIZACIÓN: Una sola query para encontrar y actualizar variación por referencia
        const { data: variation, error: variationError } = await supabase
          .rpc('restore_stock_on_reject_by_reference', {
            p_reference: item.reference,
            p_color: item.color,
            p_size: item.size,
            p_quantity: item.quantity
          });
          
        if (variationError) {
          console.warn(`No se pudo restaurar stock para ${item.reference}-${item.color}-${item.size}:`, variationError.message);
          // Continuar con otros items
        }
      }

      // Operaciones en paralelo
      const operations = [
        // Update sale status
        supabase
          .from('sales')
          .update({ 
            status: 'rejected', 
            approved_by: user.id, 
            approved_at: new Date().toISOString() 
          })
          .eq('id', saleId)
          .select('id, created_by, customers!sales_customer_id_fkey(name)'),
          
        // Batch insert return movements
        supabase
          .from('inventory_movements')
          .insert(
            saleItems.map(item => ({
              user_id: user.id,
              movement_type: 'entrada',
              quantity: item.quantity,
              method: 'manual',
              details: JSON.stringify({
                reference: item.reference,
                color: item.color,
                size: item.size,
                sale_id: saleId,
                reason: 'devolucion_venta_rechazada'
              }),
              timestamp: new Date().toISOString(),
            }))
          )
      ];

      const [saleResult, movementResult] = await Promise.all(operations);
      
      if (saleResult.error) {
        throw new Error(`Error actualizando venta: ${saleResult.error.message}`);
      }
      
      if (movementResult.error) {
        console.warn('Warning: Error registrando movimientos de devolución:', movementResult.error.message);
      }

      // Crear notificación si es posible (no bloquear por esto)
      const saleData = saleResult.data?.[0];
      if (saleData?.created_by && saleData?.customers?.name) {
        try {
          await supabase.from('notifications').insert({
            user_id: saleData.created_by,
            message: `La venta de ${saleData.customers.name} fue rechazada por ${user.username}.`,
            created_at: new Date().toISOString(),
            read: false,
            sale_id: saleId,
            type: 'sale_rejected',
          });
        } catch (notifError) {
          console.warn('No se pudo crear notificación:', notifError.message);
        }
      }

      // Actualizar estado local
      setSales(prevSales => 
        prevSales.map(sale => 
          sale.id === saleId 
            ? { 
                ...sale, 
                status: 'rejected', 
                approved_by: user.id, 
                approved_at: new Date().toISOString(),
                approved_by_user: { username: user.username }
              }
            : sale
        )
      );
      
      console.log('✅ Venta rechazada exitosamente con restauración de stock');
      
    } catch (err) {
      setError(`Error al rechazar venta: ${err.message}`);
      console.error('❌ Error in handleRejectSale:', err);
    } finally {
      // Limpiar estado de carga
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[`reject_${saleId}`];
        return newState;
      });
    }
  };

  // Optimizar fetchSales - solo cuando sea necesario
  const refreshSalesOptimized = async () => {
    // Usar un debounce para evitar múltiples llamadas
    if (refreshSalesOptimized.timeout) {
      clearTimeout(refreshSalesOptimized.timeout);
    }
    
    refreshSalesOptimized.timeout = setTimeout(() => {
      fetchSales();
    }, 1000); // 1 segundo de debounce
  };

  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('¿Eliminar esta venta? Esta acción no se puede deshacer.')) return;
    
    // Establecer estado de carga para este sale específico
    setLoadingActions(prev => ({ ...prev, [`delete_${saleId}`]: true }));
    
    try {
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);
      if (itemsError) throw itemsError;

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('status')
        .eq('id', saleId)
        .single();
      if (saleError) throw saleError;

      if (sale.status !== 'rejected') {
        for (const item of saleItems) {
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('id')
            .eq('reference', item.reference)
            .single();
          if (productError) throw productError;

          const { data: variation, error: variationError } = await supabase
            .from('variations')
            .select('id, stock')
            .eq('product_id', product.id)
            .eq('color', item.color)
            .eq('size', item.size)
            .single();
          if (variationError) throw variationError;

          const { error: stockError } = await supabase
            .from('variations')
            .update({ stock: variation.stock + item.quantity })
            .eq('id', variation.id);
          if (stockError) throw stockError;
        }
      }

      const movementsToInsert = saleItems.map(item => ({
        user_id: user.id,
        movement_type: 'entrada',
        quantity: item.quantity,
        method: 'manual',
        details: JSON.stringify({
          reference: item.reference,
          color: item.color,
          size: item.size,
          sale_id: saleId,
          reason: 'devolucion_venta_eliminada'
        }),
        timestamp: new Date().toISOString(),
      }));

      if (movementsToInsert.length > 0) {
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert(movementsToInsert);
        if (movementError) throw movementError;
      }

      await supabase.from('sale_items').delete().eq('sale_id', saleId);
      await supabase.from('notifications').delete().eq('sale_id', saleId);
      await supabase.from('sales').delete().eq('id', saleId);
      setSelectedSale(null);
      fetchSales();
    } catch (err) {
      setError(`Error al eliminar venta, debes rechazar la venta: ${err.message}`);
    } finally {
      // Limpiar estado de carga
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[`delete_${saleId}`];
        return newState;
      });
    }
  };

  // Reporte Excel: un row por venta, resumen total y pares
  const generateExcelReport = () => {
    const filteredSales = applyFilters();
    const data = filteredSales.map(sale => {
      // Priorizar sale_type sobre order_id para clasificación
      let tipoVenta;
      if (sale.sale_type === 'wholesale') {
        tipoVenta = 'Mayorista';
      } else if (sale.sale_type === 'retail') {
        tipoVenta = 'Detal';
      } else if (sale.order_id) {
        tipoVenta = 'Orden';
      } else {
        tipoVenta = 'Desconocido';
      }
      
      // Para verdaderas órdenes (sin sale_type específico)
      if (sale.order_id && !sale.sale_type) {
        // Venta proveniente de Orders
        let totalPares = sale.paid_pairs ?? 0;
        if (!totalPares) {
          totalPares = sale.total_pairs ?? 0;
        }
        if (!totalPares) {
          totalPares = sale.items ? sale.items.reduce((sum, item) => sum + (Object.values(item.sizes || {}).reduce((a, b) => a + b, 0)), 0) : 0;
        }
        let clienteNombre = Array.isArray(sale.customers) ? (sale.customers[0]?.name || 'Cliente no encontrado') : (sale.customers?.name || 'Cliente no encontrado');
        return {
          'Tipo de venta': tipoVenta,
          Cliente: clienteNombre,
          Fecha: new Date(sale.created_at).toLocaleDateString(),
          'Usuario de ventas': 'N/A',
          'Aprobado por': 'N/A',
          'Valor total': (sale.total_value ?? 0).toLocaleString('es-CO'),
          'Pares totales': totalPares,
          Estado: 'N/A',
          'Forma de pago': '',
        };
      } else {
        // Venta normal (mayorista/detal) - mostrar info de usuarios
        let totalParesVendidos = sale.paid_pairs ?? 0;
        if (!totalParesVendidos) {
          totalParesVendidos = sale.sale_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        }
        let valorTotal = sale.total_value;
        if (!valorTotal) {
          valorTotal = sale.sale_items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
        }
        return {
          'Tipo de venta': tipoVenta,
          Cliente: sale.customers?.name || 'Cliente no encontrado',
          Fecha: new Date(sale.created_at).toLocaleDateString(),
          'Usuario de ventas': sale.created_by_user?.username || 'N/A',
          'Aprobado por': sale.approved_by_user?.username || 'N/A',
          'Valor total': valorTotal.toLocaleString('es-CO'),
          'Pares totales': totalParesVendidos,
          Estado: sale.status || 'N/A',
          'Forma de pago': sale.payment_method || '',
        };
      }
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const cols = Object.keys(data[0] || {}).map(key => {
      const maxLen = Math.max(
        key.length,
        ...data.map(row => (row[key] ? String(row[key]).length : 0))
      );
      return { wch: maxLen + 2 };
    });
    ws['!cols'] = cols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `Reporte_Ventas_${filters.startDate || 'inicio'}_al_${filters.endDate || 'fin'}.xlsx`);
  };

  const filteredSales = applyFilters();

  // Limpiar filtros y cerrar dropdown
  const handleClearFilters = () => {
    setFilters({ customer: '', startDate: '', endDate: '', created_by: '', approved_by: '' });
    setCustomerDropdownOpen(false);
    setCustomerDropdownIndex(-1);
    if (customerInputRef.current) customerInputRef.current.blur();
  };

  return (
    <div className="bg-background p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-3 flex flex-wrap items-center gap-2">
          <span className="w-8 h-8 text-theme inline-block align-middle flex-shrink-0">
            {/* Sales icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
              <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" />
              <path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" />
            </svg>
          </span>
          <span className="flex-shrink-0">Historial de Ventas</span>
        </h1>
        {errorMessage && (
          <div className="mb-6 p-4 bg-error-100 border border-error-200 rounded-lg mt-4">
            <div className="flex">
              <svg className="w-5 h-5 text-error-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-error-600">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!selectedSale ? (
        <>
          <div className="mb-6 space-y-2">
            <div className="flex space-x-2">

              <div className="relative w-1/4" ref={customerDropdownRef}>
                <input
                  type="text"
                  name="customer"
                  placeholder="Filtrar por cliente"
                  autoComplete="off"
                  value={filters.customer}
                  onChange={handleFilterChange}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  onKeyDown={handleCustomerInputKeyDown}
                  ref={customerInputRef}
                  className="p-2 border border-default rounded w-full bg-card text-text text-truncate"
                  aria-autocomplete="list"
                  aria-controls="customer-dropdown-list"
                  title="Filtrar por cliente"
                  aria-expanded={customerDropdownOpen}
                  aria-activedescendant={customerDropdownOpen && customerDropdownIndex >= 0 ? `customer-option-${customerDropdownIndex}` : undefined}
                />
                {customerDropdownOpen && (
                  <ul
                    id="customer-dropdown-list"
                    className="absolute z-30 mt-1 w-full bg-card border border-default rounded shadow-lg max-h-48 overflow-y-auto"
                    style={{ maxHeight: '12rem' }}
                  >
                    {filteredCustomers.length === 0 && (
                      <li className="px-3 py-2 text-text-muted select-none">Sin resultados</li>
                    )}
                    {filteredCustomers.map((customer, idx) => (
                      <li
                        key={customer.id}
                        id={`customer-option-${idx}`}
                        className={`px-3 py-2 cursor-pointer ${idx === customerDropdownIndex ? 'bg-theme text-text-inverted' : 'text-text'} hover:bg-theme hover:text-text-inverted`}
                        onMouseDown={e => { e.preventDefault(); handleCustomerSelect(customer); }}
                        onMouseEnter={() => setCustomerDropdownIndex(idx)}
                        role="option"
                        aria-selected={idx === customerDropdownIndex}
                      >
                        {customer.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input
                type="date"
                name="startDate"
                placeholder="Desde"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="p-2 border border-default rounded w-1/4 bg-card text-text"
              />
              <input
                type="date"
                name="endDate"
                placeholder="Hasta"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="p-2 border border-default rounded w-1/4 bg-card text-text"
              />
              <input
                type="text"
                name="created_by"
                placeholder="Creado por"
                value={filters.created_by}
                onChange={handleFilterChange}
                className="p-2 border border-default rounded w-1/4 bg-card text-text"
              />
              <input
                type="text"
                name="approved_by"
                placeholder="Aprobado por"
                value={filters.approved_by}
                onChange={handleFilterChange}
                className="p-2 border border-default rounded w-1/4 bg-card text-text"
              />
            </div>
            <button
              onClick={generateExcelReport}
              className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover mt-2"
            >
              Generar Informe
            </button>
            <button
              onClick={handleClearFilters}
              className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover mt-2 ml-2 btn-no-shrink"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="rounded-lg shadow-default overflow-x-auto">
            <table className="w-full border-collapse bg-card table-fixed" style={{ minWidth: '1200px' }}>
              <thead className="bg-theme text-text-inverted z-20 sticky top-0">
                <tr>
                  <th className="border-default p-3 text-center w-28 min-w-28 font-semibold"># Venta</th>
                  <th className="border-default p-3 text-center w-24 min-w-24 font-semibold">Tipo</th>
                  <th className="border-default p-3 text-center w-48 min-w-48 font-semibold">Cliente</th>
                  <th className="border-default p-3 text-center w-24 min-w-24 font-semibold">Fecha</th>
                  <th className="border-default p-3 text-center w-36 min-w-36 font-semibold">Usuario</th>
                  <th className="border-default p-3 text-center w-36 min-w-36 font-semibold">Aprobado por</th>
                  <th className="border-default p-3 text-center w-32 min-w-32 font-semibold">Valor total</th>
                  <th className="border-default p-3 text-center w-20 min-w-20 font-semibold">Pares</th>
                  <th className="border-default p-3 text-center w-24 min-w-24 font-semibold">Estado</th>
                  <th className="border-default p-3 text-center w-40 min-w-40 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => {
                  let isOrderSale = !!sale.order_id;
                  let totalParesVendidos, valorTotal;
                  
                  // Determinar tipo de venta: prioritizar sale_type sobre order_id
                  let tipoVenta;
                  if (sale.sale_type === 'wholesale') {
                    tipoVenta = 'Mayorista';
                  } else if (sale.sale_type === 'retail') {
                    tipoVenta = 'Detal';
                  } else if (isOrderSale) {
                    tipoVenta = 'Orden';
                  } else {
                    tipoVenta = 'Desconocido';
                  }
                  
                  if (isOrderSale) {
                    totalParesVendidos = sale.total_pairs ?? (sale.items ? sale.items.reduce((sum, item) => sum + (Object.values(item.sizes || {}).reduce((a, b) => a + b, 0)), 0) : 0);
                    valorTotal = sale.total_value ?? 0;
                  } else {
                    totalParesVendidos = sale.paid_pairs ?? 0;
                    if (!totalParesVendidos) {
                      totalParesVendidos = sale.sale_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                    }
                    valorTotal = sale.total_value;
                    if (!valorTotal) {
                      valorTotal = sale.sale_items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
                    }
                  }
                  return (
                    <tr key={sale.id} className="border-t border-default hover-bg transition-colors duration-150">
                      <td className="border-default p-3 text-text text-center font-semibold w-28 min-w-28">
                        <div className="truncate" title={sale.consecutive_number || 'N/A'}>
                          {sale.consecutive_number || 'N/A'}
                        </div>
                      </td>
                      <td className="border-default p-3 text-text text-center w-24 min-w-24">
                        <div className="truncate" title={tipoVenta}>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tipoVenta === 'Mayorista' ? 'bg-blue-100 text-blue-800' :
                            tipoVenta === 'Detal' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {tipoVenta}
                          </span>
                        </div>
                      </td>
                      <td className="border-default p-3 text-text text-left w-48 min-w-48">
                        <div className="truncate font-medium" title={isOrderSale ? (sale.customers?.name || 'Cliente no encontrado') : (sale.customers?.name || 'Cliente no encontrado')}>
                          {isOrderSale ? (sale.customers?.name || 'Cliente no encontrado') : (sale.customers?.name || 'Cliente no encontrado')}
                        </div>
                      </td>
                      <td className="border-default p-3 text-text text-center w-24 min-w-24">
                        <div className="truncate text-sm" title={new Date(sale.created_at).toLocaleDateString()}>
                          {new Date(sale.created_at).toLocaleDateString('es-CO', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: '2-digit' 
                          })}
                        </div>
                      </td>
                      <td className="border-default p-3 text-text text-center w-36 min-w-36">
                        <div className="truncate text-sm" title={
                          (sale.sale_type === 'wholesale' || sale.sale_type === 'retail') ? 
                          (sale.created_by_user?.username || 'N/A') :
                          isOrderSale ? 'N/A' : (sale.created_by_user?.username || 'N/A')
                        }>
                          {(sale.sale_type === 'wholesale' || sale.sale_type === 'retail') ? 
                          (sale.created_by_user?.username || 'N/A') :
                          isOrderSale ? 'N/A' : (sale.created_by_user?.username || 'N/A')}
                        </div>
                      </td>
                      <td className="border-default p-3 text-text text-center w-36 min-w-36">
                        <div className="truncate text-sm" title={
                          (sale.sale_type === 'wholesale' || sale.sale_type === 'retail') ? 
                          (sale.approved_by_user?.username || 'N/A') :
                          isOrderSale ? 'N/A' : (sale.approved_by_user?.username || 'N/A')
                        }>
                          {(sale.sale_type === 'wholesale' || sale.sale_type === 'retail') ? 
                          (sale.approved_by_user?.username || 'N/A') :
                          isOrderSale ? 'N/A' : (sale.approved_by_user?.username || 'N/A')}
                        </div>
                      </td>
                      <td className="border-default p-3 text-text text-right w-32 min-w-32">
                        <div className="truncate font-bold text-theme" title={`$${valorTotal.toLocaleString('es-CO')}`}>
                          ${valorTotal.toLocaleString('es-CO')}
                        </div>
                      </td>
                      <td className="border-default p-3 text-text text-center w-20 min-w-20">
                        <div className="truncate font-medium" title={totalParesVendidos}>
                          {totalParesVendidos}
                        </div>
                      </td>
                      <td className="border-default p-3 text-text text-center w-24 min-w-24">
                        <div className="truncate" title={
                          (sale.sale_type === 'wholesale' || sale.sale_type === 'retail') ? 
                          sale.status : 
                          isOrderSale ? 'N/A' : sale.status
                        }>
                          {(sale.sale_type === 'wholesale' || sale.sale_type === 'retail') ? 
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sale.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              sale.status === 'approved' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {sale.status}
                            </span>
                            :
                            isOrderSale ? 'N/A' : 
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sale.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              sale.status === 'approved' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {sale.status}
                            </span>
                          }
                        </div>
                      </td>
                      <td className="border-default p-3 text-center w-40 min-w-40">
                        <div className="flex items-center justify-center gap-1">
                          {/* Verificar si hay alguna acción en progreso para esta venta */}
                          {(() => {
                            const isDeleting = loadingActions[`delete_${sale.id}`];
                            const isApproving = loadingActions[`approve_${sale.id}`];
                            const isRejecting = loadingActions[`reject_${sale.id}`];
                            const hasActiveAction = isDeleting || isApproving || isRejecting;
                            
                            return (
                              <>
                                <button
                                  onClick={() => setSelectedSale(sale)}
                                  disabled={hasActiveAction}
                                  className={`bg-theme text-text-inverted px-2 py-1 rounded-md flex items-center justify-center transition-colors duration-200 ${
                                    hasActiveAction ? 'opacity-50 cursor-not-allowed' : 'hover:bg-theme-hover'
                                  }`}
                                  title="Ver detalles"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                {user?.role === 'admin' && (
                                  <>
                                    <button
                                      onClick={() => handleDeleteSale(sale.id)}
                                      disabled={hasActiveAction}
                                      className={`bg-error text-text-inverted px-2 py-1 rounded-md flex items-center justify-center transition-colors ${
                                        hasActiveAction ? 'opacity-50 cursor-not-allowed' : 'hover:bg-error-hover'
                                      }`}
                                      title="Eliminar venta"
                                    >
                                      {isDeleting ? (
                                        <LoadingSpinner size="w-3 h-3" />
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      )}
                                    </button>
                                    {/* Mostrar aprobar/rechazar para ventas regulares (mayorista/detal) */}
                                    {(sale.sale_type === 'wholesale' || sale.sale_type === 'retail') && sale.status === 'pending' && (
                                      <>
                                        <button
                                          onClick={() => handleApproveSale(sale.id)}
                                          disabled={hasActiveAction}
                                          className={`bg-green-600 text-white px-2 py-1 rounded-md flex items-center justify-center transition-colors duration-200 ${
                                            hasActiveAction ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
                                          }`}
                                          title="Aprobar venta"
                                        >
                                          {isApproving ? (
                                            <LoadingSpinner size="w-3 h-3" />
                                          ) : (
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                          )}
                                        </button>
                                        <button
                                          onClick={() => handleRejectSale(sale.id)}
                                          disabled={hasActiveAction}
                                          className={`bg-red-600 text-white px-2 py-1 rounded-md flex items-center justify-center transition-colors duration-200 ${
                                            hasActiveAction ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
                                          }`}
                                          title="Rechazar venta"
                                        >
                                          {isRejecting ? (
                                            <LoadingSpinner size="w-3 h-3" />
                                          ) : (
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                          )}
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-card p-6 rounded-lg shadow-default" style={{background: 'var(--card)'}}>
          <h3 className="text-xl font-semibold text-theme mb-4">Detalles de Venta</h3>
          <div className="grid grid-cols-2 gap-4 bg-card p-4 rounded-lg border border-default" style={{background: 'var(--card)'}}>
            <p className="text-text"><strong># Venta:</strong> {selectedSale.consecutive_number || 'N/A'}</p>
            <p className="text-text"><strong>Tipo de venta:</strong> {
              selectedSale.sale_type === 'wholesale' ? 'Mayorista' :
              selectedSale.sale_type === 'retail' ? 'Detal' :
              selectedSale.order_id ? 'Orden' : 'Desconocido'
            }</p>
            <p className="text-text"><strong>Cliente:</strong> {selectedSale.customers?.name || 'Cliente no encontrado'}</p>
            <p className="text-text"><strong>Fecha:</strong> {new Date(selectedSale.created_at).toLocaleDateString()}</p>
            <p className="text-text"><strong>Usuario de ventas:</strong> {
              (selectedSale.sale_type === 'wholesale' || selectedSale.sale_type === 'retail') ? 
              (selectedSale.created_by_user?.username || 'N/A') : 
              selectedSale.order_id ? 'N/A' : (selectedSale.created_by_user?.username || 'N/A')
            }</p>
            <p className="text-text"><strong>Aprobado por:</strong> {
              (selectedSale.sale_type === 'wholesale' || selectedSale.sale_type === 'retail') ? 
              (selectedSale.approved_by_user?.username || 'N/A') : 
              selectedSale.order_id ? 'N/A' : (selectedSale.approved_by_user?.username || 'N/A')
            }</p>
            <p className="text-text"><strong>Valor total:</strong> ${selectedSale.total_value?.toLocaleString('es-CO')}</p>
            <p className="text-text"><strong>Pares totales:</strong> {selectedSale.total_pairs ?? (selectedSale.sale_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0)}</p>
            <p className="text-text"><strong>Forma de pago:</strong> {selectedSale.order_id ? '' : (selectedSale.payment_method || '')}</p>
            <p className="text-text"><strong>Estado:</strong> <span className={
              (selectedSale.sale_type === 'wholesale' || selectedSale.sale_type === 'retail') ? 
              (selectedSale.status === 'rejected' ? 'underline text-error-600' : '') :
              selectedSale.order_id ? '' : (selectedSale.status === 'rejected' ? 'underline text-error-600' : '')
            }>{
              (selectedSale.sale_type === 'wholesale' || selectedSale.sale_type === 'retail') ? 
              selectedSale.status :
              selectedSale.order_id ? 'N/A' : selectedSale.status
            }</span></p>
            <p className="text-text"><strong>Pares pagados:</strong> {selectedSale.paid_pairs ?? ''}</p>
            <p className="text-text"><strong>Pares solicitados:</strong> {selectedSale.requested_pairs ?? ''}</p>
            <p className="text-text"><strong>Saldo a favor (pares):</strong> {selectedSale.balance_pairs ?? ''}</p>
            <p className="text-text"><strong>Saldo a favor (dinero):</strong> {selectedSale.balance_money ? `$${selectedSale.balance_money.toLocaleString('es-CO')}` : ''}</p>
          </div>
          <h4 className="text-lg font-semibold text-theme mt-4">Items:</h4>
          <div className="rounded-lg shadow-default mt-2">
            <table className="w-full border-collapse bg-card" style={{background: 'var(--card)'}}>
              <thead className="bg-theme text-text-inverted z-20">
                <tr>
                  <th className="border-default p-2">Referencia</th>
                  <th className="border-default p-2">Color</th>
                  <th className="border-default p-2">Talla</th>
                  <th className="border-default p-2">Cantidad</th>
                  <th className="border-default p-2">Precio Unit.</th>
                  <th className="border-default p-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {/* Si la venta proviene de una orden, mostrar los items de la orden */}
                {selectedSale.order_id && selectedSale.items && selectedSale.items.length > 0 ? (
                  selectedSale.items.flatMap((item, idx) => (
                    Object.entries(item.sizes || {})
                      .filter(([size, qty]) => qty > 0)
                      .map(([size, qty]) => (
                        <tr key={idx + '-' + size} className="border-t border-default hover-bg">
                          <td className="border-default p-2 text-text text-center">{item.reference}</td>
                          <td className="border-default p-2 text-text text-center">{item.color}</td>
                          <td className="border-default p-2 text-text text-center">{size}</td>
                          <td className="border-default p-2 text-text text-center">{qty}</td>
                          <td className="border-default p-2 text-text text-center">N/A</td>
                          <td className="border-default p-2 text-text text-center">${selectedSale.paid_amount ? Number(selectedSale.paid_amount).toLocaleString('es-CO') : (selectedSale.total_value ? Number(selectedSale.total_value).toLocaleString('es-CO') : 'N/A')}</td>
                        </tr>
                      ))
                  ))
                ) : selectedSale.sale_items?.length > 0 ? (
                  selectedSale.sale_items.map(item => (
                    <tr key={item.id} className="border-t border-default hover-bg">
                      <td className="border-default p-2 text-text text-center">{item.reference}</td>
                      <td className="border-default p-2 text-text text-center">{item.color}</td>
                      <td className="border-default p-2 text-text text-center">{item.size}</td>
                      <td className="border-default p-2 text-text text-center">{item.quantity}</td>
                      <td className="border-default p-2 text-text text-center">${(item.unit_price || 0).toFixed(2)}</td>
                      <td className="border-default p-2 text-text text-center">${(item.subtotal || 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center p-4 text-text-muted">No hay items para esta venta.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setSelectedSale(null)}
            className="bg-theme text-text-inverted px-4 py-2 rounded mt-4 hover:bg-theme-hover"
          >
            Volver
          </button>
        </div>
      )}
    </div>
  );
}

export default Sales;