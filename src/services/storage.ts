import type { WikiArticle, SavedArticle } from '../types';

const SAVED_KEY = 'rabbithole_saved';

// Get all saved articles
export function getSavedArticles(): SavedArticle[] {
  try {
    const stored = localStorage.getItem(SAVED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save an article
export function saveArticle(article: WikiArticle): void {
  try {
    const saved = getSavedArticles();

    // Check if already saved
    if (saved.some((a) => a.id === article.id)) {
      return;
    }

    const savedArticle: SavedArticle = {
      ...article,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(SAVED_KEY, JSON.stringify([savedArticle, ...saved]));
  } catch (error) {
    console.error('Error saving article:', error);
  }
}

// Remove a saved article
export function unsaveArticle(articleId: number): void {
  try {
    const saved = getSavedArticles();
    const filtered = saved.filter((a) => a.id !== articleId);
    localStorage.setItem(SAVED_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing saved article:', error);
  }
}

// Check if article is saved
export function isArticleSaved(articleId: number): boolean {
  const saved = getSavedArticles();
  return saved.some((a) => a.id === articleId);
}

// Share article
export async function shareArticle(article: WikiArticle): Promise<boolean> {
  const shareData = {
    title: article.title,
    text: article.extract.slice(0, 200) + '...',
    url: article.pageUrl,
  };

  // Try native share API first
  if (navigator.share && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
      return false;
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(
      `${article.title}\n\n${article.extract.slice(0, 200)}...\n\nRead more: ${article.pageUrl}`
    );
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

// Export saved articles as JSON
export function exportSavedArticles(): string {
  const saved = getSavedArticles();
  return JSON.stringify(saved, null, 2);
}

// Import saved articles from JSON
export function importSavedArticles(json: string): boolean {
  try {
    const articles = JSON.parse(json) as SavedArticle[];
    const existing = getSavedArticles();
    const existingIds = new Set(existing.map((a) => a.id));

    const newArticles = articles.filter((a) => !existingIds.has(a.id));
    const merged = [...newArticles, ...existing];

    localStorage.setItem(SAVED_KEY, JSON.stringify(merged));
    return true;
  } catch (error) {
    console.error('Error importing articles:', error);
    return false;
  }
}
