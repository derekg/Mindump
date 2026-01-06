# Rabbithole

*Fall into knowledge.*

An endless discovery feed for the curious mind. Swipe through Wikipedia articles like you're scrolling social media—but instead of memes, you're absorbing the entire sum of human knowledge.

## Features

- **Infinite Feed** - Scroll through an endless stream of Wikipedia articles
- **Smart Recommendations** - The more you linger, the deeper you go. Our algorithm learns what captivates you and serves up related rabbit holes
- **Trending** - See what the world is curious about with the most viewed articles
- **On This Day** - Discover history with events that happened on today's date
- **Save & Share** - Save your favorites and share the mind-blowing stuff
- **Dark/Light Mode** - Automatic theme based on system preferences

## Tech Stack

- React 18 + TypeScript
- Vite
- Wikipedia REST API
- Lucide Icons
- date-fns

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## How It Works

### Recommendation Algorithm

The app tracks your engagement with articles:
- **Time spent** viewing each article
- **Taps/clicks** on articles
- **Categories** of articles you engage with

This data is used to:
1. Find related articles from your recently engaged content
2. Search for topics matching your interests
3. Mix in random articles for discovery

### Wikipedia API Integration

The app uses Wikipedia's REST API to fetch:
- Random article summaries
- Featured article of the day
- Most read/trending articles
- On This Day historical events
- Related articles
- Search results

## License

MIT

---

**Stop doom-scrolling. Start brain-scrolling.**
