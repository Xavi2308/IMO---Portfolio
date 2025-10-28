import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import LanguageContext from '../context/LanguageContext';
import translations from '../translations';
import supabase from '../supabaseClient';
import { useDebounce } from '../hooks/useOptimization';
// 🚀 OPTIMIZACIÓN: Usar consultas optimizadas
import { getSubInventoryData, getAvailableLines, getSubInventoryStats } from '../hooks/optimizedQueries';
// 🏢 CONFIGURACIÓN: Acceso a configuración de empresa
import { useAuth } from '../contexts/AuthContext';
import { ProductImage } from './LazyImage';
import OptimizedProductImage from './OptimizedProductImage';
import VirtualizedSubInventoryTable from './VirtualizedSubInventoryTable';
import Pagination from './Pagination';
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

// Componente para edición inline de precios
const PriceEditor = ({ initialValue, onSave, onCancel }) => {
  const { lang } = useContext(LanguageContext);
  const [value, setValue] = useState(initialValue || '');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    await onSave(value);
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center space-x-1">
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={handleKeyPress}
        onBlur={handleSave}
        className="w-20 px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-theme"
        disabled={isLoading}
        placeholder="0"
      />
      <button
        onClick={handleSave}
        disabled={isLoading}
        className="text-green-600 hover:text-green-800 p-1 disabled:opacity-50"
        title={translations[lang]?.save_price || "Guardar precio"}
      >
        ✓
      </button>
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
        title={translations[lang]?.cancel_price || "Cancelar edición"}
      >
        ✗
      </button>
    </div>
  );
};
const SubInventoryManagement = ({ logMovement, setError, errorMessage, setShowInventory, user }) => {
  const { lang } = useContext(LanguageContext);
  const { company } = useAuth();
  
  // 🏢 ETIQUETAS DINÁMICAS: Basadas en configuración de empresa
  const dynamicLabels = useMemo(() => {
    const productType = company?.settings?.product_type || 'custom';
    const hasSizes = company?.settings?.has_sizes || false;
    
    // Etiquetas según tipo de producto
    const labelsByType = {
      shoes: {
        units: 'pares',
        unitsSingle: 'par',
        variations: 'tallas',
        variationsSingle: 'talla',
        references: 'referencias',
        referenceSingle: 'referencia',
        average: 'prom'
      },
      glasses: {
        units: 'unidades',
        unitsSingle: 'unidad',
        variations: 'modelos',
        variationsSingle: 'modelo',
        references: 'referencias',
        referenceSingle: 'referencia',
        average: 'prom'
      },
      clothing: {
        units: 'prendas',
        unitsSingle: 'prenda',
        variations: 'tallas',
        variationsSingle: 'talla',
        references: 'referencias',
        referenceSingle: 'referencia',
        average: 'prom'
      },
      custom: {
        units: hasSizes ? 'unidades' : 'productos',
        unitsSingle: hasSizes ? 'unidad' : 'producto',
        variations: hasSizes ? 'variaciones' : 'tipos',
        variationsSingle: hasSizes ? 'variación' : 'tipo',
        references: 'referencias',
        referenceSingle: 'referencia',
        average: 'prom'
      }
    };
    
    return labelsByType[productType] || labelsByType.custom;
  }, [company?.settings]);
  
  // Helper functions for VirtualizedSubInventoryTable
  const formatCurrency = useCallback((value) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(value);
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO');
  }, []);

  const handleEditClick = useCallback((item) => {
    setEditingGroup(item);
    setNewReference({
      image_url: item.image_url,
      reference: item.reference,
      color: item.color,
      line: item.line || '',
      sizes: item.sizes,
      price_r: item.price_r || 'Precio detal',
      price_w: item.price_w || 'Precio mayorista',
      created_at: item.created_at,
      created_by: user ? user.id : null,
    });
    setShowPopup(true);
  }, [user]);

  const handleDeleteClick = useCallback((productId, reference) => {
    handleDeleteReference(productId, reference);
  }, []);

  const [barcode, setBarcode] = useState('');
  const [mode, setMode] = useState('Off');
  
  // --- OPTIMIZACIÓN: Paginación State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15); // Reducido de 25 a 15 para mínimo egress
  const [filters, setFilters] = useState({ search: '', size: '', line: 'All', created_at: '' });
  
  // --- OPTIMIZACIÓN: Sort Config debe declararse antes del hook ---
  const [sortConfig, setSortConfig] = useState({
    reference: { direction: 'asc', priority: 1 },
    color: { direction: 'asc', priority: 2 },
    size: { direction: 'asc', priority: 3 },
  });
  
  // 🚀 OPTIMIZACIÓN: React Query para inventario con consultas específicas
  // Estado local para reemplazar React Query
  const [paginatedData, setPaginatedData] = useState({ data: [], totalCount: 0, totalPages: 0, hasMore: false });
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryError, setInventoryError] = useState(null);
  
  const [inventoryStats, setInventoryStats] = useState({
    totalReferences: 0,
    totalPairs: 0,
    totalVariations: 0,
    avgPairsPerReference: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);
  
  const [lines, setLines] = useState(['All']);
  const [loadingLines, setLoadingLines] = useState(false);

  // Función para recargar datos del inventario
  const refetchInventory = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingInventory(true);
    setInventoryError(null);
    
    try {
      if (!company?.id) {
        console.warn('Esperando carga de empresa para obtener inventario...');
        setPaginatedData({ data: [], count: 0, hasMore: false });
        setInventoryError(null);
        return;
      }
      const result = await getSubInventoryData(user.id, company.id, {
        page: currentPage,
        pageSize,
        filters,
        sortConfig
      });
      setPaginatedData(result);
      setInventoryError(null);
    } catch (error) {
      console.error('Error cargando inventario:', error);
      setInventoryError(error);
    } finally {
      setLoadingInventory(false);
    }
  }, [user?.id, currentPage, pageSize, filters.search, filters.size, filters.line, filters.created_at, sortConfig.reference?.direction, sortConfig.color?.direction, sortConfig.size?.direction]);

  // Cargar datos cuando cambien las dependencias
  useEffect(() => {
    refetchInventory();
  }, [refetchInventory]);

  // Cargar estadísticas
  useEffect(() => {
    if (!user?.id) return;
    
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const stats = await getSubInventoryStats(user.id);
        setInventoryStats(stats);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    
    loadStats();
  }, [user?.id]);

  // Función para recargar líneas disponibles
  const refetchLines = useCallback(async () => {
    setLoadingLines(true);
    try {
      const availableLines = await getAvailableLines();
      setLines(['All', ...availableLines]);
    } catch (error) {
      console.error('Error cargando líneas:', error);
    } finally {
      setLoadingLines(false);
    }
  }, []);

  // Cargar líneas disponibles
  useEffect(() => {
    refetchLines();
  }, [refetchLines]);
  
  // Extraer datos de la respuesta paginada
  const groupedProducts = paginatedData?.data || [];
  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = paginatedData?.totalPages || 0;
  const hasMore = paginatedData?.hasMore || false;

  // 📊 Hook para obtener conteos de productos por línea
  const [lineProductCounts, setLineProductCounts] = useState({});
  
  useEffect(() => {
    const fetchLineProductCounts = async () => {
      try {
        const { data: lineCounts, error } = await supabase
          .from('products')
          .select('line')
          .not('line', 'is', null)
          .neq('line', '');

        if (error) throw error;

        // Contar productos por línea
        const counts = {};
        lineCounts.forEach(product => {
          if (product.line && product.line !== 'Sin línea') {
            counts[product.line] = (counts[product.line] || 0) + 1;
          }
        });

        setLineProductCounts(counts);
      } catch (err) {
        console.error('Error al obtener conteos por línea:', err);
      }
    };

    fetchLineProductCounts();
  }, [groupedProducts]); // Refrescar cuando cambien los productos

  // --- OPTIMIZACIÓN: Estado separado para búsqueda con debounce ---
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300); // 300ms delay
  
  // Actualizar filters.search cuando el debounce termine y resetear página
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }));
    setCurrentPage(1); // Reset a página 1 en nueva búsqueda
  }, [debouncedSearch]);
  const [showPopup, setShowPopup] = useState(false);
  const [newReference, setNewReference] = useState({
    image_url: '',
    reference: '',
    color: '',
    line: '',
    sizes: { 34: 0, 35: 0, 36: 0, 37: 0, 38: 0, 39: 0, 40: 0, 41: 0 },
    price_r: 'Precio detal',
    price_w: 'Precio mayorista',
    created_at: new Date().toISOString(),
    created_by: user ? user.id : null,
  });
  const [editingGroup, setEditingGroup] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showInventoryScan, setShowInventoryScan] = useState(false);
  const [scannedInventory, setScannedInventory] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [changedItems, setChangedItems] = useState([]);
  const [editingPrices, setEditingPrices] = useState({}); // Para edición inline de precios
  const [showPriceModal, setShowPriceModal] = useState(false); // Modal para confirmar aplicación por línea
  const [pendingPriceUpdate, setPendingPriceUpdate] = useState(null); // Datos del precio pendiente
  // --- Image upload logic (StockView style) ---
  // --- Sticky header CSS (puedes mover esto a styles.css si prefieres global) ---
  const stickyHeaderClass = "sticky top-0 bg-white z-10";
  const [formError, setFormError] = useState("");
  // Función para sanitizar nombres de archivo
  const sanitizeFileName = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Solo letras y números
      .substring(0, 20); // Limitar longitud
  };

  // Función para comprimir imagen si excede 15MB
  const compressImage = (file, maxSizeMB = 15) => {
    return new Promise((resolve) => {
      if (file.size <= maxSizeMB * 1024 * 1024) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        // Calcular nuevas dimensiones manteniendo ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.8 // Calidad del JPEG
        );
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files ? e.target.files[0] : (e.dataTransfer && e.dataTransfer.files[0]);
    if (!file) return;
    
    try {
      // Verificar que el archivo sea una imagen
      if (!file.type.startsWith('image/')) {
        setFormError('Por favor selecciona solo archivos de imagen (JPG, PNG, etc.)');
        return;
      }

      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) throw new Error(`Error al verificar buckets: ${bucketError.message}`);
      
      const bucketExists = buckets.some(bucket => bucket.name === 'product-images');
      if (!bucketExists) {
        setFormError(translations[lang]?.bucket_not_exist || 'El bucket "product-images" no existe. Contacte al administrador.');
        return;
      }

      // Comprimir imagen si es necesario
      const compressedFile = await compressImage(file, 15);
      
      const fileExt = compressedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Sanitizar referencia y color para crear nombre de archivo válido
      const ref = sanitizeFileName(newReference.reference || 'ref');
      const color = sanitizeFileName(newReference.color || 'color');
      const timestamp = Date.now();
      const fileName = `${ref}_${color}_${timestamp}.${fileExt}`;

      // Validar que el nombre del archivo sea válido para Supabase storage
      if (fileName.length > 100) {
        const shortFileName = `${ref.substring(0, 10)}_${color.substring(0, 10)}_${timestamp}.${fileExt}`;
        fileName = shortFileName;
      }

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, compressedFile, { 
          contentType: compressedFile.type || 'image/jpeg', 
          upsert: true 
        });

      if (uploadError) throw new Error(`${translations[lang]?.error_upload_image || 'Error al subir imagen'}: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) throw new Error(translations[lang]?.error_get_public_url || 'No se pudo obtener la URL pública de la imagen.');

      setNewReference(prev => ({ ...prev, image_url: urlData.publicUrl }));
      setFormError("");
      
      // Mostrar mensaje de éxito si la imagen fue comprimida
      if (compressedFile.size < file.size) {
        const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
        console.log(`Imagen comprimida: ${originalSizeMB}MB → ${compressedSizeMB}MB`);
      }
      
    } catch (err) {
      setFormError(`${translations[lang]?.error_process_image || 'Error al procesar imagen'}: ${err.message}`);
      console.error('Image upload error:', err);
    }
  };
  const sizes = ['34', '35', '36', '37', '38', '39', '40', '41'];
  const barcodeInputRef = useRef(null);
  const tableRef = useRef(null);

  // --- OPTIMIZACIÓN: React Query realtime subscriptions ---
  useEffect(() => {
    // NO enfocar automáticamente el input de código de barras aquí
    // Solo configurar las suscripciones a cambios en tiempo real
    
    const inventoryChannel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        refetchInventory();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'variations' }, () => {
        refetchInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
    };
  }, [refetchInventory]);
  
  // Enfocar el input de código de barras solo en el montaje inicial
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []); // Array vacío para que solo se ejecute una vez

  // Handle loading and error states from React Query
  useEffect(() => {
    if (inventoryError) {
      setError(`${translations[lang]?.error_fetch_products || 'Error al obtener productos'}: ${inventoryError.message}`);
    }
  }, [inventoryError, lang, setError, translations]);

  // Initialize scannedInventory when groupedProducts loads
  useEffect(() => {
    if (groupedProducts.length > 0) {
      const initialScanned = {};
      groupedProducts.forEach(group => {
        const key = group.reference + '-' + group.color;
        initialScanned[key] = {
          reference: group.reference,
          color: group.color,
          sizes: sizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}),
          line: group.line || 'Sin línea',
        };
      });
      setScannedInventory(initialScanned);
    }
  }, [groupedProducts]);

  // --- OPTIMIZACIÓN: Los datos ya vienen filtrados y ordenados del backend ---
  // Solo necesitamos filtrado adicional por tamaño y fecha si es necesario (funcionalidades no soportadas en backend)
  const filteredGroupedProducts = useMemo(() => {
    let filtered = [...groupedProducts];
    
    // Filtro por tamaño específico (funcionalidad adicional del frontend)
    if (filters.size) {
      filtered = filtered.filter(group => 
        Object.keys(group.sizes).some(size => 
          size.includes(filters.size) && group.sizes[size] >= 1
        )
      );
    }
    
    // Filtro por fecha de creación (funcionalidad adicional del frontend)
    if (filters.created_at) {
      filtered = filtered.filter(group => 
        group.created_at && 
        new Date(group.created_at).toISOString().includes(filters.created_at)
      );
    }

    return filtered;
  }, [groupedProducts, filters.size, filters.created_at]);

  const applyFiltersAndSorting = useCallback(() => {
    // Esta función ahora es redundante ya que el useMemo maneja todo automáticamente
    // Se mantiene para compatibilidad pero el cálculo real está en el memo de arriba
  }, []);

  const handleBarcodeChange = async (e) => {
    const value = e.target.value;
    setBarcode(value);
    // Detecta y convierte formato con apóstrofes simples a guiones
    let normalizedValue = value.trim();
    // Si el formato es LUCY'AZUL GRIS'41, lo convierte a LUCY-AZUL GRIS-41
    if (/^[^']+'[^']+'[^']+$/.test(normalizedValue)) {
      normalizedValue = normalizedValue.replace(/'/g, '-');
    } else {
      // Si no, reemplaza comas y apóstrofes por guiones
      normalizedValue = normalizedValue.replace(/[,'’]/g, '-');
    }

    // Solo valida si el parámetro está completo (tiene dos guiones y la talla es válida)
    if (showInventoryScan && value && (normalizedValue.match(/-/g) || []).length === 2) {
      const [reference, color, size] = normalizedValue.split('-');
      // Solo valida si la talla es exactamente una de las permitidas
      const validSizes = ['34', '35', '36', '37', '38', '39', '40', '41'];
      if (!reference || !color || !size || !validSizes.includes(size)) return;
      try {
        const { data: variation, error } = await supabase.from('variations').select('id, stock, product_id').eq('barcode_code', normalizedValue).single();
        if (error || !variation) {
          alert(translations[lang]?.barcode_not_found?.replace('{barcode}', value) || `El código de barras "${value}" no existe en el inventario.`);
          setBarcode('');
          if (barcodeInputRef.current) barcodeInputRef.current.focus();
          return;
        }
        setScannedInventory(prev => {
          const key = reference + '-' + color;
          const current = prev[key] || {
            reference,
            color,
            sizes: sizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}),
            line: groupedProducts.find(g => g.reference === reference && g.color === color)?.line || 'Sin línea',
          };
          const newSizes = { ...current.sizes, [size]: (current.sizes[size] || 0) + 1 };
          return { ...prev, [key]: { ...current, sizes: newSizes } };
        });
        setBarcode('');
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
      } catch (err) {
        setError(`Error al procesar el código de barras: ${err.message}`);
        setBarcode('');
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
      }
    } else if ((mode === 'Cargar' || mode === 'Descargar') && value) {
      if ((normalizedValue.match(/-/g) || []).length !== 2) return;
      const [reference, color, size] = normalizedValue.split('-');
      const validSizes = ['34', '35', '36', '37', '38', '39', '40', '41'];
      if (!reference || !color || !size || !validSizes.includes(size)) return;
      try {
        const { data: variation, error } = await supabase.from('variations').select('id, stock, product_id').eq('barcode_code', normalizedValue).single();
        if (error || !variation) {
          alert(`El código de barras "${value}" no existe en el inventario.`);
          setBarcode('');
          if (barcodeInputRef.current) barcodeInputRef.current.focus();
          return;
        }
        const newStock = mode === 'Cargar' ? variation.stock + 1 : variation.stock - 1;
        if (newStock < 0) {
          alert(translations[lang]?.not_enough_stock?.replace('{stock}', variation.stock) || `No hay suficiente stock para descargar (Stock actual: ${variation.stock}).`);
          setBarcode('');
          if (barcodeInputRef.current) barcodeInputRef.current.focus();
          return;
        }
        // --- ACTUALIZACIÓN OPTIMISTA ---
        setGroupedProducts(prev => prev.map(group => {
          if (group.reference === reference && group.color === color) {
            return {
              ...group,
              sizes: {
                ...group.sizes,
                [size]: newStock
              }
            };
          }
          return group;
        }));
        // Ya no necesitamos actualizar filteredGroupedProducts ya que useMemo lo maneja automáticamente
        setBarcode('');
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
        // --- FIN ACTUALIZACIÓN OPTIMISTA ---
        // Sincroniza con la base de datos y fetch en background
        await supabase.from('variations').update({ stock: newStock }).eq('id', variation.id);
        await logMovement(variation.id, mode === 'Cargar' ? 'entrada' : 'salida', mode === 'Cargar' ? 1 : -1, 'escaneo', { reference, color, size }, null, new Date().toISOString());
        refetchInventory();
      } catch (err) {
        setError(`${translations[lang]?.error_process_barcode || 'Error al procesar el código de barras'}: ${err.message}`);
        setBarcode('');
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
      }
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'search') {
      // Para búsqueda, usar el estado separado con debounce
      setSearchInput(value);
    } else {
      // Para otros filtros, aplicar inmediatamente y resetear página
      setFilters({ ...filters, [name]: value });
      setCurrentPage(1);
    }
  };

  // --- OPTIMIZACIÓN: Función separada para manejar búsqueda ---
  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ search: '', size: '', line: 'All', created_at: '' });
    setSearchInput(''); // También limpiar el input de búsqueda
    setCurrentPage(1); // Reset página
    setSortConfig({
      reference: { direction: 'asc', priority: 1 },
      color: { direction: 'asc', priority: 2 },
      size: { direction: 'asc', priority: 3 },
    });
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        direction: prev[key].direction === 'asc' ? 'desc' : 'asc',
      },
    }));
    // Resetear a página 1 cuando se cambie el ordenamiento
    setCurrentPage(1);
  }, []);

  // --- OPTIMIZACIÓN: Handler para cambio de página ---
  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
    // Scroll al top cuando cambie de página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // --- OPTIMIZACIÓN: Handler para cambio de página size ---
  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset a página 1
  }, []);

  const handleSaveReference = async () => {
    try {
      if (!newReference.reference || !newReference.color || newReference.price_r === 'Precio detal' || newReference.price_w === 'Precio mayorista') {
        setError('La Referencia, Color, Precio Detal y Precio Mayorista son campos obligatorios.');
        return;
      }

      if (editingGroup) {
        // Actualizar el producto principal
        const { error: productError } = await supabase.from('products').update({
          image_url: newReference.image_url,
          reference: newReference.reference,
          line: newReference.line || null,
          price_r: parseFloat(newReference.price_r) || 0,
          price_w: parseFloat(newReference.price_w) || 0,
        }).eq('id', editingGroup.product_id);

        if (productError) throw productError;

        // Actualizar TODAS las variaciones con la nueva referencia y color
        for (const size of sizes) {
          const variation = editingGroup.variations[size];
          if (variation) {
            const newBarcode = `${newReference.reference}-${newReference.color}-${size}`;
            const { error: updateVariationError } = await supabase
              .from('variations')
              .update({
                color: newReference.color,
                barcode_code: newBarcode,
              })
              .eq('id', variation.variation_id);
            
            if (updateVariationError) {
              throw updateVariationError;
            }
          }
        }

        // Procesar cambios de stock (mantener lógica original)
        const stockUpdates = sizes.map(size => {
          const newStock = newReference.sizes[size] || 0;
          const variation = editingGroup.variations[size];
          const oldStock = variation ? (editingGroup.sizes[size] || 0) : 0;
          
          return {
            size,
            stock: newStock,
            variation: variation,
            oldStock: oldStock,
          };
        }).filter(({ stock, oldStock }) => stock !== oldStock); // Solo las que cambiaron el stock

        await Promise.all(stockUpdates.map(async ({ size, stock, variation, oldStock }) => {
          const stockChange = stock - oldStock;
          
          if (variation) {
            // Solo actualizar el stock si cambió
            const { error: updateStockError } = await supabase.from('variations').update({
              stock,
            }).eq('id', variation.variation_id);

            if (updateStockError) throw updateStockError;

            // Registrar movimiento individual por talla (solo para cambios reales)
            if (stockChange !== 0) {
              const movementType = stockChange > 0 ? 'entrada' : 'salida';
              await logMovement(variation.variation_id, movementType, Math.abs(stockChange), 'manual', {
                reference: newReference.reference,
                color: newReference.color,
                size,
                oldStock: oldStock,
                newStock: stock
              }, null, new Date().toISOString());
            }
          } else if (stock > 0) { // Crear nueva variación si no existe y tiene stock
            const { data: newVariation, error: insertError } = await supabase.from('variations').insert({
              product_id: editingGroup.product_id,
              color: newReference.color,
              size,
              stock,
              barcode_code: `${newReference.reference}-${newReference.color}-${size}`,
              created_at: newReference.created_at,
              created_by: user ? user.id : null,
            }).select().single();

            if (insertError) throw insertError;

            // Registrar movimiento para nueva variación
            await logMovement(newVariation.id, 'entrada', stock, 'manual', {
              reference: newReference.reference,
              color: newReference.color,
              size,
            }, null, new Date().toISOString());
          }
        }));
      } else {
        const { data: newProduct, error: productError } = await supabase.from('products').insert({
          reference: newReference.reference,
          image_url: newReference.image_url,
          line: newReference.line || null,
          price_r: parseFloat(newReference.price_r) || 0,
          price_w: parseFloat(newReference.price_w) || 0,
          created_by: user ? user.id : null,
        }).select().single();

        if (productError) throw productError;

        const newVariations = sizes
          .filter(size => newReference.sizes[size] > 0)
          .map(size => ({
            product_id: newProduct.id,
            color: newReference.color,
            size,
            stock: newReference.sizes[size],
            barcode_code: `${newReference.reference}-${newReference.color}-${size}`,
            created_at: newReference.created_at,
            created_by: user ? user.id : null,
          }));

        if (newVariations.length > 0) {
          const { data: insertedVariations, error: variationsError } = await supabase.from('variations').insert(newVariations).select();
          if (variationsError) throw variationsError;
          
          // Registrar movimientos individuales por cada variación creada
          for (const variation of insertedVariations) {
            await logMovement(variation.id, 'entrada', variation.stock, 'manual', {
              reference: newReference.reference,
              color: newReference.color,
              size: variation.size,
            }, null, new Date().toISOString());
          }
        }
      }

      setShowPopup(false);
      setEditingGroup(null);
      setNewReference({
        image_url: '',
        reference: '',
        color: '',
        line: '',
        sizes: { 34: 0, 35: 0, 36: 0, 37: 0, 38: 0, 39: 0, 40: 0, 41: 0 },
        price_r: 'Precio detal',
        price_w: 'Precio mayorista',
        created_at: new Date().toISOString(),
        created_by: user ? user.id : null,
      });
      refetchInventory();
      refetchLines();
    } catch (err) {
      setError(`Error al guardar referencia: ${err.message}`);
    }
  };

  const handleDeleteReference = async (productId, reference) => {
    try {
      await supabase.from('variations').delete().eq('product_id', productId);
      await supabase.from('products').delete().eq('id', productId);
      await logMovement(null, 'ajuste', 0, 'manual', { reference, action: 'delete' }, null, new Date().toISOString());
      refetchInventory();
      refetchLines();
    } catch (err) {
      setError(`Error al eliminar referencia: ${err.message}`);
    }
  };

  const handleAcceptInventory = () => {
    if (window.confirm('¿Desea previsualizar los cambios?')) {
      const changes = [];
      for (const key in scannedInventory) {
        const scanned = scannedInventory[key];
        const current = groupedProducts.find(g => g.reference + '-' + g.color === key) || { sizes: {} };
        sizes.forEach(size => {
          const newStock = scanned.sizes[size] || 0;
          const oldStock = current.sizes[size] || 0;
          if (newStock !== oldStock) {
            changes.push({ reference: scanned.reference, color: scanned.color, size, oldStock, newStock });
          }
        });
      }
      setChangedItems(changes);
      setShowInventoryScan(false);
      setShowSummary(true);
    }
  };

  const handleConfirmChanges = async () => {
    try {
      const updates = [];
      for (const key in scannedInventory) {
        const scanned = scannedInventory[key];
        const current = groupedProducts.find(g => g.reference + '-' + g.color === key) || { product_id: null, variations: {} };
        sizes.forEach(async size => {
          const newStock = scanned.sizes[size] || 0;
          const variation = current.variations[size];
          if (variation) {
            updates.push({ variation_id: variation.variation_id, stock: newStock });
            await logMovement(variation.variation_id, 'ajuste', newStock - (current.sizes[size] || 0), 'escaneo', { reference: scanned.reference, color: scanned.color, size }, null, new Date().toISOString());
          } else if (newStock > 0 && current.product_id) {
            updates.push({
              product_id: current.product_id,
              color: scanned.color,
              size,
              stock: newStock,
              barcode_code: `${scanned.reference}-${scanned.color}-${size}`,
              created_at: new Date().toISOString(),
              created_by: user ? user.id : null,
            });
          }
        });
      }
      await Promise.all(updates.map(update => update.variation_id
        ? supabase.from('variations').update({ stock: update.stock }).eq('id', update.variation_id)
        : supabase.from('variations').insert(update)));
      setShowSummary(false);
      setScannedInventory({});
      refetchInventory();
      refetchLines();
    } catch (err) {
      setError(`Error al aceptar inventario: ${err.message}`);
    }
  };

  const handleCancelChanges = () => {
    setShowSummary(false);
    setScannedInventory({});
    setChangedItems([]);
    setShowInventoryScan(true);
  };

  // Funciones para edición inline de precios
  const handlePriceEdit = useCallback((productId, priceType) => {
    setEditingPrices(prev => ({
      ...prev,
      [`${productId}_${priceType}`]: true
    }));
  }, []);

  const handlePriceSave = useCallback(async (productId, priceType, newPrice) => {
    try {
      const numericPrice = parseFloat(newPrice) || 0;
      
      // Encontrar el producto y su línea
      const product = groupedProducts.find(g => g.product_id === productId);
      if (!product) {
        setError('Producto no encontrado');
        return;
      }

      // Si el producto tiene línea, buscar TODOS los productos de esa línea en la BD
      if (product.line && product.line !== 'Sin línea' && product.line !== '') {
        try {
          // Consultar TODOS los productos de la misma línea desde la base de datos
          // Incluimos más información para mostrar en el modal
          const { data: allProductsInLine, error: queryError } = await supabase
            .from('products')
            .select(`
              id, 
              reference, 
              line, 
              price_r, 
              price_w,
              variations!inner (
                color
              )
            `)
            .eq('line', product.line);

          if (queryError) throw queryError;

          if (allProductsInLine && allProductsInLine.length > 1) {
            // Agrupar por referencia-color como en el componente principal
            const groupedByRefColor = {};
            allProductsInLine.forEach(prod => {
              prod.variations.forEach(variation => {
                const key = `${prod.reference}-${variation.color}`;
                if (!groupedByRefColor[key]) {
                  groupedByRefColor[key] = {
                    product_id: prod.id,
                    reference: prod.reference,
                    color: variation.color,
                    line: prod.line,
                    price_r: prod.price_r,
                    price_w: prod.price_w
                  };
                }
              });
            });

            const affectedProducts = Object.values(groupedByRefColor);

            // Mostrar modal para confirmar si aplicar a toda la línea
            setPendingPriceUpdate({
              productId,
              priceType,
              newPrice: numericPrice,
              line: product.line,
              affectedProducts: affectedProducts,
              singleProduct: product
            });
            setShowPriceModal(true);
            
            // Cerrar editor inline
            setEditingPrices(prev => ({
              ...prev,
              [`${productId}_${priceType}`]: false
            }));
            return;
          }
        } catch (err) {
          console.error('Error al consultar productos de la línea:', err);
          // Si hay error en la consulta, continuar con actualización individual
        }
      }

      // Si no hay línea o es el único producto en la línea, actualizar solo este producto
      await updateSingleProductPrice(productId, priceType, numericPrice, product);

    } catch (err) {
      const errorMsg = translations[lang]?.error_update_price || 'Error al actualizar precio';
      setError(`${errorMsg}: ${err.message}`);
    }
  }, [groupedProducts, lang, translations]);

  // Función para actualizar precio de un solo producto
  const updateSingleProductPrice = useCallback(async (productId, priceType, numericPrice, product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ [priceType]: numericPrice })
        .eq('id', productId);

      if (error) throw error;

      // Refrescar datos inmediatamente
      await refetchInventory();

      // Cerrar editor inline
      setEditingPrices(prev => ({
        ...prev,
        [`${productId}_${priceType}`]: false
      }));

      // Log del movimiento
      await logMovement(null, 'ajuste', 0, 'manual', { 
        reference: product.reference, 
        action: `price_update_${priceType}`,
        newPrice: numericPrice 
      }, null, new Date().toISOString());

      // Mostrar mensaje de éxito
      const successMsg = translations[lang]?.price_updated_successfully || 'Precio actualizado exitosamente';
      setError(`✅ ${successMsg}`);
      setTimeout(() => setError(''), 3000);

    } catch (err) {
      const errorMsg = translations[lang]?.error_update_price || 'Error al actualizar precio';
      setError(`${errorMsg}: ${err.message}`);
    }
  }, [refetchInventory, logMovement, setError, lang, translations]);

  // Función para actualizar precio de todos los productos en una línea
  const updateLinePrice = useCallback(async (line, priceType, numericPrice, affectedProducts) => {
    try {
      // En lugar de usar affectedProducts (que puede tener duplicados), 
      // hacer una consulta directa para obtener TODOS los IDs únicos de productos de esa línea
      const { data: allLineProducts, error: queryError } = await supabase
        .from('products')
        .select('id, reference')
        .eq('line', line);

      if (queryError) throw queryError;

      const uniqueProductIds = allLineProducts.map(p => p.id);
      
      // Actualizar TODOS los productos de la línea directamente
      const { error } = await supabase
        .from('products')
        .update({ [priceType]: numericPrice })
        .eq('line', line); // Usar la línea directamente en lugar de IN con IDs

      if (error) throw error;

      // Verificar que la actualización se aplicó correctamente
      const { data: verificationData, error: verifyError } = await supabase
        .from('products')
        .select('id, reference, price_r, price_w')
        .eq('line', line);
      
      if (verifyError) {
        console.error('Error al verificar actualización:', verifyError);
      }
      
      // CRÍTICO: Refrescar datos inmediatamente
      
      // Refrescar datos inmediatamente - MÚLTIPLES ESTRATEGIAS
      await refetchInventory();
      
      // También actualizar el conteo de líneas inmediatamente
      const updatedCounts = { ...lineProductCounts };
      updatedCounts[line] = uniqueProductIds.length;
      setLineProductCounts(updatedCounts);
      
      // Segundo refetch con delay para asegurar la actualización
      setTimeout(async () => {
        await refetchInventory();
      }, 1000);

      // Log del movimiento - un solo log consolidado en lugar de 204 individuales
      await logMovement(null, 'ajuste', 0, 'manual', { 
        action: `line_price_update_${priceType}`,
        line: line,
        newPrice: numericPrice,
        affectedProductsCount: uniqueProductIds.length,
        message: `Actualización masiva de precio ${priceType === 'price_r' ? 'al detal' : 'mayorista'} para ${uniqueProductIds.length} productos de la línea "${line}"`
      }, null, new Date().toISOString());

      // Mostrar mensaje de éxito
      const uniqueCount = uniqueProductIds.length;
      const priceTypeText = priceType === 'price_r' ? 'al detal' : 'mayorista';
      const successMsg = `✅ Precio ${priceTypeText} actualizado exitosamente!\n📦 ${uniqueCount} producto${uniqueCount > 1 ? 's' : ''} de la línea "${line}"\n💰 Nuevo precio: $${numericPrice.toLocaleString('es-CO')}`;
      setError(successMsg);
      setTimeout(() => setError(''), 6000);

    } catch (err) {
      const errorMsg = translations[lang]?.error_update_price || 'Error al actualizar precio';
      setError(`${errorMsg}: ${err.message}`);
    }
  }, [refetchInventory, logMovement, setError, lang, translations]);

  const handlePriceCancel = useCallback((productId, priceType) => {
    setEditingPrices(prev => ({
      ...prev,
      [`${productId}_${priceType}`]: false
    }));
  }, []);

  // Manejar confirmación del modal de precios por línea
  const handlePriceModalConfirm = useCallback(async (applyToLine) => {
    if (!pendingPriceUpdate) return;

    const { productId, priceType, newPrice, line, affectedProducts, singleProduct } = pendingPriceUpdate;

    if (applyToLine) {
      // Aplicar a toda la línea - usar línea directamente para máxima efectividad
      await updateLinePrice(line, priceType, newPrice, affectedProducts);
    } else {
      // Aplicar solo al producto individual
      await updateSingleProductPrice(productId, priceType, newPrice, singleProduct);
    }

    // Limpiar estado
    setPendingPriceUpdate(null);
    setShowPriceModal(false);
  }, [pendingPriceUpdate, updateLinePrice, updateSingleProductPrice]);

  const handlePriceModalCancel = useCallback(() => {
    setPendingPriceUpdate(null);
    setShowPriceModal(false);
  }, []);

  return (
    <div className="bg-background p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold mb-3 flex flex-wrap items-center gap-2">
          <span className="w-8 h-8 text-theme inline-block align-middle flex-shrink-0">
            {/* Inventory management icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 013.75 3.75v1.875C13.5 7.659 12.841 8.25 12 8.25H9.75A1.875 1.875 0 017.5 6.375v-3z" />
              <path fillRule="evenodd" d="M3.75 9.75a3 3 0 00-3 3v6.75a3 3 0 003 3h16.5a3 3 0 003-3v-6.75a3 3 0 00-3-3H3.75zM9 12.75a.75.75 0 000 1.5h.008a.75.75 0 000-1.5H9zm1.5 0a.75.75 0 000 1.5h.008a.75.75 0 000-1.5h-.008zm1.5 0a.75.75 0 000 1.5h.008a.75.75 0 000-1.5h-.008z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="flex-shrink-0">{translations[lang]?.inventory_management_title || 'Gestión de Inventarios'}</span>
        </h1>
          
        
      </div>

      {errorMessage && <p className="text-theme-c2 font-semibold mb-4">{errorMessage}</p>}

      <div className="flex items-center mb-4 space-x-4">

        <div className="flex-1">
          <input
            type="text"
            value={barcode}
            onChange={handleBarcodeChange}
            placeholder={translations[lang]?.scan_barcode_placeholder || 'Escanea el código de barras (referencia-color-talla)'}
            className="w-full p-2 border border-default rounded text-truncate"
            ref={barcodeInputRef}
            title="Escanea el código de barras (referencia-color-talla)"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <div className="bg-switch-card rounded-lg p-4 shadow-md mx-auto" style={{ maxWidth: 340 }}>
            <div className="grid grid-cols-1 gap-6 place-items-center w-full">
              {/* Switch On/Off alineado y responsivo */}
              <div className="checkbox-wrapper-35 grid grid-cols-[auto_1fr_auto] items-center gap-2 w-full max-w-xs mx-auto">
                <span className="text-sm font-medium select-none text-gray-400 dark:text-gray-400" style={{ minWidth: 40, textAlign: 'right' }}>Off</span>
                <div className="flex justify-center">
                  <input
                    id="switch-onoff"
                    className="switch"
                    type="checkbox"
                    checked={mode !== 'Off'}
                    onChange={e => {
                      setMode(e.target.checked ? 'Cargar' : 'Off');
                      // Solo enfocar si el modo está activo
                      if (e.target.checked && barcodeInputRef.current) {
                        setTimeout(() => barcodeInputRef.current.focus(), 100);
                      }
                    }}
                  />
                  <label htmlFor="switch-onoff" className="m-0"></label>
                </div>
                <span className="text-sm font-medium select-none text-gray-400 dark:text-gray-400" style={{ minWidth: 40 }}>On</span>
              </div>
              {/* Switch Cargar/Descargar alineado y responsivo */}
              {mode !== 'Off' && (
                <div className="checkbox-wrapper-35 grid grid-cols-[auto_1fr_auto] items-center gap-2 w-full max-w-xs mx-auto">
                  <span className="text-sm font-medium select-none text-gray-400 dark:text-gray-400" style={{ minWidth: 60, textAlign: 'right' }}>Cargar</span>
                  <div className="flex justify-center">
                    <input
                      id="switch-cargardescargar"
                      className="switch"
                      type="checkbox"
                      checked={mode === 'Descargar'}
                      onChange={e => {
                        setMode(e.target.checked ? 'Descargar' : 'Cargar');
                        // Solo enfocar si estamos cambiando de modo y está activo
                        if (barcodeInputRef.current) {
                          setTimeout(() => barcodeInputRef.current.focus(), 100);
                        }
                      }}
                    />
                    <label htmlFor="switch-cargardescargar" className="m-0"></label>
                  </div>
                  <span className="text-sm font-medium select-none text-gray-400 dark:text-gray-400" style={{ minWidth: 64 }}>Descargar</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => { setEditingGroup(null); setNewReference({ image_url: '', reference: '', color: '', line: '', sizes: { 34: 0, 35: 0, 36: 0, 37: 0, 38: 0, 39: 0, 40: 0, 41: 0 }, price_r: 'Precio detal', price_w: 'Precio mayorista', created_at: new Date().toISOString(), created_by: user ? user.id : null }); setShowPopup(true); }}
          className="bg-theme-c3 text-text-inverted p-2 rounded hover:bg-theme-c2"
        >
          {translations[lang]?.add_new_reference || 'Agregar Nueva Referencia'}
        </button>
        <button
          onClick={() => { setShowInventoryScan(true); refetchInventory(); }}
          className="bg-theme-c3 text-text-inverted p-2 rounded hover:bg-theme-c2"
        >
          {translations[lang]?.do_inventory || 'Hacer Inventariado'}
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-theme-c4 text-text p-2 rounded hover:bg-theme-c3"
        >
          {showFilters ? (translations[lang]?.hide_filters || 'Ocultar Filtros') : (translations[lang]?.show_filters || 'Mostrar Filtros')}
        </button>
      </div>

      {showFilters && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              name="search"
              placeholder={translations[lang]?.filter_reference_color_placeholder || 'Filtrar por Referencia o Color (ej: MC104 DIANI ROJO)'}
              value={searchInput}
              onChange={handleSearchChange}
              className="p-2 border border-default rounded w-64 text-truncate"
              title="Filtrar por Referencia o Color (ej: MC104 DIANI ROJO)"
            />
            <input
              type="text"
              name="size"
              placeholder={translations[lang]?.filter_size_placeholder || 'Filtrar por Talla (solo con existencias)'}
              value={filters.size}
              onChange={handleFilterChange}
              className="p-2 border border-default rounded text-truncate"
              title="Filtrar por Talla (solo con existencias)"
            />
            <input
              type="date"
              name="created_at"
              value={filters.created_at}
              onChange={handleFilterChange}
              className="p-1 border border-default rounded"
            />
            <button
              onClick={handleClearFilters}
              className="bg-background-secondary text-text px-4 py-2 rounded hover-bg btn-no-shrink"
              title={translations[lang]?.clear_filters || 'Limpiar Filtros'}
            >
              {translations[lang]?.clear_filters || 'Limpiar Filtros'}
            </button>
          </div>
          <div className="flex items-center space-x-2">
            {lines.map((line, index) => (
              <button
                key={index}
                onClick={() => handleFilterChange({ target: { name: 'line', value: line } })}
                className={`px-2 py-1 rounded ${filters.line === line ? 'bg-theme text-text-inverted' : 'bg-theme-c4 text-text hover:bg-theme-c3'}`}
              >
                {line}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 📊 Estadísticas del Inventario - Minimalista */}
      {!loadingStats && inventoryStats && (
        <div className="flex justify-center mb-3">
          <div className="bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-default/30 shadow-sm">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-1">
                <span className="text-theme font-medium">{inventoryStats.totalReferences || 0}</span>
                <span className="text-text-muted">{dynamicLabels.references}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-green-600 font-medium">{(inventoryStats.totalPairs || 0).toLocaleString()}</span>
                <span className="text-text-muted">{dynamicLabels.units}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-blue-600 font-medium">{inventoryStats.totalVariations || 0}</span>
                <span className="text-text-muted">{dynamicLabels.variations}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-purple-600 font-medium">{inventoryStats.avgPairsPerReference || 0}</span>
                <span className="text-text-muted">{dynamicLabels.average}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <table ref={tableRef} className="w-full border-collapse bg-card rounded-lg shadow-default overflow-x-auto">
          {/* El sticky ya está aplicado por CSS global, pero puedes dejar la clase para refuerzo */}
          <thead className="sticky top-0 z-20 bg-theme text-text-inverted">
            <tr>
              <th className="border-default p-1 text-center w-16">{translations[lang]?.image || 'Imagen'}</th>
              <th className="border-default p-1 text-center">
                <div className="flex items-center justify-center w-full">
                  <span>{translations[lang]?.reference || 'Referencia'}</span>
                  <button onClick={() => handleSort('reference')} className="focus:outline-none p-1 ml-1">
                    {sortConfig.reference.direction === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </th>
              <th className="border-default p-1 text-center">
                <div className="flex items-center justify-center w-full">
                  <span>{translations[lang]?.color || 'Color'}</span>
                  <button onClick={() => handleSort('color')} className="focus:outline-none p-1 ml-1">
                    {sortConfig.color.direction === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </th>
              {sizes.map(size => (
                <th key={size} className="border-default p-1 min-w-[35px] text-center z-20">
                  {size}
                </th>
              ))}
              <th className="border-default p-1 text-center w-24 bg-theme-c1/20">
                <div className="flex items-center justify-center">
                  <span className="font-semibold">Total {dynamicLabels.units}</span>
                </div>
              </th>
              <th className="border-default p-1 text-center w-24">{translations[lang]?.retail_price || 'Precio Detal'}</th>
              <th className="border-default p-1 text-center w-24">{translations[lang]?.wholesale_price || 'Precio Mayorista'}</th>
              <th className="border-default p-1 text-center w-20">{translations[lang]?.created_at || 'Fecha Creación'}</th>
              <th className="border-default p-1 text-center w-20">{translations[lang]?.actions || 'Acciones'}</th>
            </tr>
          </thead>
          <tbody>
            {(loadingInventory || loadingLines) ? (
              <tr>
                <td colSpan={12 + sizes.length} className="border-default p-8 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
                    <span className="ml-3 text-theme">
                      {loadingInventory ? 'Cargando inventario...' : 'Cargando líneas...'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : filteredGroupedProducts.length === 0 ? (
              <tr>
                <td colSpan={10 + sizes.length} className="text-center p-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-6xl opacity-50">📦</div>
                    <h3 className="text-xl font-medium text-text-primary">
                      ¡Es hora de agregar tu primer producto!
                    </h3>
                    <p className="text-text-muted max-w-md text-center">
                      Tu inventario está esperando. Agrega referencias, gestiona stock y haz crecer tu negocio.
                    </p>
                    <button 
                      onClick={() => setShowInventory(false)}
                      className="bg-theme text-white px-6 py-2 rounded-lg hover:bg-theme-hover transition-colors"
                    >
                      ➕ Agregar Primera Referencia
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredGroupedProducts.map((group, index) => (
                <tr key={`${group.product_id}-${group.price_r}-${group.price_w}`} className="border-t border-default hover-bg">
                  <td className="border-default p-1 text-center">
                    <OptimizedProductImage
                      imageUrl={group.image_url}
                      reference={group.reference}
                      color={group.color}
                      className="w-10 h-10 object-cover rounded mx-auto"
                    />
                  </td>
                  <td className="border-default p-1 text-center">
                    <div className="flex flex-col items-center">
                      <span>{group.reference}</span>
                    </div>
                  </td>
                  <td className="border-default p-1 text-center">{group.color}</td>
                  {sizes.map(size => (
                    <td key={size} className="border-default p-1 text-center relative">
                      <span className="highlight absolute inset-0 hidden z-5"></span>
                      <span className="relative z-15">
                        {group.sizes[size] || 0}
                      </span>
                    </td>
                  ))}
                  <td className="border-default p-1 text-center bg-theme-c1/10">
                    <div className="flex items-center justify-center">
                      <span className="font-semibold text-theme text-sm">
                        {Object.values(group.sizes || {}).reduce((sum, qty) => sum + (qty || 0), 0)}
                      </span>
                    </div>
                  </td>
                  <td className="border-default p-1 text-center">
                    {editingPrices[`${group.product_id}_price_r`] ? (
                      <PriceEditor
                        initialValue={group.price_r}
                        onSave={(value) => handlePriceSave(group.product_id, 'price_r', value)}
                        onCancel={() => handlePriceCancel(group.product_id, 'price_r')}
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <span 
                          className="text-green-600 font-medium text-sm cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 px-2 py-1 rounded transition-colors"
                          onClick={() => handlePriceEdit(group.product_id, 'price_r')}
                          title={
                            group.line && group.line !== 'Sin línea' && 
                            lineProductCounts[group.line] > 1
                              ? `${translations[lang]?.click_to_edit_retail || "Clic para editar precio detal"} (se puede aplicar a toda la línea "${group.line}" - ${lineProductCounts[group.line]} productos)`
                              : (translations[lang]?.click_to_edit_retail || "Clic para editar precio detal")
                          }
                        >
                          {formatCurrency(group.price_r)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="border-default p-1 text-center">
                    {editingPrices[`${group.product_id}_price_w`] ? (
                      <PriceEditor
                        initialValue={group.price_w}
                        onSave={(value) => handlePriceSave(group.product_id, 'price_w', value)}
                        onCancel={() => handlePriceCancel(group.product_id, 'price_w')}
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <span 
                          className="text-blue-600 font-medium text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors"
                          onClick={() => handlePriceEdit(group.product_id, 'price_w')}
                          title={
                            group.line && group.line !== 'Sin línea' && 
                            lineProductCounts[group.line] > 1
                              ? `${translations[lang]?.click_to_edit_wholesale || "Clic para editar precio mayorista"} (se puede aplicar a toda la línea "${group.line}" - ${lineProductCounts[group.line]} productos)`
                              : (translations[lang]?.click_to_edit_wholesale || "Clic para editar precio mayorista")
                          }
                        >
                          {formatCurrency(group.price_w)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="border-default p-1 text-center text-xs">
                    {group.created_at ? new Date(group.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: '2-digit', 
                      day: '2-digit'
                    }) : 'Sin fecha'}
                  </td>
                  <td className="border-default p-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setEditingGroup(group);
                          setNewReference({
                            image_url: group.image_url,
                            reference: group.reference,
                            color: group.color,
                            line: group.line || '',
                            sizes: group.sizes,
                            price_r: group.price_r || 'Precio detal',
                            price_w: group.price_w || 'Precio mayorista',
                            created_at: group.created_at,
                            created_by: user ? user.id : null,
                          });
                          setShowPopup(true);
                        }}
                        className="bg-theme text-text-inverted px-1 py-1 rounded hover:bg-theme-hover transition-colors"
                        title="Editar"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteReference(group.product_id, group.reference)}
                        className="bg-error text-text-inverted px-1 py-1 rounded hover:bg-error-hover transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- OPTIMIZACIÓN: Paginación --- */}
      {!loadingInventory && groupedProducts.length > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalCount}
            itemsPerPage={pageSize}
            loading={loadingInventory}
            showInfo={false}
          />
          
          {/* Selector de tamaño de página mejorado */}
          <div className="flex justify-center mt-6">
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Elementos por página:
              </span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
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

      {showPopup && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPopup(false);
              setEditingGroup(null);
            }
          }}
        >
          <div 
            className="bg-card p-4 rounded-lg shadow-default max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-lg font-bold mb-3 text-theme">
                {editingGroup ? 'Editar Referencia' : 'Nueva Referencia'}
              </h2>
              {errorMessage && <p className="text-theme-c2 font-semibold mb-2">{errorMessage}</p>}
              <div className="space-y-2">
                {/* Imagen: Drag & Drop/Select Upload UI */}
                <div
                  className="bg-card p-2 rounded-lg shadow-default relative border-2 border-transparent hover:border-theme dark:hover:border-text-muted transition-all text-center"
                  onDragOver={e => { e.preventDefault(); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    await handleImageUpload(e);
                  }}
                >
                  <p className="text-text mb-1">Arrastra una imagen aquí o haz clic para seleccionar</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => await handleImageUpload(e)}
                    className="hidden"
                    id="imageUpload"
                  />
                  <label htmlFor="imageUpload" className="cursor-pointer text-theme underline mt-2 inline-block">
                    Seleccionar archivo
                  </label>
                  {newReference.image_url && (
                    <div className="mt-2 flex flex-col items-center">
                      <ProductImage
                        imageUrl={newReference.image_url}
                        reference={newReference.reference}
                        color={newReference.color}
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <button
                        className="text-xs text-theme-c2 underline mt-1"
                        onClick={() => setNewReference({ ...newReference, image_url: '' })}
                        type="button"
                      >
                        Quitar imagen
                      </button>
                    </div>
                  )}
                  {formError && <p className="text-theme-c2 font-semibold mt-2">{formError}</p>}
                </div>
                <input
                  key="reference-input-stable"
                  type="text"
                  placeholder={translations[lang]?.reference || 'Referencia'}
                  value={newReference.reference || ''}
                  onChange={(e) => setNewReference(prev => ({ ...prev, reference: e.target.value }))}
                  className="w-full p-1 border border-default rounded text-sm text-truncate"
                  title="Referencia"
                  autoComplete="off"
                />
                <input
                  key="color-input-stable"
                  type="text"
                  placeholder={translations[lang]?.color || 'Color'}
                  value={newReference.color || ''}
                  onChange={(e) => setNewReference(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full p-1 border border-default rounded text-sm"
                  autoComplete="off"
                />
                <input
                  type="text"
                  placeholder={translations[lang]?.line_optional || 'Línea (opcional)'}
                  value={newReference.line}
                  onChange={(e) => {
                    const input = e.target.value;
                    const normalized = lines.find(line => line.toLowerCase() === input.toLowerCase()) || input;
                    setNewReference({ ...newReference, line: normalized });
                  }}
                  list="lines"
                  className="w-full p-1 border border-default rounded text-sm"
                />
                <datalist id="lines">
                  {lines.filter(line => line !== 'All').map(line => (
                    <option key={line} value={line} />
                  ))}
                </datalist>
                <input
                  type="number"
                  placeholder={translations[lang]?.price_r || 'Precio detal'}
                  value={newReference.price_r === 'Precio detal' ? '' : newReference.price_r}
                  onChange={(e) => setNewReference({ ...newReference, price_r: e.target.value || 'Precio detal' })}
                  className="w-full p-1 border border-default rounded text-sm"
                />
                <input
                  type="number"
                  placeholder={translations[lang]?.price_w || 'Precio mayorista'}
                  value={newReference.price_w === 'Precio mayorista' ? '' : newReference.price_w}
                  onChange={(e) => setNewReference({ ...newReference, price_w: e.target.value || 'Precio mayorista' })}
                  className="w-full p-1 border border-default rounded text-sm"
                />
                <div className="grid grid-cols-4 gap-1">
                  {sizes.map(size => (
                    <div key={size}>
                      <label className="block text-text text-xs font-medium">{translations[lang]?.size || 'Talla'} {size}</label>
                      <input
                        type="number"
                        min="0"
                        value={newReference.sizes[size]}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Permitir campo vacío, 0, o números positivos
                          if (value === '' || value === '0' || (parseInt(value) >= 0 && !isNaN(parseInt(value)))) {
                            setNewReference({ 
                              ...newReference, 
                              sizes: { 
                                ...newReference.sizes, 
                                [size]: value === '' ? 0 : parseInt(value) 
                              } 
                            });
                          }
                        }}
                        onBlur={(e) => {
                          // Asegurar que el valor sea al menos 0 al perder el foco
                          const value = parseInt(e.target.value);
                          if (isNaN(value) || value < 0) {
                            setNewReference({ 
                              ...newReference, 
                              sizes: { 
                                ...newReference.sizes, 
                                [size]: 0 
                              } 
                            });
                          }
                        }}
                        className="w-full p-1 border border-default rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-3">
              <button
                onClick={() => { setShowPopup(false); setEditingGroup(null); }}
                className="bg-background-secondary text-text px-2 py-1 rounded text-sm hover-bg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveReference}
                className="bg-theme-c3 text-text-inverted px-2 py-1 rounded text-sm hover:bg-theme-c2"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showInventoryScan && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-card rounded-lg shadow-default w-full max-w-7xl max-h-[95vh] flex flex-col">
            <div className="sticky top-0 bg-card p-4 border-b border-default rounded-t-lg z-30">
              <h2 className="text-xl font-bold mb-4 text-theme">Inventario</h2>
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={barcode}
                  onChange={handleBarcodeChange}
                  placeholder="Escanea el código de barras (referencia-color-talla)"
                  className="flex-1 p-2 border border-default rounded text-truncate"
                  ref={barcodeInputRef}
                  title="Escanea el código de barras (referencia-color-talla)"
                />
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleSort('reference')}
                    className="bg-background-secondary text-text px-3 py-2 rounded hover-bg whitespace-nowrap"
                  >
                    Ref: {sortConfig.reference.direction === 'asc' ? 'A-Z' : 'Z-A'}
                  </button>
                  <button
                    onClick={() => handleSort('color')}
                    className="bg-background-secondary text-text px-3 py-2 rounded hover-bg whitespace-nowrap"
                  >
                    Color: {sortConfig.color.direction === 'asc' ? 'A-Z' : 'Z-A'}
                  </button>
                  <button
                    onClick={() => handleSort('size')}
                    className="bg-background-secondary text-text px-3 py-2 rounded hover-bg whitespace-nowrap"
                  >
                    Talla: {sortConfig.size.direction === 'asc' ? 'A-Z' : 'Z-A'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">
                <div className="bg-background-secondary rounded-lg p-4 flex flex-col">
                  <h3 className="text-lg font-bold mb-3 text-text">Inventario Actual</h3>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse bg-card rounded-lg shadow-default">
                      <thead className="sticky top-0 bg-theme text-text-inverted z-20">
                        <tr>
                          <th className="border-default p-1 text-center min-w-[80px] sticky left-0 bg-theme z-20">Referencia</th>
                          <th className="border-default p-1 text-center min-w-[80px] sticky left-[80px] bg-theme z-20">Color</th>
                          {sizes.map(size => (
                            <th key={size} className="border-default p-1 min-w-[35px] text-center bg-theme">{size}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGroupedProducts.map(group => (
                          <tr key={group.reference + '-' + group.color} className="border-t border-default hover-bg">
                            <td className="border-default p-1 text-center table-cell-truncate sticky left-0 bg-card z-10">{group.reference}</td>
                            <td className="border-default p-1 text-center table-cell-truncate sticky left-[80px] bg-card z-10">{group.color}</td>
                            {sizes.map(size => {
                              const scannedKey = group.reference + '-' + group.color;
                              const scannedStock = scannedInventory[scannedKey]?.sizes[size] || 0;
                              const currentStock = group.sizes[size] || 0;
                              const hasChanged = scannedStock !== currentStock;
                              return (
                                <td key={size} className="border-default p-1 text-center relative group">
                                  <span className={hasChanged ? 'cursor-pointer underline text-theme font-bold' : ''}>
                                    {currentStock}
                                  </span>
                                  {hasChanged && (
                                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-text-inverted text-xs rounded p-1 whitespace-nowrap z-30">
                                      Tenías {currentStock} y ahora tienes {scannedStock}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="bg-background-secondary rounded-lg p-4 flex flex-col">
                  <h3 className="text-lg font-bold mb-3 text-text">Inventario Escaneado</h3>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse bg-card rounded-lg shadow-default">
                      <thead className="sticky top-0 bg-theme text-text-inverted z-20">
                        <tr>
                          <th className="border-default p-1 text-center min-w-[80px] sticky left-0 bg-theme z-20">Referencia</th>
                          <th className="border-default p-1 text-center min-w-[80px] sticky left-[80px] bg-theme z-20">Color</th>
                          {sizes.map(size => (
                            <th key={size} className="border-default p-1 min-w-[35px] text-center bg-theme">{size}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(scannedInventory)
                          .sort((a, b) => {
                            const fields = Object.keys(sortConfig).sort((x, y) => sortConfig[x].priority - sortConfig[y].priority);
                            for (const field of fields) {
                              if (field === 'size') continue;
                              const valueA = (a[field] || '').toLowerCase();
                              const valueB = (b[field] || '').toLowerCase();
                              const compare = sortConfig[field].direction === 'asc'
                                ? valueA.localeCompare(valueB)
                                : valueB.localeCompare(valueA);
                              if (compare !== 0) return compare;
                            }
                            return 0;
                          })
                          .map((group, index) => (
                            <tr key={index} className="border-t border-default hover-bg">
                              <td className="border-default p-1 text-center table-cell-truncate sticky left-0 bg-card z-10">{group.reference}</td>
                              <td className="border-default p-1 text-center table-cell-truncate sticky left-[80px] bg-card z-10">{group.color}</td>
                              {sizes.map(size => (
                                <td key={size} className="border-default p-1 text-center">{group.sizes[size] || 0}</td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-card p-4 border-t border-default rounded-b-lg z-30">
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setShowInventoryScan(false)}
                  className="bg-background-secondary text-text px-4 py-2 rounded hover-bg"
                >
                  {translations[lang]?.cancel || 'Cancelar'}
                </button>
                <button
                  onClick={handleAcceptInventory}
                  className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover"
                >
                  {translations[lang]?.accept || 'Aceptar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSummary && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-card rounded-lg shadow-default w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card p-4 border-b border-default rounded-t-lg">
              <h2 className="text-xl font-bold mb-2 text-theme">{translations[lang]?.changes_summary || 'Resumen de Cambios'}</h2>
              {errorMessage && <p className="text-theme-c2 font-semibold mb-2">{errorMessage}</p>}
            </div>
            
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-card rounded-lg shadow-default">
                  <thead className="sticky top-0 bg-theme text-text-inverted z-20">
                    <tr>
                      <th className="border-default p-2 text-center">{translations[lang]?.reference || 'Referencia'}</th>
                      <th className="border-default p-2 text-center">{translations[lang]?.color || 'Color'}</th>
                      <th className="border-default p-2 text-center">{translations[lang]?.size || 'Talla'}</th>
                      <th className="border-default p-2 text-center">{translations[lang]?.old_stock || 'Stock Anterior'}</th>
                      <th className="border-default p-2 text-center">{translations[lang]?.new_stock || 'Nuevo Stock'}</th>
                      <th className="border-default p-2 text-center">{translations[lang]?.difference || 'Diferencia'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changedItems.map((item, index) => (
                      <tr key={index} className="border-t border-default hover-bg">
                        <td className="border-default p-2 text-center table-cell-truncate">{item.reference}</td>
                        <td className="border-default p-2 text-center table-cell-truncate">{item.color}</td>
                        <td className="border-default p-2 text-center">{item.size}</td>
                        <td className="border-default p-2 text-center">{item.oldStock}</td>
                        <td className="border-default p-2 text-center font-bold text-theme">{item.newStock}</td>
                        <td className={`border-default p-2 text-center font-bold ${item.newStock > item.oldStock ? 'text-green-600' : item.newStock < item.oldStock ? 'text-red-600' : 'text-text-muted'}`}>
                          {item.newStock > item.oldStock ? '+' : ''}{item.newStock - item.oldStock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                <button
                  onClick={handleCancelChanges}
                  className="bg-background-secondary text-text px-4 py-2 rounded hover-bg"
                >
                  {translations[lang]?.cancel || 'Cancelar'}
                </button>
                <button
                  onClick={handleConfirmChanges}
                  className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover"
                >
                  {translations[lang]?.confirm || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para confirmar aplicación de precio por línea */}
      {showPriceModal && pendingPriceUpdate && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-card p-6 rounded-lg shadow-default max-w-lg w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-theme rounded-full flex items-center justify-center mr-3">
                <span className="text-text-inverted text-sm">💰</span>
              </div>
              <h2 className="text-lg font-bold text-theme">
                {translations[lang]?.price_line_update_title || 'Actualizar precios por línea'}
              </h2>
            </div>
            
            <div className="mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
                <p className="text-text mb-2 flex items-center">
                  <span className="mr-2">📋</span>
                  {(translations[lang]?.apply_price_to_line_question || '¿Desea aplicar este precio a todos los productos de la línea "{line}"?')
                    .replace('{line}', pendingPriceUpdate.line)}
                </p>
                
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                    <div className="text-text-muted">Precio anterior:</div>
                    <div className="font-medium text-red-600">
                      {formatCurrency(pendingPriceUpdate.singleProduct[pendingPriceUpdate.priceType])}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                    <div className="text-text-muted">Precio nuevo:</div>
                    <div className="font-medium text-green-600">
                      {formatCurrency(pendingPriceUpdate.newPrice)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-background-secondary p-3 rounded-lg">
                <div className="text-sm text-text-muted mb-2 flex items-center">
                  <span className="mr-2">📦</span>
                  {translations[lang]?.products_affected?.replace('{count}', [...new Set(pendingPriceUpdate.affectedProducts.map(p => p.product_id))].length) || 
                   `Se actualizarán ${[...new Set(pendingPriceUpdate.affectedProducts.map(p => p.product_id))].length} productos`}:
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {/* Mostrar solo productos únicos, agrupando colores */}
                  {Object.values(
                    pendingPriceUpdate.affectedProducts.reduce((acc, product) => {
                      if (!acc[product.product_id]) {
                        acc[product.product_id] = {
                          ...product,
                          colors: [product.color]
                        };
                      } else {
                        if (!acc[product.product_id].colors.includes(product.color)) {
                          acc[product.product_id].colors.push(product.color);
                        }
                      }
                      return acc;
                    }, {})
                  ).map((product, index) => (
                    <div key={index} className="text-xs text-text flex justify-between items-center py-1 px-2 bg-white dark:bg-gray-700 rounded">
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-theme rounded-full mr-2"></span>
                        <div>
                          <div className="font-medium">{product.reference}</div>
                          <div className="text-text-muted">
                            {product.colors.length > 1 
                              ? `${product.colors.length} colores: ${product.colors.slice(0, 2).join(', ')}${product.colors.length > 2 ? '...' : ''}`
                              : product.colors[0]
                            }
                          </div>
                        </div>
                      </span>
                      <span className="text-text-muted font-mono text-right">
                        <div>{formatCurrency(product[pendingPriceUpdate.priceType])}</div>
                        <div className="text-green-600">↓ {formatCurrency(pendingPriceUpdate.newPrice)}</div>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handlePriceModalCancel}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center"
              >
                <span className="mr-1">❌</span>
                {translations[lang]?.cancel || 'Cancelar'}
              </button>
              <button
                onClick={() => handlePriceModalConfirm(false)}
                className="bg-background-secondary text-text px-4 py-2 rounded hover-bg flex items-center"
              >
                <span className="mr-1">👤</span>
                {translations[lang]?.apply_to_single || 'Solo este producto'}
              </button>
              <button
                onClick={() => handlePriceModalConfirm(true)}
                className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover flex items-center"
              >
                <span className="mr-1">📋</span>
                {translations[lang]?.apply_to_line || 'Aplicar a toda la línea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SubInventoryManagement);