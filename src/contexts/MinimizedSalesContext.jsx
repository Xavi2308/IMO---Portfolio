import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Crear contexto
const MinimizedSalesContext = createContext();

// Actions para el reducer
const ACTIONS = {
  ADD_SALE: 'ADD_SALE',
  REMOVE_SALE: 'REMOVE_SALE',
  UPDATE_SALE: 'UPDATE_SALE',
  SET_ACTIVE_SALE: 'SET_ACTIVE_SALE',
  CLEAR_ALL: 'CLEAR_ALL'
};

// Reducer para manejar las ventas minimizadas
const minimizedSalesReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.ADD_SALE:
      return {
        ...state,
        sales: [...state.sales, action.payload],
        nextId: state.nextId + 1
      };
    
    case ACTIONS.REMOVE_SALE:
      return {
        ...state,
        sales: state.sales.filter(sale => sale.id !== action.payload),
        activeSaleId: state.activeSaleId === action.payload ? null : state.activeSaleId
      };
    
    case ACTIONS.UPDATE_SALE:
      return {
        ...state,
        sales: state.sales.map(sale => 
          sale.id === action.payload.id 
            ? { ...sale, ...action.payload.updates }
            : sale
        )
      };
    
    case ACTIONS.SET_ACTIVE_SALE:
      return {
        ...state,
        activeSaleId: action.payload
      };
    
    case ACTIONS.CLEAR_ALL:
      return {
        sales: [],
        activeSaleId: null,
        nextId: 1
      };
    
    default:
      return state;
  }
};

// Estado inicial
const initialState = {
  sales: [], // Array de ventas minimizadas
  activeSaleId: null, // ID de la venta activa
  nextId: 1 // Contador para IDs únicos
};

// Proveedor del contexto
export const MinimizedSalesProvider = ({ children }) => {
  const [state, dispatch] = useReducer(minimizedSalesReducer, initialState);

  // Agregar nueva venta minimizada
  const addMinimizedSale = useCallback((saleData) => {
    const newSale = {
      id: state.nextId,
      createdAt: new Date().toISOString(),
      title: `Venta #${state.nextId}`,
      customer: saleData.customer || null,
      items: saleData.items || [],
      total: saleData.total || 0,
      formData: saleData.formData || {},
      module: 'StockView', // Módulo donde se originó
      ...saleData
    };

    dispatch({ type: ACTIONS.ADD_SALE, payload: newSale });
    return newSale.id;
  }, [state.nextId]);

  // Remover venta minimizada
  const removeMinimizedSale = useCallback((saleId) => {
    dispatch({ type: ACTIONS.REMOVE_SALE, payload: saleId });
  }, []);

  // Actualizar venta minimizada
  const updateMinimizedSale = useCallback((saleId, updates) => {
    dispatch({ 
      type: ACTIONS.UPDATE_SALE, 
      payload: { id: saleId, updates } 
    });
  }, []);

  // Establecer venta activa
  const setActiveSale = useCallback((saleId) => {
    dispatch({ type: ACTIONS.SET_ACTIVE_SALE, payload: saleId });
  }, []);

  // Limpiar todas las ventas
  const clearAllSales = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ALL });
  }, []);

  // Obtener venta específica
  const getSale = useCallback((saleId) => {
    return state.sales.find(sale => sale.id === saleId);
  }, [state.sales]);

  const contextValue = {
    // Estado
    sales: state.sales,
    activeSaleId: state.activeSaleId,
    
    // Métodos
    addMinimizedSale,
    removeMinimizedSale,
    updateMinimizedSale,
    setActiveSale,
    clearAllSales,
    getSale
  };

  return (
    <MinimizedSalesContext.Provider value={contextValue}>
      {children}
    </MinimizedSalesContext.Provider>
  );
};

// Hook para usar el contexto
export const useMinimizedSales = () => {
  const context = useContext(MinimizedSalesContext);
  if (!context) {
    throw new Error('useMinimizedSales must be used within a MinimizedSalesProvider');
  }
  return context;
};

export default MinimizedSalesContext;
