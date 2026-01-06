import { useState, useEffect } from 'react';
import type { ViewMode } from './types';
import {
  Header,
  Navigation,
  Feed,
  Trending,
  OnThisDay,
  Saved,
  Onboarding,
  hasCompletedOnboarding,
  completeOnboarding,
} from './components';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('feed');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = hasCompletedOnboarding();
    setShowOnboarding(!completed);
    setCheckingOnboarding(false);
  }, []);

  const handleOnboardingComplete = (categories: string[]) => {
    completeOnboarding(categories);
    setShowOnboarding(false);
  };

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

  // Don't render anything while checking onboarding status
  if (checkingOnboarding) {
    return null;
  }

  // Show onboarding if not completed
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="app">
      <Header />
      <main className="main-content">{renderView()}</main>
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
}

export default App;
