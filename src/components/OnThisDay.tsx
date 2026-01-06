import { useState } from 'react';
import { RefreshCw, Loader, Calendar, ChevronRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useOnThisDay } from '../hooks';
import type { WikiArticle } from '../types';
import './OnThisDay.css';

export function OnThisDay() {
  const { events, loading, error, refresh } = useOnThisDay();
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  const today = new Date();
  const formattedDate = format(today, 'MMMM d');

  if (error && events.length === 0) {
    return (
      <div className="otd-error">
        <p>{error}</p>
        <button onClick={refresh} className="retry-btn">
          <RefreshCw size={20} />
          Try Again
        </button>
      </div>
    );
  }

  const handleEventClick = (index: number) => {
    setExpandedEvent(expandedEvent === index ? null : index);
  };

  const openArticle = (article: WikiArticle) => {
    window.open(article.pageUrl, '_blank');
  };

  return (
    <div className="otd">
      <div className="otd-header">
        <div className="otd-title-container">
          <Calendar size={28} className="otd-icon" />
          <h1 className="otd-title">On This Day</h1>
        </div>
        <button onClick={refresh} className="refresh-btn" disabled={loading}>
          <RefreshCw size={20} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <p className="otd-subtitle">{formattedDate} in history</p>

      {loading && events.length === 0 ? (
        <div className="otd-loading">
          <Loader className="loader" size={40} />
          <p>Loading historical events...</p>
        </div>
      ) : (
        <div className="otd-content">
          {events.map((event, index) => (
            <div
              key={`${event.year}-${index}`}
              className={`otd-event ${expandedEvent === index ? 'expanded' : ''}`}
            >
              <div className="otd-event-header" onClick={() => handleEventClick(index)}>
                <span className="otd-year">{event.year}</span>
                <p className="otd-text">{event.text}</p>
                <ChevronRight
                  size={20}
                  className={`otd-chevron ${expandedEvent === index ? 'rotated' : ''}`}
                />
              </div>

              {expandedEvent === index && event.pages.length > 0 && (
                <div className="otd-articles">
                  <h4 className="otd-articles-title">Related articles</h4>
                  {event.pages.slice(0, 5).map((article, articleIndex) => (
                    <div
                      key={`${article.id}-${articleIndex}`}
                      className="otd-article"
                      onClick={() => openArticle(article)}
                    >
                      {article.thumbnail && (
                        <img
                          src={article.thumbnail.source}
                          alt={article.title}
                          className="otd-article-thumb"
                        />
                      )}
                      <div className="otd-article-info">
                        <h5 className="otd-article-title">{article.title}</h5>
                        {article.extract && (
                          <p className="otd-article-extract">
                            {article.extract.slice(0, 100)}...
                          </p>
                        )}
                      </div>
                      <ExternalLink size={16} className="otd-article-link" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
