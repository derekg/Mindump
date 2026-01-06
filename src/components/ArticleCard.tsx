import { useEffect, useCallback, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Share2,
  ExternalLink,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import type { WikiArticle } from '../types';
import { useEngagement, useIntersectionObserver } from '../hooks';
import { saveArticle, unsaveArticle, isArticleSaved, shareArticle } from '../services/storage';
import './ArticleCard.css';

interface ArticleCardProps {
  article: WikiArticle;
  onLoadRelated?: (article: WikiArticle) => void;
}

export function ArticleCard({ article, onLoadRelated }: ArticleCardProps) {
  const [saved, setSaved] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.6,
  });

  const handleLinger = useCallback(
    (lingeringArticle: WikiArticle) => {
      if (onLoadRelated) {
        onLoadRelated(lingeringArticle);
      }
    },
    [onLoadRelated]
  );

  const { startTracking, stopTracking, trackTap } = useEngagement(article, {
    onLinger: handleLinger,
    lingerThreshold: 4000,
  });

  // Track visibility
  useEffect(() => {
    if (isIntersecting) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [isIntersecting, startTracking, stopTracking]);

  // Check if saved on mount
  useEffect(() => {
    setSaved(isArticleSaved(article.id));
  }, [article.id]);

  const handleSave = () => {
    if (saved) {
      unsaveArticle(article.id);
      setSaved(false);
      setShowToast('Removed from saved');
    } else {
      saveArticle(article);
      setSaved(true);
      setShowToast('Saved for later');
    }
    setTimeout(() => setShowToast(null), 2000);
  };

  const handleShare = async () => {
    const success = await shareArticle(article);
    if (success) {
      setShowToast('Copied to clipboard!');
      setTimeout(() => setShowToast(null), 2000);
    }
  };

  const handleReadMore = () => {
    trackTap();
    window.open(article.pageUrl, '_blank');
  };

  const handleExpand = () => {
    setExpanded(!expanded);
    if (!expanded) {
      trackTap();
    }
  };

  const handleMoreLikeThis = () => {
    if (onLoadRelated) {
      onLoadRelated(article);
      setShowToast('Loading related articles...');
      setTimeout(() => setShowToast(null), 2000);
    }
  };

  const imageUrl = article.originalimage?.source || article.thumbnail?.source;

  return (
    <div ref={ref} className={`article-card ${isIntersecting ? 'visible' : ''}`}>
      {imageUrl && (
        <div className="article-image-container">
          <img
            src={imageUrl}
            alt={article.title}
            className="article-image"
            loading="lazy"
          />
          <div className="article-image-overlay" />
        </div>
      )}

      <div className="article-content">
        <h2 className="article-title" onClick={handleReadMore}>
          {article.title}
        </h2>

        <p className={`article-extract ${expanded ? 'expanded' : ''}`}>
          {article.extract}
        </p>

        {article.extract.length > 200 && (
          <button className="expand-btn" onClick={handleExpand}>
            <ChevronDown className={`expand-icon ${expanded ? 'rotated' : ''}`} />
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}

        {article.views && (
          <div className="article-views">
            {article.views.toLocaleString()} views
          </div>
        )}

        <div className="article-actions">
          <button
            className={`action-btn ${saved ? 'active' : ''}`}
            onClick={handleSave}
            aria-label={saved ? 'Remove from saved' : 'Save article'}
          >
            {saved ? <BookmarkCheck size={22} /> : <Bookmark size={22} />}
          </button>

          <button
            className="action-btn"
            onClick={handleShare}
            aria-label="Share article"
          >
            <Share2 size={22} />
          </button>

          <button
            className="action-btn more-btn"
            onClick={handleMoreLikeThis}
            aria-label="More like this"
          >
            <Sparkles size={22} />
            <span>More like this</span>
          </button>

          <button
            className="action-btn read-btn"
            onClick={handleReadMore}
            aria-label="Read full article"
          >
            <ExternalLink size={22} />
            <span>Read full</span>
          </button>
        </div>
      </div>

      {showToast && <div className="toast">{showToast}</div>}
    </div>
  );
}
