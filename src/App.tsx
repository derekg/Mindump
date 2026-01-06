import { useState } from 'react';
import type { ViewMode } from './types';
import { Header, Navigation, Feed, Trending, OnThisDay, Saved } from './components';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('feed');

  const renderView = () => {
    switch (currentView) {
      case 'feed':
        return <Feed />;
      case 'trending':
        return <Trending />;
      case 'onthisday':
        return <OnThisDay />;
      case 'saved':
        return <Saved />;
      default:
        return <Feed />;
    }
  };

  return (
    <div className="app">
      <Header />
      <main className="main-content">{renderView()}</main>
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
}

export default App;
