import type { WikiArticle, UserEngagement } from '../types';
import { getRelatedArticles, searchArticles, getRandomArticles } from './wikipedia';

const ENGAGEMENT_KEY = 'rabbithole_engagement';
const PREFERENCES_KEY = 'rabbithole_preferences';
const MAX_ENGAGEMENTS = 100;

// Category to Wikipedia search term mapping
const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  history: ['History', 'Historical events', 'Ancient civilization'],
  science: ['Science', 'Scientific discovery', 'Physics'],
  technology: ['Technology', 'Computing', 'Innovation'],
  art: ['Art history', 'Famous paintings', 'Renaissance art'],
  music: ['Music history', 'Famous musicians', 'Classical music'],
  sports: ['Sports', 'Olympic games', 'Football'],
  nature: ['Nature', 'Wildlife', 'Ecology'],
  space: ['Space exploration', 'Astronomy', 'NASA'],
  philosophy: ['Philosophy', 'Philosophers', 'Ethics'],
  geography: ['Geography', 'Countries', 'World landmarks'],
  literature: ['Literature', 'Famous authors', 'Classic novels'],
  film: ['Cinema', 'Film history', 'Movie directors'],
  politics: ['Politics', 'World leaders', 'Government'],
  economics: ['Economics', 'Economy', 'Finance'],
  medicine: ['Medicine', 'Medical discoveries', 'Health'],
  food: ['Cuisine', 'Food history', 'Cooking'],
};

// Get user's onboarding preferences
function getOnboardingPreferences(): string[] {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const prefs = JSON.parse(stored);
      return prefs.categories || [];
    }
    return [];
  } catch {
    return [];
  }
}

// Get stored engagement data
export function getEngagementHistory(): UserEngagement[] {
  try {
    const stored = localStorage.getItem(ENGAGEMENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Track user engagement with an article
export function trackEngagement(
  article: WikiArticle,
  timeSpent: number,
  tapped: boolean
): void {
  try {
    const history = getEngagementHistory();

    const engagement: UserEngagement = {
      articleId: article.id,
      title: article.title,
      categories: article.categories || [],
      timeSpent,
      tapped,
      timestamp: new Date().toISOString(),
    };

    // Add new engagement and keep only recent ones
    const updated = [engagement, ...history].slice(0, MAX_ENGAGEMENTS);
    localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error tracking engagement:', error);
  }
}

// Analyze engagement to find user interests
function analyzeInterests(): Map<string, number> {
  const history = getEngagementHistory();
  const interests = new Map<string, number>();

  history.forEach((engagement) => {
    // Weight by recency (more recent = higher weight)
    const daysAgo = (Date.now() - new Date(engagement.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.max(0.1, 1 - daysAgo / 30);

    // Weight by engagement type
    const engagementWeight = engagement.tapped ? 2 : 1;
    const timeWeight = Math.min(2, engagement.timeSpent / 10000); // Cap at 10 seconds

    const totalWeight = recencyWeight * engagementWeight * timeWeight;

    // Add weight to categories
    engagement.categories.forEach((category) => {
      const current = interests.get(category) || 0;
      interests.set(category, current + totalWeight);
    });

    // Also track the title words as interests
    const words = engagement.title.toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.length > 3) {
        const current = interests.get(word) || 0;
        interests.set(word, current + totalWeight * 0.5);
      }
    });
  });

  return interests;
}

// Get top interests
export function getTopInterests(count: number = 5): string[] {
  const interests = analyzeInterests();
  return Array.from(interests.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([interest]) => interest);
}

// Get personalized recommendations based on engagement
export async function getPersonalizedRecommendations(): Promise<WikiArticle[]> {
  const history = getEngagementHistory();
  const onboardingPrefs = getOnboardingPreferences();

  const recommendations: WikiArticle[] = [];
  const seenIds = new Set<number>();

  // If no history, use onboarding preferences or random
  if (history.length === 0) {
    if (onboardingPrefs.length > 0) {
      // Use onboarding categories to bootstrap recommendations
      for (const category of onboardingPrefs.slice(0, 4)) {
        const searchTerms = CATEGORY_SEARCH_TERMS[category] || [category];
        const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const results = await searchArticles(randomTerm, 4);
        results.forEach((article) => {
          if (!seenIds.has(article.id)) {
            seenIds.add(article.id);
            recommendations.push(article);
          }
        });
      }
      // Add some random for discovery
      const random = await getRandomArticles(3);
      random.forEach((article) => {
        if (!seenIds.has(article.id)) {
          seenIds.add(article.id);
          recommendations.push(article);
        }
      });
      return shuffleArray(recommendations).slice(0, 15);
    }
    return getRandomArticles(10);
  }

  // Get related articles from recent engaged articles
  const recentEngaged = history
    .filter((e) => e.tapped || e.timeSpent > 5000)
    .slice(0, 3);

  for (const engagement of recentEngaged) {
    const related = await getRelatedArticles(engagement.title);
    related.forEach((article) => {
      if (!seenIds.has(article.id)) {
        seenIds.add(article.id);
        recommendations.push(article);
      }
    });
  }

  // Search based on top interests
  const topInterests = getTopInterests(3);
  for (const interest of topInterests) {
    const results = await searchArticles(interest, 5);
    results.forEach((article) => {
      if (!seenIds.has(article.id)) {
        seenIds.add(article.id);
        recommendations.push(article);
      }
    });
  }

  // Also include onboarding preferences if set
  if (onboardingPrefs.length > 0 && recommendations.length < 10) {
    const randomPref = onboardingPrefs[Math.floor(Math.random() * onboardingPrefs.length)];
    const searchTerms = CATEGORY_SEARCH_TERMS[randomPref] || [randomPref];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const results = await searchArticles(randomTerm, 3);
    results.forEach((article) => {
      if (!seenIds.has(article.id)) {
        seenIds.add(article.id);
        recommendations.push(article);
      }
    });
  }

  // Add some random articles for discovery
  const random = await getRandomArticles(3);
  random.forEach((article) => {
    if (!seenIds.has(article.id)) {
      seenIds.add(article.id);
      recommendations.push(article);
    }
  });

  // Shuffle recommendations
  return shuffleArray(recommendations).slice(0, 15);
}

// Get "more like this" recommendations
export async function getMoreLikeThis(article: WikiArticle): Promise<WikiArticle[]> {
  // Track that user wanted more like this
  trackEngagement(article, 10000, true);

  const related = await getRelatedArticles(article.title);

  // Also search for similar topics
  const words = article.title.split(/\s+/).filter((w) => w.length > 3);
  if (words.length > 0) {
    const searchResults = await searchArticles(words[0], 5);
    const seenIds = new Set(related.map((a) => a.id));
    searchResults.forEach((result) => {
      if (!seenIds.has(result.id)) {
        related.push(result);
      }
    });
  }

  return related.slice(0, 10);
}

// Utility function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Clear engagement history
export function clearEngagementHistory(): void {
  localStorage.removeItem(ENGAGEMENT_KEY);
}
