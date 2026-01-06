import { useState, useCallback, useEffect } from 'react';
import type { WikiArticle } from '../types';
import {
  getRandomArticles,
  getFeaturedArticle,
  getMostViewed,
  getOnThisDay,
} from '../services/wikipedia';
import { getPersonalizedRecommendations, getMoreLikeThis } from '../services/recommendations';

export function useFeed() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Load initial feed
  const loadInitialFeed = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get featured article first
      const featured = await getFeaturedArticle();

      // Get personalized recommendations
      const recommendations = await getPersonalizedRecommendations();

      // Combine: featured first, then recommendations
      const feed = featured
        ? [featured, ...recommendations.filter((a) => a.id !== featured.id)]
        : recommendations;

      setArticles(feed);
      setInitialLoaded(true);
    } catch (err) {
      setError('Failed to load articles. Please try again.');
      console.error('Error loading feed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more articles (for infinite scroll)
  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Mix of random and personalized
      const [random, personalized] = await Promise.all([
        getRandomArticles(5),
        getPersonalizedRecommendations(),
      ]);

      const existingIds = new Set(articles.map((a) => a.id));
      const newArticles = [...random, ...personalized].filter(
        (a) => !existingIds.has(a.id)
      );

      setArticles((prev) => [...prev, ...newArticles.slice(0, 10)]);
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoading(false);
    }
  }, [articles, loading]);

  // Load related articles based on current article
  const loadRelated = useCallback(
    async (article: WikiArticle) => {
      try {
        const related = await getMoreLikeThis(article);
        const existingIds = new Set(articles.map((a) => a.id));
        const newArticles = related.filter((a) => !existingIds.has(a.id));

        if (newArticles.length > 0) {
          // Insert related articles after current article
          const currentIndex = articles.findIndex((a) => a.id === article.id);
          if (currentIndex !== -1) {
            setArticles((prev) => [
              ...prev.slice(0, currentIndex + 1),
              ...newArticles.slice(0, 3),
              ...prev.slice(currentIndex + 1),
            ]);
          }
        }
      } catch (err) {
        console.error('Error loading related:', err);
      }
    },
    [articles]
  );

  // Refresh feed
  const refresh = useCallback(async () => {
    setArticles([]);
    setInitialLoaded(false);
    await loadInitialFeed();
  }, [loadInitialFeed]);

  // Load on mount
  useEffect(() => {
    if (!initialLoaded) {
      loadInitialFeed();
    }
  }, [initialLoaded, loadInitialFeed]);

  return {
    articles,
    loading,
    error,
    loadMore,
    loadRelated,
    refresh,
  };
}

// Hook for trending articles
export function useTrending() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const trending = await getMostViewed('day');
      setArticles(trending);
    } catch (err) {
      setError('Failed to load trending articles.');
      console.error('Error loading trending:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  return { articles, loading, error, refresh: loadTrending };
}

// Hook for On This Day
export function useOnThisDay() {
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getOnThisDay>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getOnThisDay();
      setEvents(data);
    } catch (err) {
      setError('Failed to load On This Day events.');
      console.error('Error loading on this day:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return { events, loading, error, refresh: loadEvents };
}
