import { useCallback } from 'react';
import { RefreshCw, Loader } from 'lucide-react';
import { useFeed, useInfiniteScroll } from '../hooks';
import { ArticleCard } from './ArticleCard';
import './Feed.css';

export function Feed() {
  const { articles, loading, error, loadMore, loadRelated, refresh } = useFeed();

  const { ref: loadMoreRef } = useInfiniteScroll(loadMore, {
    enabled: !loading && articles.length > 0,
  });

  const handleLoadRelated = useCallback(
    (article: Parameters<typeof loadRelated>[0]) => {
      loadRelated(article);
    },
    [loadRelated]
  );

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
      <div className="feed-header">
        <h1 className="feed-title">For You</h1>
        <button onClick={refresh} className="refresh-btn" disabled={loading}>
          <RefreshCw size={20} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      {loading && articles.length === 0 ? (
        <div className="feed-loading">
          <Loader className="loader" size={40} />
          <p>Discovering articles...</p>
        </div>
      ) : (
        <>
          <div className="feed-content">
            {articles.map((article, index) => (
              <ArticleCard
                key={`${article.id}-${index}`}
                article={article}
                onLoadRelated={handleLoadRelated}
              />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="load-more-trigger">
            {loading && (
              <div className="loading-more">
                <Loader className="loader" size={24} />
                <span>Loading more...</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
