
import React, { useEffect, useState, useContext, useMemo } from 'react';
import LanguageContext from '../context/LanguageContext';
import translations from '../translations';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import supabase from '../supabaseClient';
import { getTextContrastClass } from '../utils/getContrastYIQ';
// 🚀 OPTIMIZACIÓN: Usar consultas optimizadas para dashboard
import { getHomeDashboardData } from '../hooks/optimizedQueries';
// 🏢 CONFIGURACIÓN: Acceso a configuración de empresa
import { useAuth } from '../contexts/AuthContext';

ChartJS.register(ArcElement, BarElement, Title, Tooltip, Legend, CategoryScale, LinearScale);

function Home({ user }) {
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
        variationsSingle: 'talla'
      },
      glasses: {
        units: 'unidades',
        unitsSingle: 'unidad',
        variations: 'modelos',
        variationsSingle: 'modelo'
      },
      clothing: {
        units: 'prendas',
        unitsSingle: 'prenda',
        variations: 'tallas',
        variationsSingle: 'talla'
      },
      custom: {
        units: hasSizes ? 'unidades' : 'productos',
        unitsSingle: hasSizes ? 'unidad' : 'producto',
        variations: hasSizes ? 'variaciones' : 'tipos',
        variationsSingle: hasSizes ? 'variación' : 'tipo'
      }
    };
    
    return labelsByType[productType] || labelsByType.custom;
  }, [company?.settings]);
  
  // Estado local para reemplazar React Query
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    totalVariations: 0,
    lowStockItems: 0
  });
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  // 🧹 Limpiar datos cuando cambie la empresa para evitar datos residuales
  useEffect(() => {
    setDashboardData({
      totalProducts: 0,
      totalVariations: 0,
      lowStockItems: 0
    });
    setDashboardError(null);
  }, [company?.id]);

  // Cargar datos del dashboard
  useEffect(() => {
    // Solo cargar cuando tengamos tanto usuario como empresa
    if (!user?.id || !company?.id) return;
    
    const loadDashboardData = async () => {
      setLoadingDashboard(true);
      setDashboardError(null);
      
      try {
        console.log(`🏠 Cargando dashboard para ${company.name} (${company.id})`);
        const data = await getHomeDashboardData(user.id, company.id);
        setDashboardData(data);
      } catch (error) {
        console.error('Error cargando dashboard:', error);
        setDashboardError(error);
      } finally {
        setLoadingDashboard(false);
      }
    };
    
    loadDashboardData();
  }, [user?.id, company?.id]); // 🛡️ CRÍTICO: Depender de ambos
  
  // Estados existentes para datos específicos
  const [topSoldItems, setTopSoldItems] = useState([]);
  const [leastSoldItems, setLeastSoldItems] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [weeklyRevenue, setWeeklyRevenue] = useState(0);
  const [userSales, setUserSales] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mensajes motivacionales traducidos
  const motivationalMessages = translations[lang]?.motivational_messages || [
    'Confía en el Señor con todo tu corazón y no te apoyes en tu propia prudencia.',
    'Encomienda al Señor tu camino; confía en Él, y Él actuará.',
    'Los que confían en el Señor son como el monte de Sion, que no se mueve, sino que permanece para siempre.',
    'Tú guardarás en completa paz a aquel cuyo pensamiento en ti persevera, porque en ti ha confiado.',
    'Echa sobre Él toda tu ansiedad, porque Él cuida de ti.'
  ];
  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, role');
      if (usersError) throw new Error(`Error al obtener usuarios: ${usersError.message}`);

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          created_by,
          created_at,
          sale_items(reference, color, size, quantity, unit_price)
        `)
        .eq('status', 'confirmed');
      if (salesError) throw new Error(`Error al obtener ventas: ${salesError.message}`);

      const userSalesMap = {};
      salesData.forEach(sale => {
        const userId = sale.created_by;
        if (userId) {
          const totalUnits = sale.sale_items.reduce((sum, item) => sum + (item.quantity || 0), 0);
          userSalesMap[userId] = (userSalesMap[userId] || 0) + totalUnits;
        }
      });

      const userSalesData = usersData.map(user => ({
        username: user.username,
        totalUnits: userSalesMap[user.id] || 0,
      })).filter(user => user.totalUnits > 0);

      setUserSales(userSalesData);

      const itemSales = salesData.reduce((acc, sale) => {
        sale.sale_items.forEach(item => {
          const { reference, color, quantity, unit_price } = item;
          if (!reference || !color || !quantity || !unit_price) {
            console.warn('Invalid sale item:', item);
            return acc;
          }
          const key = `${reference}-${color}`;
          acc[key] = acc[key] || { reference, color, quantity: 0, totalValue: 0 };
          acc[key].quantity += quantity;
          acc[key].totalValue += quantity * unit_price;
        });
        return acc;
      }, {});

      const sortedItems = Object.values(itemSales).sort((a, b) => b.quantity - a.quantity);
      setTopSoldItems(sortedItems.slice(0, 5) || []);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          reference,
          variations(color, size, created_at)
        `);
      if (productsError) throw new Error(`Error al obtener productos: ${productsError.message}`);


      // Mapear todos los productos/variaciones aunque no tengan ventas
      const allItems = productsData.reduce((acc, product) => {
        product.variations.forEach(variation => {
          const key = `${product.reference}-${variation.color}`;
          acc[key] = acc[key] || {
            reference: product.reference,
            color: variation.color,
            created_at: variation.created_at,
            quantity: itemSales[key]?.quantity || 0,
            totalValue: itemSales[key]?.totalValue || 0,
          };
        });
        return acc;
      }, {});

      // Incluir TODOS los productos, priorizando los no vendidos y luego los menos vendidos
      const leastSold = Object.values(allItems)
        .sort((a, b) => {
          // Primero: productos no vendidos (quantity = 0)
          if (a.quantity === 0 && b.quantity > 0) return -1;
          if (a.quantity > 0 && b.quantity === 0) return 1;
          // Luego: ordenar por cantidad (menor a mayor)
          return a.quantity - b.quantity;
        })
        .slice(0, 5);
      setLeastSoldItems(leastSold);

      setTotalRevenue(salesData.reduce((sum, sale) => sum + (sale.sale_items.reduce((itemSum, item) => itemSum + (item.quantity * item.unit_price || 0), 0) || 0), 0));

      // Calcular ingresos mensuales (mes actual)
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      const monthlyRevenue = salesData
        .filter(sale => {
          const saleDate = new Date(sale.created_at);
          return saleDate.getFullYear() === currentYear && saleDate.getMonth() === currentMonth;
        })
        .reduce((sum, sale) => sum + (sale.sale_items.reduce((itemSum, item) => itemSum + (item.quantity * item.unit_price || 0), 0) || 0), 0);
      
      setMonthlyRevenue(monthlyRevenue);

      // Calcular ingresos semanales (últimos 7 días)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(currentDate.getDate() - 7);
      
      const weeklyRevenue = salesData
        .filter(sale => {
          const saleDate = new Date(sale.created_at);
          return saleDate >= oneWeekAgo && saleDate <= currentDate;
        })
        .reduce((sum, sale) => sum + (sale.sale_items.reduce((itemSum, item) => itemSum + (item.quantity * item.unit_price || 0), 0) || 0), 0);
      
      setWeeklyRevenue(weeklyRevenue);
    } catch (err) {
      setError(err.message || 'Error al cargar estadísticas');
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Utilidad para obtener el valor real de una variable CSS
  const getCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // Estado para forzar actualización de los colores de la paleta
  const [paletteColors, setPaletteColors] = useState([
    getCssVar('--theme-main'),
    getCssVar('--theme-c3'),
    getCssVar('--theme-c4'),
    getCssVar('--theme-c5'),
    getCssVar('--theme-c2')
  ]);

  // Efecto: actualiza los colores de la paleta cuando cambian las variables CSS (por ejemplo, tras cambiar el color en Configuración)
  useEffect(() => {
    const updatePalette = () => {
      setPaletteColors([
        getCssVar('--theme-main'),
        getCssVar('--theme-c3'),
        getCssVar('--theme-c4'),
        getCssVar('--theme-c5'),
        getCssVar('--theme-c2')
      ]);
    };
    // Escucha cambios en el almacenamiento local (cuando se cambia el color en Configuración)
    window.addEventListener('storage', updatePalette);
    // Solo actualizar paleta en focus si estamos en web, no en Electron
    const isElectron = !!window.electronAPI;
    if (!isElectron) {
      window.addEventListener('focus', updatePalette);
    }
    // Llama al montar
    updatePalette();
    return () => {
      window.removeEventListener('storage', updatePalette);
      if (!isElectron) {
        window.removeEventListener('focus', updatePalette);
      }
    };
  }, []);

  const getBarColors = (count) => {
    // Rota la paleta para la cantidad de barras
    return Array.from({ length: count }, (_, i) => paletteColors[i % paletteColors.length]);
  };

  const salesData = {
    labels: userSales.map(user => user.username),
    datasets: [
      {
        label: `${dynamicLabels.units.charAt(0).toUpperCase() + dynamicLabels.units.slice(1)} Vendidos`,
        data: userSales.map(user => user.totalUnits),
        backgroundColor: getBarColors(userSales.length),
        borderColor: getBarColors(userSales.length),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const topSoldData = {
    labels: topSoldItems.map(item => `${item.reference} - ${item.color}`).filter(label => label),
    datasets: [
      {
        data: topSoldItems.map(item => item.quantity || 0),
        backgroundColor: paletteColors,
        borderColor: [
          paletteColors[1],
          paletteColors[0],
          paletteColors[2],
          paletteColors[4],
          paletteColors[3]
        ],
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  // Si todos los valores son 0, mostrar barras dummy grises con valor 0.1 para visualización
  const leastSoldLabels = leastSoldItems.map(item => `${item.reference} - ${item.color}`).filter(label => label);
  const leastSoldValues = leastSoldItems.map(item => item.quantity || 0);
  const allZero = leastSoldValues.every(v => v === 0);
  const borderMain = getCssVar('--theme-main') || '#a67c7c';
  const leastSoldData = {
    labels: leastSoldLabels,
    datasets: [
      {
        label: `${dynamicLabels.units.charAt(0).toUpperCase() + dynamicLabels.units.slice(1)} Vendidos`,
        data: allZero ? leastSoldLabels.map(() => 0.1) : leastSoldValues,
        backgroundColor: allZero
          ? leastSoldLabels.map(() => '#bdbdbd')
          : getBarColors(leastSoldItems.length),
        borderColor: allZero
          ? leastSoldLabels.map(() => borderMain)
          : leastSoldLabels.map(() => borderMain),
        borderWidth: 4,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 12,
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: 'var(--theme-c2, #222)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'var(--theme-main, #0288d1)',
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          size: 14,
          weight: '600',
        },
        bodyFont: {
          family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          size: 12,
        },
      },
    },
    cutout: '65%',
    animation: {
      animateRotate: true,
      animateScale: true,
      delay: (context) => context.dataIndex * 100,
    },
  };

  const salesBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: 'var(--theme-c2, #222)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'var(--theme-main, #0288d1)',
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          size: 14,
          weight: '600',
        },
        bodyFont: {
          family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          size: 12,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Usuarios',
          font: {
            family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 14,
            weight: '500',
          },
          color: '#616161',
        },
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 12,
          },
          color: '#757575',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: `${dynamicLabels.units.charAt(0).toUpperCase() + dynamicLabels.units.slice(1)} Vendidos`,
          font: {
            family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 14,
            weight: '500',
          },
          color: '#616161',
        },
        grid: {
          color: 'rgba(255, 239, 239, 0.05)',
        },
        ticks: {
          font: {
            family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 12,
          },
          color: '#757575',
        },
      },
    },
    animation: {
      delay: (context) => context.dataIndex * 150,
    },
  };

  // Opciones específicas para el gráfico de Productos que Necesitan Atención (barras verticales)
  const leastSoldBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: 'var(--theme-c2, #222)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'var(--theme-main, #0288d1)',
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          size: 14,
          weight: '600',
        },
        bodyFont: {
          family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          size: 12,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Producto',
          font: {
            family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 14,
            weight: '500',
          },
          color: '#616161',
        },
        grid: {
          color: 'rgba(255, 239, 239, 0.05)',
        },
        ticks: {
          font: {
            family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 12,
          },
          color: '#757575',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cantidad Vendida',
          font: {
            family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 14,
            weight: '500',
          },
          color: '#616161',
        },
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 12,
          },
          color: '#757575',
        },
      },
    },
    animation: {
      delay: (context) => context.dataIndex * 150,
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme"></div>
          <p className="text-text font-medium">{translations[lang]?.loading_stats || 'Cargando estadísticas...'}</p>
        </div>
      </div>
    );
  }

  // Usar el usuario recibido por props, o fallback a localStorage solo si no está disponible
  let displayName = 'Usuario';
  if (user && user.username) {
    displayName = user.username.split('@')[0] || user.username;
  } else {
    const loggedUser = JSON.parse(localStorage.getItem('user'));
    if (loggedUser && loggedUser.username) {
      displayName = loggedUser.username.split('@')[0] || loggedUser.username;
    }
  }

  return (
    <div className="space-y-8 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-light mb-4" style={{ color: 'var(--text)' }}>
          {translations[lang]?.hello || 'Hola'}, <span className="font-medium" style={{ color: 'var(--theme-main)' }}>
            {displayName}
          </span>
        </h2>
        <div className="bg-card rounded-xl shadow-sm border border-default p-6 max-w-2xl mx-auto">
          <p className="italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>{randomMessage}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-600 p-4 rounded-lg mb-6">
          <div className="flex">
            <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-red-600 font-medium">{translations[lang]?.error_loading || 'Error al cargar estadísticas'}: {error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue and Sales Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 🚀 OPTIMIZACIÓN: Métricas del Dashboard */}
        {dashboardData && (
          <>
            {/* Total Productos */}
            <div className="bg-card p-6 rounded-lg shadow-default border border-default hover:shadow-md transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-muted">{translations[lang]?.total_products || 'Total Productos'}</h3>
                  <p className="text-2xl font-bold text-theme">{dashboardData.totalProducts}</p>
                </div>
              </div>
            </div>

            {/* Total Variaciones */}
            <div className="bg-card p-6 rounded-lg shadow-default border border-default hover:shadow-md transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-muted">{translations[lang]?.total_variations || 'Total Variaciones'}</h3>
                  <p className="text-2xl font-bold text-theme">{dashboardData.totalVariations}</p>
                </div>
              </div>
            </div>

            {/* Stock Bajo */}
            <div className="bg-card p-6 rounded-lg shadow-default border border-default hover:shadow-md transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-red-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-muted">{translations[lang]?.low_stock || 'Stock Bajo'}</h3>
                  <p className="text-2xl font-bold text-red-600">{dashboardData.lowStockItems}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Revenue Overview - Vertical Layout */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-light mb-2" style={{color: 'var(--theme-c3)'}}>
            {translations[lang]?.revenue_overview || 'Resumen de Ingresos'}
          </h2>
          <p className="text-text-muted">{translations[lang]?.revenue_subtitle || 'Métricas de ingresos por período'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Revenue Card */}
          <div className="bg-card p-6 rounded-lg shadow-default border border-default hover:shadow-md transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-theme rounded-lg">
                <svg className="w-8 h-8 text-text-inverted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text mb-1">{translations[lang]?.total_revenue || 'Ingresos Totales'}</h3>
                <p className="text-2xl font-bold text-theme">
                  ${totalRevenue.toLocaleString('es-CO')}
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Revenue Card */}
          <div className="bg-card p-6 rounded-lg shadow-default border border-default hover:shadow-md transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-600 rounded-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text mb-1">{translations[lang]?.monthly_revenue || 'Ingresos Mensuales'}</h3>
                <p className="text-2xl font-bold text-green-600">
                  ${monthlyRevenue.toLocaleString('es-CO')}
                </p>
              </div>
            </div>
          </div>

          {/* Weekly Revenue Card */}
          <div className="bg-card p-6 rounded-lg shadow-default border border-default hover:shadow-md transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text mb-1">{translations[lang]?.weekly_revenue || 'Ingresos Semanales'}</h3>
                <p className="text-2xl font-bold text-blue-600">
                  ${weeklyRevenue.toLocaleString('es-CO')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-card p-8 rounded-lg shadow-default border border-default hover:shadow-md transition-all duration-300">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-theme rounded-lg">
            <svg className="w-8 h-8 text-text-inverted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text">{translations[lang]?.sales_by_user || 'Ventas por Usuario'}</h3>
            <p className="text-text-muted text-sm">{translations[lang]?.user_sales_performance || 'Rendimiento individual de ventas'}</p>
          </div>
        </div>
        <div style={{ width: '100%', height: '300px' }}>
          <Bar data={salesData} options={salesBarOptions} />
        </div>
      </div>

      {/* Comparative Analysis */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-light mb-2" style={{color: 'var(--theme-c3)'}}>
            {translations[lang]?.comparative_analysis || 'Análisis Comparativo de Productos'}
          </h2>
          <p className="text-text-muted">{translations[lang]?.comparative_subtitle || 'Comparación entre productos exitosos y los que necesitan atención'}</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Top Sold Items */}
          <div className="bg-card p-8 rounded-lg shadow-default border border-default hover:shadow-md transition-all duration-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-theme rounded-lg">
                <svg className="w-8 h-8 text-text-inverted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text">{translations[lang]?.top_sold || 'Más Vendidos'}</h3>
                <p className="text-text-muted text-sm">{translations[lang]?.top_sold_subtitle || 'Top 5 productos con mejor rendimiento'}</p>
              </div>
            </div>
            {topSoldItems.length > 0 && topSoldData.labels.length > 0 && topSoldData.datasets[0].data.some(d => d > 0) ? (
              <div style={{ width: '100%', height: '300px' }} className="flex justify-center">
                <div style={{ width: '280px', height: '280px' }}>
                  <Doughnut data={topSoldData} options={doughnutOptions} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-text-muted">
                <svg className="w-16 h-16 mb-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                <p className="text-center font-medium">{translations[lang]?.no_sales_data || 'No hay datos de ventas disponibles'}</p>
                <p className="text-sm text-center mt-1">{translations[lang]?.sales_data_hint || 'Los datos aparecerán aquí cuando se registren ventas'}</p>
              </div>
            )}
          </div>

          {/* Products Needing Attention */}
          <div className="bg-card p-8 rounded-lg shadow-default border border-default hover:shadow-md transition-all duration-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-theme rounded-lg">
                <svg className="w-8 h-8 text-text-inverted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text">{translations[lang]?.attention_needed || 'Productos que Necesitan Atención'}</h3>
                <p className="text-text-muted text-sm">{translations[lang]?.attention_needed_subtitle || 'Productos sin ventas o con ventas muy bajas'}</p>
              </div>
            </div>
            {leastSoldItems.length > 0 && leastSoldData.labels.length > 0 ? (
              <div style={{ width: '100%', height: '300px' }}>
                <Bar data={leastSoldData} options={leastSoldBarOptions} />
                {allZero && (
                  <div className="text-center text-text-muted text-sm mt-2">{translations[lang]?.no_sales_for_products || 'No hay ventas registradas para estos productos. Se muestran barras de ejemplo.'}</div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-text-muted">
                <svg className="w-16 h-16 mb-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                <p className="text-center font-medium">{translations[lang]?.no_product_data || 'No hay datos de productos disponibles'}</p>
                <p className="text-sm text-center mt-1">{translations[lang]?.product_data_hint || 'Los datos aparecerán aquí cuando se registren productos'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;