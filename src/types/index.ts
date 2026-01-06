export interface WikiArticle {
  id: number;
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  pageUrl: string;
  categories?: string[];
  related?: string[];
  timestamp?: string;
  views?: number;
}

export interface OnThisDayEvent {
  year: number;
  text: string;
  pages: WikiArticle[];
}

export interface TrendingPeriod {
  day: WikiArticle[];
  week: WikiArticle[];
  month: WikiArticle[];
}

export interface SavedArticle extends WikiArticle {
  savedAt: string;
}

export interface UserEngagement {
  articleId: number;
  title: string;
  categories: string[];
  timeSpent: number;
  tapped: boolean;
  timestamp: string;
}

export interface FeedState {
  articles: WikiArticle[];
  loading: boolean;
  error: string | null;
}

export type ViewMode = 'feed' | 'trending' | 'onthisday' | 'saved';
export type TrendingRange = 'day' | 'week' | 'month';
