import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
  triggerOnce?: boolean;
}

export function useIntersectionObserver<T extends Element>(
  options: UseIntersectionObserverOptions = {}
) {
  const { threshold = 0.5, rootMargin = '0px', root = null, triggerOnce = false } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<T | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((element: T | null) => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    targetRef.current = element;

    if (!element) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);

        if (intersecting && !hasIntersected) {
          setHasIntersected(true);

          if (triggerOnce && observerRef.current) {
            observerRef.current.disconnect();
          }
        }
      },
      { threshold, rootMargin, root }
    );

    observerRef.current.observe(element);
  }, [threshold, rootMargin, root, triggerOnce, hasIntersected]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { ref: setRef, isIntersecting, hasIntersected };
}

// Hook for infinite scroll - triggers when bottom element is visible
export function useInfiniteScroll(
  onLoadMore: () => void,
  options: { enabled?: boolean; threshold?: number } = {}
) {
  const { enabled = true, threshold = 0.1 } = options;
  const loadingRef = useRef(false);

  const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold,
    rootMargin: '200px',
  });

  useEffect(() => {
    if (isIntersecting && enabled && !loadingRef.current) {
      loadingRef.current = true;
      onLoadMore();
      // Reset loading state after a short delay
      setTimeout(() => {
        loadingRef.current = false;
      }, 500);
    }
  }, [isIntersecting, enabled, onLoadMore]);

  return { ref };
}
