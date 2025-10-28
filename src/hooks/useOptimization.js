import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Hook para debounce de valores - OPTIMIZADO PARA REDUCIR EGRESS
 * @param {any} value - Valor a hacer debounce
 * @param {number} delay - Delay en milisegundos (aumentado para reducir requests)
 */
export const useDebounce = (value, delay = 800) => { // Aumentado de default a 800ms
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook para búsqueda con debounce y filtrado optimizado
 * @param {Array} data - Array de datos para filtrar
 * @param {string} searchTerm - Término de búsqueda
 * @param {Array} searchFields - Campos por los que buscar
 * @param {number} debounceMs - Milisegundos de debounce
 */
export const useSearchFilter = (data, searchTerm, searchFields, debounceMs = 300) => {
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm || !Array.isArray(data)) {
      return data;
    }

    const lowerSearchTerm = debouncedSearchTerm.toLowerCase();

    return data.filter(item => {
      return searchFields.some(field => {
        const value = getNestedValue(item, field);
        return value && value.toString().toLowerCase().includes(lowerSearchTerm);
      });
    });
  }, [data, debouncedSearchTerm, searchFields]);

  return filteredData;
};

/**
 * Obtiene un valor anidado de un objeto usando notación de punto
 * @param {Object} obj - Objeto fuente
 * @param {string} path - Path como "user.name" o "company.details.name"
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Hook para filtrado avanzado con múltiples criterios
 * @param {Array} data - Datos a filtrar
 * @param {Object} filters - Objeto con filtros { field: value }
 * @param {Object} options - Opciones de filtrado
 */
export const useAdvancedFilter = (data, filters, options = {}) => {
  const {
    searchTerm = '',
    searchFields = [],
    sortBy = null,
    sortOrder = 'asc',
    debounceMs = 300
  } = options;

  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  const filteredAndSortedData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    let result = [...data];

    // Aplicar filtros específicos
    Object.entries(filters).forEach(([field, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        result = result.filter(item => {
          const itemValue = getNestedValue(item, field);
          
          if (Array.isArray(value)) {
            return value.includes(itemValue);
          }
          
          if (typeof value === 'string' && typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          
          return itemValue === value;
        });
      }
    });

    // Aplicar búsqueda por texto
    if (debouncedSearchTerm && searchFields.length > 0) {
      const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const value = getNestedValue(item, field);
          return value && value.toString().toLowerCase().includes(lowerSearchTerm);
        })
      );
    }

    // Aplicar ordenamiento
    if (sortBy) {
      result.sort((a, b) => {
        const aValue = getNestedValue(a, sortBy);
        const bValue = getNestedValue(b, sortBy);

        if (aValue === bValue) return 0;

        let comparison = 0;
        if (aValue > bValue) comparison = 1;
        if (aValue < bValue) comparison = -1;

        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, filters, debouncedSearchTerm, searchFields, sortBy, sortOrder]);

  return filteredAndSortedData;
};

/**
 * Hook para throttle de funciones
 * @param {Function} func - Función a throttle
 * @param {number} delay - Delay en milisegundos
 */
export const useThrottle = (func, delay) => {
  const [isThrottled, setIsThrottled] = useState(false);

  const throttledFunc = useCallback((...args) => {
    if (!isThrottled) {
      func.apply(null, args);
      setIsThrottled(true);
      setTimeout(() => setIsThrottled(false), delay);
    }
  }, [func, delay, isThrottled]);

  return throttledFunc;
};
