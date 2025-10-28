// ========================================
// FORMULARIO DE VENTAS MEJORADO
// ========================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const ImprovedSalesForm = ({ onSaleCreated, customer = null }) => {
  const { company } = useAuth();
  const [formData, setFormData] = useState({
    customerId: customer?.id || '',
    customerName: customer?.name || '',
    saleItems: [{ reference: '', color: '', size: '', quantity: 1, unitPrice: 0 }],
    paymentProofUrl: '',
    paymentAmount: 0,
    dispatchType: 'separate', // 'separate' o 'dispatch'
    useBalance: false,
    balanceUsed: 0,
    notes: '',
    isPaymentOnly: false, // Solo pago sin referencias
    paymentOnlyAmount: 0,
    paymentOnlyDescription: '',
    promotionId: null
  });

  const [customers, setCustomers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [customerBalance, setCustomerBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Estados para búsqueda de productos
  const [availableReferences, setAvailableReferences] = useState([]);
  const [availableColors, setAvailableColors] = useState({});
  const [availableSizes, setAvailableSizes] = useState({});
  const [searchSuggestions, setSearchSuggestions] = useState({});

  // Cargar datos iniciales
  useEffect(() => {
    console.log('🚀 ImprovedSalesForm - Inicializando componente');
    fetchCustomers();
    fetchPromotions();
    fetchAvailableProducts();
  }, []);

  useEffect(() => {
    console.log('🔍 Company Context cambió:', {
      company: company,
      hasId: !!company?.id,
      companyId: company?.id,
      companyName: company?.name
    });
    
    if (company?.id) {
      console.log('🏢 Company ID detectado, recargando productos:', company.id);
      fetchAvailableProducts();
    } else {
      console.log('❌ No hay company.id disponible para cargar productos');
    }
  }, [company]);

  const fetchAvailableProducts = async () => {
    if (!company?.id) {
      console.log('❌ No hay company.id disponible:', company);
      
      // Verificación adicional: buscar empresa por nombre si no hay ID
      if (company?.name) {
        console.log('🔄 Intentando buscar empresa por nombre:', company.name);
        try {
          const { data: companyData, error } = await supabase
            .from('companies')
            .select('id, name')
            .eq('name', company.name)
            .single();
          
          if (companyData) {
            console.log('✅ Empresa encontrada por nombre:', companyData);
            // Aquí podrías usar companyData.id temporalmente
            await fetchProductsWithCompanyId(companyData.id);
            return;
          }
        } catch (err) {
          console.log('❌ Error buscando empresa por nombre:', err);
        }
      }
      
      return;
    }
    
    await fetchProductsWithCompanyId(company.id);
  };
  
  const fetchProductsWithCompanyId = async (companyId) => {
    try {
      console.log('🔍 Obteniendo TODOS los productos para búsqueda (sin paginación)...');
      console.log('🏢 Company ID siendo usado:', companyId);
      
      // PRIMERA CONSULTA: Obtener todos los IDs de productos de la empresa
      console.log('📝 Paso 1: Obteniendo productos de la empresa...');
      const { data: companyProducts, error: productsError } = await supabase
        .from('products')
        .select('id, reference')
        .eq('company_id', companyId);
      
      if (productsError) {
        console.error('❌ Error obteniendo productos:', productsError);
        return;
      }
      
      console.log('✅ Productos de la empresa:', companyProducts?.length || 0);
      
      if (!companyProducts || companyProducts.length === 0) {
        console.log('⚠️ No se encontraron productos para esta empresa');
        return;
      }
      
      // SEGUNDA CONSULTA: Obtener variaciones con stock > 0
      console.log('📝 Paso 2: Obteniendo variaciones con stock...');
      const productIds = companyProducts.map(p => p.id);
      
      const { data: variations, error } = await supabase
        .from('variations')
        .select('product_id, color, size, stock')
        .in('product_id', productIds)
        .gt('stock', 0);
      
      if (error) {
        console.error('❌ Error obteniendo variaciones:', error);
        return;
      }

      console.log('✅ Variaciones obtenidas (SIN LÍMITES):', variations?.length || 0);
      
      if (variations && variations.length > 0) {
        console.log('📋 Muestra de primeras 3 variaciones:', variations.slice(0, 3));
      }

      // Procesar datos para crear listas de sugerencias
      const references = new Set();
      const colorsByRef = {};
      const sizesByRefColor = {};

      // Crear un mapa de product_id a reference
      const productMap = {};
      companyProducts.forEach(product => {
        productMap[product.id] = product.reference;
      });
      
      console.log('🗺️ Mapa de productos creado:', Object.keys(productMap).length, 'productos');

      variations?.forEach(variation => {
        const reference = productMap[variation.product_id];
        if (reference) {
          references.add(reference);
          
          // Colores por referencia
          if (!colorsByRef[reference]) {
            colorsByRef[reference] = new Set();
          }
          colorsByRef[reference].add(variation.color);

          // Tallas por referencia y color
          const key = `${reference}-${variation.color}`;
          if (!sizesByRefColor[key]) {
            sizesByRefColor[key] = new Set();
          }
          sizesByRefColor[key].add(variation.size);
        }
      });

      // Convertir Sets a Arrays y ordenar
      const referencesArray = Array.from(references).sort();
      setAvailableReferences(referencesArray);
      
      const colorsObj = {};
      Object.keys(colorsByRef).forEach(ref => {
        colorsObj[ref] = Array.from(colorsByRef[ref]).sort();
      });
      setAvailableColors(colorsObj);

      const sizesObj = {};
      Object.keys(sizesByRefColor).forEach(key => {
        sizesObj[key] = Array.from(sizesByRefColor[key]).sort();
      });
      setAvailableSizes(sizesObj);

      console.log('🎯 RESULTADO FINAL:');
      console.log('📋 Referencias únicas encontradas:', referencesArray.length);
      console.log('🎨 Referencias con colores:', Object.keys(colorsObj).length);
      console.log('📏 Combinaciones ref-color-talla:', Object.keys(sizesObj).length);
      console.log('🔢 Primeras 5 referencias:', referencesArray.slice(0, 5));

    } catch (error) {
      console.error('❌ Error general en fetchProductsWithCompanyId:', error);
    }
  };

  const debugCompanyData = async () => {
    console.log('🐛 INICIO DEBUG COMPANY DATA');
    console.log('📋 Company desde contexto:', company);
    
    try {
      // Buscar usuario actual
      const user = supabase.auth.getUser ? await supabase.auth.getUser() : await supabase.auth.user();
      console.log('👤 Usuario actual:', user?.data?.user?.id || user?.id);
      
      const userId = user?.data?.user?.id || user?.id;
      
      if (!userId) {
        console.log('❌ No hay usuario autenticado');
        return;
      }
      
      // Buscar en tabla users
      const { data: userData } = await supabase
        .from('users')
        .select('company_id, companies(*)')
        .eq('id', userId)
        .single();
      
      console.log('🏢 Datos desde tabla users:', userData);
      
      // Buscar todas las empresas
      const { data: allCompanies } = await supabase
        .from('companies')
        .select('*')
        .limit(10);
      
      console.log('🏭 Todas las empresas (primeras 10):', allCompanies);
      
      // Si encontramos empresa por nombre
      if (company?.name) {
        const { data: companyByName } = await supabase
          .from('companies')
          .select('*')
          .eq('name', company.name)
          .single();
        
        console.log('🔍 Empresa encontrada por nombre:', companyByName);
      }
      
    } catch (error) {
      console.error('❌ Error en debug:', error);
    }
    
    console.log('🐛 FIN DEBUG COMPANY DATA');
  };

  // Cargar balance del cliente cuando se selecciona
  useEffect(() => {
    if (formData.customerId) {
      fetchCustomerBalance();
    }
  }, [formData.customerId]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, document')
        .eq('company_id', company.id)
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('company_id', company.id)
        .eq('active', true)
        .lte('start_date', new Date().toISOString().split('T')[0])
        .gte('end_date', new Date().toISOString().split('T')[0]);
      
      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      setPromotions([]);
    }
  };

  const fetchCustomerBalance = async () => {
    try {
      // Obtener cuenta activa del cliente
      const { data: account, error: accountError } = await supabase
        .from('customer_accounts')
        .select('*')
        .eq('customer_id', formData.customerId)
        .eq('status', 'open')
        .single();

      if (accountError && accountError.code !== 'PGRST116') throw accountError;

      if (account) {
        // Calcular balance usando la función SQL
        const { data: balance, error: balanceError } = await supabase
          .rpc('calculate_account_balance', { account_id_param: account.id });

        if (balanceError) throw balanceError;
        setCustomerBalance(balance[0]);
      } else {
        setCustomerBalance({ balance: 0, status: 'balanced' });
      }
    } catch (error) {
      console.error('Error fetching customer balance:', error);
      setCustomerBalance({ balance: 0, status: 'balanced' });
    }
  };

  const calculateTotal = () => {
    const itemsTotal = formData.saleItems.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );

    let total = itemsTotal;

    // Aplicar promoción si existe
    if (formData.promotionId) {
      const promotion = promotions.find(p => p.id === formData.promotionId);
      if (promotion && itemsTotal >= (promotion.min_purchase_amount || 0)) {
        if (promotion.discount_type === 'percentage') {
          total = itemsTotal * (1 - promotion.discount_value / 100);
        } else {
          total = itemsTotal - promotion.discount_value;
        }
      }
    }

    return Math.max(0, total);
  };

  const calculatePaymentNeeded = () => {
    const total = calculateTotal();
    const balanceToUse = formData.useBalance ? Math.min(customerBalance?.balance || 0, total) : 0;
    return Math.max(0, total - balanceToUse);
  };

  const addSaleItem = () => {
    setFormData(prev => ({
      ...prev,
      saleItems: [...prev.saleItems, { reference: '', color: '', size: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const removeSaleItem = (index) => {
    setFormData(prev => ({
      ...prev,
      saleItems: prev.saleItems.filter((_, i) => i !== index)
    }));
  };

  const updateSaleItem = async (index, field, value) => {
    // Si se está actualizando la cantidad, validar stock disponible
    if (field === 'quantity') {
      const currentItem = formData.saleItems[index];
      if (currentItem.reference && currentItem.color && currentItem.size) {
        try {
          const { data: variation, error } = await supabase
            .from('variations')
            .select('stock')
            .eq('product_id', (await supabase
              .from('products')
              .select('id')
              .eq('reference', currentItem.reference)
              .eq('company_id', company.id)
              .single()).data?.id)
            .eq('color', currentItem.color)
            .eq('size', currentItem.size)
            .single();

          if (error && error.code !== 'PGRST116') throw error;
          
          const availableStock = variation?.stock || 0;
          if (value > availableStock) {
            alert(`⚠️ Solo hay ${availableStock} unidades disponibles de ${currentItem.reference} - ${currentItem.color} - Talla ${currentItem.size}`);
            value = Math.max(0, Math.min(value, availableStock));
          }
        } catch (error) {
          console.error('Error validating stock:', error);
          // En caso de error, permitir el valor pero mostrar advertencia
          if (value > 0) {
            alert('⚠️ No se pudo validar el stock disponible. Verifique manualmente la disponibilidad.');
          }
        }
      }
      // Asegurar que el valor no sea negativo
      value = Math.max(0, parseInt(value) || 0);
    }

    // Actualizar el item y limpiar campos dependientes si es necesario
    setFormData(prev => ({
      ...prev,
      saleItems: prev.saleItems.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          
          // Si se cambió la referencia, limpiar color y talla
          if (field === 'reference') {
            updatedItem.color = '';
            updatedItem.size = '';
          }
          
          // Si se cambió el color, limpiar talla
          if (field === 'color') {
            updatedItem.size = '';
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const validateStockAvailability = async () => {
    const stockErrors = [];
    
    for (let i = 0; i < formData.saleItems.length; i++) {
      const item = formData.saleItems[i];
      if (item.reference && item.color && item.size && item.quantity > 0) {
        try {
          // Buscar el producto
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('id')
            .eq('reference', item.reference)
            .eq('company_id', company.id)
            .single();

          if (productError && productError.code !== 'PGRST116') continue;
          
          if (product) {
            // Buscar la variación
            const { data: variation, error: variationError } = await supabase
              .from('variations')
              .select('stock')
              .eq('product_id', product.id)
              .eq('color', item.color)
              .eq('size', item.size)
              .single();

            if (variationError && variationError.code !== 'PGRST116') continue;
            
            const availableStock = variation?.stock || 0;
            if (item.quantity > availableStock) {
              stockErrors.push(`${item.reference} - ${item.color} - Talla ${item.size}: Solo hay ${availableStock} unidades disponibles (solicitadas: ${item.quantity})`);
            }
          }
        } catch (error) {
          console.error('Error validating stock for item:', item, error);
        }
      }
    }
    
    return stockErrors;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerId) {
      newErrors.customer = 'Debe seleccionar un cliente';
    }

    if (formData.isPaymentOnly) {
      if (!formData.paymentOnlyAmount || formData.paymentOnlyAmount <= 0) {
        newErrors.paymentOnlyAmount = 'Debe ingresar un monto válido';
      }
    } else {
      // Validar items de venta
      formData.saleItems.forEach((item, index) => {
        if (!item.reference) {
          newErrors[`item_${index}_reference`] = 'Referencia requerida';
        }
        if (!item.quantity || item.quantity <= 0) {
          newErrors[`item_${index}_quantity`] = 'Cantidad debe ser mayor a 0';
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          newErrors[`item_${index}_unitPrice`] = 'Precio debe ser mayor a 0';
        }
      });
    }

    // Validar pago
    const paymentNeeded = calculatePaymentNeeded();
    if (!formData.isPaymentOnly && paymentNeeded > 0 && (!formData.paymentAmount || formData.paymentAmount < paymentNeeded)) {
      newErrors.payment = `Se necesita un pago de $${paymentNeeded.toLocaleString()}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Validar stock disponible antes de crear la venta
    if (!formData.isPaymentOnly) {
      const stockErrors = await validateStockAvailability();
      if (stockErrors.length > 0) {
        alert(`❌ No hay suficiente stock disponible:\n\n${stockErrors.join('\n')}`);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      // Generar número consecutivo
      const { data: consecutiveNumber } = await supabase.rpc('get_next_consecutive', {
        p_type: 'sale',
        p_company_id: company.id
      });

      if (formData.isPaymentOnly) {
        // Crear solo pago sin referencias
        await createPaymentOnlySale(consecutiveNumber);
      } else {
        // Crear venta normal
        await createNormalSale(consecutiveNumber);
      }

      // Limpiar formulario
      setFormData({
        customerId: customer?.id || '',
        customerName: customer?.name || '',
        saleItems: [{ reference: '', color: '', size: '', quantity: 1, unitPrice: 0 }],
        paymentProofUrl: '',
        paymentAmount: 0,
        dispatchType: 'separate',
        useBalance: false,
        balanceUsed: 0,
        notes: '',
        isPaymentOnly: false,
        paymentOnlyAmount: 0,
        paymentOnlyDescription: '',
        promotionId: null
      });

      alert('✅ Venta creada exitosamente');
      if (onSaleCreated) onSaleCreated();

    } catch (error) {
      console.error('Error creating sale:', error);
      alert('❌ Error al crear la venta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createPaymentOnlySale = async (consecutiveNumber) => {
    // Obtener o crear cuenta del cliente
    let account = await getOrCreateCustomerAccount();

    // Crear pago sin referencia
    const { error } = await supabase
      .from('payment_only_sales')
      .insert({
        account_id: account.id,
        company_id: company.id,
        amount: formData.paymentOnlyAmount,
        description: formData.paymentOnlyDescription || 'Pago sin referencia específica',
        payment_proof_url: formData.paymentProofUrl,
        consecutive_number: consecutiveNumber
      });

    if (error) throw error;
  };

  const createNormalSale = async (consecutiveNumber) => {
    // Obtener o crear cuenta del cliente
    let account = await getOrCreateCustomerAccount();

    const total = calculateTotal();
    const balanceUsed = formData.useBalance ? Math.min(customerBalance?.balance || 0, total) : 0;

    // Crear venta
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        customer_id: formData.customerId,
        account_id: account.id,
        company_id: company.id,
        consecutive_number: consecutiveNumber,
        total_value: total,
        payment_proof_url: formData.paymentProofUrl,
        payment_amount: formData.paymentAmount,
        dispatch_type: formData.dispatchType,
        is_balance_use: formData.useBalance,
        balance_used: balanceUsed,
        remaining_payment: Math.max(0, total - balanceUsed - formData.paymentAmount),
        notes: formData.notes,
        status: 'pending',
        editable: true
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Crear items de venta
    const saleItems = formData.saleItems.map(item => ({
      sale_id: sale.id,
      reference: item.reference,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.quantity * item.unitPrice
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw itemsError;

    // Si la venta es para "apartar" (separate), crear referencia del cliente
    if (formData.dispatchType === 'separate') {
      // La venta ya se creó con dispatch_type, no necesitamos lógica adicional
      console.log(`✅ Venta creada: ${sale.id} con dispatch_type: ${formData.dispatchType}`);

      console.log(`✅ Referencia creada: ${clientReference} para venta ${sale.id}`);
    }
  };

  const getOrCreateCustomerAccount = async () => {
    // Buscar cuenta abierta existente
    const { data: existingAccount } = await supabase
      .from('customer_accounts')
      .select('*')
      .eq('customer_id', formData.customerId)
      .eq('status', 'open')
      .single();

    if (existingAccount) {
      return existingAccount;
    }

    // Crear nueva cuenta
    const { data: accountNumber } = await supabase.rpc('get_next_consecutive', {
      p_type: 'account',
      p_company_id: company.id
    });

    const { data: newAccount, error } = await supabase
      .from('customer_accounts')
      .insert({
        customer_id: formData.customerId,
        company_id: company.id,
        account_number: accountNumber,
        status: 'open'
      })
      .select()
      .single();

    if (error) throw error;
    return newAccount;
  };

  return (
    <div className="bg-card rounded-lg border border-default p-6">
      <h3 className="text-lg font-semibold mb-4">Crear Venta</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selector de cliente */}
        <div>
          <label className="block text-sm font-medium mb-1">Cliente</label>
          <select
            value={formData.customerId}
            onChange={(e) => {
              setFormData(prev => ({
                ...prev,
                customerId: e.target.value,
                customerName: e.target.options[e.target.selectedIndex].text
              }));
            }}
            className="w-full p-2 border rounded-lg"
            disabled={!!customer}
          >
            <option value="">Seleccionar cliente...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {c.document}</option>
            ))}
          </select>
          {errors.customer && <p className="text-red-500 text-xs mt-1">{errors.customer}</p>}
        </div>

        {/* Balance del cliente */}
        {customerBalance && formData.customerId && (
          <div className={`p-3 rounded border ${
            customerBalance.status === 'favor' ? 'bg-green-50 border-green-200' :
            customerBalance.status === 'pending' ? 'bg-red-50 border-red-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <p className="text-sm">
              <strong>Balance actual: </strong>
              <span className={
                customerBalance.status === 'favor' ? 'text-green-600' :
                customerBalance.status === 'pending' ? 'text-red-600' :
                'text-gray-600'
              }>
                ${Math.abs(customerBalance.balance).toLocaleString()} 
                {customerBalance.status === 'favor' ? ' a favor' :
                 customerBalance.status === 'pending' ? ' pendiente' : ''}
              </span>
            </p>
          </div>
        )}



        {/* Debug temporal - remover después */}
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-yellow-800">🔍 Debug de Referencias</h4>
            <button 
              type="button" 
              onClick={fetchAvailableProducts}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              Recargar
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Referencias:</span>
              <span className="ml-2 text-green-600 font-bold">{availableReferences.length}</span>
            </div>
            <div>
              <span className="font-medium">Colores:</span>
              <span className="ml-2 text-blue-600 font-bold">{Object.keys(availableColors).length}</span>
            </div>
            <div>
              <span className="font-medium">Tallas:</span>
              <span className="ml-2 text-purple-600 font-bold">{Object.keys(availableSizes).length}</span>
            </div>
          </div>
          
          {availableReferences.length > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              <strong>Primeras referencias:</strong> {availableReferences.slice(0, 5).join(', ')}
            </div>
          )}
          
          {availableReferences.length === 0 && (
            <div className="mt-2 text-sm text-red-600">
              ⚠️ No se han cargado referencias. Revisa la consola para más detalles.
              <button
                type="button"
                onClick={debugCompanyData}
                className="ml-2 bg-red-500 text-white px-2 py-1 rounded text-xs"
              >
                Debug BD
              </button>
            </div>
          )}
        </div>

        {/* Tipo de operación */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isPaymentOnly}
              onChange={(e) => setFormData(prev => ({ ...prev, isPaymentOnly: e.target.checked }))}
            />
            <span className="text-sm">Solo pago (sin referencias específicas)</span>
          </label>
        </div>

        {/* Formulario para solo pago */}
        {formData.isPaymentOnly ? (
          <div className="space-y-3 p-4 bg-blue-50 rounded border">
            <div>
              <label className="block text-sm font-medium mb-1">Monto del pago</label>
              <input
                type="number"
                value={formData.paymentOnlyAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentOnlyAmount: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border rounded"
                min="0"
                step="0.01"
              />
              {errors.paymentOnlyAmount && <p className="text-red-500 text-xs mt-1">{errors.paymentOnlyAmount}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <input
                type="text"
                value={formData.paymentOnlyDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentOnlyDescription: e.target.value }))}
                placeholder="Ej: Abono para futuras compras"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        ) : (
          /* Formulario normal de venta */
          <div className="space-y-4">
            {/* Items de venta */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Productos</label>
                <button
                  type="button"
                  onClick={addSaleItem}
                  className="bg-theme text-white px-3 py-1 rounded text-sm"
                >
                  + Agregar producto
                </button>
              </div>
              
              {formData.saleItems.map((item, index) => (
                <div key={index} className="grid grid-cols-6 gap-2 p-3 border rounded mb-2">
                  <div>
                    <input
                      type="text"
                      value={item.reference || ''}
                      onChange={(e) => updateSaleItem(index, 'reference', e.target.value)}
                      placeholder="Referencia"
                      className="w-full p-1 border rounded text-sm"
                      list={`references-${index}`}
                    />
                    <datalist id={`references-${index}`}>
                      {availableReferences
                        .filter(ref => ref.toLowerCase().includes(item.reference.toLowerCase()))
                        .slice(0, 10)
                        .map(ref => (
                          <option key={ref} value={ref} />
                        ))
                      }
                    </datalist>
                    {errors[`item_${index}_reference`] && (
                      <p className="text-red-500 text-xs">{errors[`item_${index}_reference`]}</p>
                    )}
                  </div>
                  
                  <div>
                    <input
                      type="text"
                      value={item.color || ''}
                      onChange={(e) => updateSaleItem(index, 'color', e.target.value)}
                      placeholder="Color"
                      className="w-full p-1 border rounded text-sm"
                      list={`colors-${index}`}
                    />
                    <datalist id={`colors-${index}`}>
                      {(availableColors[item.reference] || [])
                        .filter(color => color.toLowerCase().includes(item.color.toLowerCase()))
                        .slice(0, 10)
                        .map(color => (
                          <option key={color} value={color} />
                        ))
                      }
                    </datalist>
                  </div>
                  
                  <div>
                    <input
                      type="text"
                      value={item.size || ''}
                      onChange={(e) => updateSaleItem(index, 'size', e.target.value)}
                      placeholder="Talla"
                      className="w-full p-1 border rounded text-sm"
                      list={`sizes-${index}`}
                    />
                    <datalist id={`sizes-${index}`}>
                      {(availableSizes[`${item.reference}-${item.color}`] || [])
                        .filter(size => size.toLowerCase().includes(item.size.toLowerCase()))
                        .slice(0, 10)
                        .map(size => (
                          <option key={size} value={size} />
                        ))
                      }
                    </datalist>
                  </div>
                  
                  <div>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateSaleItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full p-1 border rounded text-sm"
                    />
                    {errors[`item_${index}_quantity`] && (
                      <p className="text-red-500 text-xs">{errors[`item_${index}_quantity`]}</p>
                    )}
                    {item.reference && item.color && item.size && (
                      <StockDisplay 
                        reference={item.reference}
                        color={item.color}
                        size={item.size}
                        companyId={company?.id}
                      />
                    )}
                  </div>
                  
                  <div>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateSaleItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="Precio"
                      className="w-full p-1 border rounded text-sm"
                    />
                    {errors[`item_${index}_unitPrice`] && (
                      <p className="text-red-500 text-xs">{errors[`item_${index}_unitPrice`]}</p>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removeSaleItem(index)}
                    className="bg-red-500 text-white p-1 rounded text-sm"
                    disabled={formData.saleItems.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Promociones */}
            {promotions.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Promoción</label>
                <select
                  value={formData.promotionId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, promotionId: e.target.value || null }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Sin promoción</option>
                  {promotions.map(promo => (
                    <option key={promo.id} value={promo.id}>
                      {promo.name} - {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `$${promo.discount_value}`} descuento
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tipo de despacho */}
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de pedido</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="separate"
                    checked={formData.dispatchType === 'separate'}
                    onChange={(e) => setFormData(prev => ({ ...prev, dispatchType: e.target.value }))}
                    className="mr-2"
                  />
                  Separar/Apartar
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="dispatch"
                    checked={formData.dispatchType === 'dispatch'}
                    onChange={(e) => setFormData(prev => ({ ...prev, dispatchType: e.target.value }))}
                    className="mr-2"
                  />
                  Despachar
                </label>
              </div>
            </div>

            {/* Usar saldo a favor */}
            {customerBalance && customerBalance.balance > 0 && (
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.useBalance}
                    onChange={(e) => setFormData(prev => ({ ...prev, useBalance: e.target.checked }))}
                  />
                  <span className="text-sm">
                    Usar saldo a favor (${customerBalance.balance.toLocaleString()} disponible)
                  </span>
                </label>
              </div>
            )}

            {/* Resumen de pago */}
            <div className="p-3 bg-gray-50 rounded border">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${formData.saleItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}</span>
                </div>
                {formData.promotionId && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento:</span>
                    <span>-${(formData.saleItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) - calculateTotal()).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>${calculateTotal().toLocaleString()}</span>
                </div>
                {formData.useBalance && customerBalance.balance > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Saldo aplicado:</span>
                    <span>-${Math.min(customerBalance.balance, calculateTotal()).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-1">
                  <span>A pagar:</span>
                  <span>${calculatePaymentNeeded().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comprobante de pago */}
        <div>
          <label className="block text-sm font-medium mb-1">URL del comprobante de pago</label>
          <input
            type="url"
            value={formData.paymentProofUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, paymentProofUrl: e.target.value }))}
            placeholder="https://..."
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Monto del pago */}
        {!formData.isPaymentOnly && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Monto del pago {calculatePaymentNeeded() > 0 && `(Necesario: $${calculatePaymentNeeded().toLocaleString()})`}
            </label>
            <input
              type="number"
              value={formData.paymentAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentAmount: parseFloat(e.target.value) || 0 }))}
              min="0"
              step="0.01"
              className="w-full p-2 border rounded"
            />
            {errors.payment && <p className="text-red-500 text-xs mt-1">{errors.payment}</p>}
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows="2"
            className="w-full p-2 border rounded"
            placeholder="Observaciones adicionales..."
          />
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-theme text-white py-2 px-4 rounded-lg hover:bg-theme-hover disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear Venta'}
        </button>
      </form>
    </div>
  );
};

// Componente para mostrar stock disponible
const StockDisplay = ({ reference, color, size, companyId }) => {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reference && color && size && companyId) {
      fetchStock();
    }
  }, [reference, color, size, companyId]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      // Obtener el stock directamente desde variations
      const { data: variation, error } = await supabase
        .from('variations')
        .select('stock')
        .eq('product_id', (await supabase
          .from('products')
          .select('id')
          .eq('reference', reference)
          .eq('company_id', companyId)
          .single()).data?.id)
        .eq('color', color)
        .eq('size', size)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setStock(variation?.stock || 0);
    } catch (error) {
      console.error('Error fetching stock:', error);
      setStock(0);
    }
    setLoading(false);
  };

  if (loading) return <p className="text-xs text-gray-500">...</p>;
  
  if (stock === null) return null;

  return (
    <p className={`text-xs ${stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
      Stock: {stock}
    </p>
  );
};

export default ImprovedSalesForm;
