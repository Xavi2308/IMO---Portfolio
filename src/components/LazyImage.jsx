import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Componente optimizado de imagen con lazy loading, fallback y optimizaciones de performance
 */
const LazyImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  fallbackSrc = 'https://placehold.co/48x48/EFEFEF/AAAAAA&text=No+Img',
  placeholder = 'https://placehold.co/48x48/F0F0F0/CCCCCC&text=Loading...',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Comenzar a cargar 50px antes de ser visible
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Cargar imagen cuando está en vista
  useEffect(() => {
    if (isInView && src && !hasError) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        setHasError(true);
        setImageSrc(fallbackSrc);
        setIsLoaded(true);
      };
      
      img.src = src;
    }
  }, [isInView, src, fallbackSrc, hasError]);

  // Manejar errores de carga
  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setImageSrc(fallbackSrc);
    }
  }, [hasError, fallbackSrc]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div 
      ref={imgRef}
      className={`relative ${className}`}
      style={{ width, height }}
    >
      <img
        src={imageSrc}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        className={`
          transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-70'}
          ${className}
        `}
        style={{
          width: width || '100%',
          height: height || '100%',
          ...props.style
        }}
        {...props}
      />
      
      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-pulse text-xs text-gray-400">
            Cargando...
          </div>
        </div>
      )}
    </div>
  );
};

// Componente específico para imágenes de productos
export const ProductImage = ({
  imageUrl,
  reference,
  color,
  className = "w-10 h-10 object-cover rounded mx-auto",
  ...props
}) => {
  return (
    <LazyImage
      src={imageUrl}
      alt={`${reference} ${color}`}
      className={className}
      fallbackSrc="https://placehold.co/48x48/EFEFEF/AAAAAA&text=No+Img"
      placeholder="https://placehold.co/48x48/F0F0F0/CCCCCC&text=..."
      {...props}
    />
  );
};

// Componente para avatares/logos con lazy loading
export const AvatarImage = ({
  src,
  alt,
  size = 40,
  className = "",
  ...props
}) => {
  const sizeClass = `w-${Math.floor(size/4)} h-${Math.floor(size/4)}`;
  
  return (
    <LazyImage
      src={src}
      alt={alt}
      className={`${sizeClass} object-cover rounded-full ${className}`}
      fallbackSrc={`https://placehold.co/${size}x${size}/E5E7EB/9CA3AF&text=${alt?.charAt(0) || '?'}`}
      placeholder={`https://placehold.co/${size}x${size}/F3F4F6/D1D5DB&text=...`}
      {...props}
    />
  );
};

export default LazyImage;
