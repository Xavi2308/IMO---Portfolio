import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import supabase from '../supabaseClient';
import { getTextContrastClass } from '../utils/getContrastYIQ';
import VirtualizedStockTable from './VirtualizedStockTable';
import { useDebounce } from '../hooks/useOptimization';
import { ProductImage } from './LazyImage';
import OptimizedProductImage from './OptimizedProductImage';
// 🚀 OPTIMIZACIÓN: Usar consultas optimizadas
import { getStockViewData, getAvailableLines } from '../hooks/optimizedQueries';
import Pagination from './Pagination';
import { useAuth } from '../contexts/AuthContext';

function StockView({ setError, errorMessage, setActiveModule, user }) {
  const { company } = useAuth();
  
  // --- Estado para modal de confirmación de venta ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSale, setPendingSale] = useState(false);
  
  // --- OPTIMIZACIÓN: Filtros para paginación infinita ---
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('stockview_filters');
      return saved ? JSON.parse(saved) : { search: '', size: '', line: 'All' };
    } catch {
      return { search: '', size: '', line: 'All' };
    }
  });
  
  // --- OPTIMIZACIÓN: Sort Config debe declararse antes del hook ---
  const [sortConfig, setSortConfig] = useState(() => {
    const defaultConfig = {
      reference: { direction: 'asc', priority: 1 },
      color: { direction: 'asc', priority: 2 },
      size: { direction: 'asc', priority: 3 },
    };
    try {
      const local = user?.id && localStorage.getItem(`imo_stock_sort_${user.id}`);
      if (local) {
        const parsed = JSON.parse(local);
        return {
          reference: {
            direction: parsed.reference?.direction === 'desc' ? 'desc' : 'asc',
            priority: Number.isInteger(parsed.reference?.priority) ? parsed.reference.priority : 1,
          },
          color: {
            direction: parsed.color?.direction === 'desc' ? 'desc' : 'asc',
            priority: Number.isInteger(parsed.color?.priority) ? parsed.color.priority : 2,
          },
          size: {
            direction: parsed.size?.direction === 'desc' ? 'desc' : 'asc',
            priority: Number.isInteger(parsed.size?.priority) ? parsed.size.priority : 3,
          },
        };
      }
      return defaultConfig;
    } catch (err) {
      console.error('Error parsing sortConfig from localStorage:', err);
      return defaultConfig;
    }
  });
  
  // --- OPTIMIZACIÓN: Estado para paginación tradicional ---
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15); // Reducido de 25 a 15 para mínimo egress

  // Estado local para reemplazar React Query
  const [productsQueryData, setProductsQueryData] = useState({ data: [], totalCount: 0, totalPages: 0, hasMore: false });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState(null);
  
  const [productLines, setProductLines] = useState(['All']);
  const [loadingLines, setLoadingLines] = useState(false);

  // Función para recargar datos
  const refetchProducts = useCallback(async () => {
    if (!user?.id) return;
    
    console.log('🔄 refetchProducts called with:', { 
      page, 
      pageSize, 
      search: filters.search, 
      line: filters.line, 
      size: filters.size 
    });
    
    setLoadingProducts(true);
    setProductsError(null);
    
    try {
      if (!company?.id) {
        throw new Error('No hay empresa definida para cargar productos');
      }
      
      const result = await getStockViewData(user.id, company.id, {
        page,
        pageSize,
        filters,
        sortConfig
      });
      setProductsQueryData(result);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProductsError(error);
    } finally {
      setLoadingProducts(false);
    }
  }, [user?.id, company?.id, page, pageSize, filters.search, filters.size, filters.line, sortConfig.reference?.direction, sortConfig.color?.direction, sortConfig.size?.direction]);

  // Cargar datos cuando cambien las dependencias
  useEffect(() => {
    // Solo ejecutar si tenemos empresa disponible
    if (!company?.id) {
      console.log('⏳ Esperando empresa para cargar productos...');
      return;
    }
    
    console.log('🔄 useEffect refetchProducts triggered:', { page, filters: filters.search, sortConfig });
    refetchProducts();
  }, [refetchProducts, company?.id]);

  // Cargar líneas disponibles
  useEffect(() => {
    const loadLines = async () => {
      setLoadingLines(true);
      try {
        const availableLines = await getAvailableLines();
        setProductLines(['All', ...availableLines]);
      } catch (error) {
        console.error('Error cargando líneas:', error);
      } finally {
        setLoadingLines(false);
      }
    };
    
    loadLines();
  }, []);

  // 🚀 OPTIMIZACIÓN: Los datos ya vienen agrupados de la consulta optimizada
  const allProducts = useMemo(() => {
    const data = productsQueryData?.data || [];
    console.log('🔍 StockView - Datos recibidos:', {
      productsQueryData,
      dataLength: data.length,
      firstProduct: data[0],
      isLoading: loadingProducts,
      error: productsError
    });
    return data;
  }, [productsQueryData, loadingProducts, productsError]);

  // Ya no necesitamos agrupar, los datos ya vienen en la estructura correcta
  const groupedProducts = allProducts;

  // 🎯 NUEVA FUNCIONALIDAD: Estado para referencias completas del formulario de ventas
  const [salesFormReferences, setSalesFormReferences] = useState([]);
  const [loadingSalesReferences, setLoadingSalesReferences] = useState(false);
  // 🎯 NUEVO: Estado para todos los datos de stock independiente de filtros
  const [allStockData, setAllStockData] = useState([]);

  // 🚀 Función para obtener TODAS las referencias y colores para el formulario de ventas
  const fetchAllReferencesForSales = useCallback(async () => {
    if (loadingSalesReferences) return; // Evitar llamadas duplicadas
    
    setLoadingSalesReferences(true);
    try {
      console.log('🔍 Obteniendo todas las referencias para formulario de ventas...');
      
      // Query optimizada para obtener productos con sus variaciones Y precios
      const { data: productsWithVariations, error } = await supabase
        .from('products')
        .select(`
          id,
          reference,
          price_r,
          price_w,
          variations!inner (
            id,
            color,
            size,
            stock
          )
        `)
        .order('reference');

      if (error) {
        console.error('❌ Error obteniendo referencias:', error);
        return;
      }

      // Procesar datos para crear estructura optimizada para referencias
      const processedReferences = [];
      const referenceMap = new Map();
      
      // Procesar datos completos para stock (estructura similar a groupedProducts)
      const allStockInfo = [];
      const stockMap = new Map();

      productsWithVariations.forEach(product => {
        product.variations.forEach(variation => {
          // Para referencias (dropdown)
          if (!referenceMap.has(product.reference)) {
            referenceMap.set(product.reference, {
              reference: product.reference,
              product_id: product.id,
              colors: new Set()
            });
          }
          referenceMap.get(product.reference).colors.add(variation.color);

          // Para stock completo (validación independiente)
          const stockKey = `${product.reference}_${variation.color}`;
          if (!stockMap.has(stockKey)) {
            stockMap.set(stockKey, {
              reference: product.reference,
              color: variation.color,
              id: product.id, // product_id para usar en queries de variations
              price_r: product.price_r,
              price_w: product.price_w,
              sizes: {}
            });
          }
          stockMap.get(stockKey).sizes[variation.size] = variation.stock;
        });
      });

      // Convertir referencias a array con colores como array
      referenceMap.forEach((value, key) => {
        processedReferences.push({
          reference: key,
          product_id: value.product_id,
          colors: Array.from(value.colors).sort()
        });
      });

      // Convertir stock a array
      stockMap.forEach((value, key) => {
        allStockInfo.push(value);
      });

      setSalesFormReferences(processedReferences);
      setAllStockData(allStockInfo);
      console.log(`✅ Cargadas ${processedReferences.length} referencias y ${allStockInfo.length} combinaciones de stock para formulario de ventas`);
      
    } catch (err) {
      console.error('❌ Error cargando referencias para ventas:', err);
    } finally {
      setLoadingSalesReferences(false);
    }
  }, [loadingSalesReferences]);
  
  // Debe ir después de groupedProducts para que todos los hooks puedan usar newItem
  const [newItem, setNewItem] = useState({ reference: '', color: '', sizes: { '34': 0, '35': 0, '36': 0, '37': 0, '38': 0, '39': 0, '40': 0, '41': 0 } });

  // --- Utility: uniqueReferences y getColorsForReference optimizadas para formulario de ventas ---
  const uniqueReferences = React.useMemo(() => {
    // Para el formulario de ventas, usar datos completos
    if (salesFormReferences.length > 0) {
      return salesFormReferences.map(item => item.reference).sort();
    }
    // Fallback a datos paginados si no se han cargado los datos completos
    return Array.isArray(groupedProducts)
      ? [...new Set(groupedProducts.map(p => p.reference))].sort()
      : [];
  }, [salesFormReferences, groupedProducts]);

  const getColorsForReference = React.useCallback((reference) => {
    // Para el formulario de ventas, usar datos completos
    const salesReference = salesFormReferences.find(item => item.reference === reference);
    if (salesReference) {
      return salesReference.colors;
    }
    // Fallback a datos paginados
    return Array.isArray(groupedProducts)
      ? [...new Set(groupedProducts.filter(p => p.reference === reference).map(p => p.color))].sort()
      : [];
  }, [salesFormReferences, groupedProducts]);

  // --- State and logic for live-filtered reference and color dropdowns in Agregar Referencia modal ---
  const [referenceSearch, setReferenceSearch] = useState('');
  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false);
  const [referenceDropdownIndex, setReferenceDropdownIndex] = useState(0);
  const filteredReferences = React.useMemo(() =>
    uniqueReferences.filter(ref =>
      ref.toLowerCase().includes((referenceSearch || '').toLowerCase())
    ), [uniqueReferences, referenceSearch]
  );

  const [colorSearch, setColorSearch] = useState('');
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [colorDropdownIndex, setColorDropdownIndex] = useState(0);
  const filteredColors = React.useMemo(() =>
    newItem && newItem.reference
      ? getColorsForReference(newItem.reference).filter(color =>
          color.toLowerCase().includes((colorSearch || '').toLowerCase())
        )
      : []
  , [newItem, colorSearch, getColorsForReference]
  );

  // Keyboard navigation for reference dropdown
  useEffect(() => {
    if (!showReferenceDropdown) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        setReferenceDropdownIndex(idx => Math.min(idx + 1, filteredReferences.length - 1));
      } else if (e.key === 'ArrowUp') {
        setReferenceDropdownIndex(idx => Math.max(idx - 1, 0));
      } else if (e.key === 'Enter' && filteredReferences[referenceDropdownIndex]) {
        handleItemChange('reference', filteredReferences[referenceDropdownIndex]);
        setReferenceSearch(filteredReferences[referenceDropdownIndex]);
        setShowReferenceDropdown(false);
      } else if (e.key === 'Escape') {
        setShowReferenceDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReferenceDropdown, filteredReferences, referenceDropdownIndex]);

  // Keyboard navigation for color dropdown
  useEffect(() => {
    if (!showColorDropdown) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        setColorDropdownIndex(idx => Math.min(idx + 1, filteredColors.length - 1));
      } else if (e.key === 'ArrowUp') {
        setColorDropdownIndex(idx => Math.max(idx - 1, 0));
      } else if (e.key === 'Enter' && filteredColors[colorDropdownIndex]) {
        handleItemChange('color', filteredColors[colorDropdownIndex]);
        setColorSearch(filteredColors[colorDropdownIndex]);
        setShowColorDropdown(false);
      } else if (e.key === 'Escape') {
        setShowColorDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showColorDropdown, filteredColors, colorDropdownIndex]);
  // Ensure customers state is always defined
  const [customers, setCustomers] = useState([]);
  // ...existing code...
  // ...existing code...
  // ...otros estados...

  // --- Sticky header CSS (puedes mover esto a styles.css si prefieres global) ---
  const stickyHeaderClass = "sticky top-0 bg-white z-10";

  // --- Estado y lógica para búsqueda de clientes mejorada ---
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerDropdownIndex, setCustomerDropdownIndex] = useState(-1);

  // filteredCustomers solo se calcula si customers está definido
  const filteredCustomers = Array.isArray(customers)
    ? customers
        .filter(c => c['status-client'] !== false)
        .filter(c => {
          const q = (customerSearch || '').toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            (c.document && c.document.toLowerCase().includes(q)) ||
            (c.phone && c.phone.toLowerCase().includes(q))
          );
        })
    : [];

  // Navegación con teclado en el dropdown
  useEffect(() => {
    if (!showCustomerDropdown) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        setCustomerDropdownIndex(idx => Math.min(idx + 1, filteredCustomers.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setCustomerDropdownIndex(idx => Math.max(idx - 1, 0));
        e.preventDefault();
      } else if (e.key === 'Enter' && customerDropdownIndex >= 0 && filteredCustomers[customerDropdownIndex]) {
        setNewSale(prev => ({ ...prev, customerId: filteredCustomers[customerDropdownIndex].id }));
        setCustomerSearch(filteredCustomers[customerDropdownIndex].name);
        setShowCustomerDropdown(false);
        setCustomerDropdownIndex(-1);
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setShowCustomerDropdown(false);
        setCustomerDropdownIndex(-1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showCustomerDropdown, filteredCustomers, customerDropdownIndex]);

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    if (!showCustomerDropdown) return;
    const handleClick = (e) => {
      if (!e.target.closest('.relative')) {
        setShowCustomerDropdown(false);
        setCustomerDropdownIndex(-1);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [showCustomerDropdown]);
  
  // --- OPTIMIZACIÓN: Estado separado para búsqueda con debounce ---
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300); // 300ms delay
  
  // Actualizar filters.search cuando el debounce termine
  useEffect(() => {
    const prevSearch = filters.search;
    if (debouncedSearch !== prevSearch) {
      console.log('🔍 Search changed:', { from: prevSearch, to: debouncedSearch, currentPage: page });
      setFilters(prev => ({ ...prev, search: debouncedSearch }));
      // Solo resetear página si realmente hay un cambio de búsqueda
      if (debouncedSearch.trim() !== prevSearch.trim()) {
        setPage(1);
      }
    }
  }, [debouncedSearch, filters.search, page]);
  const sizes = ['34', '35', '36', '37', '38', '39', '40', '41'];
  const [lines, setLines] = useState(['All']);
  const [showSaleForm, setShowSaleForm] = useState(false);
  // ...existing code...
  const [newSale, setNewSale] = useState({
  customerId: '',
  sale_type: false,
  items: [],
  paidPairs: '',
  requestedPairs: '',
  amountPaid: '',
  paymentMethod: 'Efectivo',
  dispatchType: 'separate', // 'separate' o 'dispatch'
});
  const [saldoFavorPares, setSaldoFavorPares] = useState(0);
  const [saldoFavorDinero, setSaldoFavorDinero] = useState(0);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [formError, setFormError] = useState('');
  const tableRef = useRef(null);
  const [inProcessOrders, setInProcessOrders] = useState([]);
  const [expandedRowKey, setExpandedRowKey] = useState(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    document_type: 'Cédula',
    document: '',
    phone: '',
    city: '',
    address: '',
    notes: '',
  });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    name: '', document_type: 'Cédula', document: '', phone: '', city: '', address: '', notes: '', 'status-client': true
  });
  const [showCustomerSettings, setShowCustomerSettings] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSortOrder, setCustomerSortOrder] = useState('asc');
  const [zIndexCounter, setZIndexCounter] = useState(100);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedProductForUpload, setSelectedProductForUpload] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Solo ejecutar si tenemos empresa disponible
    if (!company?.id) {
      console.log('⏳ Esperando empresa para configurar StockView...');
      return;
    }
    
    refetchProducts();
    fetchCustomers();
    fetchLines();
    fetchInProcessOrders();

    const productsChannel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        refetchProducts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'variations' }, () => {
        refetchProducts();
      })
      .subscribe();

    const handleLogout = () => {
      if (user?.id) {
        localStorage.removeItem(`imo_stock_filters_${user.id}`);
        localStorage.removeItem(`imo_stock_sort_${user.id}`);
      }
    };
    window.addEventListener('imo_logout', handleLogout);

    return () => {
      supabase.removeChannel(productsChannel);
      window.removeEventListener('imo_logout', handleLogout);
    };
  }, [user?.id, company?.id]);

  // --- OPTIMIZACIÓN: useEffect redundante eliminado ---
  // El filtrado ahora se maneja automáticamente con useMemo

  const fetchInProcessOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('client_name, items, deadline')
        .eq('status', 'in_process');
      if (error) throw error;
      setInProcessOrders(data || []);
    } catch (err) {
      setError(`Error al obtener pedidos en proceso: ${err.message}`);
    }
  };

  const fetchLines = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('line')
        .order('line', { ascending: true, nullsFirst: true });
      if (error) throw error;
      const uniqueLines = ['All', ...new Set(data.map(item => item.line || 'Sin línea').filter(line => line))];
      setLines(uniqueLines);
    } catch (err) {
      setError(`Error al obtener líneas: ${err.message}`);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      
      // Fetch sales data to calculate customer balances
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('customer_id, balance_pairs, balance_money, created_at')
        .order('created_at', { ascending: true });
      
      if (salesError) {
        console.error('Error fetching sales for balance calculation:', salesError);
        setCustomers(data);
        return;
      }
      
      // Calculate customer balances from sales data
      // Sort sales by date to process them chronologically
      const sortedSales = salesData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      const customerBalances = {};
      sortedSales.forEach(sale => {
        if (sale.customer_id) {
          if (!customerBalances[sale.customer_id]) {
            customerBalances[sale.customer_id] = {
              saldo_pares: 0,
              saldo_dinero: 0
            };
          }
          // Add the balance from this sale (can be positive or negative)
          customerBalances[sale.customer_id].saldo_pares += sale.balance_pairs || 0;
          customerBalances[sale.customer_id].saldo_dinero += sale.balance_money || 0;
          
          // Ensure balances don't go below zero (no negative balances)
          customerBalances[sale.customer_id].saldo_pares = Math.max(0, customerBalances[sale.customer_id].saldo_pares);
          customerBalances[sale.customer_id].saldo_dinero = Math.max(0, customerBalances[sale.customer_id].saldo_dinero);
        }
      });
      
      // Merge balance data with customer data
      const customersWithBalance = data.map(customer => ({
        ...customer,
        saldo_pares: customerBalances[customer.id]?.saldo_pares || 0,
        saldo_dinero: customerBalances[customer.id]?.saldo_dinero || 0
      }));
      
      console.log('Customers fetched with balances:', customersWithBalance);
      console.log('Sample customer:', customersWithBalance[0]);
      setCustomers(customersWithBalance);
      
      if (editingCustomer) {
        const updated = customersWithBalance.find(c => c.id === editingCustomer.id);
        if (updated) setEditingCustomer(updated);
      }
    } catch (err) {
      setError(`Error al obtener clientes: ${err.message}`);
    }
  };

  // --- OPTIMIZACIÓN: Los datos ya vienen filtrados y ordenados del backend ---
  // Solo aplicamos filtros adicionales que no se pueden hacer en el backend
  const filteredGroupedProducts = useMemo(() => {
    let filtered = [...groupedProducts];
    
    // Filtro por tamaño específico (funcionalidad adicional del frontend)
    if (filters.size) {
      filtered = filtered.filter((group) =>
        Object.keys(group.sizes).some(size => size === filters.size && group.sizes[size] >= 1)
      );
    }

    return filtered;
  }, [groupedProducts, filters.size]);

  const applyFiltersAndSorting = useCallback(() => {
    // Esta función ahora es redundante ya que el useMemo maneja todo automáticamente
    // Se mantiene para compatibilidad pero el cálculo real está en el memo de arriba
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    console.log('🔄 Filter change:', { name, value, currentPage: page });
    
    if (name === 'search') {
      // Para búsqueda, usar el estado separado con debounce
      setSearchInput(value);
    } else {
      // Para otros filtros, aplicar inmediatamente
      const updated = { ...filters, [name]: value };
      setFilters(updated);
      setSelectedProducts([]);
      setPage(1); // Solo resetear página para cambios de filtro (no paginación)
      if (user?.id) localStorage.setItem(`imo_stock_filters_${user.id}`, JSON.stringify(updated));
      // No llamar refetchProducts aquí - el useEffect se encargará
    }
  };

  // --- OPTIMIZACIÓN: Función separada para manejar búsqueda ---
  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  const handleClearFilters = () => {
    const defFilters = { search: '', size: '', line: 'All' };
    const defSort = {
      reference: { direction: 'asc', priority: 1 },
      color: { direction: 'asc', priority: 2 },
      size: { direction: 'asc', priority: 3 },
    };
    setFilters(defFilters);
    setSearchInput(''); // También limpiar el input de búsqueda
    setSortConfig(defSort);
    setSelectedProducts([]);
    setPage(1); // Resetear a la primera página
    if (user?.id) {
      localStorage.setItem(`imo_stock_filters_${user.id}`, JSON.stringify(defFilters));
      localStorage.setItem(`imo_stock_sort_${user.id}`, JSON.stringify(defSort));
    }
    // No llamar refetchProducts aquí - el useEffect se encargará
  };

  const handleSort = (key) => {
    console.log('🔄 Sort triggered:', { key, currentPage: page });
    setSortConfig((prev) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          direction: prev[key].direction === 'asc' ? 'desc' : 'asc',
        },
      };
      if (user?.id) localStorage.setItem(`imo_stock_sort_${user.id}`, JSON.stringify(updated));
      return updated;
    });
    // Resetear a la primera página cuando se cambia el ordenamiento
    setPage(1);
    // No llamar refetchProducts aquí - el useEffect se encargará
  };

  const openPopup = (setPopupState) => {
    setZIndexCounter(prev => prev + 1);
    setPopupState(true);
    
    // 🚀 Si se está abriendo el formulario de agregar referencia, cargar todas las referencias
    if (setPopupState === setShowAddItemForm) {
      fetchAllReferencesForSales();
    }
  };

  const handleUpdateCustomer = async () => {
    if (!customerForm.name || !customerForm.document) {
      setFormError('El nombre y el documento son obligatorios.');
      return;
    }
    try {
      const { error } = await supabase.from('customers').update({
        name: customerForm.name,
        document_type: customerForm.document_type,
        document: customerForm.document,
        phone: customerForm.phone,
        city: customerForm.city,
        address: customerForm.address,
        notes: customerForm.notes,
      }).eq('id', customerForm.id);
      if (error) throw error;
      setEditingCustomer(null);
      setCustomerForm({ name: '', document_type: 'Cédula', document: '', phone: '', city: '', address: '', notes: '', 'status-client': true });
      fetchCustomers();
      setFormError('');
    } catch (err) {
      setFormError(`Error al actualizar cliente: ${err.message}`);
    }
  };

  // Funciones para el filtrado y búsqueda de clientes
  const filteredAndSortedCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    
    // Filtrar por término de búsqueda
    let filtered = customers.filter(customer => {
      const searchTerm = customerSearchTerm.toLowerCase();
      return (
        (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
        (customer.document && customer.document.toLowerCase().includes(searchTerm)) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm)) ||
        (customer.city && customer.city.toLowerCase().includes(searchTerm)) ||
        (customer.address && customer.address.toLowerCase().includes(searchTerm))
      );
    });

    // Ordenar A-Z o Z-A
    filtered.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      
      if (customerSortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });

    return filtered;
  }, [customers, customerSearchTerm, customerSortOrder]);

  const handleSelectCustomer = (customer) => {
    setNewSale(prev => ({
      ...prev,
      customerId: customer.id
    }));
    setShowCustomerSettings(false);
    setCustomerSearchTerm('');
    // Limpiar la búsqueda de cliente para mostrar el cliente seleccionado
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    // Asegurar que NO se abra el formulario de nuevo cliente
    setShowNewCustomerForm(false);
    // Activar el formulario de ventas
    setShowSaleForm(true);
  };

  const handleToggleCustomerStatus = async (customer) => {
    try {
      const { error } = await supabase.from('customers').update({ 'status-client': !customer['status-client'] }).eq('id', customer.id);
      if (error) throw error;
      fetchCustomers();
    } catch (err) {
      setFormError('Error al cambiar estado del cliente');
    }
  };

  const checkDocumentExists = async (document) => {
    if (!document) return null;
    const { data, error } = await supabase
      .from('customers')
      .select('name')
      .eq('document', document)
      .single();
    if (error && error.code !== 'PGRST116') return null;
    return data ? data.name : null;
  };

  const handleNewCustomerDocumentChange = async (e) => {
    const document = e.target.value;
    setNewCustomer({ ...newCustomer, document });
    const existingCustomerName = await checkDocumentExists(document);
    if (existingCustomerName) {
      setFormError(`El documento ya está asociado con el cliente: ${existingCustomerName}`);
    } else {
      setFormError('');
    }
  };

  const handleImageUpload = async (e, product) => {
    if (user?.role === 'lector') return;
    const file = e.target.files ? e.target.files[0] : e.dataTransfer.files[0];
    if (!file) return;

    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) throw new Error(`Error al verificar buckets: ${bucketError.message}`);
      const bucketExists = buckets.some(bucket => bucket.name === 'product-images');
      if (!bucketExists) {
        setFormError('El bucket "product-images" no existe. Contacte al administrador.');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${product.reference}-${product.color}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) throw new Error('No se pudo obtener la URL pública de la imagen.');

      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: urlData.publicUrl })
        .eq('id', product.product_id);
      if (updateError) throw new Error(`Error al actualizar imagen: ${updateError.message}`);

      refetchProducts();
      setShowImageUpload(false);
      setSelectedProductForUpload(null);
      setFormError('');
    } catch (err) {
      setFormError(`Error al procesar imagen: ${err.message}`);
      console.error('Image upload error:', err);
    }
  };

  const handleDrop = (e, product) => {
    e.preventDefault();
    handleImageUpload(e, product);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Solo permite seleccionar un producto a la vez
const handleProductSelect = (productKey) => {
  setSelectedProducts((prev) =>
    prev.includes(productKey)
      ? []
      : [productKey]
  );
};

  // Deshabilita seleccionar todos
const handleSelectAll = () => {
  setSelectedProducts([]);
};

  // Permite copiar cualquier cantidad de imágenes seleccionadas, manejando errores y tipos soportados
  const handleCopyToClipboard = async () => {
    try {
      const selectedData = filteredGroupedProducts
        .filter((group) => selectedProducts.includes(`${group.reference}-${group.color}`))
        .filter((group) => group.image_url);

      if (selectedData.length === 0) {
        setFormError('No se seleccionaron productos con imágenes.');
        return;
      }

      // ClipboardItem solo soporta un archivo a la vez en la mayoría de navegadores
      // Por lo tanto, si hay más de una imagen, se copian como archivos (FileList) si es posible, o se copia la primera imagen
      // Además, intentamos copiar como image/png si image/jpeg no es soportado
      let copied = false;
      let errors = [];
      for (let group of selectedData) {
        try {
          const response = await fetch(group.image_url);
          if (!response.ok) throw new Error(`Error al cargar imagen: ${group.image_url}`);
          let blob = await response.blob();
          // Intenta convertir a PNG si no es soportado
          let clipboardItem;
          if (window.ClipboardItem) {
            try {
              clipboardItem = new window.ClipboardItem({ [blob.type]: blob });
              await navigator.clipboard.write([clipboardItem]);
              copied = true;
            } catch (err) {
              // Si image/jpeg falla, intenta convertir a PNG
              if (blob.type !== 'image/png') {
                try {
                  const imgBitmap = await createImageBitmap(blob);
                  const canvas = document.createElement('canvas');
                  canvas.width = imgBitmap.width;
                  canvas.height = imgBitmap.height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(imgBitmap, 0, 0);
                  const pngBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
                  clipboardItem = new window.ClipboardItem({ 'image/png': pngBlob });
                  await navigator.clipboard.write([clipboardItem]);
                  copied = true;
                } catch (pngErr) {
                  errors.push(`No se pudo copiar imagen ${group.reference} - ${group.color}`);
                }
              } else {
                errors.push(`No se pudo copiar imagen ${group.reference} - ${group.color}`);
              }
            }
          } else {
            errors.push('ClipboardItem API no soportada en este navegador.');
            break;
          }
        } catch (err) {
          errors.push(`No se pudo copiar imagen ${group.reference} - ${group.color}`);
        }
      }
      if (copied) {
        alert('Imágenes copiadas al portapapeles. Usa Ctrl+V para pegar.');
        setFormError(errors.length > 0 ? errors.join('\n') : '');
      } else {
        setFormError('No se pudieron copiar las imágenes seleccionadas.\n' + errors.join('\n'));
      }
    } catch (err) {
      setFormError(`Error al copiar imágenes: ${err.message}`);
      console.error('Clipboard error:', err);
    }
  };

  const handleRowClick = (rowKey) => {
    setExpandedRowKey(expandedRowKey === rowKey ? null : rowKey);
  };


  const calculateTotal = () => {
    return newSale.items.reduce((total, item) => {
      // 🔧 FIX: Usar allStockData (independiente de filtros) en lugar de groupedProducts (filtrado)
      const product = allStockData.find(p => p.reference === item.reference && p.color === item.color) ||
                     groupedProducts.find(p => p.reference === item.reference && p.color === item.color);
      if (!product) return total;
      const price = newSale.sale_type ? product.price_w : product.price_r;
      const quantity = Object.values(item.sizes).reduce((sum, q) => sum + q, 0);
      return total + (quantity * price);
    }, 0);
  };

  const handleAddItem = () => {
    if (!newItem.reference || !newItem.color) {
      setFormError('Debe seleccionar una referencia y un color.');
      return;
    }
    const quantity = Object.values(newItem.sizes).reduce((sum, q) => sum + q, 0);
    if (quantity === 0) {
      setFormError('Debe seleccionar al menos una talla con cantidad mayor a 0.');
      return;
    }

    const futureStockIssues = [];
    
    // 🔧 FIX: Usar allStockData (independiente de filtros) en lugar de groupedProducts (filtrado)
    const product = allStockData.find(p => p.reference === newItem.reference && p.color === newItem.color) ||
                   groupedProducts.find(p => p.reference === newItem.reference && p.color === newItem.color);
    
    if (!product) {
      setFormError(`No se encontró información de stock para la referencia ${newItem.reference} - ${newItem.color}. Intenta refrescar los datos.`);
      return;
    }

    for (const size of sizes) {
      const stockActual = product?.sizes[size] || 0;
      const yaAgregado = newSale.items
        .filter(i => i.reference === newItem.reference && i.color === newItem.color)
        .reduce((acc, i) => acc + (i.sizes[size] || 0), 0);
      const aAgregar = newItem.sizes[size] || 0;
      if (stockActual - yaAgregado - aAgregar < 0) {
        futureStockIssues.push(size);
      }
    }
    if (futureStockIssues.length > 0) {
      setFormError(`No puedes agregar la referencia porque el stock de las tallas ${futureStockIssues.join(', ')} no son suficientes, por favor ajusta las cantidades.`);
      return;
    }

    setNewSale((prev) => ({
      ...prev,
      items: [...prev.items, { ...newItem }],
    }));
    setNewItem({ reference: '', color: '', sizes: { '34': 0, '35': 0, '36': 0, '37': 0, '38': 0, '39': 0, '40': 0, '41': 0 } });
    setShowAddItemForm(false);
    setFormError('');
  };

  const handleItemChange = (field, value) => {
    setNewItem((prev) => ({ ...prev, [field]: value }));
    if (field === 'reference') {
      setNewItem((prev) => ({ ...prev, color: '' }));
    }
  };

  const handleSizeChange = (size, value) => {
    setNewItem((prev) => ({
      ...prev,
      sizes: { ...prev.sizes, [size]: parseInt(value) || 0 },
    }));
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomer.name || !newCustomer.document || !newCustomer.email) {
      setFormError('El nombre, documento y email son obligatorios.');
      return;
    }
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCustomer.email)) {
      setFormError('Por favor ingresa un email válido.');
      return;
    }
    try {
      const { data, error } = await supabase.from('customers').insert({
        ...newCustomer,
        email: newCustomer.email,
        created_at: new Date().toISOString(),
      }).select('id').single();
      if (error) throw error;

      setCustomers(prev => [...prev, { id: data.id, ...newCustomer }]);
      setNewSale({ ...newSale, customerId: data.id });
      setNewCustomer({ name: '', email: '', document_type: 'Cédula', document: '', phone: '', city: '', address: '', notes: '' });
      setShowNewCustomerForm(false);
      setShowSaleForm(true);
      setFormError('');
      fetchCustomers();
    } catch (err) {
      setFormError(`Error al agregar cliente: ${err.message}`);
    }
  };

  // Calcula pares y saldos a favor en tiempo real
  // Calcular pares solicitados automáticamente según los artículos agregados
  useEffect(() => {
    const paresSolicitados = newSale.items.reduce((sum, item) => sum + Object.values(item.sizes).reduce((s, q) => s + q, 0), 0);
    setNewSale(prev => ({ ...prev, paresSolicitados: paresSolicitados }));
    // Si el usuario no ha tocado pares pagados, igualar a pares solicitados por defecto
    if (!newSale.paresPagados || newSale.paresPagados < paresSolicitados) {
      setNewSale(prev => ({ ...prev, paresPagados: paresSolicitados }));
    }
  }, [newSale.items]);

  // Calcular saldo a favor en tiempo real
  useEffect(() => {
    const pagados = parseInt(newSale.paresPagados) || 0;
    const solicitados = parseInt(newSale.paresSolicitados) || 0;
    setSaldoFavorPares(pagados > solicitados ? pagados - solicitados : 0);
    // Calcular saldo en dinero a favor
    const precioUnitario = newSale.sale_type ? getPrecioMayorista() : getPrecioDetal();
    const totalSolicitado = solicitados * precioUnitario;
    const pagado = parseInt(newSale.montoPagado) || 0;
    setSaldoFavorDinero(pagado > totalSolicitado ? pagado - totalSolicitado : 0);
  }, [newSale.paresPagados, newSale.paresSolicitados, newSale.montoPagado, newSale.sale_type]);

  // Funciones simples para obtener precio unitario (puedes mejorar esto si tienes precios variables por producto)
  function getPrecioDetal() {
    // Busca el primer producto, asume mismo precio para todos
    const prod = groupedProducts[0];
    return prod ? prod.price_r : 0;
  }
  function getPrecioMayorista() {
    const prod = groupedProducts[0];
    return prod ? prod.price_w : 0;
  }

  // Mostrar saldo a favor del cliente seleccionado (puedes mejorar esto para traerlo de la BD si lo tienes guardado)
  const clienteActual = Array.isArray(customers) ? customers.find(c => c.id === newSale.customerId) : null;
  
  // Debug: mostrar en consola los datos del cliente actual (solo en desarrollo)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && clienteActual) {
      console.log('Cliente actual seleccionado:', clienteActual);
      console.log('Saldo pares:', clienteActual.saldo_pares);
      console.log('Saldo dinero:', clienteActual.saldo_dinero);
    }
  }, [clienteActual?.id, clienteActual?.saldo_pares, clienteActual?.saldo_dinero]); // Dependencias optimizadas
  
  const saldoClientePares = clienteActual?.saldo_pares || 0;
  const saldoClienteDinero = clienteActual?.saldo_dinero || 0;
  
  // Determinar si hay saldos a favor o en contra
  const saldoClienteFavorPares = saldoClientePares > 0 ? saldoClientePares : 0;
  const saldoClienteFavorDinero = saldoClienteDinero > 0 ? saldoClienteDinero : 0;
  const saldoClienteContraPares = saldoClientePares < 0 ? Math.abs(saldoClientePares) : 0;
  const saldoClienteContraDinero = saldoClienteDinero < 0 ? Math.abs(saldoClienteDinero) : 0;

  const handleSubmitSale = async () => {
    if (!user?.id) {
      setFormError('Usuario no autenticado. Por favor, inicia sesión.');
      return;
    }
    if (!newSale.customerId) {
      setFormError('Debe seleccionar un cliente existente.');
      return;
    }
    if (newSale.items.length === 0) {
      setFormError('Debe agregar al menos un artículo a la venta.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      // Obtener company_id del usuario
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      const companyId = userData?.company_id;
      if (!companyId) throw new Error('No se pudo obtener la empresa del usuario');

      // Generar número consecutivo - alternativa sin RPC
      let consecutiveNumber;
      let consecutiveError;
      
      try {
        // Intentar usar RPC primero
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('get_next_consecutive', {
            p_company_id: companyId,
            p_type: 'sale'
          });
        
        if (rpcError) {
          console.warn('⚠️ RPC failed, trying manual generation:', rpcError);
          
          // Fallback: generar consecutivo manualmente
          const { data: lastSale, error: queryError } = await supabase
            .from('sales')
            .select('consecutive_number')
            .eq('company_id', companyId)
            .not('consecutive_number', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (queryError) {
            throw new Error(`Error obteniendo último consecutivo: ${queryError.message}`);
          }
          
          let nextNumber = 1;
          if (lastSale && lastSale.length > 0 && lastSale[0].consecutive_number) {
            // Extraer número del consecutivo (ej: VTA-000234 -> 234)
            const match = lastSale[0].consecutive_number.match(/(\d+)$/);
            if (match) {
              nextNumber = parseInt(match[1]) + 1;
            }
          }
          
          consecutiveNumber = `VTA-${nextNumber.toString().padStart(6, '0')}`;
          console.log('🔢 Generated manual consecutive:', consecutiveNumber);
        } else {
          consecutiveNumber = rpcResult;
        }
      } catch (error) {
        consecutiveError = error;
      }
      
      console.log('🔢 Consecutive generation result:', { 
        consecutiveNumber, 
        consecutiveError,
        companyId,
        type: 'sale'
      });
      
      if (consecutiveError) {
        console.error('❌ Error generating consecutive:', consecutiveError);
        throw new Error(`Error generando consecutivo: ${consecutiveError.message}`);
      }
      
      if (!consecutiveNumber) {
        console.warn('⚠️ No consecutive number returned');
        consecutiveNumber = `VTA-${Date.now()}`; // Fallback con timestamp
      }

      // Prepare sale data (normalized schema)
      const paidPairs = parseInt(newSale.paresPagados) || 0;
      const requestedPairs = parseInt(newSale.paresSolicitados) || 0;
      const amountPaid = parseInt(newSale.montoPagado) || 0;
      const customer = customers.find(c => c.id === newSale.customerId);
      const paymentMethod = newSale.paymentMethod;
      const balancePairs = Math.max(0, paidPairs - requestedPairs);
      const unitPrice = newSale.sale_type ? getPrecioMayorista() : getPrecioDetal();
      const totalRequested = requestedPairs * unitPrice;
      const balanceMoney = Math.max(0, amountPaid - totalRequested);
      // Calculate total pairs from all sale items
      const totalPairs = newSale.items.reduce((sum, item) => {
        return sum + Object.values(item.sizes).reduce((s, qty) => s + (parseInt(qty) || 0), 0);
      }, 0);

      // Insert sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: newSale.customerId,
          company_id: companyId,
          consecutive_number: consecutiveNumber,
          total_value: amountPaid,
          sale_type: newSale.sale_type ? 'wholesale' : 'retail',
          paid_pairs: paidPairs,
          requested_pairs: requestedPairs,
          payment_method: paymentMethod,
          balance_pairs: balancePairs,
          balance_money: balanceMoney,
          total_pairs: totalPairs,
          dispatch_type: newSale.dispatchType,
          created_at: new Date().toISOString(),
          created_by: user.id,
          status: 'pending',
        })
        .select('id')
        .single();
      if (saleError) throw new Error(`Error al insertar venta: ${saleError.message}`);
      const saleId = saleData.id;

      // Insert sale items
      const itemsToInsert = newSale.items.flatMap(item => {
        const product = groupedProducts.find(p => p.reference === item.reference && p.color === item.color);
        return Object.entries(item.sizes).filter(([_, qty]) => qty > 0).map(([size, quantity]) => ({
          sale_id: saleId,
          reference: item.reference,
          color: item.color,
          size,
          quantity,
          unit_price: product ? (newSale.sale_type ? product.price_w : product.price_r) : 0,
          subtotal: quantity * (product ? (newSale.sale_type ? product.price_w : product.price_r) : 0),
        }));
      });
      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
        if (itemsError) throw new Error(`Error al insertar ítems: ${itemsError.message}`);
      }

      // La venta ya se creó con dispatch_type, no necesitamos lógica adicional
      console.log(`✅ Venta creada: ${saleId} con dispatch_type: ${newSale.dispatchType}`);

      // Insert inventory movements and update stock
      const movementsToInsert = [];
      for (const item of newSale.items) {
        for (const [size, quantity] of Object.entries(item.sizes)) {
          if (quantity > 0) {
            // Use allStockData for complete product information
            const product = allStockData.find(p => p.reference === item.reference && p.color === item.color);
            if (!product) {
              throw new Error(`Producto no encontrado: ${item.reference} - ${item.color}`);
            }
            
            movementsToInsert.push({
              user_id: user.id,
              movement_type: 'salida',
              quantity,
              method: 'manual',
              details: JSON.stringify({
                reference: item.reference,
                color: item.color,
                size,
                sale_id: saleId,
              }),
              timestamp: new Date().toISOString(),
            });
            // Update stock
            const { data: variation, error: variationError } = await supabase
              .from('variations')
              .select('id, stock')
              .eq('product_id', product.id)
              .eq('color', item.color)
              .eq('size', size)
              .single();
            if (variationError) throw new Error(`Error al obtener variación: ${variationError.message}`);
            if (variation) {
              const { error: updateError } = await supabase
                .from('variations')
                .update({ stock: variation.stock - quantity })
                .eq('id', variation.id);
              if (updateError) throw new Error(`Error al actualizar stock: ${updateError.message}`);
            }
          }
        }
      }
      if (movementsToInsert.length > 0) {
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert(movementsToInsert);
        if (movementError) throw new Error(`Error al insertar movimientos: ${movementError.message}`);
      }

      setShowSaleForm(false);
      
      // Mostrar mensaje de éxito con número consecutivo
      alert(`¡Venta registrada exitosamente!\nNúmero de venta: ${consecutiveNumber}\nCliente: ${customer.name}\nPares vendidos: ${paidPairs}`);
      
      setNewSale({
        customerId: '',
        sale_type: false,
        items: [],
        paidPairs: '',
        requestedPairs: '',
        amountPaid: '',
        paymentMethod: 'Efectivo',
        dispatchType: 'separate',
      });
      setNewItem({ reference: '', color: '', sizes: { '34': 0, '35': 0, '36': 0, '37': 0, '38': 0, '39': 0, '40': 0, '41': 0 } });
      setReferenceSearch('');
      setShowReferenceDropdown(false);
      setReferenceDropdownIndex(0);
      setColorSearch && setColorSearch('');
      setShowColorDropdown && setShowColorDropdown(false);
      setColorDropdownIndex && setColorDropdownIndex(0);
      setCustomerSearch && setCustomerSearch('');
      setShowCustomerDropdown && setShowCustomerDropdown(false);
      setCustomerDropdownIndex && setCustomerDropdownIndex(0);
      refetchProducts();
      setFormError('');
    } catch (err) {
      setFormError(err.message || 'Error al guardar venta');
      console.error('Error submitting sale:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSale = () => {
    setNewSale({ 
      customerId: '', 
      sale_type: false, 
      items: [], 
      paidPairs: '',
      requestedPairs: '',
      amountPaid: '',
      paymentMethod: 'Efectivo',
      dispatchType: 'separate'
    });
    setFormError('');
  };

  const handleCancelSale = () => {
    setShowSaleForm(false);
    setFormError('');
  };

  return (
    <div className="bg-background p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold mb-3 flex flex-wrap items-center gap-2">
          <span className="w-8 h-8 text-theme inline-block align-middle flex-shrink-0">
            {/* Stock icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
              <path fillRule="evenodd" d="m3.087 9 .54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zM12 10.5a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0v-2.19l-.72.72a.75.75 0 01-1.06-1.06L12 10.19l1.53 1.53a.75.75 0 11-1.06 1.06l-.72-.72v2.19a.75.75 0 01-.75-.75v-3.75a.75.75 0 01.75-.75z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="flex-shrink-0">Inventario Actual</span>
        </h1>
      </div>
      <p className="text-text mb-4">Visualización clara y rápida para equipo de ventas</p>
      {errorMessage && <p className="text-theme font-semibold mb-4">{errorMessage}</p>}
      {formError && <p className="text-theme font-semibold mb-4">{formError}</p>}

      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2 flex-wrap gap-2">
          <input
            type="text"
            name="search"
            placeholder="Filtrar por Referencia o Color..."
            value={searchInput}
            onChange={handleSearchChange}
            className="p-2 border border-default rounded w-64 text-truncate"
            title="Filtrar por Referencia o Color..."
          />
          <input
            type="text"
            name="size"
            placeholder="Filtrar por Talla (solo con existencias)"
            value={filters.size}
            onChange={handleFilterChange}
            className="p-2 border border-default rounded text-truncate"
            title="Filtrar por Talla (solo con existencias)"
          />
          <button
            onClick={handleClearFilters}
            className="bg-background-secondary text-text px-4 py-2 rounded hover-bg flex items-center gap-1 btn-no-shrink"
          >
            Limpiar Filtros
          </button>
          {user?.role !== 'lector' && (
            <button
              onClick={() => openPopup(setShowSaleForm)}
              className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover flex items-center gap-1"
            >
              + Nueva Venta
            </button>
          )}
          {/* El botón de copiar imagen ahora está en la barra sticky inferior */}
      {/* Multi-select bar from Orders, adapted for StockView, now fixed at the bottom */}
      {selectedProducts.length === 1 && (
        (() => {
          // Utilidad para calcular contraste (blanco o negro) según el fondo
          function getContrastYIQ(hexcolor) {
            // Elimina el # si está presente
            hexcolor = hexcolor.replace('#', '');
            // Si es formato corto (#abc), expande a #aabbcc
            if (hexcolor.length === 3) {
              hexcolor = hexcolor.split('').map(x => x + x).join('');
            }
            const r = parseInt(hexcolor.substr(0,2),16);
            const g = parseInt(hexcolor.substr(2,2),16);
            const b = parseInt(hexcolor.substr(4,2),16);
            // YIQ formula
            const yiq = ((r*299)+(g*587)+(b*114))/1000;
            return yiq >= 128 ? '#111' : '#fff';
          }

          // Color de fondo de la barra (debe coincidir con el inline style)
          const barBg = '#1e293bcc';
          // Extrae el color base (sin transparencia)
          const barBgHex = barBg.length === 9 ? barBg.slice(0,7) : barBg;
          const contrastColor = getContrastYIQ(barBgHex);

          return (
            <div className="fixed bottom-0 left-0 w-full z-50 flex justify-center items-center" style={{ pointerEvents: 'none' }}>
              <div
                className="flex items-center mb-4 px-4 py-2 rounded-lg shadow-lg"
                style={{ background: barBg, maxWidth: 480, minWidth: 320, pointerEvents: 'auto' }}
              >
                <span className="font-semibold flex items-center gap-2" style={{ color: contrastColor }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: contrastColor }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  1 producto seleccionado
                </span>
                <div className="flex gap-2 ml-4">
                  <button
                    className="bg-theme px-3 py-1 rounded hover:bg-theme-hover"
                    style={{ color: 'var(--text-inverted)' }}
                    onClick={handleCopyToClipboard}
                    disabled={selectedProducts.length !== 1}
                    title={selectedProducts.length !== 1 ? 'Selecciona un solo producto para copiar la imagen' : ''}
                  >
                    Copiar Imagen
                  </button>
                  <button
                    className="bg-background-secondary text-text px-3 py-1 rounded hover:bg-theme-hover"
                    onClick={() => setSelectedProducts([])}
                  >Cancelar</button>
                </div>
              </div>
            </div>
          );
        })()
      )}
        </div>
        <div className="flex items-center space-x-2 flex-wrap gap-1">
          {lines.map((line, index) => (
            <button
              key={index}
              onClick={() => handleFilterChange({ target: { name: 'line', value: line } })}
              className={`px-2 py-1 rounded ${filters.line === line ? 'bg-theme text-text-inverted' : 'bg-background-secondary text-text hover-bg'} transition-all duration-200`}
            >
              {line}
            </button>
          ))}
        </div>
        {filters.size && (
          <div className="flex items-center space-x-2 mt-2">
            <input
              type="checkbox"
              checked={selectedProducts.length > 0 && selectedProducts.length === filteredGroupedProducts.length}
              onChange={handleSelectAll}
              className="mr-2 h-4 w-4 accent-theme"
              id="select-all-checkbox"
            />
            <label htmlFor="select-all-checkbox" className="text-text">Seleccionar Todos</label>
          </div>
        )}
      </div>

      {filters.size ? (
        <div className="pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredGroupedProducts.map((group) => {
              const rowKey = `${group.reference}-${group.color}`;
              return (
                <div
                  key={rowKey}
                  className="bg-card p-4 rounded-lg shadow-default border-2 border-transparent hover:border-theme dark:hover:border-text-muted transition-all flex flex-col items-center relative"
                  onDragOver={user?.role !== 'lector' ? handleDragOver : undefined}
                  onDrop={user?.role !== 'lector' ? (e) => handleDrop(e, group) : undefined}
                  style={{ minHeight: 370, justifyContent: 'flex-start' }}
                >
                  <div className="flex w-full justify-between items-start mb-2">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(rowKey)}
                      onChange={() => handleProductSelect(rowKey)}
                      className="h-5 w-5 accent-theme"
                    />
                    {user?.role !== 'lector' && (
                      <button
                        onClick={() => {
                          setSelectedProductForUpload(group);
                          openPopup(setShowImageUpload);
                        }}
                        className="bg-theme text-text-inverted px-2 py-1 text-xs rounded shadow-default hover:bg-theme-hover transition-all flex items-center gap-1"
                        style={{ marginLeft: 'auto' }}
                        title="Subir imagen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="w-full flex flex-col items-center mb-2">
                    <OptimizedProductImage
                      imageUrl={group.image_url}
                      reference={group.reference}
                      color={group.color}
                      className="w-full h-48 object-cover rounded mb-2"
                    />
                  </div>
                  <div className="w-full flex flex-col items-center">
                    <p className="font-bold text-text text-center text-base whitespace-nowrap overflow-hidden text-ellipsis w-full">{group.reference}</p>
                    <p className="text-text-muted text-center text-sm whitespace-nowrap overflow-hidden text-ellipsis w-full">{group.color}</p>
                    <p className="text-lg font-semibold text-theme mt-1 text-center">Talla {filters.size}: {group.sizes[filters.size] || 0}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table ref={tableRef} className="w-full border-collapse bg-card rounded-lg shadow-default overflow-x-auto">
            <thead className="sticky top-0 bg-theme text-text-inverted z-20">
            <tr>
              <th className="border-default p-1 text-center w-16">Imagen</th>
              <th className="border-default p-1 text-center">
                <div className="flex items-center justify-center w-full">
                  <span>Referencia</span>
                  <button onClick={() => handleSort('reference')} className="focus:outline-none p-1 ml-1">
                    {sortConfig.reference.direction === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </th>
              <th className="border-default p-1 text-center">
                <div className="flex items-center justify-center w-full">
                  <span>Color</span>
                  <button onClick={() => handleSort('color')} className="focus:outline-none p-1 ml-1">
                    {sortConfig.color.direction === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </th>
              <th className="border-default p-1 text-center w-24">Precio Detal</th>
              <th className="border-default p-1 text-center w-24">Precio Mayorista</th>
              {sizes.map((size) => (
                <th key={size} className="border-default p-1 min-w-[35px] text-center z-20">
                  {size}
                </th>
              ))}
              <th className="border-default p-1 text-center w-20">En Proceso</th>
              {user?.role !== 'lector' && <th className="border-default p-1 text-center w-16">Subir</th>}
            </tr>
          </thead>
          <tbody>
            {loadingProducts ? (
              <tr>
                <td colSpan="15" className="border-default p-8 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
                    <span className="ml-3 text-theme">Cargando productos...</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredGroupedProducts.map((group) => {
                const rowKey = `${group.reference}-${group.color}`;
                const isExpanded = expandedRowKey === rowKey;
                const relevantOrders = inProcessOrders.filter(order =>
                  order.items.some(item => item.reference === group.reference && item.color === group.color)
                );
                const totalInProcess = relevantOrders.flatMap(order => order.items)
                  .filter(item => item.reference === group.reference && item.color === group.color)
                  .reduce((sum, item) => sum + Object.values(item.sizes).reduce((s, q) => s + q, 0), 0);
                return (
                  <React.Fragment key={rowKey}>
                    <tr className="border-t border-default hover-bg" onClick={() => handleRowClick(rowKey)}>
                      <td className="border-default p-1 text-center cursor-pointer" onClick={user?.role !== 'lector' ? (e) => {
                        e.stopPropagation();
                        setSelectedProductForUpload(group);
                        openPopup(setShowImageUpload);
                      } : undefined}>
                      <OptimizedProductImage
                        imageUrl={group.image_url}
                        reference={group.reference}
                        color={group.color}
                        className="w-10 h-10 object-cover rounded mx-auto"
                      />
                    </td>
                    <td className="border-default p-1 text-center cursor-pointer table-cell-truncate">{group.reference}</td>
                    <td className="border-default p-1 text-center cursor-pointer table-cell-truncate">{group.color}</td>
                    <td className="border-default p-1 text-center">
                      <span className="text-green-600 font-medium text-sm">
                        ${(group.price_r || 0).toLocaleString('es-CO')}
                      </span>
                    </td>
                    <td className="border-default p-1 text-center">
                      <span className="text-blue-600 font-medium text-sm">
                        ${(group.price_w || 0).toLocaleString('es-CO')}
                      </span>
                    </td>
                    {sizes.map((size) => (
                      <td
                        key={size}
                        className="border-default p-1 text-center cursor-pointer select-none relative"
                      >
                        <span className="highlight absolute inset-0 hidden z-5"></span>
                        <span className="relative z-15">{group.sizes[size] || 0}</span>
                      </td>
                    ))}
                    <td className={`border-default p-1 text-center cursor-pointer ${totalInProcess > 0 ? 'text-theme font-bold' : 'text-text-muted'}`}>
                      {totalInProcess}
                    </td>
                    {user?.role !== 'lector' && (
                      <td className="border-default p-1 text-center">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedProductForUpload(group);
                            openPopup(setShowImageUpload);
                          }}
                          className="bg-theme text-text-inverted px-1 py-1 rounded hover:bg-theme-hover transition-colors"
                          title="Subir imagen"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5 + sizes.length} className="p-0">
                        <div className="p-4 bg-background-secondary">
                          <h4 className="font-bold text-md mb-2 text-text">Pedidos en Proceso: {group.reference} - {group.color}</h4>
                          {relevantOrders.length > 0 ? (
                            <div>
                              <table className="w-full bg-card rounded-md shadow-inner text-sm">
                                <thead className="sticky top-0 bg-theme text-text-inverted z-20">
                                  <tr>
                                    <th className="p-1 text-center border-r border-default">Cliente</th>
                                    <th className="p-1 text-center border-r border-default">Fecha Límite</th>
                                    {sizes.map(size => <th key={size} className="p-1 text-center border-r border-default">{size}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  {relevantOrders.map((order, orderIndex) => {
                                    const item = order.items.find(i => i.reference === group.reference && i.color === group.color);
                                    if (!item) return null;
                                    return (
                                      <tr key={orderIndex} className="border-t border-default">
                                        <td className="p-1 text-center border-r border-default table-cell-truncate">{order.client_name}</td>
                                        <td className="p-1 text-center border-r border-default table-cell-truncate">{new Date(order.deadline).toLocaleDateString()}</td>
                                        {sizes.map(size => (
                                          <td key={size} className="p-1 text-center border-r border-default">{item.sizes[size] || 0}</td>
                                        ))}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-center text-text-muted py-4">No hay procesos activos para esta referencia.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
            )}
          </tbody>
          </table>
        </div>
      )}
      
      {/* --- OPTIMIZACIÓN: Paginación tradicional --- */}
      {productsQueryData && (
        <div className="mt-6">
          <Pagination
            currentPage={productsQueryData.currentPage}
            totalPages={productsQueryData.totalPages}
            totalItems={productsQueryData.totalCount}
            showInfo={false}
            onPageChange={(newPage) => {
              console.log('📄 Page change:', { from: page, to: newPage });
              setPage(newPage);
            }}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1); // Resetear a la primera página
            }}
          />
          
          {/* Selector de tamaño de página mejorado */}
          <div className="flex justify-center mt-6">
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Elementos por página:
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value);
                  setPageSize(newSize);
                  setPage(1); // Resetear a la primera página
                }}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-theme focus:border-theme transition-all duration-200 min-w-[70px]"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* Mensaje de error */}
      {productsError && (
        <div className="text-center py-4 text-red-600 dark:text-red-400">
          <p>Error al cargar productos: {productsError.message}</p>
        </div>
      )}



      <p className="text-text mt-4 text-sm">Diseñado para Demo Company - Visual Simple & Potente</p>

      {showSaleForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm" style={{ zIndex: zIndexCounter, background: 'rgba(34, 34, 34, 0.18)' }}>
          <div className="bg-card rounded-xl shadow-default w-full max-w-2xl mx-2 p-4 sm:p-8 flex flex-col gap-6 border border-default max-h-[95vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-theme mb-2 text-center">Nueva Venta</h3>
            {formError && <p className="text-theme font-semibold mb-2 text-center">{formError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sección Cliente */}
              <div className="bg-background-secondary rounded-lg p-4 shadow-sm flex flex-col gap-2 border border-default">
                <h4 className="text-lg font-semibold text-theme mb-2">Cliente</h4>
                <div className="relative">
                  <input
                    type="text"
                    className="p-2 border border-default rounded w-full bg-background text-text text-truncate"
                    placeholder="Buscar cliente por nombre, documento o teléfono..."
                    value={customerSearch || (Array.isArray(customers) ? (customers.find(c => c.id === newSale.customerId)?.name || '') : '')}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    autoComplete="off"
                    required
                    title="Buscar cliente por nombre, documento o teléfono..."
                  />
                  {showCustomerDropdown && (
                    <ul className="absolute z-30 left-0 right-0 bg-card border border-default rounded mt-1 max-h-56 overflow-y-auto shadow-lg">
                      {Array.isArray(filteredCustomers) && filteredCustomers.length === 0 && (
                        <li className="px-4 py-2 text-text-muted">No hay coincidencias</li>
                      )}
                      {Array.isArray(filteredCustomers) && filteredCustomers.map((customer, idx) => (
                        <li
                          key={customer.id}
                          className={`px-4 py-2 cursor-pointer hover:bg-theme hover:text-text-inverted ${idx === customerDropdownIndex ? 'bg-theme text-text-inverted' : ''}`}
                          onClick={() => {
                            setNewSale({ ...newSale, customerId: customer.id });
                            setCustomerSearch(customer.name);
                            setShowCustomerDropdown(false);
                          }}
                          onMouseEnter={() => setCustomerDropdownIndex(idx)}
                        >
                          <span className="font-semibold">{customer.name}</span>
                          <span className="ml-2 text-xs text-text-muted">{customer.document} {customer.phone && `| ${customer.phone}`}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  onClick={() => { setShowSaleForm(false); openPopup(setShowNewCustomerForm); }}
                  className="mt-2 text-sm text-theme font-semibold underline bg-background-secondary hover:text-text-inverted hover:bg-theme transition-colors px-2 py-1 rounded"
                >
                  Crear cliente
                </button>
              </div>
              {/* Sección Modo de venta y saldo */}
              <div className="bg-background-secondary rounded-lg p-4 shadow-sm flex flex-col gap-2 border border-default">
                <h4 className="text-lg font-semibold text-theme mb-2">Modo de venta</h4>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-1">
                    <input type="radio" name="saleType" value={false} checked={!newSale.sale_type} onChange={() => setNewSale({ ...newSale, sale_type: false })} className="accent-theme" />
                    <span>Detal</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="saleType" value={true} checked={!!newSale.sale_type} onChange={() => setNewSale({ ...newSale, sale_type: true })} className="accent-theme" />
                    <span>Mayor</span>
                  </label>
                </div>
                {/* Mostrar saldo a favor del cliente */}
                {(saldoClienteFavorPares > 0 || saldoClienteFavorDinero > 0) && (
                  <div className="mb-2 p-2 rounded bg-green-100 text-green-800 text-sm font-semibold flex items-center gap-2">
                    <span>Saldo a favor del cliente:</span>
                    {saldoClienteFavorPares > 0 && (<span>{saldoClienteFavorPares} pares</span>)}
                    {saldoClienteFavorPares > 0 && saldoClienteFavorDinero > 0 && <span>|</span>}
                    {saldoClienteFavorDinero > 0 && (<span>${saldoClienteFavorDinero.toLocaleString('es-CO')}</span>)}
                  </div>
                )}
                {/* Mostrar saldo en contra del cliente */}
                {(saldoClienteContraPares > 0 || saldoClienteContraDinero > 0) && (
                  <div className="mb-2 p-2 rounded bg-red-100 text-red-800 text-sm font-semibold flex items-center gap-2">
                    <span>Saldo en contra del cliente:</span>
                    {saldoClienteContraPares > 0 && (<span>{saldoClienteContraPares} pares</span>)}
                    {saldoClienteContraPares > 0 && saldoClienteContraDinero > 0 && <span>|</span>}
                    {saldoClienteContraDinero > 0 && (<span>${saldoClienteContraDinero.toLocaleString('es-CO')}</span>)}
                  </div>
                )}
                {(saldoFavorPares > 0 || saldoFavorDinero > 0) && (
                  <div className="mb-2 p-2 rounded bg-background-secondary text-theme text-sm font-medium flex items-center gap-2">
                    <span>Saldo generado en esta venta:</span>
                    {saldoFavorPares > 0 && (<span>{saldoFavorPares} pares</span>)}
                    {saldoFavorPares > 0 && saldoFavorDinero > 0 && <span>|</span>}
                    {saldoFavorDinero > 0 && (<span>${saldoFavorDinero.toLocaleString('es-CO')}</span>)}
                  </div>
                )}
              </div>

              {/* Sección Tipo de despacho */}
              <div className="bg-background-secondary rounded-lg p-4 shadow-sm flex flex-col gap-2 border border-default">
                <h4 className="text-lg font-semibold text-theme mb-2">Tipo de pedido</h4>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-1">
                    <input 
                      type="radio" 
                      name="dispatchType" 
                      value="separate" 
                      checked={newSale.dispatchType === 'separate'} 
                      onChange={() => setNewSale({ ...newSale, dispatchType: 'separate' })} 
                      className="accent-theme" 
                    />
                    <span>Apartar</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input 
                      type="radio" 
                      name="dispatchType" 
                      value="dispatch" 
                      checked={newSale.dispatchType === 'dispatch'} 
                      onChange={() => setNewSale({ ...newSale, dispatchType: 'dispatch' })} 
                      className="accent-theme" 
                    />
                    <span>Despachar</span>
                  </label>
                </div>
                <div className="text-sm text-text-muted">
                  <p><strong>Apartar:</strong> Se genera una referencia para gestionar el despacho posterior</p>
                  <p><strong>Despachar:</strong> Se procesa como venta directa sin referencia</p>
                </div>
              </div>
            </div>
            {/* Sección Detalles de pago */}
            <div className="bg-background-secondary rounded-lg p-4 shadow-sm flex flex-col gap-4 border border-default">
              <h4 className="text-lg font-semibold text-theme mb-2">Detalles de Pago</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium text-theme">Pares pagados</label>
                  <input type="number" min="0" value={newSale.paresPagados} onChange={e => setNewSale({ ...newSale, paresPagados: e.target.value })} className="p-2 border border-default rounded w-full bg-card text-text" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-theme">Forma de pago</label>
                  <select value={newSale.paymentMethod} onChange={e => setNewSale({ ...newSale, paymentMethod: e.target.value })} className="p-2 border border-default rounded w-full bg-background text-text">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Pago en Casa">Pago en Casa</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block mb-1 font-medium text-theme">Monto pagado</label>
                  <input type="number" min="0" value={newSale.montoPagado} onChange={e => setNewSale({ ...newSale, montoPagado: e.target.value })} className="p-2 border border-default rounded w-full bg-card text-text" required onWheel={e => e.target.blur()} />
                </div>
              </div>
              {parseInt(newSale.paresPagados || 0) < parseInt(newSale.paresSolicitados || 0) && (
                <div className="mt-2 p-2 rounded bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 text-sm font-semibold flex items-center gap-2">
                  <span className="text-yellow-900 dark:text-yellow-100">Saldo pendiente:</span>
                  <span className="font-bold text-yellow-900 dark:text-yellow-100">{parseInt(newSale.paresSolicitados || 0) - parseInt(newSale.paresPagados || 0)} pares</span>
                  <span className="text-yellow-900 dark:text-yellow-100">|</span>
                  <span className="font-bold text-yellow-900 dark:text-yellow-100">${((parseInt(newSale.paresSolicitados || 0) - parseInt(newSale.paresPagados || 0)) * (newSale.sale_type ? getPrecioMayorista() : getPrecioDetal())).toLocaleString('es-CO')}</span>
                </div>
              )}
            </div>
            {/* Sección Artículos */}
            <div className="bg-background-secondary rounded-lg p-4 shadow-sm flex flex-col gap-4 border border-default">
              <h4 className="text-lg font-semibold text-theme mb-2">Artículos</h4>
              {user?.role !== 'vendedor' && (
                <button onClick={() => openPopup(setShowAddItemForm)} className="bg-theme text-inverted px-4 py-2 rounded font-semibold hover:bg-theme-hover transition-colors w-full mb-2">+ Agregar Referencia</button>
              )}
              {newSale.items.length > 0 && (
                <div className="max-h-40 overflow-y-auto pr-2">
                  {newSale.items.map((item, index) => (
                    <div key={index} className="border border-default p-2 rounded mb-2 bg-background">
                      <p><strong>Ref:</strong> {item.reference} - <strong>Color:</strong> {item.color}</p>
                      <p className="text-xs"><strong>Tallas:</strong> {Object.entries(item.sizes).filter(([_, qty]) => qty > 0).map(([size, qty]) => `${size}: ${qty}`).join(', ')}</p>
                    </div>
                  ))}
                  <p className="mt-2 font-bold text-lg text-theme">Total: ${calculateTotal().toLocaleString('es-CO')} <span className="ml-4 text-base font-semibold text-theme">({newSale.paresSolicitados} pares solicitados)</span></p>
                </div>
              )}
            </div>
            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
              <button onClick={handleClearSale} className="bg-theme-secondary-2 text-inverted px-4 py-2 rounded hover:bg-theme hover:text-inverted transition-colors">Limpiar</button>
              <button onClick={handleCancelSale} className="bg-background-secondary text-theme px-4 py-2 rounded hover:bg-background transition-colors">Cancelar</button>
              <button
                onClick={() => setShowConfirmModal(true)}
                className={`px-4 py-2 rounded font-bold ${isSubmitting ? 'bg-text-muted cursor-not-allowed' : 'bg-theme text-inverted hover:bg-theme-hover'}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Guardar Venta'}
              </button>
      {/* Modal de confirmación de modo de venta */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-theme">Confirmar venta</h2>
            <p className="mb-4 text-text">La venta que vas a realizar es <span className="font-bold">{newSale.sale_type ? 'Mayorista' : 'Detal'}</span>. ¿Es correcto?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => { setShowConfirmModal(false); handleSubmitSale(); }}
                className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover"
              >
                Aceptar
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-error-600 text-text-inverted px-4 py-2 rounded hover:bg-error-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
      )}

      {showNewCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8 z-50 p-4" style={{ zIndex: zIndexCounter }}>
          <div className="bg-card p-4 sm:p-6 rounded-lg shadow-default w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-theme">Nuevo Cliente</h3>
            {formError && <p className="text-theme font-semibold mb-4">{formError}</p>}
            <div className="space-y-4 pr-2">
              <div>
                <label className="block mb-1 font-medium text-text">Nombre *</label>
                <input 
                  type="text" 
                  value={newCustomer.name} 
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} 
                  className="p-2 border border-default rounded w-full" 
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-text">Email *</label>
                <input 
                  type="email" 
                  value={newCustomer.email} 
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} 
                  className="p-2 border border-default rounded w-full" 
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium text-text">Tipo de Documento *</label>
                  <select 
                    value={newCustomer.document_type} 
                    onChange={(e) => setNewCustomer({ ...newCustomer, document_type: e.target.value })} 
                    className="p-2 border border-default rounded w-full"
                  >
                    <option value="Cédula">Cédula</option>
                    <option value="NIT">NIT</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium text-text">Documento *</label>
                  <input 
                    type="text" 
                    value={newCustomer.document} 
                    onChange={handleNewCustomerDocumentChange} 
                    className="p-2 border border-default rounded w-full" 
                    placeholder="12345678"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium text-text">Teléfono</label>
                  <input 
                    type="text" 
                    value={newCustomer.phone} 
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} 
                    className="p-2 border border-default rounded w-full" 
                    placeholder="3001234567"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-text">Ciudad</label>
                  <input 
                    type="text" 
                    value={newCustomer.city} 
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} 
                    className="p-2 border border-default rounded w-full" 
                    placeholder="Bogotá"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium text-text">Dirección</label>
                <input 
                  type="text" 
                  value={newCustomer.address} 
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} 
                  className="p-2 border border-default rounded w-full" 
                  placeholder="Calle 123 #45-67"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-text">Notas</label>
                <textarea 
                  value={newCustomer.notes} 
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })} 
                  className="p-2 border border-default rounded w-full resize-none" 
                  rows="3" 
                  placeholder="Información adicional del cliente..."
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-6">
              {user?.role !== 'vendedor' && (
                <button
                  onClick={() => { openPopup(setShowCustomerSettings); }}
                  className="mt-2 text-sm text-theme font-semibold underline bg-background-secondary hover:text-text-inverted hover:bg-theme transition-colors px-2 py-1 rounded"
                >
                  Ajustar Clientes
                </button>
              )}
              <button 
                onClick={() => { setShowNewCustomerForm(false); setShowSaleForm(true); }} 
                className="bg-background-secondary text-text px-4 py-2 rounded hover-bg"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddNewCustomer} 
                className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddItemForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ zIndex: zIndexCounter }}>
          <div className="bg-card p-6 rounded-lg shadow-default max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-theme">Agregar Referencia</h3>
            {formError && <p className="text-theme font-semibold mb-4">{formError}</p>}
            
            {/* 🔄 Indicador de carga de referencias */}
            {loadingSalesReferences && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-blue-600 text-sm">Cargando todas las referencias disponibles...</span>
                </div>
              </div>
            )}

            {/* 🎯 Información de estado de datos de stock */}
            {allStockData.length === 0 && !loadingSalesReferences && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-orange-600 text-sm">Datos de stock no cargados completamente</span>
                  <button 
                    onClick={() => fetchAllReferencesForSales()}
                    className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-2 py-1 rounded"
                  >
                    Cargar Stock
                  </button>
                </div>
              </div>
            )}

            {/* ✅ Información de stock cargado */}
            {allStockData.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded p-2 mb-4">
                <span className="text-green-600 text-xs">
                  ✅ Stock independiente cargado: {allStockData.length} combinaciones de referencia-color
                </span>
              </div>
            )}
            
            <div className="space-y-4 pr-2">
              {/* Referencia live-filtered dropdown */}
              <div>
                <label className="block mb-1 font-medium text-text">
                  Referencia
                  <span className="text-green-600 text-xs ml-2">
                    ({uniqueReferences.length} referencias disponibles)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="p-2 border border-default rounded w-full bg-background text-text text-truncate"
                    placeholder={loadingSalesReferences ? "Cargando referencias..." : "Buscar referencia..."}
                    value={referenceSearch || newItem.reference || ''}
                    onChange={e => {
                      setReferenceSearch(e.target.value);
                      setShowReferenceDropdown(true);
                      handleItemChange('reference', e.target.value);
                    }}
                    onFocus={() => setShowReferenceDropdown(true)}
                    autoComplete="off"
                    title="Buscar referencia..."
                    disabled={loadingSalesReferences}
                  />
                  {showReferenceDropdown && !loadingSalesReferences && (
                    <ul className="absolute z-30 left-0 right-0 bg-card border border-default rounded mt-1 max-h-56 overflow-y-auto shadow-lg">
                      {filteredReferences.length === 0 && (
                        <li className="px-4 py-2 text-text-muted">
                          {referenceSearch ? "No hay coincidencias" : "Escriba para buscar referencias"}
                        </li>
                      )}
                      {filteredReferences.map((ref, idx) => (
                        <li
                          key={ref}
                          className={`px-4 py-2 cursor-pointer hover:bg-theme hover:text-text-inverted ${idx === referenceDropdownIndex ? 'bg-theme text-text-inverted' : ''}`}
                          onClick={() => {
                            handleItemChange('reference', ref);
                            setReferenceSearch(ref);
                            setShowReferenceDropdown(false);
                          }}
                          onMouseEnter={() => setReferenceDropdownIndex(idx)}
                        >
                          <span className="font-semibold">{ref}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {/* Color live-filtered dropdown */}
              <div>
                <label className="block mb-1 font-medium text-text">
                  Color
                  {newItem.reference && (
                    <span className="text-green-600 text-xs ml-2">
                      ({getColorsForReference(newItem.reference).length} colores disponibles)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="p-2 border border-default rounded w-full bg-background text-text text-truncate"
                    placeholder={newItem.reference ? "Buscar color..." : "Primero seleccione una referencia"}
                    value={colorSearch || newItem.color || ''}
                    onChange={e => {
                      setColorSearch(e.target.value);
                      setShowColorDropdown(true);
                      handleItemChange('color', e.target.value);
                    }}
                    onFocus={() => setShowColorDropdown(true)}
                    autoComplete="off"
                    disabled={!newItem.reference}
                    title="Buscar color..."
                  />
                  {showColorDropdown && newItem.reference && (
                    <ul className="absolute z-30 left-0 right-0 bg-card border border-default rounded mt-1 max-h-56 overflow-y-auto shadow-lg">
                      {filteredColors.length === 0 && (
                        <li className="px-4 py-2 text-text-muted">
                          {colorSearch ? "No hay coincidencias" : "Escriba para buscar colores"}
                        </li>
                      )}
                      {filteredColors.map((color, idx) => (
                        <li
                          key={color}
                          className={`px-4 py-2 cursor-pointer hover:bg-theme hover:text-text-inverted ${idx === colorDropdownIndex ? 'bg-theme text-text-inverted' : ''}`}
                          onClick={() => {
                            handleItemChange('color', color);
                            setColorSearch(color);
                            setShowColorDropdown(false);
                          }}
                          onMouseEnter={() => setColorDropdownIndex(idx)}
                        >
                          <span className="font-semibold">{color}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium text-text">Tallas</label>
                <div className="grid grid-cols-4 gap-2">
                  {sizes.map((size) => (
                    <div key={size}><label className="block text-sm text-text">{size}</label><input type="number" min="0" value={newItem.sizes[size]} onChange={(e) => handleSizeChange(size, e.target.value)} className="p-2 border border-default rounded w-full" /></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={() => { setShowAddItemForm(false); setFormError(''); }} className="bg-background-secondary text-text px-4 py-2 rounded hover-bg">Cancelar</button>
              <button onClick={handleAddItem} className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover">Agregar</button>
            </div>
          </div>
        </div>
      )}

      {showCustomerSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" style={{ zIndex: zIndexCounter + 1 }}>
          <div className="bg-card rounded-lg shadow-default w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-default flex-shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold text-theme mb-4">Ajustes de Clientes</h2>
              
              {/* Barra de búsqueda y filtros */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Barra de búsqueda */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, documento, teléfono, ciudad o dirección..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full p-2 border border-default rounded text-sm"
                  />
                </div>
                
                {/* Botón de ordenamiento A-Z */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => setCustomerSortOrder(customerSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="bg-theme text-text-inverted px-3 py-2 rounded text-sm hover:bg-theme-hover flex items-center gap-2"
                    title={`Ordenar ${customerSortOrder === 'asc' ? 'Z-A' : 'A-Z'}`}
                  >
                    <span>Nombre</span>
                    <span className="text-xs">
                      {customerSortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Content with scroll */}
            <div className="flex-1 overflow-auto p-4 sm:p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm min-w-[600px]">
                  <thead className="sticky top-0 bg-theme text-text-inverted z-10">
                    <tr>
                      <th className="p-2 sm:p-3 border-default text-left">Nombre</th>
                      <th className="p-2 sm:p-3 border-default text-left hidden sm:table-cell">Documento</th>
                      <th className="p-2 sm:p-3 border-default text-left hidden md:table-cell">Teléfono</th>
                      <th className="p-2 sm:p-3 border-default text-left hidden lg:table-cell">Ciudad</th>
                      <th className="p-2 sm:p-3 border-default text-left">Estado</th>
                      <th className="p-2 sm:p-3 border-default text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(filteredAndSortedCustomers) && filteredAndSortedCustomers.map(c => (
                      <tr key={c.id} className="border-t border-default hover-bg">
                        <td className="p-2 sm:p-3 border-default">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-text-muted sm:hidden">
                            {c.document && <div>Doc: {c.document}</div>}
                            {c.phone && <div>Tel: {c.phone}</div>}
                            {c.city && <div>Ciudad: {c.city}</div>}
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 border-default hidden sm:table-cell">{c.document}</td>
                        <td className="p-2 sm:p-3 border-default hidden md:table-cell">{c.phone}</td>
                        <td className="p-2 sm:p-3 border-default hidden lg:table-cell">{c.city}</td>
                        <td className="p-2 sm:p-3 border-default">
                          <span className={`px-2 py-1 rounded-full text-xs ${c['status-client'] ? 'bg-theme text-text-inverted' : 'bg-theme-secondary-2 text-text'}`}>
                            {c['status-client'] ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="p-2 sm:p-3 border-default">
                          <div className="flex flex-row gap-1 justify-center">
                            {/* Botón "Usar este" */}
                            <button 
                              onClick={() => handleSelectCustomer(c)} 
                              className="bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-colors"
                              title="Usar este cliente en el formulario de ventas"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            
                            {user?.role !== 'vendedor' ? (
                              <>
                                {/* Botón Modificar */}
                                <button 
                                  onClick={() => { setEditingCustomer(c); setCustomerForm({ ...c }); }} 
                                  className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                                  title="Modificar cliente"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                
                                {/* Botón Habilitar/Deshabilitar */}
                                <button 
                                  onClick={() => handleToggleCustomerStatus(c)} 
                                  className={`p-2 rounded-full transition-colors ${
                                    c['status-client'] 
                                      ? 'bg-orange-600 text-white hover:bg-orange-700' 
                                      : 'bg-gray-600 text-white hover:bg-gray-700'
                                  }`}
                                  title={c['status-client'] ? 'Deshabilitar cliente' : 'Habilitar cliente'}
                                >
                                  {c['status-client'] ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center justify-center p-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Solo lectura">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Mensaje cuando no hay resultados */}
              {Array.isArray(filteredAndSortedCustomers) && filteredAndSortedCustomers.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  {customerSearchTerm ? (
                    <div>
                      <p className="text-lg">No se encontraron clientes</p>
                      <p className="text-sm">No hay clientes que coincidan con "{customerSearchTerm}"</p>
                      <button 
                        onClick={() => setCustomerSearchTerm('')}
                        className="mt-2 text-theme hover:underline text-sm"
                      >
                        Limpiar búsqueda
                      </button>
                    </div>
                  ) : (
                    <p>No hay clientes registrados</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-default flex-shrink-0">
              <div className="flex justify-end">
                <button onClick={() => setShowCustomerSettings(false)} className="bg-background-secondary text-text px-4 py-2 rounded hover-bg">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4" style={{ zIndex: zIndexCounter + 2 }}>
          <div className="bg-card p-4 sm:p-8 rounded-lg shadow-default w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-theme">Modificar Cliente</h3>
            {formError && <p className="text-theme font-semibold mb-4">{formError}</p>}
            <div className="space-y-3 pr-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-text">Nombre</label>
                <input 
                  type="text" 
                  value={customerForm.name} 
                  onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} 
                  className="p-2 border border-default rounded w-full" 
                  placeholder="Nombre completo"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-text">Tipo Documento</label>
                  <select 
                    value={customerForm.document_type} 
                    onChange={e => setCustomerForm({ ...customerForm, document_type: e.target.value })} 
                    className="p-2 border border-default rounded w-full"
                  >
                    <option value="Cédula">Cédula</option>
                    <option value="NIT">NIT</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-text">Documento</label>
                  <input 
                    type="text" 
                    value={customerForm.document} 
                    onChange={e => setCustomerForm({ ...customerForm, document: e.target.value })} 
                    className="p-2 border border-default rounded w-full" 
                    placeholder="12345678"
                    disabled={editingCustomer && editingCustomer.document && editingCustomer.document.trim() !== ''}
                    title={editingCustomer && editingCustomer.document && editingCustomer.document.trim() !== '' ? 'El documento no se puede editar por seguridad' : ''}
                  />
                  {editingCustomer && editingCustomer.document && editingCustomer.document.trim() !== '' && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ Campo protegido - No editable por seguridad</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-text">Teléfono</label>
                  <input 
                    type="text" 
                    value={customerForm.phone} 
                    onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} 
                    className="p-2 border border-default rounded w-full" 
                    placeholder="3001234567"
                    disabled={editingCustomer && editingCustomer.phone && editingCustomer.phone.trim() !== ''}
                    title={editingCustomer && editingCustomer.phone && editingCustomer.phone.trim() !== '' ? 'El teléfono no se puede editar por seguridad' : ''}
                  />
                  {editingCustomer && editingCustomer.phone && editingCustomer.phone.trim() !== '' && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ Campo protegido - No editable por seguridad</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-text">Ciudad</label>
                  <input 
                    type="text" 
                    value={customerForm.city} 
                    onChange={e => setCustomerForm({ ...customerForm, city: e.target.value })} 
                    className="p-2 border border-default rounded w-full" 
                    placeholder="Bogotá"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-text">Dirección</label>
                <input 
                  type="text" 
                  value={customerForm.address} 
                  onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} 
                  className="p-2 border border-default rounded w-full" 
                  placeholder="Calle 123 #45-67"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-text">Notas</label>
                <textarea 
                  value={customerForm.notes} 
                  onChange={e => setCustomerForm({ ...customerForm, notes: e.target.value })} 
                  className="p-2 border border-default rounded w-full resize-none" 
                  rows="3" 
                  placeholder="Información adicional del cliente..."
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-6">
              <button 
                onClick={() => setEditingCustomer(null)} 
                className="bg-background-secondary text-text px-4 py-2 rounded hover-bg"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateCustomer} 
                className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ zIndex: zIndexCounter }}>
          <div className="bg-card p-6 rounded-lg shadow-default max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-theme">Subir Imagen para {selectedProductForUpload?.reference} - {selectedProductForUpload?.color}</h3>
            {formError && <p className="text-theme font-semibold mb-4">{formError}</p>}
            {/* Large image preview */}
            {selectedProductForUpload?.image_url && (
              <div className="flex justify-center mb-4">
                <ProductImage
                  imageUrl={selectedProductForUpload.image_url}
                  reference={selectedProductForUpload.reference}
                  color={selectedProductForUpload.color}
                  className="w-64 h-64 object-contain rounded border bg-white"
                  style={{ maxWidth: '100%', maxHeight: '256px' }}
                />
              </div>
            )}
            <div
              className="bg-card p-4 rounded-lg shadow-default relative border-2 border-transparent hover:border-theme dark:hover:border-text-muted transition-all"
              onDragOver={user?.role !== 'lector' ? handleDragOver : undefined}
              onDrop={user?.role !== 'lector' ? (e) => handleDrop(e, selectedProductForUpload) : undefined}
            >
              <p className="text-text">Arrastra una imagen aquí o haz clic para seleccionar</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, selectedProductForUpload)}
                className="hidden"
                id="imageUpload"
              />
              <label htmlFor="imageUpload" className="cursor-pointer text-theme underline mt-2 inline-block">
                Seleccionar archivo
              </label>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={() => { setShowImageUpload(false); setFormError('') }} className="bg-background-secondary text-text px-4 py-2 rounded hover-bg">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(StockView);