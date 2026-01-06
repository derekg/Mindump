import { RefreshCw, Loader, TrendingUp, Eye } from 'lucide-react';
import { useTrending } from '../hooks';
import { ArticleCard } from './ArticleCard';
import './Trending.css';

export function Trending() {
  const { articles, loading, error, refresh } = useTrending();

  if (error && articles.length === 0) {
    return (
      <div className="trending-error">
        <p>{error}</p>
        <button onClick={refresh} className="retry-btn">
          <RefreshCw size={20} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="trending">
      <div className="trending-header">
        <div className="trending-title-container">
          <TrendingUp size={28} className="trending-icon" />
          <h1 className="trending-title">Trending</h1>
        </div>
        <button onClick={refresh} className="refresh-btn" disabled={loading}>
          <RefreshCw size={20} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <p className="trending-subtitle">
        <Eye size={16} />
        Most viewed articles right now
      </p>

      {loading && articles.length === 0 ? (
        <div className="trending-loading">
          <Loader className="loader" size={40} />
          <p>Loading trending articles...</p>
        </div>
      ) : (
        <div className="trending-content">
          {articles.map((article, index) => (
            <div key={`${article.id}-${index}`} className="trending-item">
              <div className="trending-rank">#{index + 1}</div>
              <ArticleCard article={article} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
