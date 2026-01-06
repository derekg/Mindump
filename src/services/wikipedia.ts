import type { WikiArticle, OnThisDayEvent } from '../types';

const WIKI_API = 'https://en.wikipedia.org/api/rest_v1';
const WIKI_ACTION_API = 'https://en.wikipedia.org/w/api.php';

// Transform Wikipedia API response to our article format
function transformArticle(page: any): WikiArticle {
  return {
    id: page.pageid || page.tid || Math.random(),
    title: page.title || page.normalizedtitle || '',
    extract: page.extract || page.description || '',
    thumbnail: page.thumbnail,
    originalimage: page.originalimage,
    pageUrl: page.content_urls?.desktop?.page ||
             `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
    categories: page.categories || [],
    views: page.views,
  };
}

// Get a random set of articles
export async function getRandomArticles(count: number = 10): Promise<WikiArticle[]> {
  try {
    const articles: WikiArticle[] = [];

    // Wikipedia random API - get multiple random articles
    for (let i = 0; i < count; i++) {
      const response = await fetch(`${WIKI_API}/page/random/summary`);
      if (response.ok) {
        const data = await response.json();
        articles.push(transformArticle(data));
      }
    }

    return articles;
  } catch (error) {
    console.error('Error fetching random articles:', error);
    return [];
  }
}

// Get featured article of the day
export async function getFeaturedArticle(): Promise<WikiArticle | null> {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const response = await fetch(`${WIKI_API}/feed/featured/${year}/${month}/${day}`);
    if (response.ok) {
      const data = await response.json();
      if (data.tfa) {
        return transformArticle(data.tfa);
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching featured article:', error);
    return null;
  }
}

// Get "On This Day" events
export async function getOnThisDay(): Promise<OnThisDayEvent[]> {
  try {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const response = await fetch(`${WIKI_API}/feed/onthisday/events/${month}/${day}`);
    if (response.ok) {
      const data = await response.json();
      return (data.events || []).slice(0, 20).map((event: any) => ({
        year: event.year,
        text: event.text,
        pages: (event.pages || []).map(transformArticle),
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching on this day:', error);
    return [];
  }
}

// Get related articles based on a title
export async function getRelatedArticles(title: string): Promise<WikiArticle[]> {
  try {
    const response = await fetch(`${WIKI_API}/page/related/${encodeURIComponent(title)}`);
    if (response.ok) {
      const data = await response.json();
      return (data.pages || []).map(transformArticle);
    }
    return [];
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }
}

// Search articles by query
export async function searchArticles(query: string, limit: number = 10): Promise<WikiArticle[]> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: query,
      gsrlimit: String(limit),
      prop: 'extracts|pageimages|info',
      exintro: '1',
      explaintext: '1',
      exsentences: '3',
      piprop: 'thumbnail|original',
      pithumbsize: '400',
      inprop: 'url',
      origin: '*',
    });

    const response = await fetch(`${WIKI_ACTION_API}?${params}`);
    if (response.ok) {
      const data = await response.json();
      const pages = data.query?.pages || {};
      return Object.values(pages).map((page: any) => ({
        id: page.pageid,
        title: page.title,
        extract: page.extract || '',
        thumbnail: page.thumbnail,
        originalimage: page.original,
        pageUrl: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error searching articles:', error);
    return [];
  }
}

// Get most viewed articles (trending)
export async function getMostViewed(_period: 'day' | 'week' | 'month' = 'day'): Promise<WikiArticle[]> {
  try {
    const today = new Date();
    let targetDate = new Date(today);

    // Go back a day to ensure data is available
    targetDate.setDate(targetDate.getDate() - 1);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');

    const response = await fetch(
      `${WIKI_API}/feed/featured/${year}/${month}/${day}`
    );

    if (response.ok) {
      const data = await response.json();
      const mostRead = data.mostread?.articles || [];

      // Filter out main page and special pages
      return mostRead
        .filter((article: any) =>
          !article.title.includes('Main_Page') &&
          !article.title.includes('Special:') &&
          !article.title.includes('Wikipedia:')
        )
        .slice(0, 20)
        .map(transformArticle);
    }
    return [];
  } catch (error) {
    console.error('Error fetching most viewed:', error);
    return [];
  }
}

// Get article by title with full details
export async function getArticleByTitle(title: string): Promise<WikiArticle | null> {
  try {
    const response = await fetch(`${WIKI_API}/page/summary/${encodeURIComponent(title)}`);
    if (response.ok) {
      const data = await response.json();
      return transformArticle(data);
    }
    return null;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

// Get articles by category
export async function getArticlesByCategory(category: string, limit: number = 10): Promise<WikiArticle[]> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmlimit: String(limit),
      cmtype: 'page',
      origin: '*',
    });

    const response = await fetch(`${WIKI_ACTION_API}?${params}`);
    if (response.ok) {
      const data = await response.json();
      const members = data.query?.categorymembers || [];

      // Fetch full details for each article
      const articles = await Promise.all(
        members.map((member: any) => getArticleByTitle(member.title))
      );

      return articles.filter((a): a is WikiArticle => a !== null);
    }
    return [];
  } catch (error) {
    console.error('Error fetching category articles:', error);
    return [];
  }
}
