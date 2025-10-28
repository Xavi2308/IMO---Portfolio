import React, { useState, useRef, useEffect } from 'react';

/**
 * Componente de imagen optimizada para reducir egress
 * - Carga lazy (solo cuando es visible)
 * - Placeholder mientras carga
 * - Fallback si no hay imagen
 * - Optimización de tamaño
 */
const OptimizedProductImage = ({ 
  imageUrl, 
  reference, 
  color, 
  className = "w-10 h-10 object-cover rounded mx-auto",
  showPlaceholder = true 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef();

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Cargar 50px antes de ser visible
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  // Si no hay URL de imagen, mostrar placeholder inmediatamente
  if (!imageUrl) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-gray-700 flex items-center justify-center`}>
        <span className="text-xs text-gray-400 text-center">
          {showPlaceholder ? 'Sin imagen' : '📷'}
        </span>
      </div>
    );
  }

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {!isVisible ? (
        // Placeholder mientras no es visible
        <div className={`${className} bg-gray-100 dark:bg-gray-700 flex items-center justify-center animate-pulse`}>
          <span className="text-xs text-gray-400">📷</span>
        </div>
      ) : hasError ? (
        // Error state
        <div className={`${className} bg-gray-100 dark:bg-gray-700 flex items-center justify-center`}>
          <span className="text-xs text-gray-400 text-center">Sin imagen</span>
        </div>
      ) : (
        // Imagen real
        <div className="relative">
          {isLoading && (
            <div className={`absolute inset-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center animate-pulse`}>
              <span className="text-xs text-gray-400">⏳</span>
            </div>
          )}
          <img
            src={imageUrl}
            alt={`${reference} - ${color}`}
            className={className}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            loading="lazy" // HTML native lazy loading como backup
            style={{
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.2s ease-in-out'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default OptimizedProductImage;
