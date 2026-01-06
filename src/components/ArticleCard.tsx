import { useEffect, useCallback, useState, useRef } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Share2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Heart,
} from 'lucide-react';
import type { WikiArticle } from '../types';
import { useEngagement, useIntersectionObserver } from '../hooks';
import { saveArticle, unsaveArticle, isArticleSaved, shareArticle } from '../services/storage';
import './ArticleCard.css';

interface ArticleCardProps {
  article: WikiArticle;
  onLoadRelated?: (article: WikiArticle) => void;
  onTopicClick?: (topic: string) => void;
}

// Extract topic hints from title
function extractTopics(title: string): string[] {
  const words = title.split(/[\s\-–—:,()]+/).filter(w => w.length > 3);
  return words.slice(0, 3);
}

export function ArticleCard({ article, onLoadRelated, onTopicClick }: ArticleCardProps) {
  const [saved, setSaved] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef<number>(0);
  const imageRef = useRef<HTMLDivElement>(null);

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

  // Parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (imageRef.current && isIntersecting) {
        const rect = imageRef.current.getBoundingClientRect();
        const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        const parallaxOffset = (scrollProgress - 0.5) * 30;
        imageRef.current.style.transform = `translateY(${parallaxOffset}px) scale(1.1)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isIntersecting]);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (!saved) {
        saveArticle(article);
        setSaved(true);
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 1000);
      }
    }
    lastTapRef.current = now;
  };

  const handleSave = () => {
    if (saved) {
      unsaveArticle(article.id);
      setSaved(false);
      setShowToast('Removed from saved');
    } else {
      saveArticle(article);
      setSaved(true);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
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

  const handleTopicClick = (topic: string) => {
    if (onTopicClick) {
      onTopicClick(topic);
    }
  };

  const imageUrl = article.originalimage?.source || article.thumbnail?.source;
  const topics = extractTopics(article.title);

  return (
    <div
      ref={ref}
      className={`article-card ${isIntersecting ? 'visible' : ''}`}
      onClick={handleDoubleTap}
    >
      {imageUrl && (
        <div className="article-image-container">
          <div className="article-image-wrapper" ref={imageRef}>
            <img
              src={imageUrl}
              alt={article.title}
              className="article-image"
              loading="lazy"
            />
          </div>
          <div className="article-image-overlay" />
          <div className="article-image-glow" />
        </div>
      )}

      {/* Double-tap heart animation */}
      {showHeart && (
        <div className="heart-animation">
          <Heart size={80} fill="white" />
        </div>
      )}

      <div className="article-content">
        {/* Topic pills */}
        {topics.length > 0 && (
          <div className="topic-pills">
            {topics.map((topic, i) => (
              <button
                key={i}
                className="topic-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTopicClick(topic);
                }}
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        <h2 className="article-title" onClick={(e) => {
          e.stopPropagation();
          handleReadMore();
        }}>
          {article.title}
        </h2>

        <p className={`article-extract ${expanded ? 'expanded' : ''}`}>
          {article.extract}
        </p>

        {article.extract.length > 200 && (
          <button className="expand-btn" onClick={(e) => {
            e.stopPropagation();
            handleExpand();
          }}>
            <ChevronDown className={`expand-icon ${expanded ? 'rotated' : ''}`} />
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}

        {article.views && (
          <div className="article-views">
            {article.views.toLocaleString()} views
          </div>
        )}

        <div className="article-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`action-btn ${saved ? 'active saved-active' : ''}`}
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

        <p className="double-tap-hint">Double-tap to save</p>
      </div>

      {showToast && <div className="toast">{showToast}</div>}
    </div>
  );
}
