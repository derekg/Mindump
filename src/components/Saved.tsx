import { useState, useEffect } from 'react';
import { Bookmark, Trash2, FileDown } from 'lucide-react';
import type { SavedArticle } from '../types';
import { getSavedArticles, unsaveArticle, exportSavedArticles } from '../services/storage';
import { ArticleCard } from './ArticleCard';
import './Saved.css';

export function Saved() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);

  const loadSaved = () => {
    setArticles(getSavedArticles());
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const handleRemove = (articleId: number) => {
    unsaveArticle(articleId);
    loadSaved();
  };

  const handleExport = () => {
    const json = exportSavedArticles();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rabbithole-saved-articles.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="saved">
      <div className="saved-header">
        <div className="saved-title-container">
          <Bookmark size={28} className="saved-icon" />
          <h1 className="saved-title">Saved</h1>
        </div>
        {articles.length > 0 && (
          <button onClick={handleExport} className="export-btn">
            <FileDown size={20} />
            Export
          </button>
        )}
      </div>

      <p className="saved-subtitle">
        {articles.length} article{articles.length !== 1 ? 's' : ''} saved
      </p>

      {articles.length === 0 ? (
        <div className="saved-empty">
          <Bookmark size={48} className="empty-icon" />
          <h3>No saved articles</h3>
          <p>Articles you save will appear here for easy access later.</p>
        </div>
      ) : (
        <div className="saved-content">
          {articles.map((article, index) => (
            <div key={`${article.id}-${index}`} className="saved-item">
              <ArticleCard article={article} />
              <button
                className="remove-btn"
                onClick={() => handleRemove(article.id)}
                aria-label="Remove from saved"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
