import React, { useEffect, useRef, useCallback } from 'react';

const InfiniteScroll = ({
  hasMore,
  loadMore,
  loading = false,
  children,
  className = '',
  threshold = 100, // pixels before end to trigger
  loader = null,
  endMessage = null,
}) => {
  const scrollElementRef = useRef(null);
  const loadingRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (loadingRef.current || !hasMore) return;

    const element = scrollElementRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceToBottom < threshold) {
      loadingRef.current = true;
      loadMore().finally(() => {
        loadingRef.current = false;
      });
    }
  }, [hasMore, loadMore, threshold]);

  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const defaultLoader = (
    <div className="flex justify-center items-center py-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600 dark:text-gray-300">Cargando más...</span>
    </div>
  );

  const defaultEndMessage = (
    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
      <p>No hay más elementos para cargar</p>
    </div>
  );

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ maxHeight: '100%' }}
    >
      {children}
      
      {loading && (loader || defaultLoader)}
      
      {!hasMore && !loading && (endMessage || defaultEndMessage)}
    </div>
  );
};

export default InfiniteScroll;
