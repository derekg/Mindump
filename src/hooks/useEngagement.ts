import { useCallback, useEffect, useRef } from 'react';
import type { WikiArticle } from '../types';
import { trackEngagement } from '../services/recommendations';

interface UseEngagementOptions {
  onLinger?: (article: WikiArticle) => void;
  lingerThreshold?: number; // ms before considering it a "linger"
}

export function useEngagement(
  article: WikiArticle | null,
  options: UseEngagementOptions = {}
) {
  const { onLinger, lingerThreshold = 3000 } = options;
  const startTimeRef = useRef<number | null>(null);
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredLingerRef = useRef(false);

  // Start tracking when article becomes visible
  const startTracking = useCallback(() => {
    if (!article) return;
    startTimeRef.current = Date.now();
    hasTriggeredLingerRef.current = false;

    // Set up linger detection
    lingerTimerRef.current = setTimeout(() => {
      if (onLinger && article) {
        hasTriggeredLingerRef.current = true;
        onLinger(article);
      }
    }, lingerThreshold);
  }, [article, onLinger, lingerThreshold]);

  // Stop tracking and record engagement
  const stopTracking = useCallback(() => {
    if (lingerTimerRef.current) {
      clearTimeout(lingerTimerRef.current);
      lingerTimerRef.current = null;
    }

    if (!article || startTimeRef.current === null) return;

    const timeSpent = Date.now() - startTimeRef.current;
    trackEngagement(article, timeSpent, false);
    startTimeRef.current = null;
  }, [article]);

  // Track a tap/click on the article
  const trackTap = useCallback(() => {
    if (!article || startTimeRef.current === null) return;

    const timeSpent = Date.now() - startTimeRef.current;
    trackEngagement(article, timeSpent, true);
  }, [article]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lingerTimerRef.current) {
        clearTimeout(lingerTimerRef.current);
      }
    };
  }, []);

  return {
    startTracking,
    stopTracking,
    trackTap,
    hasLingered: hasTriggeredLingerRef.current,
  };
}
