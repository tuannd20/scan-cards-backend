const EXAMPLE_TIMESTAMP = '2026-06-19 12:00:00';

const HTTP_ERROR_LABELS: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
};

export function wrapSuccess(
  statusCode: number,
  message: string,
  data: unknown,
  timestamp = EXAMPLE_TIMESTAMP,
) {
  return {
    message,
    statusCode,
    data,
    timestamp,
  };
}

export function wrapError(
  statusCode: number,
  message: string,
  errorLabel?: string,
  timestamp = EXAMPLE_TIMESTAMP,
) {
  return {
    message,
    statusCode,
    data: {
      statusCode,
      message,
      error: errorLabel ?? HTTP_ERROR_LABELS[statusCode] ?? 'Error',
    },
    timestamp,
  };
}

export const SCAN_CARD_SUCCESS_EXAMPLE = wrapSuccess(
  200,
  'Card scanned successfully',
  {
    cardName: 'Pikachu ex',
    cardNameEn: 'Pikachu ex',
    rarity: 'Double Rare',
    energy: 'Lightning',
    artist: '5ban Graphics',
    year: '2024',
    type: 'Pokemon',
    finish: 'Holo',
    seriesExpansion: 'Scarlet & Violet',
    currentPrice: '$12.50',
    predictedPrice: '$14.00',
    priceLink: 'https://www.tcgplayer.com/product/example',
    hp: '190',
    weakness: 'Fighting',
    attacks: [
      {
        name: 'Thunder Shock',
        damage: '30',
        description:
          'Flip a coin. If heads, the Defending Pokemon is Paralyzed.',
      },
    ],
    cost: 0.00412,
    inputToken: 18420,
    outputToken: 1034,
    model: 'google/gemini-2.5-flash',
    openRouterCalls: [
      {
        step: 'card-new.detect-card-identity',
        cost: 0.0008,
        inputToken: 4200,
        outputToken: 120,
        model: 'google/gemini-2.5-flash',
      },
    ],
  },
);

export const CATALOG_LIST_EXAMPLE = wrapSuccess(200, 'success', {
  items: [
    {
      cardName: 'Charizard ex',
      cardNumber: '006/165',
      rarity: 'Double Rare',
      typeNames: ['Fire'],
      price: 25.5,
    },
  ],
  pagination: {
    total: 120,
    page: 1,
    limit: 20,
    totalPages: 6,
  },
});

export const CATALOG_SEARCH_EXAMPLE = wrapSuccess(200, 'success', {
  items: [
    {
      cardName: 'Charizard ex',
      cardNumber: '006/165',
      rarity: 'Double Rare',
      typeNames: ['Fire'],
      price: 25.5,
    },
  ],
  pagination: {
    total: 3,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  sort: 'name_asc',
});

export const CATALOG_STATS_EXAMPLE = wrapSuccess(200, 'success', {
  totalCards: 15234,
  typeBreakdown: [
    { type: 'Fire', count: 2100 },
    { type: 'Water', count: 1980 },
  ],
  rarityBreakdown: [
    { rarity: 'Common', count: 5200 },
    { rarity: 'Rare Holo', count: 890 },
  ],
});

export const CATALOG_TRENDING_EXAMPLE = wrapSuccess(200, 'success', {
  period: 'week',
  direction: 'both',
  minChangePercent: 5,
  limit: 20,
  total: 2,
  items: [
    {
      cardName: 'Pikachu ex',
      cardNumber: '193/165',
      currentPrice: 18.5,
      previousPrice: 14.2,
      changePercent: 30.28,
    },
  ],
});

export const CATALOG_TOP_MOVERS_EXAMPLE = wrapSuccess(200, 'success', {
  period: 'today',
  direction: 'gainers',
  limit: 10,
  total: 1,
  items: [
    {
      cardName: 'Mew ex',
      cardNumber: '151/165',
      currentPrice: 22.0,
      previousPrice: 18.0,
      changePercent: 22.22,
    },
  ],
});

export const ARTICLES_LIST_EXAMPLE = wrapSuccess(
  200,
  'Articles retrieved successfully',
  {
    articles: [
      {
        _id: '665f1a2b3c4d5e6f7a8b9c0d',
        title: 'Top Pokemon Cards to Watch',
        description: 'Weekly market highlights for collectors.',
        type: 'pokemon',
        bannerUrl: 'https://cdn.example.com/articles/banner.jpg',
        language: 'EN',
      },
    ],
    total: 42,
    page: 1,
    limit: 10,
  },
);

export const ARTICLE_DETAIL_EXAMPLE = wrapSuccess(
  200,
  'Article retrieved successfully',
  {
    title: 'Top Pokemon Cards to Watch',
    description: 'Weekly market highlights for collectors.',
    sections: [
      {
        heading: 'Market Overview',
        content: 'Prices for ex cards continued to climb this week.',
        image: 'https://cdn.example.com/articles/section-1.jpg',
      },
    ],
  },
);

export const INTERNAL_SERVER_ERROR_EXAMPLE = wrapError(
  500,
  'Internal server error',
);
