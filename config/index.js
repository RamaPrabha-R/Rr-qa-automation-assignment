'use strict';

require('dotenv').config();

const config = {
  baseUrl: process.env.BASE_URL || 'https://tmdb-discover.surge.sh',
  tmdbApiBase: process.env.TMDB_API_BASE || 'https://api.themoviedb.org/3',
  tmdbApiKey: process.env.TMDB_API_KEY || '',

  browser: {
    type: process.env.BROWSER || 'chrome',
    headless: process.env.HEADLESS !== 'false',
    implicitWait: parseInt(process.env.IMPLICIT_WAIT || '10000', 10),
    pageLoadTimeout: parseInt(process.env.PAGE_LOAD_TIMEOUT || '30000', 10),
    windowSize: { width: 1440, height: 900 },
  },

  test: {
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '2', 10),
    screenshotOnFailure: process.env.SCREENSHOT_ON_FAILURE !== 'false',
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  urls: {
    home: '/',
    popular: '/popular',
    trending: '/trending',
    newest: '/newest',
    topRated: '/top-rated',
  },

  filters: {
    categories: ['Popular', 'Trending', 'Newest', 'Top Rated'],
    types: ['Movies', 'TV Shows'],
    genres: ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller'],
  },

  selectors: {
    // Navigation / Category tabs
    navTabs: '[data-testid="category-tab"], .category-tab, nav a, .tabs a, [role="tab"]',
    activeTab: '.active, [aria-selected="true"], .selected',

    // Search / Title filter
    searchInput: 'input[type="search"], input[placeholder*="search" i], input[placeholder*="title" i], .search-input, #search',

    // Type filter (Movies / TV Shows)
    typeFilter: '[data-testid="type-filter"], .type-filter, select[name="type"], [aria-label*="type" i]',
    typeMovies: '[value="movie"], [data-type="movie"]',
    typeTvShows: '[value="tv"], [data-type="tv"]',

    // Year filter
    yearFilter: 'select[name="year"], [data-testid="year-filter"], input[placeholder*="year" i]',

    // Rating filter
    ratingFilter: 'select[name="rating"], [data-testid="rating-filter"], input[type="range"]',

    // Genre filter
    genreFilter: 'select[name="genre"], [data-testid="genre-filter"], .genre-select',

    // Results / Cards
    mediaCards: '.card, .movie-card, .media-card, [data-testid="media-card"]',
    cardTitle: '.card-title, .title, h3, h2',
    cardRating: '.rating, .score, [data-testid="rating"]',
    cardYear: '.year, .release-year, [data-testid="year"]',
    cardType: '.type, .media-type, [data-testid="type"]',

    // Pagination
    paginationNext: '[aria-label="Next page"], .next-page, button:contains("Next"), .pagination-next',
    paginationPrev: '[aria-label="Previous page"], .prev-page, button:contains("Prev"), .pagination-prev',
    paginationPages: '.pagination a, .page-link, [data-testid="page-button"]',
    activePage: '.pagination .active, .current-page',

    // Loading / Error states
    loadingSpinner: '.loading, .spinner, [data-testid="loading"]',
    errorMessage: '.error, .error-message, [data-testid="error"]',
    noResults: '.no-results, .empty-state, [data-testid="no-results"]',
  },
};

module.exports = config;
