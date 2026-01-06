import { useState } from 'react';
import { Rabbit, ChevronRight, Sparkles } from 'lucide-react';
import './Onboarding.css';

const CATEGORIES = [
  { id: 'history', label: 'History', emoji: '🏛️' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'technology', label: 'Technology', emoji: '💻' },
  { id: 'art', label: 'Art & Culture', emoji: '🎨' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 'space', label: 'Space', emoji: '🚀' },
  { id: 'philosophy', label: 'Philosophy', emoji: '🤔' },
  { id: 'geography', label: 'Geography', emoji: '🌍' },
  { id: 'literature', label: 'Literature', emoji: '📚' },
  { id: 'film', label: 'Film & TV', emoji: '🎬' },
  { id: 'politics', label: 'Politics', emoji: '🏛️' },
  { id: 'economics', label: 'Economics', emoji: '📈' },
  { id: 'medicine', label: 'Medicine', emoji: '🏥' },
  { id: 'food', label: 'Food & Drink', emoji: '🍳' },
];

interface OnboardingProps {
  onComplete: (categories: string[]) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'welcome' | 'categories'>('welcome');

  const toggleCategory = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleSkip = () => {
    onComplete([]);
  };

  const handleContinue = () => {
    if (step === 'welcome') {
      setStep('categories');
    } else {
      onComplete(Array.from(selected));
    }
  };

  if (step === 'welcome') {
    return (
      <div className="onboarding">
        <div className="onboarding-content welcome">
          <div className="welcome-icon">
            <Rabbit size={80} />
          </div>
          <h1 className="welcome-title">Welcome to Rabbithole</h1>
          <p className="welcome-subtitle">
            Fall into knowledge. Discover Wikipedia articles tailored to your curiosity.
          </p>
          <div className="welcome-features">
            <div className="feature">
              <Sparkles size={20} />
              <span>Personalized feed that learns your interests</span>
            </div>
            <div className="feature">
              <Sparkles size={20} />
              <span>Trending articles & historical events</span>
            </div>
            <div className="feature">
              <Sparkles size={20} />
              <span>Save & share your discoveries</span>
            </div>
          </div>
          <button className="primary-btn" onClick={handleContinue}>
            Get Started
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding">
      <div className="onboarding-content">
        <h1 className="onboarding-title">What interests you?</h1>
        <p className="onboarding-subtitle">
          Pick a few topics to personalize your feed. You can always change this later.
        </p>

        <div className="categories-grid">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              className={`category-chip ${selected.has(category.id) ? 'selected' : ''}`}
              onClick={() => toggleCategory(category.id)}
            >
              <span className="category-emoji">{category.emoji}</span>
              <span className="category-label">{category.label}</span>
            </button>
          ))}
        </div>

        <div className="onboarding-actions">
          <button className="skip-btn" onClick={handleSkip}>
            Skip for now
          </button>
          <button
            className="primary-btn"
            onClick={handleContinue}
          >
            {selected.size > 0 ? `Continue (${selected.size})` : 'Continue'}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Storage keys
const ONBOARDING_KEY = 'rabbithole_onboarding';
const PREFERENCES_KEY = 'rabbithole_preferences';

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function completeOnboarding(categories: string[]): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ categories }));
}

export function getUserPreferences(): { categories: string[] } {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : { categories: [] };
  } catch {
    return { categories: [] };
  }
}

export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
  localStorage.removeItem(PREFERENCES_KEY);
}
