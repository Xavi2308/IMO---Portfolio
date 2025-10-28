import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import StockOrderDetailsModal from './StockOrderDetailsModal';
import OrderDetailsModal from './OrderDetailsModal';
import StockOrderSplitter from './StockOrderSplitter';
// Utilidad para texto blanco o negro según fondo c1-c5 o bg-theme
function getTextContrastClass(bgClass, forceBg) {
  // Si se fuerza el fondo (por ejemplo, bg-theme es blanco o negro)
  if (forceBg === 'light') return 'text-theme-c1';
  if (forceBg === 'dark') return 'text-theme-c5';
  if (bgClass.includes('bg-theme-c1')) return 'text-theme-c5';
  if (bgClass.includes('bg-theme-c5')) return 'text-theme-c1';
  // Para otros, usar texto por defecto
  return '';
}
function Orders({ user }) {
  // --- THEME STATE ---
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('themeColor') || '#1e293b');

  // --- LISTENER PARA CAMBIOS DE TEMA ---
  useEffect(() => {
    const handleThemeChange = (event) => {
      console.log('Orders: Evento de cambio de tema recibido:', event.detail);
      const { color } = event.detail;
      setThemeColor(color);
    };

    window.addEventListener('themeChanged', handleThemeChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  // --- DIALOG STATE HOOKS (must be at the very top!) ---
  const [newOrder, setNewOrder] = useState({
    client_name: '',
    customer_id: null,
    observations: '',
    deadline: '',
    items: [],
    paid_amount: '',
    countsAsSale: false, // <-- para la casilla 'esto es una venta'
  });
  const [editOrder, setEditOrder] = useState(null);
  // --- DIALOG STATE HOOKS (must be at the very top!) ---
  const [customers, setCustomers] = useState([]);

  // --- DIALOG STATE HOOKS (must be at the very top!) ---
  const [references, setReferences] = useState([]);
  const [colors, setColors] = useState([]);
  const [newReference, setNewReference] = useState({
    reference: '',
    color: '',
    sizes: { 34: 0, 35: 0, 36: 0, 37: 0, 38: 0, 39: 0, 40: 0, 41: 0 },
    observation: '',
    image_url: '',
    price_r: 'Precio detal',
    price_w: 'Precio mayorista',
  });
  const [referenceDropdownOpen, setReferenceDropdownOpen] = useState(false);
  const [referenceSearch, setReferenceSearch] = useState('');
  const [referenceDropdownIndex, setReferenceDropdownIndex] = useState(0);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [colorSearch, setColorSearch] = useState('');
  const [colorDropdownIndex, setColorDropdownIndex] = useState(0);

  // filteredReferences and filteredColors must be defined after references/colors
  const filteredReferences = references.filter(r => r.toLowerCase().includes(referenceSearch.toLowerCase()));
  const filteredColors = colors.filter(c => c.toLowerCase().includes(colorSearch.toLowerCase()));

  // Keyboard navigation for reference dropdown
  useEffect(() => {
    if (!referenceDropdownOpen) return;
    const handleKeyDown = (e) => {
      if (filteredReferences.length === 0) return;
      if (e.key === 'ArrowDown') {
        setReferenceDropdownIndex(i => Math.min(i + 1, filteredReferences.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setReferenceDropdownIndex(i => Math.max(i - 1, 0));
        e.preventDefault();
      } else if (e.key === 'Enter') {
        setNewReference({ ...newReference, reference: filteredReferences[referenceDropdownIndex] });
        setReferenceSearch(filteredReferences[referenceDropdownIndex]);
        setReferenceDropdownOpen(false);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [referenceDropdownOpen, filteredReferences, referenceDropdownIndex, newReference]);

  // Keyboard navigation for color dropdown
  useEffect(() => {
    if (!colorDropdownOpen) return;
    const handleKeyDown = (e) => {
      if (filteredColors.length === 0) return;
      if (e.key === 'ArrowDown') {
        setColorDropdownIndex(i => Math.min(i + 1, filteredColors.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setColorDropdownIndex(i => Math.max(i - 1, 0));
        e.preventDefault();
      } else if (e.key === 'Enter') {
        setNewReference({ ...newReference, color: filteredColors[colorDropdownIndex] });
        setColorSearch(filteredColors[colorDropdownIndex]);
        setColorDropdownOpen(false);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [colorDropdownOpen, filteredColors, colorDropdownIndex, newReference]);
  // Move references/colors useState above all usages

  // Dropdown search state for customer
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownIndex, setCustomerDropdownIndex] = useState(0);
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()));

  // Keyboard navigation for customer dropdown
  useEffect(() => {
    if (!customerDropdownOpen) return;
    const handleKeyDown = (e) => {
      if (filteredCustomers.length === 0) return;
      if (e.key === 'ArrowDown') {
        setCustomerDropdownIndex(i => Math.min(i + 1, filteredCustomers.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setCustomerDropdownIndex(i => Math.max(i - 1, 0));
        e.preventDefault();
      } else if (e.key === 'Enter') {
        setNewOrder({
          ...newOrder,
          client_name: filteredCustomers[customerDropdownIndex].name,
          customer_id: filteredCustomers[customerDropdownIndex].id
        });
        setCustomerDropdownOpen(false);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [customerDropdownOpen, filteredCustomers, customerDropdownIndex, newOrder]);
  // Track orders being deleted or accepted for animation
  const [deletingOrderIds, setDeletingOrderIds] = useState([]); // array of order ids
  const [acceptingOrderIds, setAcceptingOrderIds] = useState([]); // array of order ids
  // --- DIALOG STATE HOOKS (must be at the very top!) ---
  const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = useState(false);
  const [showSuspensionDialog, setShowSuspensionDialog] = useState(false);
  const [suspensionPeriod, setSuspensionPeriod] = useState({ value: 1, unit: 'days' });
  const [pendingDeleteOrders, setPendingDeleteOrders] = useState([]); // [{order, rowKey}]

  // ...existing state hooks...

  // --- DIALOGS (move JSX to just before return) ---
  // (Dialog JSX will be rendered just before the return statement, after all hooks and logic)

  // ...existing code...
  // Multi-select, priority, and view state
  const [selectedOrders, setSelectedOrders] = useState([]); // array of rowKeys
  const [selectAll, setSelectAll] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('ordersViewMode') || 'card');
  const [priorityLoading, setPriorityLoading] = useState({}); // { [rowKey]: boolean }
  const [orders, setOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(null);
  const [showAddReference, setShowAddReference] = useState(false);
  const [showEditOrder, setShowEditOrder] = useState(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [showNewReferenceForm, setShowNewReferenceForm] = useState(false);
  const [filters, setFilters] = useState({ search: '', created_at: '' });
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
  const [error, setError] = useState(null);
  const [suggestedSizes, setSuggestedSizes] = useState({
    34: 0, 35: 1, 36: 2, 37: 3, 38: 3, 39: 2, 40: 1, 41: 0,
  });
  const sizes = ['34', '35', '36', '37', '38', '39', '40', '41'];

  useEffect(() => {
    fetchOrders();
    fetchReferencesAndColors();
    checkAndCreateStockOrders();
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from('customers').select('id, name');
      if (error) console.error(error);
      else setCustomers(data || []);
    };
    fetchCustomers();

    const subscription = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          fetchOrders();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Subscription error:', err);
          setError(`Error en suscripción: ${err.message}`);
        }
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to orders-changes');
        } else if (status === 'CLOSED' || status === 'TIMED_OUT') {
          console.warn('Subscription closed/timed out, retrying...');
          setTimeout(() => subscription.subscribe(), 5000);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id]);

  // Reset selection on tab/view change
  useEffect(() => {
    setSelectedOrders([]);
    setSelectAll(false);
  }, [activeTab, viewMode, filteredOrders]);

  useEffect(() => {
    groupOrders();
  }, [orders, activeTab]);

  useEffect(() => {
    applyFilters();
  }, [groupedOrders, filters]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, users(username)')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      setOrders(data || []);
    } catch (err) {
      setError(`Error al obtener pedidos: ${err.message}`);
    }
  };

  // rowKey: unique per row (for selection, priority, etc)
  const getRowKey = (order) => {
    if (order.user_id === null || order.client_name === 'Stock') {
      // Stock order: id + reference + color
      return `stock-${order.id}-${order.item?.reference || order.reference}-${order.item?.color || order.color}`;
    }
    return `user-${order.id}`;
  };

  const groupOrders = () => {
    const grouped = [];
    orders.forEach(order => {
      if (order.status !== activeTab) return;
      if (order.user_id === null || order.client_name === 'Stock') {
        // Stock order: only one item per row
        order.items.forEach(item => {
          grouped.push({ ...order, item });
        });
      } else {
        grouped.push(order);
      }
    });
    setGroupedOrders(grouped);
  };

  const applyFilters = () => {
    let filtered = [...groupedOrders];
    if (filters.search) {
      const searchTerms = filters.search.toLowerCase().split(' ').filter(term => term);
      filtered = filtered.filter(o =>
        o.user_id === null || o.client_name === 'Stock'
          ? searchTerms.every(term => o.item.reference.toLowerCase().includes(term))
          : searchTerms.every(term => o.client_name.toLowerCase().includes(term) || o.items.some(i => i.reference.toLowerCase().includes(term)))
      );
    }
    if (filters.created_at) {
      filtered = filtered.filter(o =>
        o.created_at ? new Date(o.created_at).toISOString().split('T')[0] === filters.created_at : false
      );
    }
    setFilteredOrders(filtered);
  };

  const fetchReferencesAndColors = async () => {
    try {
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('reference');
      if (productError) throw new Error(productError.message);

      const { data: variations, error: variationError } = await supabase
        .from('variations')
        .select('color');
      if (variationError) throw new Error(variationError.message);

      setReferences([...new Set(products.map(p => p.reference))]);
      setColors([...new Set(variations.map(v => v.color))]);
    } catch (err) {
      setError(`Error al obtener referencias y colores: ${err.message}`);
    }
  };

  const checkAndCreateStockOrders = async () => {
    if (!user?.id || !['admin', 'produccion'].includes(user.role)) return;


    try {
      const { data: sizesData, error: sizesError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `suggested_sizes_${user.id}`)
        .limit(1)
        .maybeSingle();
      if (sizesError) throw new Error(`Error en settings: ${sizesError.message}`);
      const effectiveSuggestedSizes = sizesData?.value ? JSON.parse(sizesData.value) : suggestedSizes;

      // 1. Consultar suspensiones activas
      const nowISO = new Date().toISOString();
      const { data: suspensions, error: suspError } = await supabase
        .from('stock_suspensions')
        .select('reference, color, suspend_until')
        .gt('suspend_until', nowISO);
      if (suspError) throw new Error(`Error en suspensiones: ${suspError.message}`);
      const suspendedSet = new Set((suspensions || []).map(s => `${s.reference}|||${s.color}`));

      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, reference, variations(color, size, stock)');
      if (productError) throw new Error(`Error en productos: ${productError.message}`);

      // Traer todas las órdenes de stock pendientes o en proceso
      const { data: stockOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, items, reference, color')
        .eq('client_name', 'Stock')
        .in('status', ['pending', 'in_process']);
      if (ordersError) throw new Error(`Error en órdenes: ${ordersError.message}`);

      // Generar la lista de referencias/color que deberían estar como órdenes independientes
      const idealStockOrders = [];

      for (const product of products) {
        const variationsByColor = product.variations.reduce((acc, variation) => {
          if (!acc[variation.color]) acc[variation.color] = {};
          acc[variation.color][variation.size] = variation.stock;
          return acc;
        }, {});

        for (const [color, currentStockBySize] of Object.entries(variationsByColor)) {
          // ¿Ya existe una orden en proceso para esta referencia/color?
          const inProcess = stockOrders.some(o => o.status === 'in_process' && o.reference === product.reference && o.color === color);
          if (inProcess) continue;

          // 2. Filtrar si está suspendido
          if (suspendedSet.has(`${product.reference}|||${color}`)) continue;

          const neededSizes = {};
          for (const size of sizes) {
            const currentStock = currentStockBySize[size] || 0;
            const suggestedStock = effectiveSuggestedSizes[size] || 0;
            const needed = suggestedStock - currentStock;
            if (needed > 0) {
              neededSizes[size] = needed;
            }
          }

          if (Object.keys(neededSizes).length > 0) {
            idealStockOrders.push({
              reference: product.reference,
              color: color,
              sizes: neededSizes,
              observation: 'Reposición automática',
            });
          }
        }
      }

      // Eliminar todas las órdenes de stock pendientes existentes (para evitar duplicados)
      const pendingStockOrders = stockOrders.filter(o => o.status === 'pending');
      if (pendingStockOrders.length > 0) {
        const idsToDelete = pendingStockOrders.map(o => o.id);
        if (idsToDelete.length > 0) {
          await supabase.from('orders').delete().in('id', idsToDelete);
        }
      }

      // Insertar una orden por cada referencia/color necesaria
      if (idealStockOrders.length > 0) {
        const now = new Date();
        const deadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const inserts = idealStockOrders.map(item => ({
          client_name: 'Stock',
          status: 'pending',
          items: [item],
          reference: item.reference,
          color: item.color,
          created_at: now.toISOString(),
          deadline,
          observations: 'Orden automática para reposición de stock.',
        }));
        // Insertar en lotes de 50 (por si hay muchas)
        for (let i = 0; i < inserts.length; i += 50) {
          const batch = inserts.slice(i, i + 50);
          const { error: insertError } = await supabase.from('orders').insert(batch);
          if (insertError) throw insertError;
        }
      }

      fetchOrders();
    } catch (err) {
      setError(`Error al crear/actualizar pedidos de stock: ${err.message}`);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleClearFilters = () => {
    setFilters({ search: '', created_at: '' });
  };

  const handleAddReference = () => {
    if (!newReference.reference || !newReference.color || !Object.values(newReference.sizes).some(v => v > 0)) {
      setError('Por favor, completa referencia, color y al menos una talla.');
      return;
    }
    if (showEditOrder) {
      setEditOrder({
        ...editOrder,
        items: [...editOrder.items, { ...newReference }],
      });
    } else {
      setNewOrder({
        ...newOrder,
        items: [...newOrder.items, { ...newReference }],
      });
    }
    setNewReference({
      reference: '',
      color: '',
      sizes: { 34: 0, 35: 0, 36: 0, 37: 0, 38: 0, 39: 0, 40: 0, 41: 0 },
      observation: '',
      image_url: '',
      price_r: 'Precio detal',
      price_w: 'Precio mayorista',
    });
    setShowAddReference(false);
    if (showCreateOrder) setShowCreateOrder(true);
    else if (showEditOrder) setShowEditOrder(true);
  };

  const handleCreateOrder = async () => {
    try {
      if (!user?.id) {
        setError('Error: usuario no autenticado. Por favor, inicia sesión nuevamente.');
        return;
      }
      if (!newOrder.client_name || !newOrder.deadline || newOrder.items.length === 0) {
        setError('Por favor, completa todos los campos obligatorios y agrega al menos una referencia.');
        return;
      }
      // Si es venta, cliente es obligatorio
      if (newOrder.countsAsSale && !newOrder.customer_id) {
        setError('Debes seleccionar un cliente válido para registrar la venta.');
        return;
      }
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_name: newOrder.client_name,
          customer_id: newOrder.customer_id,
          user_id: user.id,
          status: 'pending',
          items: newOrder.items,
          created_at: new Date().toISOString(),
          deadline: newOrder.deadline,
          observations: newOrder.observations,
        })
        .select('id')
        .single();
      if (orderError) throw orderError;
      const orderId = orderData.id;
      const { data: adminUsers, error: adminError } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'produccion']);
      if (adminError) throw adminError;
      const notificationMessage = `Nueva orden creada: ${newOrder.client_name} (${newOrder.items.length} referencias).`;
      const notificationsToInsert = adminUsers.map(adminUser => ({
        user_id: adminUser.id,
        message: notificationMessage,
        created_at: new Date().toISOString(),
        read: false,
        order_id: orderId,
        type: 'order_created',
      }));
      const { error: notificationError } = await supabase.from('notifications').insert(notificationsToInsert);
      if (notificationError) throw notificationError;

      // Si la casilla "esto es una venta" está marcada, crear registro en sales
      if (newOrder.countsAsSale) {
        const totalPairs = newOrder.items.reduce((total, item) => total + Object.values(item.sizes).reduce((a, b) => a + b, 0), 0);
        const totalValue = newOrder.paid_amount ? parseFloat(newOrder.paid_amount) : newOrder.items.reduce((sum, item) => sum + (item.price_r ? parseFloat(item.price_r) : 0) * Object.values(item.sizes).reduce((a, b) => a + b, 0), 0);
        const { error: salesError } = await supabase.from('sales').insert({
          customer_id: newOrder.customer_id,
          items: newOrder.items,
          total_pairs: totalPairs,
          total_value: totalValue,
          paid_amount: newOrder.paid_amount ? parseFloat(newOrder.paid_amount) : null,
          created_at: new Date().toISOString(),
          order_id: orderId,
        });
        if (salesError) {
          setError(`Error al registrar la venta: ${salesError.message}`);
          return;
        }
      }

      setNewOrder({ client_name: '', customer_id: null, observations: '', deadline: '', items: [], paid_amount: '', countsAsSale: false });
      setShowCreateOrder(false);
      fetchOrders();
    } catch (err) {
      setError(`Error al crear pedido: ${err.message}`);
    }
  };

  const handleEditOrder = async () => {
    try {
      if (!editOrder.client_name || !editOrder.deadline || editOrder.items.length === 0) {
        setError('Por favor, completa todos los campos obligatorios y agrega al menos una referencia.');
        return;
      }
      await supabase
        .from('orders')
        .update({
          client_name: editOrder.client_name,
          deadline: editOrder.deadline,
          items: editOrder.items,
          observations: editOrder.observations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editOrder.id);

      // If counts as sale, upsert to sales history
      if (editOrder.countsAsSale) {
        const totalPairs = editOrder.items.reduce((total, item) => total + Object.values(item.sizes).reduce((a, b) => a + b, 0), 0);
        const totalAmount = editOrder.items.reduce((sum, item) => sum + (item.price_r ? parseFloat(item.price_r) : 0) * Object.values(item.sizes).reduce((a, b) => a + b, 0), 0);
        // Try to find existing sale for this order
        const { data: existingSale } = await supabase.from('sales').select('id').eq('order_id', editOrder.id).maybeSingle();
        if (existingSale && existingSale.id) {
          await supabase.from('sales').update({
            customer_id: editOrder.customer_id, // Usar customer_id para el join
            items: editOrder.items,
            total_pairs: totalPairs,
            total_value: editOrder.paid_amount ? parseFloat(editOrder.paid_amount) : totalAmount,
            paid_amount: editOrder.paid_amount ? parseFloat(editOrder.paid_amount) : null,
            updated_at: new Date().toISOString(),
          }).eq('id', existingSale.id);
        } else {
          await supabase.from('sales').insert({
            customer_id: editOrder.customer_id, // Usar customer_id para el join
            items: editOrder.items,
            total_pairs: totalPairs,
            total_value: editOrder.paid_amount ? parseFloat(editOrder.paid_amount) : totalAmount,
            paid_amount: editOrder.paid_amount ? parseFloat(editOrder.paid_amount) : null,
            created_at: new Date().toISOString(),
            order_id: editOrder.id,
          });
        }
      } else {
        // If unchecked, remove from sales history
        await supabase.from('sales').delete().eq('order_id', editOrder.id);
      }

      setShowEditOrder(false);
      setEditOrder(null);
      fetchOrders();
    } catch (err) {
      setError(`Error al editar pedido: ${err.message}`);
    }
  };

  const handleAcceptOrder = async (orderId, itemToAccept = null) => {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*, users(username)')
        .eq('id', orderId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!order) {
        setError('No se encontró la orden o hubo un conflicto.');
        return;
      }
      if ((order.user_id === null || order.client_name === 'Stock') && itemToAccept) {
        const splitter = new StockOrderSplitter(supabase);
        await splitter.splitAndAcceptOne(order, itemToAccept);
      } else {
        await supabase
          .from('orders')
          .update({ status: 'in_process', accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', orderId);
        if (order.user_id) {
          const { error: notifyError } = await supabase
            .from('notifications')
            .insert({
              user_id: order.user_id,
              message: `La orden de ${order.client_name} ha pasado a "En Proceso".`,
              created_at: new Date().toISOString(),
              read: false,
              order_id: orderId,
              type: 'order_status_changed',
            });
          if (notifyError) throw notifyError;
        }
      }
      fetchOrders();
    } catch (err) {
      setError(`Error al aceptar pedido: ${err.message}`);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*, users(username)')
        .eq('id', orderId)
        .single();
      if (fetchError) throw fetchError;
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      if (order.user_id) {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert({
            user_id: order.user_id,
            message: `La orden de ${order.client_name} ha sido completada.`,
            created_at: new Date().toISOString(),
            read: false,
            order_id: orderId,
            type: 'order_status_changed',
          });
        if (notifyError) throw notifyError;
      }
      fetchOrders();
    } catch (err) {
      setError(`Error al completar pedido: ${err.message}`);
    }
  };

  // Single delete (still used for per-row delete)
  // Individual delete now uses the same dialog flow as multi-delete
  // Individual delete now uses the same dialog flow as multi-delete
  const handleDeleteOrder = (orderId, itemToDelete = null) => {
    // Find the order object
    let order;
    if (itemToDelete) {
      order = filteredOrders.find(o => o.id === orderId);
      if (order) order = { ...order, item: itemToDelete };
    } else {
      order = filteredOrders.find(o => o.id === orderId);
    }
    if (!order) return;
    setPendingDeleteOrders([{ order, rowKey: getRowKey(order) }]);
    setShowMultiDeleteConfirm(true);
  };

  // Actual delete logic (called after confirmation)
  const performDeleteOrder = async (ordersToDelete, suspension) => {
    try {
      // Optimistically remove from UI
      const idsToDelete = ordersToDelete.map(({ order }) => order.id);
      setDeletingOrderIds((prev) => [...prev, ...idsToDelete]);
      setFilteredOrders((prev) => prev.filter((o) => !idsToDelete.includes(o.id)));
      setOrders((prev) => prev.filter((o) => !idsToDelete.includes(o.id)));

      // Run all deletes in parallel for speed
      await Promise.all(ordersToDelete.map(async ({ order, rowKey }) => {
        if (order.user_id === null || order.client_name === 'Stock') {
          // Stock/system order: use splitter
          const { data: fullOrder, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order.id)
            .maybeSingle();
          if (fetchError) throw fetchError;
          if (!fullOrder) return; // Order already deleted or not found
          const splitter = new StockOrderSplitter(supabase);
          await splitter.deleteOne(fullOrder, order.item);
        } else {
          const { error } = await supabase.from('orders').delete().eq('id', order.id);
          if (error) throw new Error(error.message);
        }
      }));
      setDeletingOrderIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
      fetchOrders();
    } catch (err) {
      setError(`Error al eliminar pedido: ${err.message}`);
      setDeletingOrderIds([]);
    }
  };

  // Batch delete for multi-select
  // Batch delete for multi-select (calls same logic as individual)
  const handleBatchDelete = async (ordersToDelete, suspension) => {
    // Suspension logic for auto-generated orders
    if (suspension) {
      const now = new Date();
      let ms = 0;
      if (suspension.unit === 'days') ms = suspension.value * 24 * 60 * 60 * 1000;
      if (suspension.unit === 'hours') ms = suspension.value * 60 * 60 * 1000;
      const until = new Date(now.getTime() + ms).toISOString();
      // Collect all Stock/system orders to suspend
      const stockOrders = ordersToDelete.filter(({order}) => order.user_id === null || order.client_name === 'Stock');
      const suspensions = stockOrders.map(({order}) => {
        const ref = order.item?.reference || order.reference;
        const col = order.item?.color || order.color;
        // Save to localStorage for fallback
        localStorage.setItem(`stock_suspend_${ref}_${col}`, until);
        return {
          reference: ref,
          color: col,
          suspend_until: until,
          created_at: now.toISOString(),
        };
      });
      if (suspensions.length > 0) {
        try {
          const { error } = await supabase
            .from('stock_suspensions')
            .insert(suspensions);
          if (error) {
            setError('Error guardando suspensión en Supabase: ' + error.message);
          }
        } catch (err) {
          setError('Error guardando suspensión en Supabase: ' + err.message);
        }
      }
      // Remove suspended Stock/system orders from UI immediately
      const suspendedKeys = stockOrders.map(({order}) => getRowKey(order));
      setOrders(prev => prev.filter(o => !suspendedKeys.includes(getRowKey(o))));
      setFilteredOrders(prev => prev.filter(o => !suspendedKeys.includes(getRowKey(o))));
    }
    // Optimistically clear selection and dialogs
    setPendingDeleteOrders([]);
    setSelectedOrders([]);
    setSelectAll(false);
    await performDeleteOrder(ordersToDelete, suspension);
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomer.name || !newCustomer.document) {
      setError('El nombre y el documento son obligatorios.');
      return;
    }
    try {
      const { error } = await supabase.from('customers').insert({
        name: newCustomer.name,
        email: newCustomer.email,
        document_type: newCustomer.document_type,
        document: newCustomer.document,
        phone: newCustomer.phone,
        city: newCustomer.city,
        address: newCustomer.address,
        notes: newCustomer.notes,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      setNewCustomer({ name: '', email: '', document_type: 'Cédula', document: '', phone: '', city: '', address: '', notes: '' });
      setShowNewCustomerForm(false);
      setNewOrder({ ...newOrder, client_name: newCustomer.name });
      setShowCreateOrder(true);
      setError(null);
    } catch (err) {
      setError(`Error al agregar cliente: ${err.message}`);
    }
  };

  const handleSaveNewReference = async () => {
    try {
      if (!newReference.reference || !newReference.color || newReference.price_r === 'Precio detal' || newReference.price_w === 'Precio mayorista') {
        setError('La Referencia, Color, Precio Detal y Precio Mayorista son campos obligatorios.');
        return;
      }

      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          reference: newReference.reference,
          image_url: newReference.image_url,
          price_r: parseFloat(newReference.price_r),
          price_w: parseFloat(newReference.price_w),
          created_by: user ? user.id : null,
        })
        .select()
        .single();

      if (productError) throw productError;

      for (const size of sizes) {
        const stockToInsert = parseInt(newReference.sizes[size]) || 0;
        if (!isNaN(stockToInsert) && stockToInsert > 0) {
          await supabase.from('variations').insert({
            product_id: newProduct.id,
            color: newReference.color,
            size,
            stock: stockToInsert,
            barcode_code: `${newReference.reference}-${newReference.color}-${size}`,
            created_at: new Date().toISOString(),
            created_by: user ? user.id : null,
          });
        }
      }

      setReferences([...new Set([...references, newReference.reference])]);
      setColors([...new Set([...colors, newReference.color])]);
      setNewReference({
        reference: newReference.reference,
        color: '',
        sizes: { 34: 0, 35: 0, 36: 0, 37: 0, 38: 0, 39: 0, 40: 0, 41: 0 },
        observation: '',
        image_url: '',
        price_r: 'Precio detal',
        price_w: 'Precio mayorista',
      });
      setShowNewReferenceForm(false);
      setShowAddReference(true);
      setError(null);
    } catch (err) {
      setError(`Error al guardar referencia: ${err.message}`);
    }
  };

  const getDaysSinceAccepted = (acceptedAt) => {
    if (!acceptedAt) return 0;
    const diff = new Date() - new Date(acceptedAt);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilDeadline = (deadline) => {
    if (!deadline) return 0;
    const diff = new Date(deadline) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getTotalPairs = (items) => {
    return items.reduce((total, item) => total + Object.values(item.sizes).reduce((a, b) => a + b, 0), 0);
  };


  // --- Multi-select, priority, and view toggle bar ---
  const multiSelectBarColor = `${themeColor}cc`;

  // Priority toggle handler
  const handleTogglePriority = async (order) => {
    const rowKey = getRowKey(order);
    setPriorityLoading((prev) => ({ ...prev, [rowKey]: true }));
    try {
      const isPriority = !!order.is_priority;
      const updates = isPriority
        ? { is_priority: false, prioritySetAt: null }
        : { is_priority: true, prioritySetAt: new Date().toISOString() };
      await supabase.from('orders').update(updates).eq('id', order.id);
      fetchOrders();
    } catch (err) {
      setError('Error al cambiar prioridad: ' + err.message);
    } finally {
      setPriorityLoading((prev) => ({ ...prev, [rowKey]: false }));
    }
  };

  // Selection logic
  const handleSelectOrder = (rowKey) => {
    setSelectedOrders((prev) =>
      prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...prev, rowKey]
    );
  };

  // Multi-accept handler (optimistic)
  const handleBatchAccept = async (ordersToAccept) => {
    const idsToAccept = ordersToAccept.map(({ order }) => order.id);
    setAcceptingOrderIds((prev) => [...prev, ...idsToAccept]);
    setSelectedOrders([]);
    setSelectAll(false);
    setFilteredOrders((prev) => prev.map((o) => idsToAccept.includes(o.id) ? { ...o, status: 'in_process', _optimistic: true } : o));
    setOrders((prev) => prev.map((o) => idsToAccept.includes(o.id) ? { ...o, status: 'in_process', _optimistic: true } : o));
    try {
      // Run all accept operations in parallel for speed
      await Promise.all(ordersToAccept.map(({ order }) => {
        if (order.user_id === null || order.client_name === 'Stock') {
          return handleAcceptOrder(order.id, order.item);
        } else {
          return handleAcceptOrder(order.id);
        }
      }));
      // --- Remove duplicates in "in_process" tab (especially for Stock/system orders) ---
      setOrders((prev) => {
        const seenRefs = new Set();
        return prev.filter(o => {
          if (o.status !== 'in_process') return true;
          if (o.user_id === null || o.client_name === 'Stock') {
            const ref = o.item?.reference;
            if (!ref) return true;
            if (seenRefs.has(ref)) return false;
            seenRefs.add(ref);
            return true;
          }
          return true;
        });
      });
      setFilteredOrders((prev) => {
        const seenRefs = new Set();
        return prev.filter(o => {
          if (o.status !== 'in_process') return true;
          if (o.user_id === null || o.client_name === 'Stock') {
            const ref = o.item?.reference;
            if (!ref) return true;
            if (seenRefs.has(ref)) return false;
            seenRefs.add(ref);
            return true;
          }
          return true;
        });
      });
    } catch (err) {
      setError('Error al aceptar órdenes: ' + err.message);
    } finally {
      setAcceptingOrderIds((prev) => prev.filter((id) => !idsToAccept.includes(id)));
      fetchOrders();
    }
  };
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedOrders([]);
      setSelectAll(false);
    } else {
      setSelectedOrders(filteredOrders.map(getRowKey));
      setSelectAll(true);
    }
  };

  // Sorting: prioritized first, by prioritySetAt, then by created_at
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (a.is_priority && !b.is_priority) return -1;
    if (!a.is_priority && b.is_priority) return 1;
    if (a.is_priority && b.is_priority) {
      return new Date(a.prioritySetAt || 0) - new Date(b.prioritySetAt || 0);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // --- UI ---
  // Place dialogs here to avoid ReferenceError
  const multiDeleteDialog = (
    showMultiDeleteConfirm && (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)'}}>
        <div className="bg-card p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
          <h3 className="text-xl font-semibold mb-4">Eliminar órdenes</h3>
          <p className="mb-6">Vas a eliminar <b>{pendingDeleteOrders.length}</b> artículo(s), ¿Te encuentras seguro?</p>
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <button className="bg-background-secondary text-text px-4 py-2 rounded hover:bg-theme-hover" onClick={() => { setShowMultiDeleteConfirm(false); setPendingDeleteOrders([]); }}>Cancelar</button>
            <button className="bg-error-600 text-text-inverted px-4 py-2 rounded hover:bg-error-700" onClick={async () => {
              setShowMultiDeleteConfirm(false);
              // If any are auto-generados, show suspension dialog, else delete directly
              if (pendingDeleteOrders.some(({order}) => order.user_id === null || order.client_name === 'Stock')) {
                setShowSuspensionDialog(true);
              } else {
                await handleBatchDelete(pendingDeleteOrders, null);
              }
            }}>Aceptar</button>
          </div>
        </div>
      </div>
    )
  );
  const suspensionDialog = (
    showSuspensionDialog && (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)'}}>
        <div className="bg-card p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
          <h3 className="text-xl font-semibold mb-4">Suspender generación automática</h3>
          <p className="mb-4">Los artículos que deseas eliminar son generados por el sistema de manera automática.<br/>¿Por cuánto tiempo deseas evitar que se generen automáticamente?</p>
          <div className="flex items-center gap-2 mb-6">
            <input type="number" min="1" value={suspensionPeriod.value} onChange={e => setSuspensionPeriod({ ...suspensionPeriod, value: Math.max(1, parseInt(e.target.value)||1) })} className="w-20 p-2 border border-default rounded" />
            <select value={suspensionPeriod.unit} onChange={e => setSuspensionPeriod({ ...suspensionPeriod, unit: e.target.value })} className="p-2 border border-default rounded">
              <option value="days">Días</option>
              <option value="hours">Horas</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <button className="bg-background-secondary text-text px-4 py-2 rounded hover:bg-theme-hover" onClick={() => { setShowSuspensionDialog(false); setPendingDeleteOrders([]); }}>Cancelar</button>
            <button className="bg-error-600 text-text-inverted px-4 py-2 rounded hover:bg-error-700" onClick={async () => {
              setShowSuspensionDialog(false);
              // Eliminar SIN suspender
              await handleBatchDelete(pendingDeleteOrders, null);
            }}>No suspender</button>
            <button className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover" onClick={async () => {
              setShowSuspensionDialog(false);
              await handleBatchDelete(pendingDeleteOrders, suspensionPeriod);
            }}>Suspender</button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="bg-background p-4 sm:p-6 min-h-screen">
      {multiDeleteDialog}
      {suspensionDialog}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold mb-3 flex flex-wrap items-center gap-2">
          <span className="w-8 h-8 text-theme inline-block align-middle flex-shrink-0">
            {/* Orders icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z" />
              <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
            </svg>
          </span>
          <span className="flex-shrink-0">Pedidos</span>
        </h1>
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-error-100 border border-error-200 rounded-lg mt-4">
            <div className="flex">
              <svg className="w-5 h-5 text-error-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-error-600">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs and view toggle */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-6 items-start sm:items-center">
        <div className="flex space-x-2 sm:space-x-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 sm:px-4 py-2 rounded text-sm sm:text-base ${activeTab === 'pending' ? 'bg-theme text-text-inverted shadow-md' : 'bg-background-secondary text-text hover:bg-theme-hover'}`}
          >Pendientes</button>
          <button
            onClick={() => setActiveTab('in_process')}
            className={`px-3 sm:px-4 py-2 rounded text-sm sm:text-base ${activeTab === 'in_process' ? 'bg-theme text-text-inverted shadow-md' : 'bg-background-secondary text-text hover:bg-theme-hover'}`}
          >En Proceso</button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 sm:px-4 py-2 rounded text-sm sm:text-base ${activeTab === 'completed' ? 'bg-theme text-text-inverted shadow-md' : 'bg-background-secondary text-text hover:bg-theme-hover'}`}
          >Completados</button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              setViewMode('card');
              localStorage.setItem('ordersViewMode', 'card');
            }}
            className={`p-2 rounded ${viewMode === 'card' ? 'bg-theme text-text-inverted' : 'bg-background-secondary text-text hover:bg-theme-hover'}`}
            title="Vista de tarjetas"
          >
            {/* Card icon */}
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>
          </button>
          <button
            onClick={() => {
              setViewMode('list');
              localStorage.setItem('ordersViewMode', 'list');
            }}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-theme text-text-inverted' : 'bg-background-secondary text-text hover:bg-theme-hover'}`}
            title="Vista de lista"
          >
            {/* List icon */}
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="2" rx="1"/><rect x="4" y="11" width="16" height="2" rx="1"/><rect x="4" y="16" width="16" height="2" rx="1"/></svg>
          </button>
        </div>
        {user?.role !== 'lector' && (
          <button
            onClick={() => setShowCreateOrder(true)}
            className="bg-theme text-text-inverted px-3 py-2 rounded hover:bg-theme-hover transition text-sm sm:text-base"
          >Crear Orden</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <input
            type="text"
            name="search"
            placeholder="Filtrar por Nombre del Cliente o Referencia"
            value={filters.search}
            onChange={handleFilterChange}
            className="p-2 border border-default rounded w-full sm:w-64 text-truncate"
            title="Filtrar por Nombre del Cliente o Referencia"
          />
          <input
            type="date"
            name="created_at"
            value={filters.created_at}
            onChange={handleFilterChange}
            className="p-2 border border-default rounded w-full sm:w-auto"
          />
          <button
            onClick={handleClearFilters}
            className="bg-background-secondary text-text px-4 py-2 rounded hover:bg-theme-hover w-full sm:w-auto btn-no-shrink"
          >Limpiar Filtros</button>
        </div>
      </div>

      {/* Multi-select bar - unified with StockView, fixed at bottom */}
      {selectedOrders.length > 0 && (() => {
        // Utilidad para calcular contraste (blanco o negro) según el fondo
        function getContrastYIQ(hexcolor) {
          hexcolor = hexcolor.replace('#', '');
          if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(x => x + x).join('');
          const r = parseInt(hexcolor.substr(0,2),16);
          const g = parseInt(hexcolor.substr(2,2),16);
          const b = parseInt(hexcolor.substr(4,2),16);
          const yiq = ((r*299)+(g*587)+(b*114))/1000;
          return yiq >= 128 ? '#111' : '#fff';
        }
        // Color de fondo de la barra (usar el estado themeColor)
        const barBg = themeColor + 'cc';
        const barBgHex = barBg.length === 9 ? barBg.slice(0,7) : barBg;
        const contrastColor = getContrastYIQ(barBgHex);
        return (
          <div className="fixed bottom-0 left-0 w-full z-50 flex justify-center items-center p-4" style={{ pointerEvents: 'none' }}>
            <div
              className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 px-4 py-2 rounded-lg shadow-lg"
              style={{ background: barBg, maxWidth: '90vw', minWidth: 320, pointerEvents: 'auto' }}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="h-5 w-5 accent-theme"
                  title="Seleccionar todo"
                  style={{ accentColor: 'var(--theme)' }}
                />
                <span className="font-semibold flex items-center gap-2" style={{ color: contrastColor }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: contrastColor }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {selectedOrders.length} seleccionadas
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="bg-theme px-3 py-1 rounded hover:bg-theme-hover"
                  style={{ color: 'var(--text-inverted)' }}
                  onClick={async () => {
                    if (!window.confirm('¿Aceptar todas las órdenes seleccionadas?')) return;
                    const ordersToAccept = selectedOrders.map(rowKey => {
                      const order = filteredOrders.find(o => getRowKey(o) === rowKey);
                      return { order, rowKey };
                    }).filter(({order}) => order);
                    await handleBatchAccept(ordersToAccept);
                  }}
                >Aceptar</button>
                <button
                  className="bg-error-600 px-3 py-1 rounded hover:bg-error-700"
                  style={{ color: 'var(--text-inverted)' }}
                  onClick={() => {
                    // Prepare orders to delete
                    const ordersToDelete = selectedOrders.map(rowKey => {
                      const order = filteredOrders.find(o => getRowKey(o) === rowKey);
                      return { order, rowKey };
                    }).filter(({order}) => order);
                    setPendingDeleteOrders(ordersToDelete);
                    setShowMultiDeleteConfirm(true);
                  }}
                >Eliminar</button>
                <button
                  className="bg-background-secondary text-text px-3 py-1 rounded hover:bg-theme-hover"
                  onClick={() => { setSelectedOrders([]); setSelectAll(false); }}
                  style={{ color: contrastColor }}
                >Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Card/List view */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
          {sortedOrders.map((order, index) => {
              const rowKey = getRowKey(order);
              const isSelected = selectedOrders.includes(rowKey);
              // Show spinner overlay if deleting or accepting
              const isDeleting = deletingOrderIds.includes(order.id);
              const isAccepting = acceptingOrderIds.includes(order.id);
              return (
                <div key={rowKey} className={`bg-card rounded-lg border border-default p-4 shadow-default relative pt-12 ${isSelected ? 'ring-2 ring-theme' : ''} ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
                  {(isDeleting || isAccepting) && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
                      <svg className="animate-spin h-8 w-8 text-theme" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                    </div>
                  )}
                  {/* Selection checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectOrder(rowKey)}
                  className="absolute left-3 top-3 w-5 h-5 accent-theme"
                  title="Seleccionar orden"
                />
                {/* Priority star */}
                <button
                  className="absolute right-3 top-3 p-0 bg-transparent border-none focus:outline-none"
                  onClick={() => handleTogglePriority(order)}
                  disabled={priorityLoading[rowKey]}
                  title={order.is_priority ? 'Quitar prioridad' : 'Marcar como prioridad'}
                >
                  {priorityLoading[rowKey] ? (
                    <svg className="w-6 h-6 animate-spin text-theme" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                  ) : (
                    <svg className={`w-6 h-6 ${order.is_priority ? 'text-yellow-400' : 'text-gray-300'} transition`} fill={order.is_priority ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  )}
                </button>
                {/* Card content */}
                {order.user_id === null || order.client_name === 'Stock' ? (
                  <div className="cursor-pointer" onClick={() => setShowOrderDetails(order)}>
                    <h3 className="text-lg font-semibold text-text">Ref: {order.item.reference}</h3>
                    <p className="text-text-muted">Color: {order.item.color}</p>
                    <p className="text-text-muted">
                      Tallas: {Object.entries(order.item.sizes).filter(([_, stock]) => stock > 0).map(([size, stock]) => `${size}: ${stock}`).join(', ')}
                    </p>
                    <p className="text-text-muted">Cliente: {order.client_name}</p>
                    <p className="text-text-muted">Creado: {new Date(order.created_at).toLocaleDateString()}</p>
                    <p className="text-text-muted">Límite: {new Date(order.deadline).toLocaleDateString()}</p>
                    {order.status === 'in_process' && (
                      <>
                        <p className="text-text-muted">Días transcurridos: {getDaysSinceAccepted(order.accepted_at)}</p>
                        <p className="text-text-muted">Días restantes: {getDaysUntilDeadline(order.deadline)}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="cursor-pointer" onClick={() => setShowOrderDetails(order)}>
                    <h3 className="text-lg font-semibold text-text">{order.client_name}</h3>
                    <p className="text-text-muted">Total Referencias: {order.items.length}</p>
                    <p className="text-text-muted">Total Pares: {getTotalPairs(order.items)}</p>
                    <p className="text-text-muted">Usuario: {order.users?.username || 'Desconocido'}</p>
                    <p className="text-text-muted">Creado: {new Date(order.created_at).toLocaleDateString()}</p>
                    <p className="text-text-muted">Límite: {new Date(order.deadline).toLocaleDateString()}</p>
                    {order.status === 'in_process' && (
                      <>
                        <p className="text-text-muted">Días transcurridos: {getDaysSinceAccepted(order.accepted_at)}</p>
                        <p className="text-text-muted">Días restantes: {getDaysUntilDeadline(order.deadline)}</p>
                      </>
                    )}
                  </div>
                )}
                {/* Action buttons */}
                {user?.role !== 'lector' && !isDeleting && !isAccepting && (
                  <div className="flex justify-end space-x-2 mt-2">
                    {['admin', 'produccion'].includes(user?.role) && (
                      <button
                        onClick={() =>
                          order.user_id === null || order.client_name === 'Stock'
                            ? handleDeleteOrder(order.id, order.item)
                            : handleDeleteOrder(order.id)
                        }
                        className="bg-error text-text-inverted px-2 py-1 rounded hover:bg-error-hover transition-colors"
                        title="Eliminar pedido"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    {order.status === 'pending' && ['admin', 'produccion'].includes(user?.role) && (
                      <button
                        onClick={() =>
                          order.user_id === null || order.client_name === 'Stock'
                            ? handleAcceptOrder(order.id, order.item)
                            : handleAcceptOrder(order.id)
                        }
                        className="bg-theme text-text-inverted px-2 py-1 rounded hover:bg-theme-hover flex items-center gap-1"
                        title="Aceptar pedido"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                    {order.status === 'pending' && order.client_name !== 'Stock' && order.user_id === user?.id && (
                      <button
                        onClick={() => {
                          setEditOrder(order);
                          setShowEditOrder(true);
                        }}
                        className="bg-theme text-text-inverted px-3 py-1.5 rounded hover:bg-theme-hover transition flex items-center gap-1"
                        title="Editar pedido"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {order.status === 'in_process' && ['admin', 'produccion'].includes(user?.role) && (
                      <button
                        onClick={() => handleCompleteOrder(order.id)}
                        className="bg-theme text-text-inverted px-2 py-1 rounded hover:bg-theme-hover flex items-center gap-1"
                        title="Marcar como completado"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // List view
        <div className="overflow-x-auto pb-20">
          <table className="min-w-full border border-default rounded-lg bg-card">
            <thead className="bg-theme text-text-inverted">
              <tr>
                <th className="p-2 text-center"><input type="checkbox" checked={selectAll} onChange={handleSelectAll} /></th>
                <th className="p-2 text-center">Prioridad</th>
                <th className="p-2 text-center">Cliente</th>
                <th className="p-2 text-center">Producto</th>
                <th className="p-2 text-center">Referencias</th>
                <th className="p-2 text-center">Pares</th>
                <th className="p-2 text-center">Usuario</th>
                <th className="p-2 text-center">Creado</th>
                <th className="p-2 text-center">Límite</th>
                <th className="p-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => {
                const rowKey = getRowKey(order);
                const isSelected = selectedOrders.includes(rowKey);
                return (
                  <tr key={rowKey} className={isSelected ? 'bg-theme/10' : ''}>
                    <td className="p-2 text-center">
                      <input type="checkbox" checked={isSelected} onChange={() => handleSelectOrder(rowKey)} />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        className="p-0 bg-transparent border-none focus:outline-none"
                        onClick={() => handleTogglePriority(order)}
                        disabled={priorityLoading[rowKey]}
                        title={order.is_priority ? 'Quitar prioridad' : 'Marcar como prioridad'}
                      >
                        {priorityLoading[rowKey] ? (
                          <svg className="w-5 h-5 animate-spin text-theme" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                        ) : (
                          <svg className={`w-5 h-5 ${order.is_priority ? 'text-yellow-400' : 'text-gray-300'} transition`} fill={order.is_priority ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="p-2 text-left table-cell-truncate">{order.client_name === 'Stock' || order.user_id === null ? 'Sistema' : order.client_name}</td>
                    <td className="p-2 text-left table-cell-truncate">
                      {order.user_id === null || order.client_name === 'Stock'
                        ? `${order.item.reference} / ${order.item.color}`
                        : order.items && order.items.length > 0
                          ? order.items.map((item, idx) => (
                              <div key={idx} className="whitespace-nowrap text-truncate">{item.reference} / {item.color}</div>
                            ))
                          : <span className="text-text-muted">—</span>}
                    </td>
                    <td className="p-2 text-center">
                      {order.user_id === null || order.client_name === 'Stock'
                        ? 1
                        : order.items.length}
                    </td>
                    <td className="p-2 text-center">
                      {order.user_id === null || order.client_name === 'Stock'
                        ? Object.values(order.item.sizes).reduce((a, b) => a + b, 0)
                        : getTotalPairs(order.items)}
                    </td>
                    <td className="p-2 text-left table-cell-truncate">{order.users?.username || (order.user_id === null || order.client_name === 'Stock' ? 'Sistema' : 'Desconocido')}</td>
                    <td className="p-2 text-center table-cell-truncate">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="p-2 text-center table-cell-truncate">{new Date(order.deadline).toLocaleDateString()}</td>
                    <td className="p-2 text-center">
                      <div className="flex gap-1">
                        <button
                          className="bg-background-secondary text-theme px-2 py-1 rounded hover:bg-theme-hover"
                          onClick={() => setShowOrderDetails(order)}
                          title="Ver detalles"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                        </button>
                        {user?.role !== 'lector' && [
                          ['admin', 'produccion'].includes(user?.role) && (
                            <button
                              key="del"
                              onClick={() =>
                                order.user_id === null || order.client_name === 'Stock'
                                  ? handleDeleteOrder(order.id, order.item)
                                  : handleDeleteOrder(order.id)
                              }
                              className="bg-error-600 text-text-inverted px-2 py-1 rounded hover:bg-error-700"
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          ),
                          order.status === 'pending' && ['admin', 'produccion'].includes(user?.role) && (
                            <button
                              key="accept"
                              onClick={() =>
                                order.user_id === null || order.client_name === 'Stock'
                                  ? handleAcceptOrder(order.id, order.item)
                                  : handleAcceptOrder(order.id)
                              }
                              className="bg-theme text-text-inverted px-2 py-1 rounded hover:bg-theme-hover"
                              title="Aceptar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </button>
                          ),
                          order.status === 'pending' && order.client_name !== 'Stock' && order.user_id === user?.id && (
                            <button
                              key="edit"
                              onClick={() => {
                                setEditOrder(order);
                                setShowEditOrder(true);
                              }}
                              className="bg-theme text-text-inverted px-3 py-1.5 rounded hover:bg-theme-hover transition"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" /></svg>
                            </button>
                          ),
                          order.status === 'in_process' && ['admin', 'produccion'].includes(user?.role) && (
                            <button
                              key="complete"
                              onClick={() => handleCompleteOrder(order.id)}
                              className="bg-theme text-text-inverted px-2 py-1 rounded hover:bg-theme-hover"
                              title="Completado"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </button>
                          ),
                        ].filter(Boolean)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateOrder && (
        <div className="fixed inset-0 flex items-center justify-center z-40" style={{background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)'}}>
            <div className="bg-card p-4 sm:p-6 rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" style={{background: 'var(--card)'}}>
              <h3 className="text-xl font-semibold text-theme mb-4">Crear Nueva Orden</h3>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-text">Nombre del Cliente</label>
                  <input
                    type="text"
                    value={customerSearch || newOrder.client_name}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 150)}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      setNewOrder({ ...newOrder, client_name: e.target.value });
                      setCustomerDropdownOpen(true);
                      setCustomerDropdownIndex(0);
                    }}
                    className="w-full p-2 border border-default rounded"
                    required
                    autoComplete="off"
                  />
                  {customerDropdownOpen && filteredCustomers.length > 0 && (
                    <ul className="absolute left-0 right-0 bg-card border border-default rounded shadow-lg z-30 max-h-48 overflow-y-auto mt-1">
                      {filteredCustomers.map((customer, idx) => (
                        <li
                          key={customer.id}
                          className={`px-3 py-2 cursor-pointer ${idx === customerDropdownIndex ? 'bg-theme text-text-inverted' : 'hover:bg-background-secondary'}`}
                    onMouseDown={() => {
                      setNewOrder({ ...newOrder, client_name: customer.name, customer_id: customer.id });
                      setCustomerSearch(customer.name);
                      setCustomerDropdownOpen(false);
                    }}
                        >
                          {customer.name}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => { setShowCreateOrder(false); setShowNewCustomerForm(true); }}
                    className="mt-2 text-sm text-theme font-semibold underline bg-background-secondary hover:text-text-inverted hover:bg-theme transition-colors px-2 py-1 rounded"
                  >
                    + Crear Cliente
                  </button>
                </div>
              <div>
                <label className="block text-text">Fecha Límite</label>
                <input
                  type="date"
                  value={newOrder.deadline}
                  onChange={(e) => setNewOrder({ ...newOrder, deadline: e.target.value })}
                  className="w-full p-2 border border-default rounded"
                  required
                />
              </div>
              <div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!newOrder.countsAsSale}
                    onChange={e => setNewOrder({ ...newOrder, countsAsSale: e.target.checked })}
                    className="accent-theme"
                  />
                  <span className="text-text">¿Esta orden cuenta como una venta?</span>
                </label>
              </div>
              {newOrder.countsAsSale && (
                <div>
                  <label className="block text-text">Monto pagado por el cliente</label>
                  <input
                    type="number"
                    min="0"
                    value={newOrder.paid_amount}
                    onChange={e => setNewOrder({ ...newOrder, paid_amount: e.target.value })}
                    className="w-full p-2 border border-default rounded"
                    placeholder="Ej: 150000"
                  />
                </div>
              )}
              <div>
                <label className="block text-text">Observaciones Generales</label>
                <textarea
                  value={newOrder.observations}
                  onChange={(e) => setNewOrder({ ...newOrder, observations: e.target.value })}
                  className="w-full p-2 border border-default rounded"
                />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-theme mb-2">Referencias Agregadas</h4>
                {newOrder.items.length === 0 ? (
                  <p className="text-text-muted">No hay referencias agregadas.</p>
                ) : (
                  <div className="border border-default rounded max-h-[40vh] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="sticky top-0 bg-theme text-text-inverted z-20">
                        <tr>
                          <th className="p-2 border-default text-center">Referencia</th>
                          <th className="p-2 border-default text-center">Color</th>
                          <th className="p-2 border-default text-center">Tallas</th>
                          <th className="p-2 border-default text-center">Observación</th>
                          <th className="p-2 border-default text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newOrder.items.map((item, index) => (
                          <tr key={index} className="border-t border-default">
                            <td className="p-2 text-text text-left">{item.reference}</td>
                            <td className="p-2 text-text text-left">{item.color}</td>
                            <td className="p-2 text-text text-center">
                              {Object.entries(item.sizes)
                                .filter(([_, stock]) => stock > 0)
                                .map(([size, stock]) => `${size}: ${stock}`)
                                .join(', ')}
                            </td>
                            <td className="p-2 text-text">{item.observation || 'N/A'}</td>
                            <td className="p-2">
                              <button
                                onClick={() => {
                                  const updatedItems = newOrder.items.filter((_, i) => i !== index);
                                  setNewOrder({ ...newOrder, items: updatedItems });
                                }}
                                className="bg-error-600 text-text-inverted px-2 py-1 rounded hover:bg-error-700"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button
                  onClick={() => { setShowAddReference(true); }}
                  className="mt-2 bg-theme text-text-inverted p-2 rounded hover:bg-theme-hover"
                >
                  + Agregar Referencia
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
              <button
                onClick={() => setShowCreateOrder(false)}
                className="bg-background-secondary text-text px-4 py-2 rounded hover:bg-theme-hover"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateOrder}
                className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewCustomerForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)'}}>
          <div className="bg-card p-4 sm:p-6 rounded-lg shadow-default w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" style={{background: 'var(--card)'}}>
            <h3 className="text-xl font-semibold text-theme mb-4">Nuevo Cliente</h3>
            {error && <p className="text-error-600 mb-4">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-text mb-1 font-medium">Nombre *</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="p-2 border border-default rounded w-full"
                />
              </div>
              <div>
                <label className="block text-text mb-1 font-medium">Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="p-2 border border-default rounded w-full"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-text mb-1 font-medium">Tipo de Documento *</label>
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
                  <label className="block text-text mb-1 font-medium">Documento *</label>
                  <input
                    type="text"
                    value={newCustomer.document}
                    onChange={(e) => setNewCustomer({ ...newCustomer, document: e.target.value })}
                    className="p-2 border border-default rounded w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-text mb-1 font-medium">Teléfono</label>
                  <input
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="p-2 border border-default rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-text mb-1 font-medium">Ciudad</label>
                  <input
                    type="text"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    className="p-2 border border-default rounded w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-text mb-1 font-medium">Dirección</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="p-2 border border-default rounded w-full"
                />
              </div>
              <div>
                <label className="block text-text mb-1 font-medium">Notas</label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  className="p-2 border border-default rounded w-full"
                  rows="3"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-6">
              <button onClick={() => { setShowNewCustomerForm(false); setShowCreateOrder(true); }} className="bg-background-secondary text-text px-4 py-2 rounded hover:bg-theme-hover">
                Cancelar
              </button>
              <button onClick={handleAddNewCustomer} className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditOrder && editOrder && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)'}}>
          <div className="bg-card p-4 sm:p-6 rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-theme mb-4">Editar Orden</h3>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-text">Nombre del Cliente</label>
                <input
                  type="text"
                  value={customerSearch || editOrder.client_name}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 150)}
                  onChange={e => {
                    setCustomerSearch(e.target.value);
                    setEditOrder({ ...editOrder, client_name: e.target.value });
                    setCustomerDropdownOpen(true);
                    setCustomerDropdownIndex(0);
                  }}
                  className="w-full p-2 border border-default rounded"
                  required
                  autoComplete="off"
                />
                {customerDropdownOpen && filteredCustomers.length > 0 && (
                  <ul className="absolute left-0 right-0 bg-card border border-default rounded shadow-lg z-30 max-h-48 overflow-y-auto mt-1">
                    {filteredCustomers.map((customer, idx) => (
                      <li
                        key={customer.id}
                        className={`px-3 py-2 cursor-pointer ${idx === customerDropdownIndex ? 'bg-theme text-text-inverted' : 'hover:bg-background-secondary'}`}
                        onMouseDown={() => {
                          setEditOrder({ ...editOrder, client_name: customer.name });
                          setCustomerSearch(customer.name);
                          setCustomerDropdownOpen(false);
                        }}
                      >
                        {customer.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editOrder.countsAsSale}
                    onChange={e => setEditOrder({ ...editOrder, countsAsSale: e.target.checked })}
                    className="accent-theme"
                  />
                  <span className="text-text">¿Esta orden cuenta como una venta?</span>
                </label>
              </div>
              <div>
                <label className="block text-text">Fecha Límite</label>
                <input
                  type="date"
                  value={editOrder.deadline}
                  onChange={(e) => setEditOrder({ ...editOrder, deadline: e.target.value })}
                  className="w-full p-2 border border-default rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-text">Observaciones Generales</label>
                <textarea
                  value={editOrder.observations}
                  onChange={(e) => setEditOrder({ ...editOrder, observations: e.target.value })}
                  className="w-full p-2 border border-default rounded"
                />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-theme mb-2">Referencias Agregadas</h4>
                {editOrder.items.length === 0 ? (
                  <p className="text-text-muted">No hay referencias agregadas.</p>
                ) : (
                  <div className="border border-default rounded max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-theme text-text-inverted z-20">
                        <tr>
                          <th className="p-2 border-default">Referencia</th>
                          <th className="p-2 border-default">Color</th>
                          <th className="p-2 border-default">Tallas</th>
                          <th className="p-2 border-default">Observación</th>
                          <th className="p-2 border-default"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {editOrder.items.map((item, index) => (
                          <tr key={index} className="border-t border-default">
                            <td className="p-2 text-text">{item.reference}</td>
                            <td className="p-2 text-text">{item.color}</td>
                            <td className="p-2 text-text">
                              {Object.entries(item.sizes)
                                .filter(([_, stock]) => stock > 0)
                                .map(([size, stock]) => `${size}: ${stock}`)
                                .join(', ')}
                            </td>
                            <td className="p-2 text-text">{item.observation || 'N/A'}</td>
                            <td className="p-2">
                              <button
                                onClick={() => {
                                  const updatedItems = editOrder.items.filter((_, i) => i !== index);
                                  setEditOrder({ ...editOrder, items: updatedItems });
                                }}
                                className="bg-error text-text-inverted px-2 py-1 rounded hover:bg-error-hover transition-colors"
                                title="Eliminar item"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button
                  onClick={() => { setShowAddReference(true); }}
                  className="mt-2 bg-theme text-text-inverted p-2 rounded hover:bg-theme-hover"
                >
                  + Agregar Referencia
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowEditOrder(false);
                  setEditOrder(null);
                }}
                className="bg-background-secondary text-text px-4 py-2 rounded hover:bg-theme-hover"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditOrder}
                className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddReference && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)'}}>
          <div className="bg-card p-4 sm:p-6 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" style={{background: 'var(--card)'}}>
            <h3 className="text-xl font-semibold text-theme mb-4">Agregar Referencia</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <label className="block text-text">Referencia</label>
                  <input
                    type="text"
                    value={referenceSearch || newReference.reference}
                    onFocus={() => setReferenceDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setReferenceDropdownOpen(false), 150)}
                    onChange={e => {
                      setError('');
                      setReferenceSearch(e.target.value);
                      setNewReference({ ...newReference, reference: e.target.value });
                      setReferenceDropdownOpen(true);
                      setReferenceDropdownIndex(0);
                    }}
                    className="w-full p-2 border border-default rounded text-sm"
                    autoComplete="off"
                  />
                  {referenceDropdownOpen && filteredReferences.length > 0 && (
                    <ul className="absolute left-0 right-0 bg-card border border-default rounded shadow-lg z-30 max-h-48 overflow-y-auto mt-1">
                      {filteredReferences.map((ref, idx) => (
                        <li
                          key={ref}
                          className={`px-3 py-2 cursor-pointer ${idx === referenceDropdownIndex ? 'bg-theme text-text-inverted' : 'hover:bg-background-secondary'}`}
                          onMouseDown={() => {
                            setError('');
                            setNewReference({ ...newReference, reference: ref });
                            setReferenceSearch(ref);
                            setReferenceDropdownOpen(false);
                          }}
                        >
                          {ref}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => { setShowAddReference(false); setShowNewReferenceForm(true); }}
                    className="mt-2 text-sm text-theme font-semibold underline bg-background-secondary hover:text-text-inverted hover:bg-theme transition-colors px-2 py-1 rounded"
                  >
                    + Crear Referencia
                  </button>
                </div>
                <div className="flex-1 relative">
                  <label className="block text-text">Color</label>
                  <input
                    type="text"
                    value={colorSearch || newReference.color}
                    onFocus={() => setColorDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setColorDropdownOpen(false), 150)}
                    onChange={e => {
                      setError('');
                      setColorSearch(e.target.value);
                      setNewReference({ ...newReference, color: e.target.value });
                      setColorDropdownOpen(true);
                      setColorDropdownIndex(0);
                    }}
                    className="w-full p-2 border border-default rounded text-sm"
                    autoComplete="off"
                  />
                  {colorDropdownOpen && filteredColors.length > 0 && (
                    <ul className="absolute left-0 right-0 bg-card border border-default rounded shadow-lg z-30 max-h-48 overflow-y-auto mt-1">
                      {filteredColors.map((color, idx) => (
                        <li
                          key={color}
                          className={`px-3 py-2 cursor-pointer ${idx === colorDropdownIndex ? 'bg-theme text-text-inverted' : 'hover:bg-background-secondary'}`}
                          onMouseDown={() => {
                            setError('');
                            setNewReference({ ...newReference, color });
                            setColorSearch(color);
                            setColorDropdownOpen(false);
                          }}
                        >
                          {color}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-text mb-2">Tallas</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {sizes.map(size => (
                    <div key={size} className="flex flex-col items-center">
                      <label className="text-text-muted text-sm mb-1">{size}</label>
                      <input
                        type="number"
                        value={newReference.sizes[size]}
                        onChange={(e) => {
                          setError('');
                          setNewReference({
                            ...newReference,
                            sizes: { ...newReference.sizes, [size]: parseInt(e.target.value) || 0 },
                          });
                        }}
                        className="w-full p-1 border border-default rounded text-sm text-center"
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-text">Observación</label>
                <textarea
                  value={newReference.observation}
                  onChange={(e) => { setError(''); setNewReference({ ...newReference, observation: e.target.value }); }}
                  className="w-full p-2 border border-default rounded text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
              <button
                onClick={() => { setShowAddReference(false); if (showCreateOrder) setShowCreateOrder(true); else if (showEditOrder) setShowEditOrder(true); }}
                className="bg-background-secondary text-text px-4 py-2 rounded text-sm hover:bg-theme-hover"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddReference}
                className="bg-theme text-text-inverted px-4 py-2 rounded text-sm hover:bg-theme-hover"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewReferenceForm && (
        <div className="fixed inset-0 flex items-center justify-center z-40" style={{background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)'}}>
          <div className="bg-card p-4 sm:p-6 rounded-lg shadow-default w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-theme mb-4">Nueva Referencia</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="URL de la imagen"
                value={newReference.image_url}
                onChange={(e) => { setError(''); setNewReference({ ...newReference, image_url: e.target.value }); }}
                className="w-full p-2 border border-default rounded"
              />
              <input
                type="text"
                placeholder="Referencia"
                value={newReference.reference}
                onChange={(e) => { setError(''); setNewReference({ ...newReference, reference: e.target.value }); }}
                className="w-full p-2 border border-default rounded text-truncate"
                title="Referencia"
              />
              <input
                type="text"
                placeholder="Color"
                value={newReference.color}
                onChange={(e) => { setError(''); setNewReference({ ...newReference, color: e.target.value }); }}
                className="w-full p-2 border border-default rounded"
              />
              <input
                type="number"
                placeholder="Precio detal"
                value={newReference.price_r === 'Precio detal' ? '' : newReference.price_r}
                onChange={(e) => { setError(''); setNewReference({ ...newReference, price_r: e.target.value || 'Precio detal' }); }}
                className="w-full p-2 border border-default rounded"
              />
              <input
                type="number"
                placeholder="Precio mayorista"
                value={newReference.price_w === 'Precio mayorista' ? '' : newReference.price_w}
                onChange={(e) => { setError(''); setNewReference({ ...newReference, price_w: e.target.value || 'Precio mayorista' }); }}
                className="w-full p-2 border border-default rounded"
              />
              <div className="grid grid-cols-8 gap-2">
                {sizes.map((size) => (
                  <div key={size} className="flex flex-col items-center">
                    <label className="block text-text-muted sm:text-xs font-medium">T{size}</label>
                    <input
                      type="number"
                      value={newReference.sizes[size]}
                      onChange={(e) =>
                        {
                          setError('');
                          setNewReference({
                            ...newReference,
                            sizes: { ...newReference.sizes, [size]: parseInt(e.target.value) || 0 },
                          });
                        }
                      }
                      className="w-full p-1 border border-default rounded text-sm text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
              <button
                onClick={() => { setShowNewReferenceForm(false); setShowAddReference(true); }}
                className="bg-background-secondary text-text px-4 py-2 rounded hover:bg-theme-hover"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNewReference}
                className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showOrderDetails && (
        showOrderDetails.user_id === null || showOrderDetails.client_name === 'Stock' ? (
          <StockOrderDetailsModal order={showOrderDetails} onClose={() => setShowOrderDetails(null)} />
        ) : (
          <OrderDetailsModal order={showOrderDetails} onClose={() => setShowOrderDetails(null)} getDaysSinceAccepted={getDaysSinceAccepted} getDaysUntilDeadline={getDaysUntilDeadline} />
        )
      )}
    </div>
  );
}

export default Orders;