import { useState } from 'react';
import { Search, X, Rabbit } from 'lucide-react';
import { searchArticles } from '../services/wikipedia';
import type { WikiArticle } from '../types';
import './Header.css';

interface HeaderProps {
  onSearchResult?: (articles: WikiArticle[]) => void;
}

export function Header({ onSearchResult }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !onSearchResult) return;

    setSearching(true);
    try {
      const results = await searchArticles(query, 20);
      onSearchResult(results);
      setSearchOpen(false);
      setQuery('');
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Rabbit size={32} className="logo-icon" />
          <span className="logo-text">Rabbithole</span>
        </div>

        <button
          className="search-toggle"
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label="Toggle search"
        >
          {searchOpen ? <X size={24} /> : <Search size={24} />}
        </button>
      </div>

      {searchOpen && (
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Wikipedia..."
            className="search-input"
            autoFocus
          />
          <button type="submit" className="search-btn" disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
      )}
    </header>
  );
}
