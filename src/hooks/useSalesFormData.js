// Hook optimizado para obtener todas las referencias y colores disponibles para el formulario de ventas
import { useState, useEffect, useMemo } from 'react';
import supabase from '../supabaseClient';

export const useSalesFormData = (companyId) => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch optimizado para obtener TODOS los productos con stock > 0
  useEffect(() => {
    const fetchAllProductsForSales = async () => {
      if (!companyId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Cargando todas las referencias para formulario de ventas...');
        
        // Query optimizada: Solo productos con stock disponible
        const { data, error } = await supabase
          .from('variations')
          .select(`
            id,
            stock,
            color,
            size,
            barcode_code,
            products!inner(
              id,
              reference,
              line,
              name
            )
          `)
          .eq('company_id', companyId)
          .gt('stock', 0) // Solo con stock disponible
          .order('products.reference')
          .order('color')
          .order('size');

        if (error) throw error;

        // Transformar datos para compatibilidad
        const transformedData = (data || []).map(variation => ({
          id: variation.id,
          reference: variation.products.reference,
          color: variation.color,
          size: variation.size,
          stock: variation.stock,
          barcode_code: variation.barcode_code,
          line: variation.products.line,
          name: variation.products.name,
          product_id: variation.products.id
        }));

        setAllProducts(transformedData);
        console.log(`✅ Cargadas ${transformedData.length} variaciones para ventas`);
        
      } catch (err) {
        console.error('❌ Error cargando productos para ventas:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProductsForSales();
  }, [companyId]);

  // Memoized computations para performance
  const uniqueReferences = useMemo(() => {
    const refs = [...new Set(allProducts.map(p => p.reference))];
    return refs.sort();
  }, [allProducts]);

  const getColorsForReference = useMemo(() => {
    return (reference) => {
      const colors = allProducts
        .filter(p => p.reference === reference)
        .map(p => p.color);
      return [...new Set(colors)].sort();
    };
  }, [allProducts]);

  const getSizesForReferenceAndColor = useMemo(() => {
    return (reference, color) => {
      const sizes = allProducts
        .filter(p => p.reference === reference && p.color === color)
        .map(p => ({ size: p.size, stock: p.stock }));
      return sizes.sort((a, b) => {
        // Ordenar tallas numéricamente si es posible
        const aNum = parseInt(a.size);
        const bNum = parseInt(b.size);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.size.localeCompare(b.size);
      });
    };
  }, [allProducts]);

  const getStockForVariation = useMemo(() => {
    return (reference, color, size) => {
      const variation = allProducts.find(p => 
        p.reference === reference && 
        p.color === color && 
        p.size === size
      );
      return variation ? variation.stock : 0;
    };
  }, [allProducts]);

  const getVariationId = useMemo(() => {
    return (reference, color, size) => {
      const variation = allProducts.find(p => 
        p.reference === reference && 
        p.color === color && 
        p.size === size
      );
      return variation ? variation.id : null;
    };
  }, [allProducts]);

  return {
    allProducts,
    loading,
    error,
    uniqueReferences,
    getColorsForReference,
    getSizesForReferenceAndColor,
    getStockForVariation,
    getVariationId,
    refetch: () => {
      // Force refetch
      setAllProducts([]);
    }
  };
};