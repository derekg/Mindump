import { useCallback, useState } from 'react';
import { RefreshCw, Loader, Shuffle, Sparkles } from 'lucide-react';
import { useFeed, useInfiniteScroll } from '../hooks';
import { ArticleCard } from './ArticleCard';
import { DepthMeter } from './DepthMeter';
import { getRandomArticles, searchArticles } from '../services/wikipedia';
import './Feed.css';

export function Feed() {
  const { articles, loading, error, loadMore, loadRelated, refresh } = useFeed();
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  const { ref: loadMoreRef } = useInfiniteScroll(loadMore, {
    enabled: !loading && articles.length > 0,
  });

  const handleLoadRelated = useCallback(
    (article: Parameters<typeof loadRelated>[0]) => {
      loadRelated(article);
    },
    [loadRelated]
  );

  const handleTopicClick = useCallback(async (topic: string) => {
    // Search for topic and scroll to top
    const results = await searchArticles(topic, 5);
    if (results.length > 0) {
      // This would ideally inject articles at top, but for now just refresh
      refresh();
    }
  }, [refresh]);

  const handleSurpriseMe = async () => {
    setSurpriseLoading(true);
    try {
      // Get a random article and scroll to it
      const randomArticles = await getRandomArticles(1);
      if (randomArticles.length > 0) {
        // Trigger refresh to show new content
        refresh();
      }
    } finally {
      setSurpriseLoading(false);
    }
  };

  if (error && articles.length === 0) {
    return (
      <div className="feed-error">
        <p>{error}</p>
        <button onClick={refresh} className="retry-btn">
          <RefreshCw size={20} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="feed">
      <DepthMeter articleCount={articles.length} />

      <div className="feed-header">
        <h1 className="feed-title">
          <Sparkles size={24} className="feed-title-icon" />
          For You
        </h1>
        <div className="feed-actions">
          <button
            onClick={handleSurpriseMe}
            className="surprise-btn"
            disabled={surpriseLoading}
          >
            <Shuffle size={18} className={surpriseLoading ? 'spinning' : ''} />
            <span>Surprise me</span>
          </button>
          <button onClick={refresh} className="refresh-btn" disabled={loading}>
            <RefreshCw size={20} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {loading && articles.length === 0 ? (
        <div className="feed-loading">
          <div className="loading-animation">
            <div className="loading-rabbit">🐇</div>
            <div className="loading-hole">🕳️</div>
          </div>
          <p>Falling down the rabbit hole...</p>
        </div>
      ) : (
        <>
          <div className="feed-content">
            {articles.map((article, index) => (
              <ArticleCard
                key={`${article.id}-${index}`}
                article={article}
                onLoadRelated={handleLoadRelated}
                onTopicClick={handleTopicClick}
              />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="load-more-trigger">
            {loading && (
              <div className="loading-more">
                <Loader className="loader" size={24} />
                <span>Discovering more...</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
