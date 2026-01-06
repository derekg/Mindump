import { Home, TrendingUp, Calendar, Bookmark } from 'lucide-react';
import type { ViewMode } from '../types';
import './Navigation.css';

interface NavigationProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const navItems: { view: ViewMode; icon: typeof Home; label: string }[] = [
    { view: 'feed', icon: Home, label: 'Feed' },
    { view: 'trending', icon: TrendingUp, label: 'Trending' },
    { view: 'onthisday', icon: Calendar, label: 'Today' },
    { view: 'saved', icon: Bookmark, label: 'Saved' },
  ];

  return (
    <nav className="navigation">
      {navItems.map(({ view, icon: Icon, label }) => (
        <button
          key={view}
          className={`nav-item ${currentView === view ? 'active' : ''}`}
          onClick={() => onViewChange(view)}
          aria-label={label}
        >
          <Icon size={24} />
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
