import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as stringSimilarity from 'string-similarity';
import { randomUUID } from 'crypto';
import { EnergyTypeService } from '../ai-chat/energy-type.service';

type CardCategory = 'all' | 'pokemon' | 'yugioh' | 'soccer';
type SearchCardCategory = 'pokemon' | 'yugioh' | 'soccer';

interface GetAllCardsOptions {
  type?: string;
  page?: number;
  limit?: number;
}

interface SearchCardsOptions {
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface PricePoint {
  price: string;
  date: string;
}

interface AttackPayload {
  name: string;
  damage: string;
  description: string;
  energy: string[];
  _id: string;
}

interface GradedPricePayload {
  grade: string;
  price: string;
}

interface BuyLinkPayload {
  Shop: string;
  link: string;
}

interface FullScanCardPayload {
  cardName: string;
  cardNameEn?: string;
  rarity: string;
  energy: string;
  artist: string;
  year: string;
  type: string;
  finish: string;
  seriesExpansion: string;
  seriesExpansionEn?: string;
  description: string;
  currentPrice: string;
  predictedPrice: string;
  priceLink: string;
  attacks: AttackPayload[];
  hp: string;
  weakness: string;
  'TCG-1month-prices': PricePoint[];
  'TCG-3month-prices': PricePoint[];
  'TCG-6month-prices': PricePoint[];
  'TCG-1year-prices': PricePoint[];
  'TCG-all-prices': PricePoint[];
  'TCG-1month-forecast-prices': PricePoint[];
  'TCG-3month-forecast-prices': PricePoint[];
  'TCG-6month-forecast-prices': PricePoint[];
  'TCG-1year-forecast-prices': PricePoint[];
  'TCG-all-forecast-prices': PricePoint[];
  'CM-1month-prices': PricePoint[];
  'CM-3month-prices': PricePoint[];
  'CM-6month-prices': PricePoint[];
  'CM-1year-prices': PricePoint[];
  'CM-all-prices': PricePoint[];
  'CM-1month-forecast-prices': PricePoint[];
  'CM-3month-forecast-prices': PricePoint[];
  'CM-6month-forecast-prices': PricePoint[];
  'CM-1year-forecast-prices': PricePoint[];
  'CM-all-forecast-prices': PricePoint[];
  gradedPrices: GradedPricePayload[];
  buyLink: BuyLinkPayload[];
}

interface OpenRouterCallUsage {
  step: string;
  cost: number;
  inputToken: number;
  outputToken: number;
  model: string;
}

interface OpenRouterUsageTracker {
  calls: OpenRouterCallUsage[];
  total: Pick<OpenRouterCallUsage, 'cost' | 'inputToken' | 'outputToken' | 'model'>;
}

type ScanCardOpenRouterPayload = FullScanCardPayload & {
  cost: number;
  inputToken: number;
  outputToken: number;
  model: string;
  openRouterCalls: OpenRouterCallUsage[];
};

interface ScanCardOpenRouterResult {
  success: boolean;
  message: string;
  data?: ScanCardOpenRouterPayload;
}

interface CurrencyConversionApiResponse {
  data?: number;
}

interface UploadedTypeIcon {
  type: string;
  url: string;
}

interface CardmarketSearchCandidate {
  href: string;
  text: string;
  contextText: string;
}

interface CardmarketMetricsSnapshot {
  detailUrl: string;
  title: string;
  priceTrend: number;
  average30: number;
  average7: number;
  average1: number;
  availableFrom: number;
  chartPoints: Array<{ label: string; price: number }>;
  chartSource: 'chartjs' | 'script' | 'summary';
}

const HISTORY_POINT_COUNT = 10;
const CARDMARKET_HISTORY_POINT_COUNT = 12;
const FORECAST_POINT_COUNT = 4;
const TCGPLAYER_BASE_URL = 'https://www.tcgplayer.com';
const TCGPLAYER_HISTORY_API_BASE = 'https://infinite-api.tcgplayer.com';
const CARDMARKET_BASE_URL = 'https://www.cardmarket.com';
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const IDENTITY_FIELD_KEYS = [
  'cardName',
  'seriesExpansion',
  'year',
  'cardNumber',
];
const FULL_CARD_FIELD_KEYS = [
  'cardName',
  'rarity',
  'energy',
  'artist',
  'year',
  'type',
  'finish',
  'seriesExpansion',
  'description',
  'currentPrice',
  'predictedPrice',
  'priceLink',
  'attacks',
  'hp',
  'weakness',
  'TCG-1month-prices',
  'TCG-3month-prices',
  'TCG-6month-prices',
  'TCG-1year-prices',
  'TCG-all-prices',
  'TCG-1month-forecast-prices',
  'TCG-3month-forecast-prices',
  'TCG-6month-forecast-prices',
  'TCG-1year-forecast-prices',
  'TCG-all-forecast-prices',
  'CM-1month-prices',
  'CM-3month-prices',
  'CM-6month-prices',
  'CM-1year-prices',
  'CM-all-prices',
  'CM-1month-forecast-prices',
  'CM-3month-forecast-prices',
  'CM-6month-forecast-prices',
  'CM-1year-forecast-prices',
  'CM-all-forecast-prices',
  'gradedPrices',
  'buyLink',
];

const createPriceSeriesSchema = (count: number) => ({
  type: 'array',
  items: pricePointSchema,
  minItems: count,
  maxItems: count,
});

const pricePointSchema = {
  type: 'object',
  properties: {
    price: { type: 'string' },
    date: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    },
  },
  required: ['price', 'date'],
  additionalProperties: false,
};

const gradedPriceSchema = {
  type: 'object',
  properties: {
    grade: { type: 'string' },
    price: { type: 'string' },
  },
  required: ['grade', 'price'],
  additionalProperties: false,
};

const buyLinkSchema = {
  type: 'object',
  properties: {
    Shop: { type: 'string' },
    link: { type: 'string', format: 'uri' },
  },
  required: ['Shop', 'link'],
  additionalProperties: false,
};

const attackSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    damage: { type: 'string' },
    description: { type: 'string' },
    energy: {
      type: 'array',
      items: { type: 'string' },
    },
    _id: { type: 'string' },
  },
  required: ['name', 'damage', 'description', 'energy', '_id'],
  additionalProperties: false,
};

const historicalPriceSeriesSchema =
  createPriceSeriesSchema(HISTORY_POINT_COUNT);
const cardmarketHistoricalPriceSeriesSchema = createPriceSeriesSchema(
  CARDMARKET_HISTORY_POINT_COUNT,
);
const forecastPriceSeriesSchema = createPriceSeriesSchema(FORECAST_POINT_COUNT);

const fullCardScanSchema = {
  type: 'object',
  properties: {
    cardName: { type: 'string' },
    rarity: { type: 'string' },
    energy: { type: 'string' },
    artist: { type: 'string' },
    year: { type: 'string' },
    type: { type: 'string' },
    finish: { type: 'string' },
    seriesExpansion: { type: 'string' },
    description: { type: 'string' },
    currentPrice: { type: 'string' },
    predictedPrice: { type: 'string' },
    priceLink: { type: 'string', format: 'uri' },
    attacks: {
      type: 'array',
      items: attackSchema,
    },
    hp: { type: 'string' },
    weakness: { type: 'string' },
    'TCG-1month-prices': historicalPriceSeriesSchema,
    'TCG-3month-prices': historicalPriceSeriesSchema,
    'TCG-6month-prices': historicalPriceSeriesSchema,
    'TCG-1year-prices': historicalPriceSeriesSchema,
    'TCG-all-prices': historicalPriceSeriesSchema,
    'TCG-1month-forecast-prices': forecastPriceSeriesSchema,
    'TCG-3month-forecast-prices': forecastPriceSeriesSchema,
    'TCG-6month-forecast-prices': forecastPriceSeriesSchema,
    'TCG-1year-forecast-prices': forecastPriceSeriesSchema,
    'TCG-all-forecast-prices': forecastPriceSeriesSchema,
    'CM-1month-prices': cardmarketHistoricalPriceSeriesSchema,
    'CM-3month-prices': cardmarketHistoricalPriceSeriesSchema,
    'CM-6month-prices': cardmarketHistoricalPriceSeriesSchema,
    'CM-1year-prices': cardmarketHistoricalPriceSeriesSchema,
    'CM-all-prices': cardmarketHistoricalPriceSeriesSchema,
    'CM-1month-forecast-prices': forecastPriceSeriesSchema,
    'CM-3month-forecast-prices': forecastPriceSeriesSchema,
    'CM-6month-forecast-prices': forecastPriceSeriesSchema,
    'CM-1year-forecast-prices': forecastPriceSeriesSchema,
    'CM-all-forecast-prices': forecastPriceSeriesSchema,
    gradedPrices: {
      type: 'array',
      items: gradedPriceSchema,
    },
    buyLink: {
      type: 'array',
      items: buyLinkSchema,
    },
  },
  required: [
    'cardName',
    'rarity',
    'energy',
    'artist',
    'year',
    'type',
    'finish',
    'seriesExpansion',
    'description',
    'currentPrice',
    'predictedPrice',
    'priceLink',
    'attacks',
    'hp',
    'weakness',
    'TCG-1month-prices',
    'TCG-3month-prices',
    'TCG-6month-prices',
    'TCG-1year-prices',
    'TCG-all-prices',
    'TCG-1month-forecast-prices',
    'TCG-3month-forecast-prices',
    'TCG-6month-forecast-prices',
    'TCG-1year-forecast-prices',
    'TCG-all-forecast-prices',
    'CM-1month-prices',
    'CM-3month-prices',
    'CM-6month-prices',
    'CM-1year-prices',
    'CM-all-prices',
    'CM-1month-forecast-prices',
    'CM-3month-forecast-prices',
    'CM-6month-forecast-prices',
    'CM-1year-forecast-prices',
    'CM-all-forecast-prices',
    'gradedPrices',
    'buyLink',
  ],
  additionalProperties: false,
};

const cardIdentitySchema = {
  type: 'object',
  properties: {
    cardName: {
      type: 'string',
      description: 'Card name as printed on the card (original language)',
    },
    cardNameEn: {
      type: 'string',
      description: 'English card name for searching on trading card markets',
    },
    seriesExpansion: {
      type: 'string',
      description: 'Set / expansion name as printed on the card',
    },
    seriesExpansionEn: {
      type: 'string',
      description: 'English set / expansion name for searching',
    },
    year: { type: 'string' },
    cardNumber: { type: 'string' },
  },
  required: [
    'cardName',
    'cardNameEn',
    'seriesExpansion',
    'seriesExpansionEn',
    'year',
    'cardNumber',
  ],
  additionalProperties: false,
};

const buildCardIdentityPrompt = () => `
Read this Pokemon card image carefully and return ONLY valid JSON.

Rules:
- cardName: exact card name printed on the card (original language as seen on card).
- cardNameEn: the English card name (official English name of the Pokemon/character on the card).
- seriesExpansion: visible set / expansion name as printed on the card.
- seriesExpansionEn: the English name of that set / expansion.
- year: visible year if visible, otherwise empty string.
- cardNumber: visible card number / set number if visible, otherwise empty string.
- Do not guess extra text.
- Return only JSON.
`;

const buildFullCardScanPrompt = (currentDate: string) => `
Analyze this Pokemon trading card image and extract all visible information. Return ONLY valid JSON.

Today is ${currentDate}.

## Card Fields — READ CAREFULLY
- cardName: exact name printed on the card (e.g. "Clefairy", "Sylveon GX")
- rarity: rarity text from card (e.g. "Ultra Rare", "Rare", "Common") — NOT from set list
- hp: HP value from the card (e.g. "70", "200") — REQUIRED, look for "HP" near the card name
- attacks: ARRAY of ALL attacks/abilities on the card. Each attack must have:
  - name: attack name ONLY (e.g. "Follow Me", "Flop")
  - damage: damage number ONLY (e.g. "30", "110") — NEVER put text here
  - description: effect/rule text of the attack (e.g. "Switch in 1 of your opponent's Benched Pokémon...")
  - energy: array of energy cost (e.g. ["Psychic"] or ["Psychic","Psychic"] or ["Colorless","Colorless"])
- weakness: the type symbol shown (e.g. "Psychic", "Fire") — NOT an image URL
- artist: illustrator name from card bottom

## Rules
- If a field is not visible, infer it from the card image and Pokemon shown.
- hp is REQUIRED — every Pokemon card has an HP value. Look carefully near the card name.
- attacks is REQUIRED — at least 1 attack per card. Most cards have 1-3 attacks.
- Never return null or empty arrays. Always return an array for attacks.
- Use the SAME language as the card for: cardName, seriesExpansion, rarity, artist, type, finish, description, hp, weakness, attacks[].name, attacks[].description.
- Use English ONLY for energy type names (Fire, Water, Grass, Lightning, Psychic, Fighting, Darkness, Metal, Dragon, Fairy, Colorless) and attacks[].energy.
- attacks[].damage must be ONLY a number. Never put rule text here.
- Every TCG historical price array must contain exactly ${HISTORY_POINT_COUNT} points starting from ${currentDate} going backward.
- Every CM historical price array must contain exactly ${CARDMARKET_HISTORY_POINT_COUNT} points.
- Every forecast array must contain exactly ${FORECAST_POINT_COUNT} points starting from ${currentDate} going forward.
- Return ONLY the JSON object, no markdown, no explanation.
`;

const buildScrapedEnrichmentPrompt = (
  currentDate: string,
  scrapedData: Record<string, any>,
) => `
You are enriching a Pokemon card payload using authoritative scraped data from TCGPlayer.

Today is ${currentDate}.

Authoritative scraped data:
${JSON.stringify(scrapedData, null, 2)}

Rules:
- Return ONLY valid JSON matching the required schema exactly.
- Preserve every non-empty scraped value exactly as provided.
- Only fill fields that are empty, missing, or obviously unavailable from scraping.
- Keep TCG historical arrays if they already exist in the scraped data.
- Generate forecast arrays starting at ${currentDate}.
- If CM historical arrays are missing, create plausible values based on the scraped TCG data.
- If you must create CM historical arrays, return exactly ${CARDMARKET_HISTORY_POINT_COUNT} points for each CM historical array.
- Use the SAME language as the card for: cardName, seriesExpansion, rarity, artist, type, finish, description, hp, weakness, attacks[].name, attacks[].description.
- Use English ONLY for energy type names (Fire, Water, Grass, Lightning, Psychic, Fighting, Darkness, Metal, Dragon, Fairy, Colorless) and attacks[].energy array.
- attacks[].damage must be ONLY a number or "×2" style multiplier string. NEVER put rule text here.
- attacks[].energy must be an array of energy type names or cost numbers. NEVER put image URLs here.
- attacks[].name must be the attack/ability name ONLY (e.g. "Fairy Wind", "Magical Ribbon", "Plea GX"). NEVER put effect descriptions in the name field.
- attacks[].description should contain the effect/rules text, NOT the attack name.
- Return only JSON, no explanation.
`;

const scanTextReadSchema = {
  type: 'object',
  properties: {
    cardName: { type: 'string' },
    hp: { type: 'string' },
    weakness: { type: 'string' },
    artist: { type: 'string' },
    description: { type: 'string' },
    attacks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          damage: { type: 'string' },
          description: { type: 'string' },
          energy: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['name', 'damage', 'description', 'energy'],
        additionalProperties: false,
      },
    },
  },
  required: ['cardName', 'hp', 'weakness', 'artist', 'description', 'attacks'],
  additionalProperties: false,
};

const buildScanTextReadPrompt = () => `
You are an OCR-style Pokemon card reader. Extract visible text and attacks from this card image.

Return ONLY valid JSON.

Rules:
- Focus on text actually visible on card.
- attacks must include each attack found on the card with:
  - name: attack name only
  - damage: number or multiplier (e.g. "30", "×2"). If no damage shown, return "0".
  - description: effect text for that attack. If no effect text, return "No attack description available."
  - energy: list of energy type names in English (Fire, Water, Grass, Lightning, Psychic, Fighting, Darkness, Metal, Dragon, Fairy, Colorless)
- hp: numeric string (e.g. "70")
- weakness: plain type name (e.g. "Psychic", "Metal")
- Never return image URLs.
- Return empty string only if a field is truly unreadable.
`;

// ══════════════════════════════════════════════════════════════════════════════
// PSA GRADING PROMPT & SCHEMA
// ══════════════════════════════════════════════════════════════════════════════

const buildPsaGradingPrompt = () => `
You are a professional PSA card grading expert. Analyze this trading card image carefully.

Return ONLY valid JSON matching the required schema exactly.

## Centering
- score: 1–10 (10 = perfectly centered)
- top, bottom, left, right: percentage of card border (0–100)
- description: brief note (e.g. "slightly left-heavy", "well-centered")

## Corners
- score: 1–10, the average/worst corner grade
- description: worst corner condition (e.g. "minor whitening on bottom-right corner")

## Edges
- score: 1–10
- description: worst edge condition (e.g. "slight whitening on right edge")

## Surface
- score: 1–10
- description: surface condition (e.g. "clean surface, minor print line")

## Estimated Grade
- estimatedGrade: PSA grade range string like "7-8" or "9-10"
- rawPrice: raw market value string like "$50-100"

## Graded Prices
For the estimated grade range, return prices for ALL grades in that range AND the grade immediately above.
Examples:
- If estimatedGrade is "7-8", return: PSA 7, PSA 8, PSA 9
- If estimatedGrade is "8-9", return: PSA 8, PSA 9, PSA 10
- If estimatedGrade is "9-10", return: PSA 8, PSA 9, PSA 10
- If estimatedGrade is "6-7", return: PSA 6, PSA 7, PSA 8
Format each price as a string with currency symbol, e.g. "$50", "$75.50"

## Notes
- Any additional observations

Return ONLY JSON, no explanation.`;

const psaGradingSchema = {
  type: 'object',
  properties: {
    centering: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 1, maximum: 10 },
        top: { type: 'number', minimum: 0, maximum: 100 },
        bottom: { type: 'number', minimum: 0, maximum: 100 },
        left: { type: 'number', minimum: 0, maximum: 100 },
        right: { type: 'number', minimum: 0, maximum: 100 },
        description: { type: 'string' },
      },
      required: ['score', 'top', 'bottom', 'left', 'right'],
      additionalProperties: false,
    },
    corners: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 1, maximum: 10 },
        description: { type: 'string' },
      },
      required: ['score'],
      additionalProperties: false,
    },
    edges: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 1, maximum: 10 },
        description: { type: 'string' },
      },
      required: ['score'],
      additionalProperties: false,
    },
    surface: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 1, maximum: 10 },
        description: { type: 'string' },
      },
      required: ['score'],
      additionalProperties: false,
    },
    estimatedGrade: {
      type: 'string',
      description: 'Estimated PSA grade range, e.g. "7-8" or "9-10"',
    },
    rawPrice: {
      type: 'string',
      description: 'Estimated raw (ungraded) market value, e.g. "$50-100"',
    },
    gradedPrices: {
      type: 'object',
      description:
        'Prices for grades in range (e.g. 7-8 → {PSA 7, PSA 8, PSA 9})',
      additionalProperties: { type: 'string' },
    },
    notes: { type: 'string' },
  },
  required: [
    'centering',
    'corners',
    'edges',
    'surface',
    'estimatedGrade',
    'gradedPrices',
  ],
  additionalProperties: false,
};

@Injectable()
export class CardNewService implements OnModuleInit {
  private readonly logger = new Logger(CardNewService.name);
  private pokemonCards: any[] = [];
  private yugiohCards: any[] = [];
  private soccerCards: any[] = [];
  private uploadedTypeIconMap: Record<string, string> = {};

  onModuleInit(): void {
    this.loadAllData();
    this.loadUploadedTypeIcons();
  }

  getAllCards(options: GetAllCardsOptions = {}) {
    const category = this.normalizeCategory(options.type);
    const usePagination = this.shouldUsePagination(options.page, options.limit);
    const pagination = this.normalizePagination(options.page, options.limit);

    if (category === 'pokemon') {
      return {
        type: 'pokemon',
        ...this.buildCategoryPayload(
          this.pokemonCards,
          usePagination,
          pagination,
        ),
      };
    }

    if (category === 'yugioh') {
      return {
        type: 'yugioh',
        ...this.buildCategoryPayload(
          this.yugiohCards,
          usePagination,
          pagination,
        ),
      };
    }

    if (category === 'soccer') {
      return {
        type: 'soccer',
        ...this.buildCategoryPayload(
          this.soccerCards,
          usePagination,
          pagination,
        ),
      };
    }

    return {
      type: 'all',
      totals: {
        pokemon: this.pokemonCards.length,
        yugioh: this.yugiohCards.length,
        soccer: this.soccerCards.length,
        all:
          this.pokemonCards.length +
          this.yugiohCards.length +
          this.soccerCards.length,
      },
      data: {
        pokemon: this.buildCategoryPayload(
          this.pokemonCards,
          usePagination,
          pagination,
        ),
        yugioh: this.buildCategoryPayload(
          this.yugiohCards,
          usePagination,
          pagination,
        ),
        soccer: this.buildCategoryPayload(
          this.soccerCards,
          usePagination,
          pagination,
        ),
      },
    };
  }

  searchCards(options: SearchCardsOptions = {}) {
    const category = this.normalizeSearchCategory(options.type);
    const keyword = this.normalizeSearchKeyword(options.search);
    const usePagination = this.shouldUsePagination(options.page, options.limit);
    const pagination = this.normalizePagination(options.page, options.limit);
    const sourceItems = this.getItemsBySearchCategory(category);
    const filteredItems = sourceItems.filter((item) =>
      this.matchesByCategory(item, category, keyword),
    );

    return {
      type: category,
      search: options.search,
      ...this.buildCategoryPayload(filteredItems, usePagination, pagination),
    };
  }

  async convertCurrencyPayload(
    rawData: Record<string, any>,
    base: string,
    target: string,
  ): Promise<FullScanCardPayload> {
    const normalizedData = this.normalizeFullScanCardPayload(rawData || {});
    const exchangeRate = await this.fetchCurrencyExchangeRate(base, target);

    return this.applyCurrencyConversionToPayload(
      normalizedData,
      exchangeRate,
      target,
    );
  }

  async scanCardOpenRouter(
    imageBuffer: Buffer,
    filename: string,
    language?: string,
  ): Promise<ScanCardOpenRouterResult> {
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        return {
          success: false,
          message: 'OPENROUTER_API_KEY environment variable is not set',
        };
      }

      const extension = this.getFileExtension(filename);
      const base64Image = `data:image/${extension};base64,${imageBuffer.toString('base64')}`;
      const currentDate = this.shiftDate(0);
      const usageTracker = this.createOpenRouterUsageTracker(
        this.getOpenRouterScanModel(),
      );
      const identity = await this.detectCardIdentity(
        base64Image,
        usageTracker,
      );

      // Use English name for TCGPlayer/Cardmarket search (most reliable)
      const searchCardName = identity?.cardNameEn || identity?.cardName || '';
      const searchSeries =
        identity?.seriesExpansionEn || identity?.seriesExpansion || '';

      // AI reads the card DIRECTLY from image — this is the primary source for all card fields
      let aiData = await this.generateAiFallbackCardData(
        base64Image,
        currentDate,
        usageTracker,
      );

      // Retry once if AI failed
      if (
        !aiData ||
        !aiData.cardName ||
        aiData.cardName.toLowerCase() === 'unknown'
      ) {
        this.logger.warn('[card-new.scan-card] AI returned empty, retrying...');
        aiData = await this.generateAiFallbackCardData(
          base64Image,
          currentDate,
          usageTracker,
        );
      }

      // Fallback: if AI completely fails, try with just the card name from identity
      if (
        !aiData ||
        !aiData.cardName ||
        aiData.cardName.toLowerCase() === 'unknown'
      ) {
        this.logger.warn(
          '[card-new.scan-card] AI still failed, using identity fallback',
        );
        aiData = {
          cardName: identity?.cardName || identity?.cardNameEn || 'Unknown',
          seriesExpansion:
            identity?.seriesExpansion || identity?.seriesExpansionEn || '',
          rarity: '',
          energy: '',
          artist: '',
          year: identity?.year || '',
          type: 'Pokemon',
          finish: '',
          description: '',
          currentPrice: '',
          predictedPrice: '',
          priceLink: '',
          attacks: [],
          hp: '',
          weakness: '',
        };
      }

      // Dedicated OCR-style read for scan (separate from grade flow)
      const textReadData = await this.extractScanTextData(
        base64Image,
        usageTracker,
      );
      aiData = this.mergeScanTextData(aiData, textReadData);

      // Scrape TCGPlayer ONLY for price data (history arrays, current price)
      const scrapedPriceData = await this.scrapeTcgplayerCardData(
        searchCardName,
        searchSeries,
        identity?.year || '',
        identity?.cardNumber || '',
      );

      // Merge: AI data is primary, scraper only provides price arrays
      const mergedData = this.mergeCardDataForScan(
        aiData,
        scrapedPriceData,
        identity || {},
      );

      const normalizedData = this.normalizeFullScanCardPayload(mergedData);
      const data = await this.translateCardPayload(normalizedData, language);

      this.logger.log(
        `[card-new.scan-card] done | card="${data.cardName}" | hp="${data.hp}" | attacks=${Array.isArray(data.attacks) ? data.attacks.length : 0} | price=${data.currentPrice}`,
      );

      if (!data.cardName || data.cardName.toLowerCase() === 'unknown') {
        return {
          success: false,
          message: 'Could not identify card name from image',
        };
      }

      return {
        success: true,
        message: 'Card scanned successfully',
        data: {
          ...data,
          ...usageTracker.total,
          openRouterCalls: usageTracker.calls,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenRouter scan failed: ${message}`);

      if (axios.isAxiosError(error)) {
        this.logger.error(
          `OpenRouter error response: ${JSON.stringify(error.response?.data ?? {})}`,
        );
      }

      return {
        success: false,
        message: 'Internal server error while scanning card',
      };
    }
  }

  private loadAllData(): void {
    this.loadPokemonCards();
    this.loadYugiohCards();
    this.loadSoccerCards();
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'jpeg';
  }

  private loadUploadedTypeIcons(): void {
    try {
      const filePath = path.join(process.cwd(), 'uploaded-type-icons.json');
      if (!fs.existsSync(filePath)) {
        this.logger.warn(
          'uploaded-type-icons.json not found, falling back to default energy icons',
        );
        return;
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.logger.warn('uploaded-type-icons.json is not a valid array');
        return;
      }

      this.uploadedTypeIconMap = parsed.reduce(
        (accumulator: Record<string, string>, item: UploadedTypeIcon) => {
          const key = this.normalizeUploadedTypeKey(item?.type);
          const value = this.normalizeUrl(item?.url);
          if (key && value) {
            accumulator[key] = value;
          }
          return accumulator;
        },
        {},
      );
    } catch (error) {
      this.logger.error(
        `Failed to load uploaded-type-icons.json: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private getOpenRouterScanModel(): string {
    return (
      process.env.OPENROUTER_CARD_SCAN_MODEL || 'google/gemini-2.5-flash'
    );
  }

  private createOpenRouterUsageTracker(
    defaultModel: string,
  ): OpenRouterUsageTracker {
    return {
      calls: [],
      total: {
        cost: 0,
        inputToken: 0,
        outputToken: 0,
        model: defaultModel,
      },
    };
  }

  private extractOpenRouterCallUsage(
    responseData: any,
    step: string,
    model: string,
  ): OpenRouterCallUsage {
    const usage = responseData?.usage;
    const resolvedModel = responseData?.model || model;

    return {
      step,
      cost: Number(usage?.cost ?? 0),
      inputToken: Number(usage?.prompt_tokens ?? 0),
      outputToken: Number(usage?.completion_tokens ?? 0),
      model: resolvedModel,
    };
  }

  private recordOpenRouterUsage(
    tracker: OpenRouterUsageTracker,
    responseData: any,
    step: string,
    model: string,
  ): OpenRouterCallUsage {
    const callUsage = this.extractOpenRouterCallUsage(
      responseData,
      step,
      model,
    );
    tracker.calls.push(callUsage);
    tracker.total.cost += callUsage.cost;
    tracker.total.inputToken += callUsage.inputToken;
    tracker.total.outputToken += callUsage.outputToken;
    tracker.total.model = callUsage.model || tracker.total.model;
    return callUsage;
  }

  private async requestOpenRouterJson(
    prompt: string,
    schema: Record<string, any>,
    base64Image: string,
    usageContext: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      timeout?: number;
      usageTracker?: OpenRouterUsageTracker;
    },
  ): Promise<Record<string, any> | null> {
    const model =
      options?.model ||
      process.env.OPENROUTER_CARD_SCAN_MODEL ||
      'google/gemini-2.5-flash';
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: base64Image } },
            ],
          },
        ],
        response_format: {
          type: 'json_object',
        },
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 8192,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: options?.timeout ?? 45000,
      },
    );

    if (options?.usageTracker) {
      this.recordOpenRouterUsage(
        options.usageTracker,
        response?.data,
        usageContext,
        model,
      );
    }
    this.logOpenRouterUsage(response?.data, usageContext);
    const parsed = this.parseAiJson(
      response?.data?.choices?.[0]?.message?.content,
    );

    // Log raw AI response for debugging
    const rawContent = response?.data?.choices?.[0]?.message?.content;
    if (parsed) {
      this.logger.log(
        `[openrouter] ${usageContext} | raw_length=${(rawContent || '').length} | attacks=${Array.isArray(parsed.attacks) ? parsed.attacks.length : 'null'} | hp="${parsed.hp || 'null'}" | cardName="${parsed.cardName || 'null'}"`,
      );
    } else {
      this.logger.warn(
        `[openrouter] ${usageContext} | PARSE FAILED | raw=${String(rawContent || '').slice(0, 200)}`,
      );
    }

    return parsed;
  }

  private async requestOpenRouterJsonForScan(
    prompt: string,
    schema: Record<string, any>,
    base64Image: string,
    usageContext: string,
    usageTracker?: OpenRouterUsageTracker,
  ): Promise<Record<string, any> | null> {
    return this.requestOpenRouterJson(
      prompt,
      schema,
      base64Image,
      usageContext,
      {
        model: this.getOpenRouterScanModel(),
        temperature: 0.2,
        maxTokens: 8192,
        timeout: 45000,
        usageTracker,
      },
    );
  }

  private async requestOpenRouterJsonForGrade(
    prompt: string,
    schema: Record<string, any>,
    base64Image: string,
    usageContext: string,
  ): Promise<Record<string, any> | null> {
    return this.requestOpenRouterJson(
      prompt,
      schema,
      base64Image,
      usageContext,
      {
        model:
          process.env.OPENROUTER_CARD_GRADE_MODEL ||
          process.env.OPENROUTER_CARD_SCAN_MODEL ||
          'google/gemini-2.5-flash',
        temperature: 0.1,
        maxTokens: 8192,
        timeout: 60000,
      },
    );
  }

  private async detectCardIdentity(
    base64Image: string,
    usageTracker?: OpenRouterUsageTracker,
  ): Promise<Record<string, any> | null> {
    try {
      return await this.requestOpenRouterJsonForScan(
        buildCardIdentityPrompt(),
        cardIdentitySchema,
        base64Image,
        'card-new.detect-card-identity',
        usageTracker,
      );
    } catch (error) {
      this.logger.warn(
        `Detect card identity failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async enrichScrapedCardData(
    base64Image: string,
    currentDate: string,
    scrapedData: Record<string, any>,
  ): Promise<Record<string, any> | null> {
    try {
      const result = await this.requestOpenRouterJsonForScan(
        buildScrapedEnrichmentPrompt(currentDate, scrapedData),
        fullCardScanSchema,
        base64Image,
        'card-new.enrich-scraped-data',
      );
      if (result) {
        this.logger.log(
          `[card-new.enrich] AI returned attacks=${Array.isArray(result.attacks) ? result.attacks.length : 'null'}, hp="${result.hp || 'null'}"`,
        );
      }
      return result;
    } catch (error) {
      this.logger.warn(
        `Enrich scraped card data failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async generateAiFallbackCardData(
    base64Image: string,
    currentDate: string,
    usageTracker?: OpenRouterUsageTracker,
  ): Promise<Record<string, any> | null> {
    try {
      const result = await this.requestOpenRouterJsonForScan(
        buildFullCardScanPrompt(currentDate),
        fullCardScanSchema,
        base64Image,
        'card-new.ai-fallback-full-scan',
        usageTracker,
      );
      if (result) {
        this.logger.log(
          `[card-new.fallback] AI returned attacks=${Array.isArray(result.attacks) ? result.attacks.length : 'null'}, hp="${result.hp || 'null'}"`,
        );
      }
      return result;
    } catch (error) {
      this.logger.warn(
        `AI fallback full scan failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async extractScanTextData(
    base64Image: string,
    usageTracker?: OpenRouterUsageTracker,
  ): Promise<Record<string, any> | null> {
    try {
      const result = await this.requestOpenRouterJsonForScan(
        buildScanTextReadPrompt(),
        scanTextReadSchema,
        base64Image,
        'card-new.scan-text-read',
        usageTracker,
      );

      if (result) {
        this.logger.log(
          `[card-new.scan-text-read] attacks=${Array.isArray(result.attacks) ? result.attacks.length : 0} | hp="${result.hp || 'null'}"`,
        );
      }

      return result;
    } catch (error) {
      this.logger.warn(
        `Scan text read failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private mergeScanTextData(
    aiData: Record<string, any>,
    textData: Record<string, any> | null,
  ): Record<string, any> {
    if (!textData || typeof textData !== 'object') return aiData;

    const merged = { ...aiData };

    if (Array.isArray(textData.attacks) && textData.attacks.length > 0) {
      merged.attacks = textData.attacks;
    }

    if (this.isMeaningfulValue(textData.hp)) {
      merged.hp = textData.hp;
    }

    if (this.isMeaningfulValue(textData.weakness)) {
      merged.weakness = textData.weakness;
    }

    if (this.isMeaningfulValue(textData.description)) {
      merged.description = textData.description;
    }

    if (this.isMeaningfulValue(textData.artist)) {
      merged.artist = textData.artist;
    }

    if (
      (!merged.cardName ||
        String(merged.cardName).toLowerCase() === 'unknown') &&
      this.isMeaningfulValue(textData.cardName)
    ) {
      merged.cardName = textData.cardName;
    }

    return merged;
  }

  private mergeCardDataForScan(
    aiData: Record<string, any>,
    scrapedPriceData: Record<string, any>,
    identityData: Record<string, any>,
  ): Record<string, any> {
    // AI is primary source for all card fields (attacks, hp, name, etc.)
    // Scraper only provides price data (currentPrice, history arrays)
    const merged = {
      ...scrapedPriceData,
      ...aiData,
    };

    // Preserve English names from identity for searchability
    if (identityData.cardNameEn) {
      merged.cardNameEn = identityData.cardNameEn;
    }
    if (identityData.seriesExpansionEn) {
      merged.seriesExpansionEn = identityData.seriesExpansionEn;
    }

    // AI always wins for attacks — it reads the card image directly
    if (Array.isArray(aiData.attacks) && aiData.attacks.length > 0) {
      merged.attacks = aiData.attacks;
    }

    // AI always wins for HP — it reads the card image directly
    if (aiData.hp && aiData.hp !== 'Unknown') {
      merged.hp = aiData.hp;
    }

    // Price data from scraper always wins (more reliable for market prices)
    const priceKeys = ['currentPrice', 'predictedPrice', 'priceLink'];
    for (const key of priceKeys) {
      if (scrapedPriceData[key]) {
        merged[key] = scrapedPriceData[key];
      }
    }

    // Historical price arrays from scraper
    const priceArrayKeys = [
      'gradedPrices',
      'buyLink',
      'TCG-1month-prices',
      'TCG-3month-prices',
      'TCG-6month-prices',
      'TCG-1year-prices',
      'TCG-all-prices',
      'TCG-1month-forecast-prices',
      'TCG-3month-forecast-prices',
      'TCG-6month-forecast-prices',
      'TCG-1year-forecast-prices',
      'TCG-all-forecast-prices',
      'CM-1month-prices',
      'CM-3month-prices',
      'CM-6month-prices',
      'CM-1year-prices',
      'CM-all-prices',
      'CM-1month-forecast-prices',
      'CM-3month-forecast-prices',
      'CM-6month-forecast-prices',
      'CM-1year-forecast-prices',
      'CM-all-forecast-prices',
    ];

    for (const key of priceArrayKeys) {
      if (
        Array.isArray(scrapedPriceData[key]) &&
        scrapedPriceData[key].length > 0
      ) {
        merged[key] = scrapedPriceData[key];
      }
    }

    return merged;
  }

  async lookupTcgplayerProduct(
    cardName: string,
  ): Promise<{ productId: string; productUrl: string } | null> {
    const query = this.cleanText(cardName || '');
    if (!query) {
      return null;
    }

    try {
      let searchUrl = this.buildTcgplayerSearchUrl(query);
      let searchPage = await this.fetchTcgplayerHtmlWithFallback(
        searchUrl,
        'search',
      );
      let firstResult = this.parseFirstTcgplayerSearchResult(searchPage.html);

      if (!firstResult?.detailUrl) {
        const searchDiagnostics = this.inspectTcgplayerSearchHtml(
          searchPage.html,
        );
        this.logger.warn(
          [
            '[scan-title-openrouter] No TCGPlayer result found',
            `query="${query}"`,
            `searchUrl=${searchUrl}`,
            `htmlSource=${searchPage.source}`,
            `pageTitle="${searchDiagnostics.pageTitle || 'unknown'}"`,
            `productCardCount=${searchDiagnostics.productCardCount}`,
            `sampleTitles="${searchDiagnostics.sampleTitles.join(' | ') || 'none'}"`,
          ].join(' | '),
        );
        return null;
      }

      const productId = this.extractTcgplayerProductId(firstResult.detailUrl);
      if (!productId) {
        return null;
      }

      return {
        productId,
        productUrl: firstResult.detailUrl,
      };
    } catch (error) {
      this.logger.warn(
        `TCGPlayer lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async scrapeTcgplayerCardData(
    cardName: string,
    seriesExpansion: string,
    detectedYear: string,
    cardNumberHint: string,
  ): Promise<Record<string, any>> {
    const query = [cardName, seriesExpansion].filter(Boolean).join(' ').trim();
    if (!query) {
      return {};
    }

    try {
      let searchUrl = this.buildTcgplayerSearchUrl(query);
      let searchPage = await this.fetchTcgplayerHtmlWithFallback(
        searchUrl,
        'search',
      );
      let searchHtml = searchPage.html;
      let firstResult = this.parseFirstTcgplayerSearchResult(searchHtml);

      if (!firstResult?.detailUrl) {
        const searchDiagnostics = this.inspectTcgplayerSearchHtml(searchHtml);
        this.logger.warn(
          [
            '[card-new.scan-card-openrouter] No TCGPlayer result found',
            `query="${query}"`,
            `searchUrl=${searchUrl}`,
            `htmlSource=${searchPage.source}`,
            `pageTitle="${searchDiagnostics.pageTitle || 'unknown'}"`,
            `productCardCount=${searchDiagnostics.productCardCount}`,
            `sampleTitles="${searchDiagnostics.sampleTitles.join(' | ') || 'none'}"`,
            `resultSnippet="${searchDiagnostics.resultSnippet || 'none'}"`,
          ].join(' | '),
        );

        const fallbackQuery = this.cleanText(cardName || '');
        if (fallbackQuery && fallbackQuery !== query) {
          searchUrl = this.buildTcgplayerSearchUrl(fallbackQuery);
          searchPage = await this.fetchTcgplayerHtmlWithFallback(
            searchUrl,
            'search',
          );
          searchHtml = searchPage.html;
          firstResult = this.parseFirstTcgplayerSearchResult(searchHtml);

          if (!firstResult?.detailUrl) {
            const fallbackDiagnostics =
              this.inspectTcgplayerSearchHtml(searchHtml);
            this.logger.warn(
              [
                '[card-new.scan-card-openrouter] No TCGPlayer result found (fallback name-only)',
                `query="${fallbackQuery}"`,
                `searchUrl=${searchUrl}`,
                `htmlSource=${searchPage.source}`,
                `pageTitle="${fallbackDiagnostics.pageTitle || 'unknown'}"`,
                `productCardCount=${fallbackDiagnostics.productCardCount}`,
                `sampleTitles="${fallbackDiagnostics.sampleTitles.join(' | ') || 'none'}"`,
                `resultSnippet="${fallbackDiagnostics.resultSnippet || 'none'}"`,
              ].join(' | '),
            );
            return {};
          }
        } else {
          return {};
        }
      }

      const detailPage = await this.fetchTcgplayerHtmlWithFallback(
        firstResult.detailUrl,
        'detail',
      );
      const detailHtml = detailPage.html;
      const detailData = this.parseTcgplayerDetailPage(
        detailHtml,
        firstResult.detailUrl,
        firstResult,
      );
      const productId = this.extractTcgplayerProductId(firstResult.detailUrl);
      const observedHistory = productId
        ? await this.fetchTcgplayerObservedHistory(
            productId,
            detailData.preferredHistoryVariant,
          )
        : [];
      const tcgHistorySeries =
        this.buildTcgHistorySeriesFromObserved(observedHistory);
      const cardmarketData = await this.scrapeCardmarketCardData(
        detailData.cardName || cardName,
        detailData.seriesExpansion || seriesExpansion,
        detailData.cardNumber || cardNumberHint || '',
      );
      const cardmarketLink =
        this.normalizeUrl(cardmarketData.cardmarketLink) ||
        `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(
          [
            detailData.cardName || cardName,
            detailData.seriesExpansion || seriesExpansion,
          ]
            .filter(Boolean)
            .join(' '),
        )}`;
      const searchQuery = encodeURIComponent(
        [
          detailData.cardName || cardName,
          detailData.seriesExpansion || seriesExpansion,
        ]
          .filter(Boolean)
          .join(' '),
      );

      return {
        cardName: detailData.cardName || cardName,
        rarity: detailData.rarity || firstResult.rarity || '',
        energy: detailData.energy || '',
        artist: detailData.artist || '',
        year: detailData.year || detectedYear || '',
        type: 'Pokemon',
        finish: detailData.finish || '',
        seriesExpansion: detailData.seriesExpansion || seriesExpansion || '',
        description: detailData.description || '',
        currentPrice:
          detailData.currentPrice ||
          firstResult.marketPrice ||
          firstResult.listingPrice ||
          '',
        priceLink: firstResult.detailUrl,
        attacks: detailData.attacks || [],
        hp: detailData.hp || '',
        weakness: detailData.weakness || '',
        'TCG-1month-prices': tcgHistorySeries['TCG-1month-prices'],
        'TCG-3month-prices': tcgHistorySeries['TCG-3month-prices'],
        'TCG-6month-prices': tcgHistorySeries['TCG-6month-prices'],
        'TCG-1year-prices': tcgHistorySeries['TCG-1year-prices'],
        'TCG-all-prices': tcgHistorySeries['TCG-all-prices'],
        'CM-1month-prices': cardmarketData['CM-1month-prices'] || [],
        'CM-3month-prices': cardmarketData['CM-3month-prices'] || [],
        'CM-6month-prices': cardmarketData['CM-6month-prices'] || [],
        'CM-1year-prices': cardmarketData['CM-1year-prices'] || [],
        'CM-all-prices': cardmarketData['CM-all-prices'] || [],
        buyLink: [
          {
            Shop: 'Ebay',
            link: `https://www.ebay.com/sch/i.html?_nkw=${searchQuery}`,
          },
          {
            Shop: 'Cardmarket',
            link: cardmarketLink,
          },
          {
            Shop: 'TCGPlayer',
            link: firstResult.detailUrl,
          },
        ],
        cardNumber: detailData.cardNumber || cardNumberHint || '',
      };
    } catch (error) {
      this.logger.warn(
        `Scrape TCGPlayer card data failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {};
    }
  }

  private async scrapeCardmarketCardData(
    cardName: string,
    seriesExpansion: string,
    cardNumberHint: string,
  ): Promise<Record<string, any>> {
    const query = [cardName, seriesExpansion].filter(Boolean).join(' ').trim();
    if (!query) {
      return {};
    }

    const searchUrl = this.buildCardmarketSearchUrl(query);

    try {
      const playwright = await import('playwright');
      const headless = !['false', '0', 'no'].includes(
        String(
          process.env.CARD_NEW_CARDMARKET_HEADLESS ?? 'true',
        ).toLowerCase(),
      );
      const browser = await playwright.chromium.launch({
        headless,
        slowMo: headless ? 0 : 100,
      });

      try {
        const contextOptions: Record<string, any> = {
          userAgent: BROWSER_USER_AGENT,
          locale: 'en-US',
          extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
          },
        };
        const storageStatePath = String(
          process.env.CARDMARKET_STORAGE_STATE_PATH || '',
        ).trim();

        if (storageStatePath && fs.existsSync(storageStatePath)) {
          contextOptions.storageState = storageStatePath;
        }

        const context = await browser.newContext(contextOptions);
        const page = await context.newPage();
        await page.goto(searchUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        await page.waitForTimeout(6000);

        const searchSnapshot = await this.readCardmarketSearchSnapshot(page);
        if (
          this.isCardmarketChallengePage(
            searchSnapshot.title,
            searchSnapshot.bodyText,
          )
        ) {
          this.logger.warn(
            [
              '[card-new.scan-card-openrouter] Cardmarket search blocked by Cloudflare',
              `query="${query}"`,
              `searchUrl=${searchUrl}`,
              `title="${searchSnapshot.title || 'unknown'}"`,
            ].join(' | '),
          );
          await context.close();
          return {};
        }

        const bestResult = this.pickBestCardmarketSearchResult(
          searchSnapshot.results,
          cardName,
          seriesExpansion,
          cardNumberHint,
        );

        if (!bestResult?.href) {
          this.logger.warn(
            [
              '[card-new.scan-card-openrouter] No Cardmarket result found',
              `query="${query}"`,
              `searchUrl=${searchUrl}`,
              `candidateCount=${searchSnapshot.results.length}`,
            ].join(' | '),
          );
          await context.close();
          return {};
        }

        await page.goto(bestResult.href, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        await page.waitForTimeout(6000);

        const metrics = await this.readCardmarketMetrics(page, bestResult.href);
        if (this.isCardmarketChallengePage(metrics.title, '')) {
          this.logger.warn(
            [
              '[card-new.scan-card-openrouter] Cardmarket product blocked by Cloudflare',
              `detailUrl=${bestResult.href}`,
              `title="${metrics.title || 'unknown'}"`,
            ].join(' | '),
          );
          await context.close();
          return {};
        }

        const cmSeries = this.buildCardmarketHistorySeries(metrics);
        await context.close();

        return {
          ...cmSeries,
          cardmarketLink: metrics.detailUrl,
        };
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.warn(
        `Scrape Cardmarket card data failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {};
    }
  }

  private buildCardmarketSearchUrl(query: string): string {
    return `${CARDMARKET_BASE_URL}/en/Pokemon/Products/Search?searchString=${encodeURIComponent(
      query,
    )}`;
  }

  private async readCardmarketSearchSnapshot(page: any): Promise<{
    title: string;
    bodyText: string;
    results: CardmarketSearchCandidate[];
  }> {
    return page.evaluate((baseUrl: string) => {
      const normalizeText = (value: string) =>
        String(value || '')
          .replace(/\s+/g, ' ')
          .trim();
      const anchors = Array.from(
        document.querySelectorAll('a[href*="/Pokemon/Products/Singles/"]'),
      );
      const seen = new Set<string>();
      const results = anchors
        .map((anchor) => {
          const href = (anchor as HTMLAnchorElement).href || '';
          if (!href || seen.has(href)) {
            return null;
          }

          seen.add(href);
          const container = anchor.closest(
            'article, tr, li, .row, .product-row, .table-row, div',
          );

          return {
            href: href.startsWith('http')
              ? href
              : new URL(href, baseUrl).toString(),
            text: normalizeText(anchor.textContent || ''),
            contextText: normalizeText(container?.textContent || ''),
          };
        })
        .filter(Boolean)
        .slice(0, 25);

      return {
        title: normalizeText(document.title),
        bodyText: normalizeText(document.body.innerText).slice(0, 1200),
        results,
      };
    }, CARDMARKET_BASE_URL);
  }

  private pickBestCardmarketSearchResult(
    results: CardmarketSearchCandidate[],
    cardName: string,
    seriesExpansion: string,
    cardNumberHint: string,
  ): CardmarketSearchCandidate | null {
    if (!Array.isArray(results) || !results.length) {
      return null;
    }

    const nameNeedle = this.cleanText(cardName).toLowerCase();
    const seriesNeedle = this.cleanText(seriesExpansion).toLowerCase();
    const cardNumberNeedle = this.normalizeCardNumberHint(cardNumberHint);
    const target = [nameNeedle, seriesNeedle, cardNumberNeedle]
      .filter(Boolean)
      .join(' ');

    const ranked = results
      .map((result) => {
        const haystack = this.cleanText(
          `${result.text} ${result.contextText} ${result.href}`,
        ).toLowerCase();
        let score = stringSimilarity.compareTwoStrings(
          haystack,
          target || nameNeedle,
        );

        if (nameNeedle && haystack.includes(nameNeedle)) {
          score += 1.2;
        }

        if (seriesNeedle && haystack.includes(seriesNeedle)) {
          score += 0.8;
        }

        if (cardNumberNeedle && haystack.includes(cardNumberNeedle)) {
          score += 0.8;
        }

        return { result, score };
      })
      .sort((left, right) => right.score - left.score);

    return ranked[0]?.result || null;
  }

  private normalizeCardNumberHint(value: string): string {
    return this.cleanText(value).toLowerCase().replace(/\s+/g, '');
  }

  private async readCardmarketMetrics(
    page: any,
    detailUrl: string,
  ): Promise<CardmarketMetricsSnapshot> {
    const snapshot = await page.evaluate(() => {
      const normalizeText = (value: string) =>
        String(value || '')
          .replace(/\s+/g, ' ')
          .trim();
      const parseEuro = (value: string) => {
        const cleaned = normalizeText(value)
          .replace(/[^\d,.-]/g, '')
          .replace(/\./g, '')
          .replace(',', '.');
        const numeric = Number(cleaned);
        return Number.isFinite(numeric) ? numeric : 0;
      };
      const bodyText = normalizeText(document.body.innerText);
      const extractPriceByLabel = (label: string) => {
        const escaped = label
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\s+/g, '\\s+');
        const match = bodyText.match(
          new RegExp(`${escaped}\\s*([0-9.,]+)\\s*€`, 'i'),
        );
        return parseEuro(match?.[1] || '');
      };

      const chartPoints: Array<{ label: string; price: number }> = [];
      let chartSource: 'chartjs' | 'script' | 'summary' = 'summary';
      const chartCanvases = Array.from(
        document.querySelectorAll('canvas[id^="prodChart"], canvas'),
      );
      const chartApi = (window as any).Chart;

      if (chartApi) {
        const charts: any[] = [];

        if (typeof chartApi.getChart === 'function') {
          for (const canvas of chartCanvases) {
            const chart = chartApi.getChart(canvas);
            if (chart) {
              charts.push(chart);
            }
          }
        }

        if (!charts.length && chartApi.instances) {
          charts.push(...Object.values(chartApi.instances));
        }

        const firstChart = charts.find((chart) =>
          Array.isArray(chart?.data?.datasets),
        );
        const dataset = firstChart?.data?.datasets?.[0];
        const labels = Array.isArray(firstChart?.data?.labels)
          ? firstChart.data.labels
          : [];
        const values = Array.isArray(dataset?.data) ? dataset.data : [];

        if (labels.length && values.length) {
          for (
            let index = 0;
            index < Math.min(labels.length, values.length);
            index += 1
          ) {
            const numericValue = Number(values[index]);
            if (!Number.isFinite(numericValue)) continue;

            chartPoints.push({
              label: normalizeText(String(labels[index] ?? '')),
              price: numericValue,
            });
          }

          chartSource = 'chartjs';
        }
      }

      if (!chartPoints.length) {
        const scriptText = Array.from(document.querySelectorAll('script'))
          .map((script) => script.textContent || '')
          .find((text) => /prodChart|datasets|labels/i.test(text));

        if (scriptText) {
          const labelsMatch = scriptText.match(/labels\s*:\s*\[(.*?)\]/s);
          const dataMatch = scriptText.match(/data\s*:\s*\[(.*?)\]/s);

          if (labelsMatch && dataMatch) {
            const labels = labelsMatch[1]
              .split(',')
              .map((item) => normalizeText(item.replace(/^['"`]|['"`]$/g, '')))
              .filter(Boolean);
            const values = dataMatch[1]
              .split(',')
              .map((item) => Number(item.replace(/[^\d.-]/g, '')))
              .filter((item) => Number.isFinite(item));

            for (
              let index = 0;
              index < Math.min(labels.length, values.length);
              index += 1
            ) {
              chartPoints.push({
                label: labels[index],
                price: values[index],
              });
            }

            if (chartPoints.length) {
              chartSource = 'script';
            }
          }
        }
      }

      return {
        title: normalizeText(document.title),
        priceTrend: extractPriceByLabel('Price Trend'),
        average30: extractPriceByLabel('30-days average price'),
        average7: extractPriceByLabel('7-days average price'),
        average1: extractPriceByLabel('1-day average price'),
        availableFrom: extractPriceByLabel('Available from'),
        chartPoints,
        chartSource,
      };
    });

    return {
      detailUrl,
      title: this.cleanText(snapshot.title || ''),
      priceTrend: Number(snapshot.priceTrend) || 0,
      average30: Number(snapshot.average30) || 0,
      average7: Number(snapshot.average7) || 0,
      average1: Number(snapshot.average1) || 0,
      availableFrom: Number(snapshot.availableFrom) || 0,
      chartPoints: Array.isArray(snapshot.chartPoints)
        ? snapshot.chartPoints
        : [],
      chartSource: snapshot.chartSource || 'summary',
    };
  }

  private isCardmarketChallengePage(title: string, bodyText: string): boolean {
    const combined = `${title} ${bodyText}`.toLowerCase();
    return (
      combined.includes('just a moment') ||
      combined.includes('security verification') ||
      combined.includes('cloudflare')
    );
  }

  private buildCardmarketHistorySeries(
    metrics: CardmarketMetricsSnapshot,
  ): Record<string, PricePoint[]> {
    return {
      'CM-1month-prices': this.buildCardmarketSeriesForRange(metrics, 30),
      'CM-3month-prices': this.buildCardmarketSeriesForRange(metrics, 90),
      'CM-6month-prices': this.buildCardmarketSeriesForRange(metrics, 180),
      'CM-1year-prices': this.buildCardmarketSeriesForRange(metrics, 365),
      'CM-all-prices': this.buildCardmarketSeriesForRange(metrics, 365),
    };
  }

  private buildCardmarketSeriesForRange(
    metrics: CardmarketMetricsSnapshot,
    totalDays: number,
  ): PricePoint[] {
    const chartValues = Array.isArray(metrics.chartPoints)
      ? metrics.chartPoints
          .map((point) => Number(point?.price))
          .filter((value) => Number.isFinite(value) && value >= 0)
      : [];

    if (chartValues.length >= 2) {
      return this.buildHistoricalPriceSeriesFromChartValues(
        chartValues,
        totalDays,
        CARDMARKET_HISTORY_POINT_COUNT,
      );
    }

    return this.buildCardmarketSummarySeries(metrics, totalDays);
  }

  private buildHistoricalPriceSeriesFromChartValues(
    values: number[],
    totalDays: number,
    count: number,
  ): PricePoint[] {
    const sampled = this.downsampleNumericSeries(values, count).reverse();

    return sampled.map((value, index) => {
      const dayOffset =
        count === 1
          ? 0
          : Math.round((totalDays * index) / Math.max(1, count - 1));

      return {
        date: this.shiftDate(-dayOffset),
        price: this.formatUsd(Math.max(value, 0)),
      };
    });
  }

  private downsampleNumericSeries(values: number[], count: number): number[] {
    if (!values.length) {
      return [];
    }

    if (values.length <= count) {
      const padded = [...values];
      while (padded.length < count) {
        padded.unshift(padded[0]);
      }
      return padded;
    }

    return Array.from({ length: count }, (_, index) => {
      const ratio = count === 1 ? 1 : index / (count - 1);
      const sourceIndex = Math.round(ratio * (values.length - 1));
      return values[sourceIndex];
    });
  }

  private buildCardmarketSummarySeries(
    metrics: CardmarketMetricsSnapshot,
    totalDays: number,
  ): PricePoint[] {
    const pointCount = CARDMARKET_HISTORY_POINT_COUNT;
    const latest =
      metrics.average1 ||
      metrics.priceTrend ||
      metrics.average7 ||
      metrics.availableFrom ||
      0.01;
    const weekly = metrics.average7 || latest;
    const monthly = metrics.average30 || weekly || latest;
    const baseline = metrics.availableFrom || monthly || latest;

    return Array.from({ length: pointCount }, (_, index) => {
      const progress = pointCount <= 1 ? 0 : index / (pointCount - 1);
      const dayOffset = Math.round(progress * totalDays);
      let value = latest;

      if (dayOffset > 30) {
        const localProgress = Math.min(
          1,
          (dayOffset - 30) / Math.max(1, totalDays - 30),
        );
        value = monthly + (baseline - monthly) * localProgress;
      } else if (dayOffset > 7) {
        const localProgress = (dayOffset - 7) / 23;
        value =
          weekly + (monthly - weekly) * Math.max(0, Math.min(1, localProgress));
      } else {
        const localProgress = dayOffset / 7;
        value =
          latest + (weekly - latest) * Math.max(0, Math.min(1, localProgress));
      }

      return {
        date: this.shiftDate(-dayOffset),
        price: this.formatUsd(Math.max(value, 0.01)),
      };
    });
  }

  private buildTcgplayerSearchUrl(query: string): string {
    return `${TCGPLAYER_BASE_URL}/search/pokemon/product?q=${encodeURIComponent(
      query,
    )}&view=grid&productLineName=pokemon&setName=product&ProductTypeName=Cards&page=1&CardType=Pokemon`;
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await axios.get(url, {
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'User-Agent': BROWSER_USER_AGENT,
      },
      timeout: 45000,
    });

    return String(response.data || '');
  }

  private async fetchTcgplayerHtmlWithFallback(
    url: string,
    pageType: 'search' | 'detail',
  ): Promise<{ html: string; source: 'axios' | 'playwright' }> {
    const axiosHtml = await this.fetchHtml(url);
    const fallbackReason = this.getTcgplayerPlaywrightFallbackReason(
      axiosHtml,
      pageType,
    );

    if (!fallbackReason) {
      return {
        html: axiosHtml,
        source: 'axios',
      };
    }

    this.logger.warn(
      [
        '[card-new.scan-card-openrouter] Falling back to Playwright for TCGPlayer',
        `pageType=${pageType}`,
        `reason=${fallbackReason}`,
        `url=${url}`,
      ].join(' | '),
    );

    try {
      const renderedHtml = await this.fetchHtmlWithPlaywright(url, pageType);
      return {
        html: renderedHtml,
        source: 'playwright',
      };
    } catch (error) {
      this.logger.warn(
        [
          '[card-new.scan-card-openrouter] Playwright fallback failed',
          `pageType=${pageType}`,
          `url=${url}`,
          `error=${error instanceof Error ? error.message : String(error)}`,
        ].join(' | '),
      );

      return {
        html: axiosHtml,
        source: 'axios',
      };
    }
  }

  private getTcgplayerPlaywrightFallbackReason(
    html: string,
    pageType: 'search' | 'detail',
  ): string | null {
    if (!html.trim()) {
      return 'empty-html';
    }

    if (this.isTcgplayerJavascriptShell(html)) {
      return 'javascript-required-shell';
    }

    const $ = cheerio.load(html);

    if (pageType === 'search') {
      if (!$('.product-card__content').length) {
        return 'missing-product-cards';
      }

      return null;
    }

    const hasProductName = Boolean(
      $('h1[data-testid="lblProductDetailsProductName"]').length,
    );
    const hasProductDetails = Boolean(
      $(
        'section.product-details__details.product-details__info, .product-details__details.product-details__info',
      ).length,
    );

    if (!hasProductName && !hasProductDetails) {
      return 'missing-product-details';
    }

    return null;
  }

  private isTcgplayerJavascriptShell(html: string): boolean {
    return /doesn['’]t work properly without javascript/i.test(html);
  }

  private async fetchHtmlWithPlaywright(
    url: string,
    pageType: 'search' | 'detail',
  ): Promise<string> {
    const playwright = await import('playwright');
    const headless = !['false', '0', 'no'].includes(
      String(process.env.CARD_NEW_TCGPLAYER_HEADLESS ?? 'true').toLowerCase(),
    );
    const browser = await playwright.chromium.launch({
      headless,
      slowMo: headless ? 0 : 150,
    });

    try {
      const context = await browser.newContext({
        userAgent: BROWSER_USER_AGENT,
        locale: 'en-US',
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      const page = await context.newPage();

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });

      const readySelector =
        pageType === 'search'
          ? '.product-card__content, .search-results'
          : 'h1[data-testid="lblProductDetailsProductName"], .product-details__details.product-details__info';

      await page
        .waitForSelector(readySelector, {
          timeout: 15000,
        })
        .catch(() => undefined);
      await page
        .waitForLoadState('networkidle', {
          timeout: 15000,
        })
        .catch(() => undefined);

      if (!headless) {
        await page.waitForTimeout(2000);
      }

      const html = await page.content();
      const title = this.cleanText(await page.title());
      const productCardCount =
        pageType === 'search'
          ? await page.locator('.product-card__content').count()
          : 0;

      await context.close();
      return html;
    } finally {
      await browser.close();
    }
  }

  private parseFirstTcgplayerSearchResult(
    html: string,
  ): Record<string, string> | null {
    const $ = cheerio.load(html);
    const firstCard = $('.product-card__content').first();
    const anchor = firstCard
      .find('a[data-testid^="product-card__image--"]')
      .first();

    if (!anchor.length) {
      return null;
    }

    const href = anchor.attr('href') || '';
    const detailUrl = href ? new URL(href, TCGPLAYER_BASE_URL).toString() : '';
    if (!detailUrl) {
      return null;
    }

    return {
      detailUrl,
      title: this.cleanText(
        firstCard.find('.product-card__title').first().text(),
      ),
      setName: this.cleanText(
        firstCard.find('.product-card__set-name__variant').first().text(),
      ),
      rarity: this.cleanText(
        firstCard.find('.product-card__rarity__variant').first().text(),
      ),
      listingPrice: this.cleanPriceText(
        firstCard.find('.inventory__price-with-shipping').first().text(),
      ),
      marketPrice: this.cleanPriceText(
        firstCard.find('.product-card__market-price--value').first().text(),
      ),
      imageUrl:
        firstCard
          .find('img[data-testid^="product-image__container--"]')
          .first()
          .attr('src') || '',
    };
  }

  private inspectTcgplayerSearchHtml(html: string): {
    pageTitle: string;
    productCardCount: number;
    sampleTitles: string[];
    resultSnippet: string;
  } {
    const $ = cheerio.load(html);
    const pageTitle = this.cleanText($('title').first().text());
    const productCards = $('.product-card__content');
    const sampleTitles = productCards
      .slice(0, 3)
      .map((_, element) =>
        this.cleanText($(element).find('.product-card__title').first().text()),
      )
      .get()
      .filter(Boolean);

    const resultSnippet = this.cleanText(
      [
        $('[data-testid="search-result__content"]').first().text(),
        $('.search-layout').first().text(),
        $('.search-results').first().text(),
        $('main').first().text(),
      ]
        .filter(Boolean)
        .join(' ')
        .slice(0, 400),
    );

    return {
      pageTitle,
      productCardCount: productCards.length,
      sampleTitles,
      resultSnippet,
    };
  }

  private parseTcgplayerDetailPage(
    html: string,
    detailUrl: string,
    searchCardData: Record<string, string>,
  ): Record<string, any> {
    const $ = cheerio.load(html);
    const productDetailsRoot = $(
      'section.product-details__details.product-details__info, .product-details__details.product-details__info',
    ).first();
    const productName = this.cleanText(
      $('h1[data-testid="lblProductDetailsProductName"]').first().text(),
    );
    const setName = this.cleanText(
      $('[data-testid="lblProductDetailsSetName"]').first().text(),
    );
    const detailAttributes = this.extractProductDetailAttributes(
      productDetailsRoot.length ? productDetailsRoot : $('body'),
      $,
    );
    const cardNumberAndRarity = this.parseCardNumberAndRarity(
      detailAttributes['Card Number / Rarity'] || '',
    );
    const typeHpStage = this.parseCardTypeHpStage(
      detailAttributes['Card Type / HP / Stage'] || '',
    );
    const weaknessData = this.parseWeaknessResistance(detailAttributes);
    const attacks = this.parseTcgplayerAttacks(detailAttributes);
    const cardText = detailAttributes['Card Text'] || '';
    const tip = detailAttributes['TCGplayer Tip'] || '';
    const currentPrice =
      this.cleanPriceText($('.price-points__upper__price').first().text()) ||
      searchCardData.marketPrice ||
      searchCardData.listingPrice ||
      '';
    const preferredHistoryVariant = this.cleanText(
      $('.price-guide__points-header__condition').first().text(),
    ).replace(/^Near Mint\s+/i, '');

    return {
      cardName:
        this.extractBaseCardName(productName) ||
        this.extractBaseCardName(searchCardData.title),
      seriesExpansion: setName || searchCardData.setName || '',
      rarity: cardNumberAndRarity.rarity || searchCardData.rarity || '',
      cardNumber: cardNumberAndRarity.cardNumber || '',
      energy: this.normalizeEnergyLink(typeHpStage.primaryType),
      artist: detailAttributes.Artist || '',
      finish: this.inferFinishFromRarity(
        cardNumberAndRarity.rarity || searchCardData.rarity,
      ),
      description: [cardText, tip].filter(Boolean).join(' ').trim(),
      currentPrice,
      attacks,
      hp: typeHpStage.hp,
      weakness: this.normalizeEnergyLink(weaknessData.weakness),
      imageUrl:
        $('img[data-testid^="product-image__container--"]')
          .first()
          .attr('src') ||
        searchCardData.imageUrl ||
        '',
      priceLink: detailUrl,
      preferredHistoryVariant,
    };
  }

  private extractProductDetailAttributes(
    root: any,
    $: cheerio.CheerioAPI | any,
  ): Record<string, string> {
    const out: Record<string, string> = {};

    root.find('ul.product__item-details__attributes li').each((_, element) => {
      const labelNode = $(element).find('strong').first();
      const label = this.cleanText(labelNode.text()).replace(/:\s*$/, '');

      const valueContainer = $(element).find('div').first().clone();
      valueContainer.find('br').replaceWith('\n');
      valueContainer.find('strong').first().remove();

      let value = this.cleanText(
        valueContainer.text().replace(/\n+/g, ' ').replace(/\s+/g, ' '),
      );

      if (!value) {
        value = this.cleanText($(element).find('span, a').first().text());
      }

      if (label) {
        out[label] = value;
      }
    });

    return out;
  }

  private parseCardNumberAndRarity(value: string): {
    cardNumber: string;
    rarity: string;
  } {
    const parts = String(value || '')
      .split(/\s+\/\s+/)
      .map((item) => this.cleanText(item))
      .filter(Boolean);

    if (parts.length >= 2) {
      return {
        cardNumber: parts[0],
        rarity: parts.slice(1).join(' / '),
      };
    }

    return {
      cardNumber: '',
      rarity: parts[0] || '',
    };
  }

  private parseCardTypeHpStage(value: string): {
    primaryType: string;
    hp: string;
  } {
    const parts = String(value || '')
      .split(/\s+\/\s+/)
      .map((item) => this.cleanText(item))
      .filter(Boolean);

    return {
      primaryType: parts[0] || '',
      hp: parts[1] || '',
    };
  }

  private parseWeaknessResistance(attributes: Record<string, string>): {
    weakness: string;
  } {
    const text = attributes['Weakness / Resistance / Retreat Cost'] || '';
    const weaknessToken = this.cleanText(text.split(/\s+\/\s+/)[0] || '');
    return {
      weakness: this.mapEnergySymbolToName(
        this.extractEnergySymbolFromWeakness(weaknessToken),
      ),
    };
  }

  private parseTcgplayerAttacks(
    attributes: Record<string, string>,
  ): AttackPayload[] {
    return Object.entries(attributes)
      .filter(([label]) => /^Attack\s+\d+/i.test(label))
      .map(([, value]) => {
        const compact = this.cleanText(value);
        const match = compact.match(
          /^\[([^\]]+)\]\s*(.*?)\s*\(([^)]+)\)\s*(.*)$/,
        );

        if (match) {
          return {
            name: match[2] || 'Unknown Attack',
            damage: match[3] || '0',
            description: match[4] || 'No attack description available.',
            energy: this.parseEnergyCostSymbols(match[1]),
            _id: randomUUID().replace(/-/g, '').slice(0, 24),
          };
        }

        return {
          name: compact || 'Unknown Attack',
          damage: '0',
          description: 'No attack description available.',
          energy: [],
          _id: randomUUID().replace(/-/g, '').slice(0, 24),
        };
      });
  }

  private parseEnergyCostSymbols(rawSymbols: string): string[] {
    return String(rawSymbols || '')
      .split('')
      .map((token) => this.mapEnergySymbolToName(token))
      .filter(Boolean)
      .map((energyName) => this.normalizeEnergyLink(energyName));
  }

  private mapEnergySymbolToName(token: string): string {
    const normalized = String(token || '')
      .trim()
      .toUpperCase();
    const map: Record<string, string> = {
      C: 'Colorless',
      N: 'Dragon',
      D: 'Darkness',
      F: 'Fighting',
      G: 'Grass',
      L: 'Lightning',
      M: 'Metal',
      P: 'Psychic',
      R: 'Fire',
      W: 'Water',
      Y: 'Fairy',
    };

    return map[normalized] || normalized;
  }

  private extractEnergySymbolFromWeakness(token: string): string {
    const normalized = String(token || '')
      .trim()
      .toUpperCase();
    const match = normalized.match(/[RWGLPFDMCNY]/);
    return match?.[0] || normalized;
  }

  private inferFinishFromRarity(rarity: string): string {
    const normalized = String(rarity || '').toLowerCase();
    if (normalized.includes('reverse')) return 'Reverse Holo';
    if (normalized.includes('holo')) return 'Holo';
    if (normalized.includes('promo')) return 'Promo';
    if (normalized.includes('foil')) return 'Holo';
    return normalized ? 'Normal' : '';
  }

  private extractBaseCardName(value: string): string {
    const normalized = this.cleanText(value);
    if (!normalized) return '';
    return normalized.split(' - ')[0].trim();
  }

  private async fetchTcgplayerObservedHistory(
    productId: string,
    preferredVariant: string,
  ): Promise<Array<{ date: string; price: number }>> {
    try {
      const response = await axios.get(
        `${TCGPLAYER_HISTORY_API_BASE}/price/history/${productId}?range=annual`,
        {
          headers: {
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            Origin: TCGPLAYER_BASE_URL,
            Referer: `${TCGPLAYER_BASE_URL}/product/${productId}`,
            'User-Agent': BROWSER_USER_AGENT,
            'X-PageRequest-ID': `${Date.now()}-${Math.floor(Math.random() * 10000)}:card-new`,
          },
          timeout: 45000,
        },
      );

      const rows = Array.isArray(response.data?.result)
        ? response.data.result
        : [];
      const today = this.shiftDate(0);
      const rawHistorySummary = rows.map((row: any) => {
        const chosenVariant = this.chooseObservedHistoryVariant(
          row?.variants,
          preferredVariant,
        );

        return {
          date: row?.date || '',
          variants: Array.isArray(row?.variants)
            ? row.variants.map((variant: any) => ({
                variant: this.cleanText(variant?.variant || ''),
                marketPrice: variant?.marketPrice ?? null,
                listedMedian: variant?.listedMedian ?? null,
              }))
            : [],
          chosenVariant: this.cleanText(chosenVariant?.variant || ''),
          chosenMarketPrice:
            chosenVariant?.marketPrice !== undefined &&
            chosenVariant?.marketPrice !== null
              ? Number(chosenVariant.marketPrice)
              : null,
        };
      });
      const points = rows
        .map((row: any) => {
          const variant = this.chooseObservedHistoryVariant(
            row?.variants,
            preferredVariant,
          );
          const marketPrice = Number(variant?.marketPrice);

          if (
            !row?.date ||
            row.date > today ||
            !Number.isFinite(marketPrice) ||
            marketPrice <= 0
          ) {
            return null;
          }

          return {
            date: String(row.date),
            price: marketPrice,
          };
        })
        .filter(
          (item): item is { date: string; price: number } => item !== null,
        )
        .sort((left, right) => right.date.localeCompare(left.date));

      return points;
    } catch (error) {
      this.logger.warn(
        `Fetch TCGPlayer observed history failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  private chooseObservedHistoryVariant(
    variants: any[],
    preferredVariant: string,
  ): any {
    if (!Array.isArray(variants) || !variants.length) {
      return null;
    }

    const preferred = this.cleanText(preferredVariant).toLowerCase();
    if (preferred) {
      const exact = variants.find(
        (variant) =>
          this.cleanText(variant?.variant || '').toLowerCase() === preferred,
      );
      if (exact) return exact;
    }

    const normal = variants.find(
      (variant) =>
        this.cleanText(variant?.variant || '').toLowerCase() === 'normal',
    );
    return normal || variants[0];
  }

  private buildTcgHistorySeriesFromObserved(
    observedHistory: Array<{ date: string; price: number }>,
  ): Record<string, PricePoint[]> {
    return {
      'TCG-1month-prices': this.buildSeriesFromObservedHistory(
        observedHistory,
        30,
      ),
      'TCG-3month-prices': this.buildSeriesFromObservedHistory(
        observedHistory,
        90,
      ),
      'TCG-6month-prices': this.buildSeriesFromObservedHistory(
        observedHistory,
        180,
      ),
      'TCG-1year-prices': this.buildSeriesFromObservedHistory(
        observedHistory,
        365,
      ),
      'TCG-all-prices': this.buildSeriesFromObservedHistory(
        observedHistory,
        365,
      ),
    };
  }

  private buildSeriesFromObservedHistory(
    observedHistory: Array<{ date: string; price: number }>,
    totalDays: number,
  ): PricePoint[] {
    if (!Array.isArray(observedHistory) || observedHistory.length === 0) {
      return [];
    }

    const today = this.shiftDate(0);
    const lowerBound = this.shiftDate(-totalDays);
    const filtered = observedHistory
      .filter(
        (point) =>
          Boolean(point?.date) &&
          point.date <= today &&
          point.date >= lowerBound &&
          Number.isFinite(point?.price) &&
          point.price > 0,
      )
      .sort((left, right) => right.date.localeCompare(left.date));

    const source = filtered.length
      ? filtered
      : observedHistory
          .filter(
            (point) =>
              Boolean(point?.date) &&
              point.date <= today &&
              Number.isFinite(point?.price) &&
              point.price > 0,
          )
          .sort((left, right) => right.date.localeCompare(left.date));

    if (!source.length) {
      return [];
    }

    return this.sampleObservedHistoryPoints(source, HISTORY_POINT_COUNT).map(
      (point) => ({
        date: point.date,
        price: this.formatUsd(point.price),
      }),
    );
  }

  private sampleObservedHistoryPoints(
    observedHistory: Array<{ date: string; price: number }>,
    count: number,
  ): Array<{ date: string; price: number }> {
    if (observedHistory.length <= count) {
      return observedHistory;
    }

    const chronological = [...observedHistory].reverse();
    const sampledChronological = Array.from({ length: count }, (_, index) => {
      const ratio = count === 1 ? 1 : index / (count - 1);
      const sourceIndex = Math.round(ratio * (chronological.length - 1));
      return chronological[sourceIndex];
    });

    return sampledChronological.reverse();
  }

  private extractTcgplayerProductId(url: string): string {
    const match = String(url || '').match(/\/product\/(\d+)/i);
    return match?.[1] || '';
  }

  private cleanText(value: string): string {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanPriceText(value: string): string {
    const cleaned = this.cleanText(value);
    return /^\$[\d,]+(?:\.\d+)?$/.test(cleaned) ? cleaned : '';
  }

  private loadPokemonCards(): void {
    const filePath = path.join(process.cwd(), 'data', 'pokemon-info.json');
    const data = this.readJsonArray(filePath, 'pokemon-info.json');
    this.pokemonCards = data.map((item) => ({
      ...item,
      cardType: 'pokemon',
    }));
  }

  private loadYugiohCards(): void {
    const filePath = path.join(process.cwd(), 'data', 'yugioh-info.json');
    const data = this.readJsonArray(filePath, 'yugioh-info.json');
    this.yugiohCards = data.map((item) => ({
      ...item,
      cardType: 'yugioh',
    }));
  }

  private loadSoccerCards(): void {
    const filePath = path.join(
      process.cwd(),
      'sport-cards',
      'soccer-cards.json',
    );
    const groups = this.readJsonArray(filePath, 'soccer-cards.json');
    const flattenedCards: any[] = [];

    for (const group of groups) {
      const playerName = group?.playerName ?? null;
      const playerId = group?.playerId ?? null;
      const cards = Array.isArray(group?.cards) ? group.cards : [];

      for (const card of cards) {
        flattenedCards.push({
          ...card,
          playerName: card?.playerName ?? playerName,
          playerId: card?.playerId ?? playerId,
          sport: card?.sport ?? 'Soccer',
          cardType: 'soccer',
        });
      }
    }

    this.soccerCards = flattenedCards;
  }

  private readJsonArray(filePath: string, label: string): any[] {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`[CardNewService] Missing file: ${filePath}`);
        return [];
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        console.warn(`[CardNewService] ${label} is not an array.`);
        return [];
      }

      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[CardNewService] Failed to load ${label}: ${message}`);
      return [];
    }
  }

  private normalizeCategory(type?: string): CardCategory {
    const normalized = String(type || 'all')
      .trim()
      .toLowerCase();

    if (normalized === 'all' || normalized === '') return 'all';
    if (normalized === 'pokemon') return 'pokemon';
    if (normalized === 'yugioh') return 'yugioh';
    if (normalized === 'soccer') return 'soccer';

    throw new BadRequestException(
      'type must be one of: all, pokemon, yugioh, soccer',
    );
  }

  private normalizeSearchCategory(type?: string): SearchCardCategory {
    const normalized = String(type || '')
      .trim()
      .toLowerCase();

    if (normalized === 'pokemon') return 'pokemon';
    if (normalized === 'yugioh') return 'yugioh';
    if (normalized === 'soccer') return 'soccer';

    throw new BadRequestException(
      'type is required and must be one of: pokemon, yugioh, soccer',
    );
  }

  private normalizeSearchKeyword(search?: string): string {
    const normalized = String(search || '')
      .trim()
      .toLowerCase();
    if (!normalized) {
      throw new BadRequestException('search is required');
    }
    return normalized;
  }

  private getItemsBySearchCategory(category: SearchCardCategory): any[] {
    if (category === 'pokemon') return this.pokemonCards;
    if (category === 'yugioh') return this.yugiohCards;
    return this.soccerCards;
  }

  private matchesByCategory(
    item: any,
    category: SearchCardCategory,
    keyword: string,
  ): boolean {
    const searchableFields: Record<SearchCardCategory, string[]> = {
      pokemon: ['name', 'cardNumber', 'expansion', 'rarity', 'description'],
      yugioh: [
        'name',
        'setName',
        'cardNumber',
        'rarity',
        'monsterType',
        'productDetailsDescription',
      ],
      soccer: [
        'player',
        'playerName',
        'set_name',
        'set_year',
        'variation',
        'card_number',
        'sport',
        'description',
      ],
    };

    return searchableFields[category].some((field) =>
      this.includesKeyword(item?.[field], keyword),
    );
  }

  private includesKeyword(value: unknown, keyword: string): boolean {
    if (value === null || value === undefined) return false;

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value).toLowerCase().includes(keyword);
    }

    if (Array.isArray(value)) {
      return value.some((item) => this.includesKeyword(item, keyword));
    }

    return false;
  }

  private shouldUsePagination(page?: number, limit?: number): boolean {
    return page !== undefined || limit !== undefined;
  }

  private normalizePagination(
    page?: number,
    limit?: number,
  ): { page: number; limit: number } {
    const parsedPage = page === undefined ? 1 : Number(page);
    const parsedLimit = limit === undefined ? 20 : Number(limit);

    if (!Number.isFinite(parsedPage) || parsedPage <= 0) {
      throw new BadRequestException('page must be a positive number');
    }

    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException('limit must be a positive number');
    }

    return {
      page: Math.floor(parsedPage),
      limit: Math.floor(parsedLimit),
    };
  }

  private buildCategoryPayload(
    items: any[],
    usePagination: boolean,
    pagination: { page: number; limit: number },
  ) {
    if (!usePagination) {
      return {
        total: items.length,
        items,
      };
    }

    const { page, limit } = pagination;
    const start = (page - 1) * limit;
    const end = start + limit;
    const pagedItems = items.slice(start, end);

    return {
      total: items.length,
      page,
      limit,
      totalPages: Math.ceil(items.length / limit),
      items: pagedItems,
    };
  }

  private parseAiJson(raw: unknown): Record<string, any> | null {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, any>;
    }

    let text = '';
    if (typeof raw === 'string') {
      text = raw;
    } else if (Array.isArray(raw)) {
      text = raw
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'text' in item) {
            return String((item as { text?: unknown }).text ?? '');
          }
          return '';
        })
        .join('');
    }

    if (!text.trim()) {
      return null;
    }

    let cleaned = text.replace(/```json|```/g, '').trim();
    const jsonStart = cleaned.indexOf('{');
    if (jsonStart > 0) cleaned = cleaned.slice(jsonStart);
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonEnd >= 0) cleaned = cleaned.slice(0, jsonEnd + 1);

    try {
      return JSON.parse(cleaned) as Record<string, any>;
    } catch {
      return null;
    }
  }

  private normalizeFullScanCardPayload(
    raw: Record<string, any>,
  ): FullScanCardPayload {
    const cardName = this.normalizeText(raw.cardName, 'Unknown');
    const currentPriceValue = this.parsePriceNumber(raw.currentPrice, 100);
    const predictedPriceValue = this.parsePriceNumber(
      raw.predictedPrice,
      currentPriceValue * 1.08,
    );
    const currentPrice = this.normalizePrice(
      raw.currentPrice,
      currentPriceValue,
    );
    const predictedPrice = this.normalizePrice(
      raw.predictedPrice,
      predictedPriceValue,
    );
    const priceLink = this.normalizePriceLink(raw.priceLink, cardName);

    return {
      cardName,
      cardNameEn: this.normalizeText(raw.cardNameEn, ''),
      rarity: this.normalizeText(raw.rarity, 'Unknown'),
      energy: this.normalizeEnergyLink(raw.energy),
      artist: this.normalizeText(raw.artist, 'Unknown'),
      year: this.normalizeText(raw.year, 'Unknown'),
      type: this.normalizeText(raw.type, 'Pokemon'),
      finish: this.normalizeText(raw.finish, 'Unknown'),
      seriesExpansion: this.normalizeText(raw.seriesExpansion, 'Unknown'),
      seriesExpansionEn: this.normalizeText(raw.seriesExpansionEn, ''),
      description: this.normalizeText(
        raw.description,
        'No description available for this card.',
      ),
      currentPrice,
      predictedPrice,
      priceLink,
      attacks: this.normalizeAttacks(raw.attacks),
      hp: this.normalizeText(raw.hp, 'Unknown'),
      weakness: this.normalizeWeaknessType(raw.weakness),
      'TCG-1month-prices': this.normalizePriceHistory(
        raw['TCG-1month-prices'],
        this.buildHistoricalPriceSeries(
          currentPriceValue,
          HISTORY_POINT_COUNT,
          3,
          0.88,
        ),
        'desc',
      ),
      'TCG-3month-prices': this.normalizePriceHistory(
        raw['TCG-3month-prices'],
        this.buildHistoricalPriceSeries(
          currentPriceValue,
          HISTORY_POINT_COUNT,
          10,
          0.82,
        ),
        'desc',
      ),
      'TCG-6month-prices': this.normalizePriceHistory(
        raw['TCG-6month-prices'],
        this.buildHistoricalPriceSeries(
          currentPriceValue,
          HISTORY_POINT_COUNT,
          20,
          0.76,
        ),
        'desc',
      ),
      'TCG-1year-prices': this.normalizePriceHistory(
        raw['TCG-1year-prices'],
        this.buildHistoricalPriceSeries(
          currentPriceValue,
          HISTORY_POINT_COUNT,
          40,
          0.68,
        ),
        'desc',
      ),
      'TCG-all-prices': this.normalizePriceHistory(
        raw['TCG-all-prices'],
        this.buildHistoricalPriceSeries(
          currentPriceValue,
          HISTORY_POINT_COUNT,
          50,
          0.68,
        ),
        'desc',
      ),
      'TCG-1month-forecast-prices': this.normalizePriceHistory(
        raw['TCG-1month-forecast-prices'],
        this.buildForecastPriceSeries(
          currentPriceValue,
          predictedPriceValue,
          FORECAST_POINT_COUNT,
          10,
        ),
        'asc',
      ),
      'TCG-3month-forecast-prices': this.normalizePriceHistory(
        raw['TCG-3month-forecast-prices'],
        this.buildForecastPriceSeries(
          currentPriceValue,
          predictedPriceValue,
          FORECAST_POINT_COUNT,
          30,
        ),
        'asc',
      ),
      'TCG-6month-forecast-prices': this.normalizePriceHistory(
        raw['TCG-6month-forecast-prices'],
        this.buildForecastPriceSeries(
          currentPriceValue,
          predictedPriceValue,
          FORECAST_POINT_COUNT,
          60,
        ),
        'asc',
      ),
      'TCG-1year-forecast-prices': this.normalizePriceHistory(
        raw['TCG-1year-forecast-prices'],
        this.buildForecastPriceSeries(
          currentPriceValue,
          predictedPriceValue,
          FORECAST_POINT_COUNT,
          120,
        ),
        'asc',
      ),
      'TCG-all-forecast-prices': this.normalizePriceHistory(
        raw['TCG-all-forecast-prices'],
        this.buildForecastPriceSeries(
          currentPriceValue,
          predictedPriceValue,
          FORECAST_POINT_COUNT,
          120,
        ),
        'asc',
      ),
      'CM-1month-prices': this.normalizePriceHistory(
        raw['CM-1month-prices'],
        this.buildHistoricalPriceSeries(
          currentPriceValue * 1.02,
          CARDMARKET_HISTORY_POINT_COUNT,
          3,
          0.89,
        ),
        'desc',
      ),
      'CM-3month-prices': this.normalizePriceHistory(
        raw['CM-3month-prices'],
        this.buildHistoricalPriceSeries(
          currentPriceValue * 1.02,
          CARDMARKET_HISTORY_POINT_COUNT,
          10,
          0.83,
        ),
        'desc',
      ),
      'CM-6month-prices': this.normalizePriceHistory(
        raw['CM-6month-prices'],
        this.buildHistoricalPriceSeries(
          currentPriceValue * 1.02,
          CARDMARKET_HISTORY_POINT_COUNT,
          20,
          0.77,
        ),
        'desc',
      ),
      'CM-1year-prices': this.normalizePriceHistory(
        raw['CM-1year-prices'],
        this.buildHistoricalPriceSeries(
          currentPriceValue * 1.02,
          CARDMARKET_HISTORY_POINT_COUNT,
          40,
          0.69,
        ),
        'desc',
      ),
      'CM-all-prices': this.normalizePriceHistory(
        raw['CM-all-prices'],
        this.buildHistoricalPriceSeries(
          currentPriceValue * 1.02,
          CARDMARKET_HISTORY_POINT_COUNT,
          50,
          0.69,
        ),
        'desc',
      ),
      'CM-1month-forecast-prices': this.normalizePriceHistory(
        raw['CM-1month-forecast-prices'],
        this.buildForecastPriceSeries(
          currentPriceValue * 1.02,
          predictedPriceValue * 1.02,
          FORECAST_POINT_COUNT,
          10,
        ),
        'asc',
      ),
      'CM-3month-forecast-prices': this.normalizePriceHistory(
        raw['CM-3month-forecast-prices'],
        this.buildForecastPriceSeries(
          currentPriceValue * 1.02,
          predictedPriceValue * 1.02,
          FORECAST_POINT_COUNT,
          30,
        ),
        'asc',
      ),
      'CM-6month-forecast-prices': this.normalizePriceHistory(
        raw['CM-6month-forecast-prices'],
        this.buildForecastPriceSeries(
          currentPriceValue * 1.02,
          predictedPriceValue * 1.02,
          FORECAST_POINT_COUNT,
          60,
        ),
        'asc',
      ),
      'CM-1year-forecast-prices': this.normalizePriceHistory(
        raw['CM-1year-forecast-prices'],
        this.buildForecastPriceSeries(
          currentPriceValue * 1.02,
          predictedPriceValue * 1.02,
          FORECAST_POINT_COUNT,
          120,
        ),
        'asc',
      ),
      'CM-all-forecast-prices': this.normalizePriceHistory(
        raw['CM-all-forecast-prices'],
        this.buildForecastPriceSeries(
          currentPriceValue * 1.02,
          predictedPriceValue * 1.02,
          FORECAST_POINT_COUNT,
          120,
        ),
        'asc',
      ),
      gradedPrices: this.normalizeGradedPrices(
        raw.gradedPrices,
        currentPriceValue,
      ),
      buyLink: this.normalizeBuyLinks(raw.buyLink, cardName, priceLink),
    };
  }

  private async fetchCurrencyExchangeRate(
    base: string,
    target: string,
  ): Promise<number> {
    const normalizedBase = String(base || '')
      .trim()
      .toUpperCase();
    const normalizedTarget = String(target || '')
      .trim()
      .toUpperCase();

    if (!normalizedBase || !normalizedTarget) {
      throw new BadRequestException('base and target currency are required');
    }

    if (normalizedBase === normalizedTarget) {
      return 1;
    }

    try {
      const response = await axios.post<CurrencyConversionApiResponse>(
        'https://live-earth-map.limgrow.com/money/convert',
        {
          base: normalizedBase,
          target: normalizedTarget,
          amount: 1,
        },
        {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const rate = Number(response.data?.data);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error(`Invalid exchange rate: ${response.data?.data}`);
      }

      return rate;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fetch currency exchange rate failed: ${message}`);
      throw new BadRequestException('Could not fetch exchange rate');
    }
  }

  private applyCurrencyConversionToPayload(
    data: FullScanCardPayload,
    exchangeRate: number,
    targetCurrency: string,
  ): FullScanCardPayload {
    return {
      ...data,
      currentPrice: this.convertPriceString(
        data.currentPrice,
        exchangeRate,
        targetCurrency,
      ),
      predictedPrice: this.convertPriceString(
        data.predictedPrice,
        exchangeRate,
        targetCurrency,
      ),
      'TCG-1month-prices': this.convertPricePointSeries(
        data['TCG-1month-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'TCG-3month-prices': this.convertPricePointSeries(
        data['TCG-3month-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'TCG-6month-prices': this.convertPricePointSeries(
        data['TCG-6month-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'TCG-1year-prices': this.convertPricePointSeries(
        data['TCG-1year-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'TCG-all-prices': this.convertPricePointSeries(
        data['TCG-all-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'TCG-1month-forecast-prices': this.convertPricePointSeries(
        data['TCG-1month-forecast-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'TCG-3month-forecast-prices': this.convertPricePointSeries(
        data['TCG-3month-forecast-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'TCG-6month-forecast-prices': this.convertPricePointSeries(
        data['TCG-6month-forecast-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'TCG-1year-forecast-prices': this.convertPricePointSeries(
        data['TCG-1year-forecast-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'TCG-all-forecast-prices': this.convertPricePointSeries(
        data['TCG-all-forecast-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'CM-1month-prices': this.convertPricePointSeries(
        data['CM-1month-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'CM-3month-prices': this.convertPricePointSeries(
        data['CM-3month-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'CM-6month-prices': this.convertPricePointSeries(
        data['CM-6month-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'CM-1year-prices': this.convertPricePointSeries(
        data['CM-1year-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'CM-all-prices': this.convertPricePointSeries(
        data['CM-all-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'CM-1month-forecast-prices': this.convertPricePointSeries(
        data['CM-1month-forecast-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'CM-3month-forecast-prices': this.convertPricePointSeries(
        data['CM-3month-forecast-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'CM-6month-forecast-prices': this.convertPricePointSeries(
        data['CM-6month-forecast-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'CM-1year-forecast-prices': this.convertPricePointSeries(
        data['CM-1year-forecast-prices'],
        exchangeRate,
        targetCurrency,
      ),
      'CM-all-forecast-prices': this.convertPricePointSeries(
        data['CM-all-forecast-prices'],
        exchangeRate,
        targetCurrency,
      ),
      gradedPrices: this.convertGradedPrices(
        data.gradedPrices,
        exchangeRate,
        targetCurrency,
      ),
    };
  }

  private convertPricePointSeries(
    series: PricePoint[],
    exchangeRate: number,
    targetCurrency: string,
  ): PricePoint[] {
    return Array.isArray(series)
      ? series.map((point) => ({
          ...point,
          price: this.convertPriceString(
            point.price,
            exchangeRate,
            targetCurrency,
          ),
        }))
      : [];
  }

  private convertGradedPrices(
    items: GradedPricePayload[],
    exchangeRate: number,
    targetCurrency: string,
  ): GradedPricePayload[] {
    return Array.isArray(items)
      ? items.map((item) => ({
          ...item,
          price: this.convertPriceString(
            item.price,
            exchangeRate,
            targetCurrency,
          ),
        }))
      : [];
  }

  private convertPriceString(
    value: string,
    exchangeRate: number,
    targetCurrency: string,
  ): string {
    const amount = this.parsePriceNumber(value, 0);
    const converted = amount * exchangeRate;
    return this.formatCurrencyByCode(converted, targetCurrency);
  }

  private formatCurrencyByCode(value: number, currencyCode: string): string {
    const normalizedCode = String(currencyCode || 'USD')
      .trim()
      .toUpperCase();
    const safeValue = Number.isFinite(value) ? value : 0;

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: normalizedCode,
        maximumFractionDigits: normalizedCode === 'VND' ? 0 : 2,
      }).format(safeValue);
    } catch {
      return `${normalizedCode} ${safeValue.toFixed(2)}`;
    }
  }

  private async translateCardPayload(
    data: FullScanCardPayload,
    language?: string,
  ): Promise<FullScanCardPayload> {
    const targetCode = this.mapLanguageToCode(language || 'en');
    if (!targetCode || targetCode === 'en') {
      return data;
    }

    try {
      const [cardName, seriesExpansion, description, rarity, finish, attacks] =
        await Promise.all([
          this.translateTextIfNeeded(data.cardName, targetCode),
          this.translateTextIfNeeded(data.seriesExpansion, targetCode),
          this.translateTextIfNeeded(data.description, targetCode),
          this.translateTextIfNeeded(data.rarity, targetCode),
          this.translateTextIfNeeded(data.finish, targetCode),
          Promise.all(
            data.attacks.map(async (attack) => ({
              ...attack,
              name: await this.translateTextIfNeeded(attack.name, targetCode),
              description: await this.translateTextIfNeeded(
                attack.description,
                targetCode,
              ),
            })),
          ),
        ]);

      return {
        ...data,
        cardName,
        seriesExpansion,
        description,
        rarity,
        finish,
        attacks,
        // Preserve English names for search — not translated
        cardNameEn: data.cardNameEn || data.cardName,
        seriesExpansionEn: data.seriesExpansionEn || data.seriesExpansion,
      };
    } catch (error) {
      this.logger.warn(
        `Translate card payload failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return data;
    }
  }

  private async translateTextIfNeeded(
    text: string,
    targetLanguage: string,
  ): Promise<string> {
    const normalized = this.normalizeText(text, '');
    if (!normalized || normalized.toLowerCase() === 'unknown') {
      return normalized;
    }

    const { translatedText } = await this.translateTextDirect(
      normalized,
      targetLanguage,
    );
    return translatedText || normalized;
  }

  private async translateCardIdentity(
    identity: {
      cardName: string;
      seriesExpansion: string;
      year: string;
      cardNumber: string;
    },
    language?: string,
  ): Promise<{
    cardName: string;
    seriesExpansion: string;
    year: string;
    cardNumber: string;
  }> {
    if (!language) return identity;

    const targetCode = this.mapLanguageToCode(language);
    if (!targetCode || targetCode === 'en') return identity;

    try {
      const [cardName, seriesExpansion] = await Promise.all([
        this.translateTextIfNeeded(identity.cardName, targetCode),
        this.translateTextIfNeeded(identity.seriesExpansion, targetCode),
      ]);
      return { ...identity, cardName, seriesExpansion };
    } catch {
      return identity;
    }
  }

  private mapLanguageToCode(name: string): string {
    const normalized = String(name || '')
      .trim()
      .toLowerCase();
    const map: Record<string, string> = {
      vietnamese: 'vi',
      english: 'en',
      french: 'fr',
      spanish: 'es',
      chinese: 'zh-CN',
      japanese: 'ja',
      korean: 'ko',
      russian: 'ru',
      german: 'de',
      deutsch: 'de',
      portuguesa: 'pt',
      português: 'pt',
      portuguese: 'pt',
      française: 'fr',
      italiana: 'it',
      italian: 'it',
      hindi: 'hi',
      arabic: 'ar',
      bengali: 'bn',
      punjabi: 'pa',
      kiswahili: 'sw',
      'bahasa indo': 'id',
      indonesian: 'id',
      indonesia: 'id',
      zh: 'zh-CN',
      hi: 'hi',
      es: 'es',
      ar: 'ar',
      fr: 'fr',
      bn: 'bn',
      en: 'en',
      pt: 'pt',
      sw: 'sw',
      in: 'id',
      id: 'id',
      ja: 'ja',
      de: 'de',
      pa: 'pa',
      it: 'it',
      vi: 'vi',
      ko: 'ko',
      ru: 'ru',
      中文: 'zh-CN',
      हिन्दी: 'hi',
      española: 'es',
      عربي: 'ar',
      français: 'fr',
      বাংলা: 'bn',
      日本語: 'ja',
      ਪੰਜਾਬੀ: 'pa',
    };

    return map[normalized] || normalized;
  }

  private async translateTextDirect(text: string, targetLanguage: string) {
    try {
      const targetCode = this.mapLanguageToCode(targetLanguage);
      const { translate } = await import('@vitalets/google-translate-api');
      const { text: translatedText } = await translate(text, {
        to: targetCode,
      });
      return { translatedText };
    } catch (error) {
      this.logger.error(
        `Google Translate Text Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to translate text via Google API');
    }
  }

  private normalizeText(value: unknown, fallback = ''): string {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    return fallback;
  }

  private normalizePrice(value: unknown, fallbackNumber: number): string {
    if (typeof value === 'string' && value.trim()) {
      const normalizedValue = value.trim();
      if (normalizedValue.startsWith('$')) return normalizedValue;
      const parsed = this.parsePriceNumber(normalizedValue, fallbackNumber);
      return this.formatUsd(parsed);
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return this.formatUsd(value);
    }

    return this.formatUsd(fallbackNumber);
  }

  private parsePriceNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const numeric = Number(value.replace(/[^0-9.]/g, ''));
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
    }

    return fallback;
  }

  private formatUsd(value: number): string {
    const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
    return `$${safeValue.toFixed(2)}`;
  }

  private isMeaningfulValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      return Boolean(normalized) && normalized.toLowerCase() !== 'unknown';
    }

    if (typeof value === 'number') {
      return Number.isFinite(value);
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).length > 0;
    }

    return Boolean(value);
  }

  private getMissingFields(
    data: Record<string, any>,
    fields: string[],
  ): string[] {
    return fields.filter((field) => !this.isMeaningfulValue(data?.[field]));
  }

  private getFoundFields(
    data: Record<string, any>,
    fields: string[],
  ): string[] {
    return fields.filter((field) => this.isMeaningfulValue(data?.[field]));
  }

  private formatFieldList(fields: string[]): string {
    return fields.length ? fields.join(', ') : 'none';
  }

  private logFieldCoverage(
    context: string,
    data: Record<string, any>,
    fields: string[],
    label: string,
  ): void {
    const foundFields = this.getFoundFields(data, fields);
    const missingFields = this.getMissingFields(data, fields);

    void context;
    void data;
    void fields;
    void label;
    void foundFields;
    void missingFields;
  }

  private normalizeEnergyLink(value: unknown): string {
    const normalized = this.extractEnergyToken(value);
    if (!normalized) return '';
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }

    const uploadedTypeIcon = this.getUploadedTypeIcon(normalized);
    if (uploadedTypeIcon) {
      return uploadedTypeIcon;
    }

    return EnergyTypeService.getEnergyImg(normalized) || normalized;
  }

  private getUploadedTypeIcon(value: string): string | null {
    const key = this.normalizeUploadedTypeKey(value);
    if (!key) return null;
    return this.uploadedTypeIconMap[key] || null;
  }

  private normalizeUploadedTypeKey(value: unknown): string {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();

    if (!normalized) {
      return '';
    }

    const aliasMap: Record<string, string> = {
      darkness: 'dark',
      dark: 'dark',
      electric: 'lightning',
      lightning: 'lightning',
      steel: 'metal',
      metal: 'metal',
      normal: 'colorless',
      colorless: 'colorless',
      leaf: 'grass',
      grass: 'grass',
      fire: 'fire',
      water: 'water',
      psychic: 'psychic',
      fighting: 'fighting',
      fairy: 'fairy',
      dragon: 'dragon',
    };

    return aliasMap[normalized] || normalized;
  }

  private extractEnergyToken(value: unknown): string {
    if (Array.isArray(value)) {
      for (const item of value) {
        const normalized = this.extractEnergyToken(item);
        if (normalized) return normalized;
      }
      return '';
    }

    if (typeof value !== 'string') {
      return '';
    }

    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    const candidates = trimmed
      .split(/[^a-zA-Z]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    for (const candidate of candidates) {
      if (EnergyTypeService.getEnergyImg(candidate)) {
        return candidate;
      }
    }

    return trimmed;
  }

  /** Extracts energy TYPE NAME from a URL, symbol, or type string — returns plain name, NOT a URL */
  private normalizeWeaknessType(value: unknown): string {
    const token = this.extractEnergyToken(value);
    if (!token) return '';
    if (token.startsWith('http://') || token.startsWith('https://')) {
      // Reverse-lookup: find key by URL in uploaded icons map
      for (const [key, url] of Object.entries(this.uploadedTypeIconMap)) {
        if (url === token) {
          return this.normalizeUploadedTypeKey(key) || key;
        }
      }
      // Could not resolve URL → return empty
      return '';
    }
    return this.normalizeUploadedTypeKey(token) || token;
  }

  private normalizeAttacks(value: unknown): AttackPayload[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((attack) => {
        const payload = attack as Record<string, unknown>;
        let name = this.normalizeText(payload?.name, '');
        let damage = this.normalizeText(payload?.damage, '');
        let description = this.normalizeText(payload?.description, '');

        // Strip [Y] / [R] / [B] / etc. prefixes from attack name
        name = name.replace(/^\[[A-Z]\]\s*/i, '');

        // Safety net: if name contains full sentence (likely name+description merged), split it
        // Pattern: "Attack Name" followed by a full sentence starting with verb
        const nameDescSplit = name.match(
          /^([A-Za-z][A-Za-z\s']+?)\s+(Search|Put|Move|Switch|Shuffle|Choose|Return|Attach|Heal|Your|Do|Damage|Effect|Copy|Prevent|Discard|Draw|Knock|Break|You|This|Card|Count)/,
        );
        if (
          nameDescSplit &&
          nameDescSplit[1].length > 2 &&
          nameDescSplit[0].length < name.length
        ) {
          if (
            !description ||
            description === 'No attack description available.'
          ) {
            description = name.slice(nameDescSplit[0].length).trim();
          }
          name = nameDescSplit[1].trim();
        }

        // Safety net: if damage is rule text and description is a number → swap them
        const descIsDamage =
          /^\d+$/.test(description) || /^\×\d+$/i.test(description);
        const dmgIsRuleText =
          /\b(you can't?|search|put|move|switch|shuffle|choose|return|attach|heal|use|your deck|your hand|opponent|gx attack|card attached)\b/i.test(
            damage,
          ) || damage.length > 30;
        if (descIsDamage && dmgIsRuleText) {
          damage = description;
          description = 'No attack description available.';
        }

        // If damage contains rule text, GX restrictions, or text (not a number/×N): move to description
        const isDamageText =
          !damage || (isNaN(parseInt(damage)) && !/^×\d+$/i.test(damage));
        const looksLikeRuleText =
          /\b(you can't?|search your deck|put [0-9]|attached to|into your (hand|deck|discard|bench)|opponent'?s|gx attack|move|switch|shuffle)\b/i.test(
            damage,
          ) ||
          /^(search|put|move|switch|shuffle|choose|return|attach|heal|use)/i.test(
            damage,
          ) ||
          /\bgx\b/i.test(damage) ||
          damage.length > 50;

        if (isDamageText && looksLikeRuleText) {
          if (
            description &&
            description !== 'No attack description available.'
          ) {
            description = `${damage}. ${description}`;
          } else {
            description = damage;
          }
          damage = '0';
        }

        // If energy contains URLs or numeric damage-like values mixed with type names, fix it
        let energy = this.normalizeAttackEnergy(payload?.energy);
        if (energy.length > 0) {
          const numericItems = energy.filter((e) => /^\d+$/.test(e));
          const typeNameItems = energy.filter((e) => !/^\d+$/.test(e));
          // If we have both numbers AND type names, keep type names; numbers likely mis-parsed damage
          if (numericItems.length > 0 && typeNameItems.length > 0) {
            energy = typeNameItems;
          }
          // If ALL energy items are numeric (cost), convert to cost notation
          if (numericItems.length > 0 && typeNameItems.length === 0) {
            energy = numericItems;
          }
        }

        if (!name && !damage && !description) {
          return null;
        }

        return {
          name: name || 'Unknown Attack',
          damage: damage || '0',
          description: description || 'No attack description available.',
          energy,
          _id: this.normalizeText(
            payload?._id,
            randomUUID().replace(/-/g, '').slice(0, 24),
          ),
        };
      })
      .filter((item): item is AttackPayload => item !== null);
  }

  private normalizeAttackEnergy(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          const token = this.extractEnergyToken(item);
          if (!token) return '';
          // Return URL if found in uploaded-type-icons.json, else return raw type name
          const url = this.getUploadedTypeIcon(token);
          return url || token;
        })
        .filter((item) => Boolean(item));
    }

    const token = this.extractEnergyToken(value);
    if (!token) return [];
    const url = this.getUploadedTypeIcon(token);
    return [url || token];
  }

  private normalizePriceHistory(
    value: unknown,
    fallback: PricePoint[],
    direction: 'asc' | 'desc',
  ): PricePoint[] {
    if (!Array.isArray(value)) {
      return fallback;
    }

    const normalized = value
      .map((entry, index) => {
        const payload = entry as Record<string, unknown>;
        const price = this.normalizePrice(payload?.price, 0);
        const date = this.normalizeDateString(payload?.date);

        if (!price) {
          return null;
        }

        return { price, date, index };
      })
      .filter(
        (item): item is { price: string; date: string; index: number } =>
          item !== null,
      )
      .sort((left, right) => {
        if (left.date && right.date) {
          return direction === 'desc'
            ? right.date.localeCompare(left.date)
            : left.date.localeCompare(right.date);
        }

        if (left.date) return -1;
        if (right.date) return 1;
        return left.index - right.index;
      });

    if (!normalized.length) {
      return fallback;
    }

    if (direction === 'desc') {
      return normalized.map((point) => ({
        date: point.date,
        price: point.price,
      }));
    }

    return fallback.map((point, index) => ({
      date: point.date,
      price: normalized[index]?.price ?? point.price,
    }));
  }

  private normalizeDateString(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    return '';
  }

  private normalizeGradedPrices(
    value: unknown,
    basePrice: number,
  ): GradedPricePayload[] {
    if (Array.isArray(value)) {
      const normalized = value
        .map((entry) => {
          const payload = entry as Record<string, unknown>;
          const grade = this.normalizeText(payload?.grade, '');
          const price = this.normalizePrice(payload?.price, 0);

          if (!grade || !price) {
            return null;
          }

          return { grade, price };
        })
        .filter((item): item is GradedPricePayload => item !== null);

      if (normalized.length) {
        return normalized;
      }
    }

    return [
      { grade: 'PSA 10', price: this.formatUsd(basePrice * 1.2) },
      { grade: 'PSA 9', price: this.formatUsd(basePrice * 1.1) },
      { grade: 'PSA 8', price: this.formatUsd(basePrice * 1.04) },
      { grade: 'UNGRADED', price: this.formatUsd(basePrice * 0.92) },
    ];
  }

  private normalizeBuyLinks(
    value: unknown,
    cardName: string,
    priceLink: string,
  ): BuyLinkPayload[] {
    if (Array.isArray(value)) {
      const normalized = value
        .map((entry) => {
          const payload = entry as Record<string, unknown>;
          const shop = this.normalizeText(payload?.Shop, '');
          const link = this.normalizeUrl(payload?.link);

          if (!shop || !link) {
            return null;
          }

          return { Shop: shop, link };
        })
        .filter((item): item is BuyLinkPayload => item !== null);

      if (normalized.length) {
        return normalized;
      }
    }

    const query = encodeURIComponent(cardName || 'trading card');

    return [
      {
        Shop: 'Ebay',
        link: `https://www.ebay.com/sch/i.html?_nkw=${query}`,
      },
      {
        Shop: 'Cardmarket',
        link: `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${query}`,
      },
      {
        Shop: 'TCGPlayer',
        link: priceLink,
      },
    ];
  }

  private normalizePriceLink(value: unknown, cardName: string): string {
    const normalized = this.normalizeUrl(value);
    if (normalized) {
      return normalized;
    }

    const query = encodeURIComponent(cardName || 'trading card');
    return `https://www.tcgplayer.com/search/all/product?q=${query}`;
  }

  private normalizeUrl(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      return '';
    }

    try {
      const url = new URL(value.trim());
      return url.toString();
    } catch {
      return '';
    }
  }

  private buildHistoricalPriceSeries(
    latestPrice: number,
    count: number,
    dayStep: number,
    oldestRatio: number,
  ): PricePoint[] {
    const safeLatestPrice = latestPrice > 0 ? latestPrice : 100;
    const points: PricePoint[] = [];

    for (let index = 0; index < count; index++) {
      const progress = count === 1 ? 1 : index / (count - 1);
      const ratio =
        1 - (1 - oldestRatio) * progress + Math.sin(index + 1) * 0.015;
      const date = this.shiftDate(-index * dayStep);
      points.push({
        price: this.formatUsd(safeLatestPrice * Math.max(ratio, 0.25)),
        date,
      });
    }

    return points;
  }

  private buildForecastPriceSeries(
    currentPrice: number,
    predictedPrice: number,
    count: number,
    dayStep: number,
  ): PricePoint[] {
    const safeCurrentPrice = currentPrice > 0 ? currentPrice : 100;
    const safePredictedPrice =
      predictedPrice > 0 ? predictedPrice : safeCurrentPrice * 1.08;
    const points: PricePoint[] = [];

    for (let index = 0; index < count; index++) {
      const progress = count === 1 ? 1 : index / (count - 1);
      const value =
        safeCurrentPrice +
        (safePredictedPrice - safeCurrentPrice) * progress +
        safeCurrentPrice * Math.cos(index + 1) * 0.01;
      points.push({
        price: this.formatUsd(Math.max(value, 0.01)),
        date: this.shiftDate(index * dayStep),
      });
    }

    return points;
  }

  private shiftDate(dayOffset: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + dayOffset);
    return date.toISOString().slice(0, 10);
  }

  private logOpenRouterUsage(responseData: any, context: string): void {
    const usage = responseData?.usage;

    if (!usage) {
      this.logger.warn(
        `[${context}] OpenRouter response did not include usage data`,
      );
      return;
    }

    this.logger.log(
      `[${context}] OpenRouter usage | cost=${Number(usage.cost ?? 0)} | inputToken=${Number(usage.prompt_tokens ?? 0)} | outputToken=${Number(usage.completion_tokens ?? 0)} | model=${responseData?.model || 'unknown'}`,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PSA GRADING
  // ══════════════════════════════════════════════════════════════════════════════

  async gradeCardOpenRouter(
    imageBuffer: Buffer,
    filename: string,
    language?: string,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        return {
          success: false,
          message: 'OPENROUTER_API_KEY environment variable is not set',
        };
      }

      const extension = this.getFileExtension(filename);
      const base64Image = `data:image/${extension};base64,${imageBuffer.toString('base64')}`;

      // Auto-detect card identity from image
      const identity = await this.detectCardIdentity(base64Image);
      const resolvedCardName = identity?.cardName || '';
      const resolvedCardNameEn = identity?.cardNameEn || '';
      const resolvedSeries = identity?.seriesExpansion || '';
      const resolvedSeriesEn = identity?.seriesExpansionEn || '';
      const resolvedYear = identity?.year || '';
      const resolvedCardNumber = identity?.cardNumber || '';

      // Analyze PSA subgrades
      const psaAnalysis = await this.analyzePsaSubgrades(base64Image);
      if (psaAnalysis && !psaAnalysis.estimatedGrade) {
        const inferredGrade =
          this.inferEstimatedGradeFromSubgrades(psaAnalysis);
        if (inferredGrade) {
          psaAnalysis.estimatedGrade = inferredGrade;
          this.logger.warn(
            `[card-new.grade-card] Missing estimatedGrade from AI, inferred from subgrades: ${inferredGrade}`,
          );
        }
      }

      if (!psaAnalysis || !psaAnalysis.estimatedGrade) {
        return {
          success: false,
          message: 'Could not analyze card grade from image',
        };
      }

      const lowestSubgrade = this.findLowestSubgrade(psaAnalysis);
      const centeringPass = this.checkCenteringPass(psaAnalysis, language);
      // Use English name for TCGPlayer/Cardmarket search (most reliable)
      const searchCardName = resolvedCardNameEn || resolvedCardName;
      const searchSeries = resolvedSeriesEn || resolvedSeries;

      // Fetch graded prices from TCGPlayer/Cardmarket
      const gradedPricesResult = await this.fetchGradedPricesFromTcgplayer(
        searchCardName,
        searchSeries,
        '',
      );

      // Translate card identity to display language (if not English)
      const translatedIdentity = await this.translateCardIdentity(
        {
          cardName: resolvedCardName,
          seriesExpansion: resolvedSeries,
          year: resolvedYear,
          cardNumber: resolvedCardNumber,
        },
        language,
      );

      const gradingResponse = this.buildPsaGradingResponse(
        psaAnalysis,
        lowestSubgrade,
        centeringPass,
        gradedPricesResult,
        translatedIdentity.cardName,
        translatedIdentity.seriesExpansion,
        language,
        resolvedCardNameEn,
        resolvedSeriesEn,
      );

      this.logger.log(
        `[card-new.grade-card] PSA grading completed | cardName="${resolvedCardName}" | grade="${psaAnalysis.estimatedGrade}" | lowest="${lowestSubgrade.name} (${lowestSubgrade.score})"`,
      );

      return {
        success: true,
        message: 'Card graded successfully',
        data: gradingResponse,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`PSA grading failed: ${message}`);
      return {
        success: false,
        message: 'Internal server error while grading card',
      };
    }
  }

  private async analyzePsaSubgrades(base64Image: string): Promise<any> {
    const attempt1Raw = await this.requestOpenRouterJsonForGrade(
      buildPsaGradingPrompt(),
      psaGradingSchema,
      base64Image,
      'card-new.psa-grading[attempt1]',
    );
    const attempt1 = this.normalizePsaAnalysis(attempt1Raw);

    this.logger.log(
      `[openrouter] card-new.psa-grading[attempt1] | raw_length=${JSON.stringify(attempt1Raw || {}).length} | centering=${attempt1?.centering?.score} corners=${attempt1?.corners?.score} edges=${attempt1?.edges?.score} surface=${attempt1?.surface?.score} estimatedGrade="${attempt1?.estimatedGrade || 'null'}"`,
    );

    if (this.hasValidPsaScores(attempt1) || attempt1?.estimatedGrade) {
      return attempt1;
    }

    this.logger.warn(
      '[card-new.psa-grading] Attempt 1 — subgrade scores missing, retrying with stricter prompt.',
    );

    const strictPrompt = `${buildPsaGradingPrompt()}\n\nSTRICT JSON RULES:\n- Return top-level keys ONLY: centering, corners, edges, surface, estimatedGrade, rawPrice, gradedPrices, notes.\n- Do NOT wrap inside data/result/analysis/psa objects.\n- centering/corners/edges/surface must be objects and each must have numeric score (1-10).\n- If uncertain, still provide best-estimate numeric scores.`;

    const attempt2Raw = await this.requestOpenRouterJsonForGrade(
      strictPrompt,
      psaGradingSchema,
      base64Image,
      'card-new.psa-grading[attempt2]',
    );
    const attempt2 = this.normalizePsaAnalysis(attempt2Raw);

    this.logger.log(
      `[openrouter] card-new.psa-grading[attempt2] | raw_length=${JSON.stringify(attempt2Raw || {}).length} | centering=${attempt2?.centering?.score} corners=${attempt2?.corners?.score} edges=${attempt2?.edges?.score} surface=${attempt2?.surface?.score} estimatedGrade="${attempt2?.estimatedGrade || 'null'}"`,
    );

    if (!this.hasValidPsaScores(attempt2) && !attempt2?.estimatedGrade) {
      this.logger.warn(
        `[card-new.psa-grading] Both attempts failed — no usable scores/grade. raw_preview=${JSON.stringify(attempt2Raw || attempt1Raw || {}).slice(0, 400)}`,
      );
    }

    return attempt2;
  }

  private hasValidPsaScores(psaAnalysis: any): boolean {
    if (!psaAnalysis) return false;
    const scores = [
      psaAnalysis?.centering?.score,
      psaAnalysis?.corners?.score,
      psaAnalysis?.edges?.score,
      psaAnalysis?.surface?.score,
    ]
      .map((v) => this.parseBoundedNumber(v, 0, 0, 10))
      .filter((v) => v > 0);

    return scores.length >= 2;
  }

  private parseBoundedNumber(
    value: unknown,
    fallback: number,
    min: number,
    max: number,
  ): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(min, Math.min(max, value));
    }

    if (typeof value === 'string') {
      const numeric = parseFloat(value.replace(/[^\d.-]/g, ''));
      if (Number.isFinite(numeric)) {
        return Math.max(min, Math.min(max, numeric));
      }
    }

    return Math.max(min, Math.min(max, fallback));
  }

  private normalizeEstimatedGrade(input: unknown): string {
    if (!input) return '';
    const text = String(input).trim();
    if (!text) return '';

    const numbers = (text.match(/\d{1,2}/g) || [])
      .map((n) => parseInt(n, 10))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 10);

    if (!numbers.length) return '';
    if (numbers.length === 1) return `${numbers[0]}-${numbers[0]}`;

    const from = Math.min(numbers[0], numbers[1]);
    const to = Math.max(numbers[0], numbers[1]);
    return `${from}-${to}`;
  }

  private extractScoreFromSubgradeCollection(
    container: any,
    key: string,
  ): { score: number; description: string } {
    const target = key.toLowerCase();
    if (!container) return { score: 0, description: '' };

    // Object map: { centering: { score: 8, ... }, ... }
    if (typeof container === 'object' && !Array.isArray(container)) {
      const direct =
        container[key] ??
        container[target] ??
        container[target.charAt(0).toUpperCase() + target.slice(1)];
      if (direct && typeof direct === 'object') {
        return {
          score: this.parseBoundedNumber((direct as any).score, 0, 0, 10),
          description: String(
            (direct as any).description ?? (direct as any).note ?? '',
          ),
        };
      }
    }

    // Array: [{ name: 'Centering', score: 8, ... }, ...]
    if (Array.isArray(container)) {
      const found = container.find((item: any) => {
        const name = String(
          item?.name ?? item?.type ?? item?.label ?? '',
        ).toLowerCase();
        return name.includes(target);
      });
      if (found) {
        return {
          score: this.parseBoundedNumber(found?.score, 0, 0, 10),
          description: String(found?.description ?? found?.note ?? ''),
        };
      }
    }

    return { score: 0, description: '' };
  }

  private findNestedObjectByKeys(raw: any, keys: string[]): any {
    if (!raw || typeof raw !== 'object') return null;

    const queue: any[] = [raw];
    const visited = new Set<any>();

    while (queue.length > 0) {
      const node = queue.shift();
      if (!node || typeof node !== 'object' || visited.has(node)) continue;
      visited.add(node);

      for (const key of keys) {
        if (
          Object.prototype.hasOwnProperty.call(node, key) &&
          node[key] &&
          typeof node[key] === 'object'
        ) {
          return node[key];
        }
      }

      for (const value of Object.values(node)) {
        if (value && typeof value === 'object') queue.push(value);
      }
    }

    return null;
  }

  private normalizePsaAnalysis(raw: any): any | null {
    if (!raw || typeof raw !== 'object') return null;

    const psaRoot =
      this.findNestedObjectByKeys(raw, [
        'psa',
        'psaGrading',
        'grading',
        'analysis',
        'result',
        'data',
      ]) || raw;

    const subgradeCollection =
      psaRoot?.subgrades ||
      psaRoot?.subgrade ||
      raw?.subgrades ||
      raw?.subgrade ||
      null;

    const centeringFromCollection = this.extractScoreFromSubgradeCollection(
      subgradeCollection,
      'centering',
    );
    const cornersFromCollection = this.extractScoreFromSubgradeCollection(
      subgradeCollection,
      'corners',
    );
    const edgesFromCollection = this.extractScoreFromSubgradeCollection(
      subgradeCollection,
      'edges',
    );
    const surfaceFromCollection = this.extractScoreFromSubgradeCollection(
      subgradeCollection,
      'surface',
    );

    const centeringRaw = psaRoot?.centering || psaRoot?.center || {};
    const cornersRaw = psaRoot?.corners || psaRoot?.corner || {};
    const edgesRaw = psaRoot?.edges || psaRoot?.edge || {};
    const surfaceRaw = psaRoot?.surface || {};

    const estimatedGrade = this.normalizeEstimatedGrade(
      psaRoot?.estimatedGrade ??
        psaRoot?.estimated_grade ??
        psaRoot?.estimatedGradeRange ??
        psaRoot?.gradeRange ??
        psaRoot?.grade ??
        raw?.estimatedGrade ??
        raw?.estimated_grade,
    );

    const rawPrice =
      psaRoot?.rawPrice ??
      psaRoot?.raw_price ??
      psaRoot?.raw ??
      psaRoot?.raw_value ??
      raw?.rawPrice ??
      '$0';

    const gradedPricesCandidate =
      psaRoot?.gradedPrices ??
      psaRoot?.graded_prices ??
      psaRoot?.prices ??
      raw?.gradedPrices ??
      {};

    const gradedPrices: Record<string, string> = {};
    if (gradedPricesCandidate && typeof gradedPricesCandidate === 'object') {
      for (const [k, v] of Object.entries(gradedPricesCandidate)) {
        if (v !== null && v !== undefined) gradedPrices[String(k)] = String(v);
      }
    }

    return {
      centering: {
        score: this.parseBoundedNumber(
          centeringRaw?.score ?? centeringFromCollection.score,
          0,
          0,
          10,
        ),
        top: this.parseBoundedNumber(centeringRaw?.top, 50, 0, 100),
        bottom: this.parseBoundedNumber(centeringRaw?.bottom, 50, 0, 100),
        left: this.parseBoundedNumber(centeringRaw?.left, 50, 0, 100),
        right: this.parseBoundedNumber(centeringRaw?.right, 50, 0, 100),
        description: String(
          centeringRaw?.description ??
            centeringFromCollection.description ??
            '',
        ),
      },
      corners: {
        score: this.parseBoundedNumber(
          cornersRaw?.score ?? cornersFromCollection.score,
          0,
          0,
          10,
        ),
        description: String(
          cornersRaw?.description ?? cornersFromCollection.description ?? '',
        ),
      },
      edges: {
        score: this.parseBoundedNumber(
          edgesRaw?.score ?? edgesFromCollection.score,
          0,
          0,
          10,
        ),
        description: String(
          edgesRaw?.description ?? edgesFromCollection.description ?? '',
        ),
      },
      surface: {
        score: this.parseBoundedNumber(
          surfaceRaw?.score ?? surfaceFromCollection.score,
          0,
          0,
          10,
        ),
        description: String(
          surfaceRaw?.description ?? surfaceFromCollection.description ?? '',
        ),
      },
      estimatedGrade,
      rawPrice: String(rawPrice),
      gradedPrices,
      notes: String(psaRoot?.notes ?? raw?.notes ?? ''),
    };
  }

  private inferEstimatedGradeFromSubgrades(psaAnalysis: any): string {
    const scores = [
      psaAnalysis?.centering?.score,
      psaAnalysis?.corners?.score,
      psaAnalysis?.edges?.score,
      psaAnalysis?.surface?.score,
    ]
      .map((s) => this.parseBoundedNumber(s, 0, 0, 10))
      .filter((s) => s > 0);

    if (!scores.length) return '';

    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    if (avg >= 9.2) return '9-10';
    if (avg >= 8.2) return '8-9';
    if (avg >= 7.2) return '7-8';
    if (avg >= 6.2) return '6-7';

    const base = Math.max(1, Math.min(10, Math.floor(avg)));
    const next = Math.min(10, base + 1);
    return `${base}-${next}`;
  }

  private findLowestSubgrade(psaAnalysis: any): {
    name: string;
    score: number;
    description: string;
  } {
    const allScores: Array<{
      name: string;
      score: number;
      description: string;
    }> = [
      {
        name: 'Centering',
        score: psaAnalysis?.centering?.score ?? 0,
        description: psaAnalysis?.centering?.description || '',
      },
      {
        name: 'Corners',
        score: psaAnalysis?.corners?.score ?? 0,
        description: psaAnalysis?.corners?.description || '',
      },
      {
        name: 'Edges',
        score: psaAnalysis?.edges?.score ?? 0,
        description: psaAnalysis?.edges?.description || '',
      },
      {
        name: 'Surface',
        score: psaAnalysis?.surface?.score ?? 0,
        description: psaAnalysis?.surface?.description || '',
      },
    ].filter((s) => s.score > 0);

    allScores.sort((a, b) => a.score - b.score);
    return allScores[0] || { name: 'Unknown', score: 0, description: '' };
  }

  private checkCenteringPass(
    psaAnalysis: any,
    language?: string,
  ): { pass: boolean; detail: string } {
    const c = psaAnalysis?.centering;
    if (!c)
      return {
        pass: false,
        detail: this.t('centering_not_available', language),
      };
    const { top = 50, bottom = 50, left = 50, right = 50 } = c;
    const scoreOk = (c.score ?? 0) >= 7;
    const allBalanced = Math.min(top, bottom, left, right) >= 45;
    const allReasonable = Math.max(top, bottom, left, right) <= 55;

    if (allBalanced && allReasonable) {
      return {
        pass: true,
        detail: this.t('centering_balanced', language, {
          top,
          bottom,
          left,
          right,
        }),
      };
    } else if (scoreOk) {
      return {
        pass: true,
        detail: this.t('centering_acceptable', language, {
          top,
          bottom,
          left,
          right,
        }),
      };
    }
    return {
      pass: false,
      detail: this.t('centering_off', language, { top, bottom, left, right }),
    };
  }

  private t(key: string, lang?: string, vars?: Record<string, any>): string {
    const isVi = lang === 'vi';
    const map: Record<string, Record<string, string>> = {
      centering_not_available: {
        en: 'Centering not available',
        vi: 'Không có dữ liệu căn lề',
      },
      centering_balanced: {
        en: 'Well-balanced: top {top}% | bot {bottom}% | left {left}% | right {right}%',
        vi: 'Căn lề tốt: trên {top}% | dưới {bottom}% | trái {left}% | phải {right}%',
      },
      centering_acceptable: {
        en: 'Acceptable centering: top {top}% | bot {bottom}% | left {left}% | right {right}%',
        vi: 'Căn lề chấp nhận được: trên {top}% | dưới {bottom}% | trái {left}% | phải {right}%',
      },
      centering_off: {
        en: 'Off-center: top {top}% | bot {bottom}% | left {left}% | right {right}%',
        vi: 'Lệch tâm: trên {top}% | dưới {bottom}% | trái {left}% | phải {right}%',
      },
      lowest_subgrade: {
        en: 'Lowest subgrade = {name} ({score}) — {desc}',
        vi: 'Điểm thấp nhất = {name} ({score}) — {desc}',
      },
      worth_grading: {
        en: 'Worth grading — Likely PSA {grade}+',
        vi: 'Đáng giá — Có thể đạt PSA {grade}+',
      },
      not_worth_grading: {
        en: 'May not be worth grading',
        vi: 'Có thể không đáng giá',
      },
      notes_worth_grading: {
        en: "The card's estimated grade combined with its market value makes it a strong candidate for professional grading.",
        vi: 'Thẻ có điểm ước tính kết hợp giá trị thị trường là ứng viên tốt để mang đi chấm điểm chuyên nghiệp.',
      },
      notes_not_worth_grading: {
        en: "The estimated grade is relatively low; consider selling raw or upgrading the card's condition before grading.",
        vi: 'Điểm ước tính khá thấp; nên bán thẻ nguyên bản hoặc cải thiện tình trạng trước khi chấm điểm.',
      },
    };

    const lang2 = isVi ? 'vi' : 'en';
    let text = map[key]?.[lang2] || map[key]?.['en'] || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return text;
  }

  private async fetchGradedPricesFromTcgplayer(
    cardName: string,
    seriesExpansion: string,
    rawPriceHint: string,
  ): Promise<{
    raw: string;
    gradedPrices: Record<string, string>;
    comparePrices: Array<{
      source: string;
      raw: string;
      gradedPrices: Record<string, string>;
      link: string;
    }>;
  }> {
    const query = [cardName, seriesExpansion].filter(Boolean).join(' ').trim();
    if (!query)
      return this.defaultGradedPrices(rawPriceHint, cardName, seriesExpansion);

    try {
      // Align with scan-card pipeline: use scrapeTcgplayerCardData as primary pricing source
      const scanStylePricing = await this.scrapeTcgplayerCardData(
        cardName,
        seriesExpansion,
        '',
        '',
      );

      const tcgRawPrice = this.parsePriceNumber(
        scanStylePricing?.currentPrice,
        0,
      );
      const buyLinks = Array.isArray(scanStylePricing?.buyLink)
        ? scanStylePricing.buyLink
        : [];
      const tcgBuyLink = buyLinks.find(
        (item: any) => String(item?.Shop || '').toLowerCase() === 'tcgplayer',
      )?.link;

      const tcgDetailUrl =
        this.normalizeUrl(scanStylePricing?.priceLink) ||
        this.normalizeUrl(tcgBuyLink) ||
        '';

      const basePrice =
        tcgRawPrice > 0 ? tcgRawPrice : this.parsePriceNumber(rawPriceHint, 50);

      let tcgPrices: Record<string, string> = {
        Raw: this.formatUsd(basePrice),
      };

      if (tcgDetailUrl) {
        const detailPage = await this.fetchTcgplayerHtmlWithFallback(
          tcgDetailUrl,
          'detail',
        );
        tcgPrices = this.extractGradedPricesFromTcgplayerHtml(
          detailPage.html,
          basePrice,
        );
      }

      const cmPrices = await this.fetchCardmarketGradedPrices(
        cardName,
        seriesExpansion,
      );

      const tcgCompareLink =
        tcgDetailUrl ||
        `${TCGPLAYER_BASE_URL}/search/pokemon/product?q=${encodeURIComponent(query)}&view=grid&ProductTypeName=Cards`;

      const comparePrices: Array<{
        source: string;
        raw: string;
        gradedPrices: Record<string, string>;
        link: string;
      }> = [];
      if (Object.keys(tcgPrices).length > 0) {
        comparePrices.push({
          source: 'TCGPlayer',
          raw: tcgPrices['Raw'] || this.formatUsd(basePrice),
          gradedPrices: tcgPrices,
          link: tcgCompareLink,
        });
      }
      if (cmPrices.raw) {
        comparePrices.push({
          source: 'Cardmarket',
          raw: cmPrices.raw,
          gradedPrices: {
            'PSA 8': cmPrices.psa8,
            'PSA 9': cmPrices.psa9,
            'PSA 10': cmPrices.psa10,
          },
          link: cmPrices.link,
        });
      }
      if (cardName) {
        comparePrices.push({
          source: 'eBay',
          raw: this.formatUsd(basePrice),
          gradedPrices: {
            'PSA 8': this.formatUsd(basePrice * 1.15),
            'PSA 9': this.formatUsd(basePrice * 1.35),
            'PSA 10': this.formatUsd(basePrice * 1.6),
          },
          link: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(cardName + ' PSA')}&LH_BIN=1`,
        });
      }

      return {
        raw: tcgPrices['Raw'] || this.formatUsd(basePrice),
        gradedPrices: tcgPrices,
        comparePrices,
      };
    } catch (error) {
      this.logger.warn(
        `Fetch graded prices failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.defaultGradedPrices(rawPriceHint, cardName, seriesExpansion);
    }
  }

  private extractGradedPricesFromTcgplayerHtml(
    html: string,
    basePrice: number,
  ): Record<string, string> {
    const $ = cheerio.load(html);
    const bodyText = $('body').text();

    const result: Record<string, string> = {};

    // Try to scrape all PSA grades 1-10 plus Raw/Ungraded
    const gradeLabels = [
      'PSA 10',
      'PSA 9',
      'PSA 8',
      'PSA 7',
      'PSA 6',
      'PSA 5',
      'PSA 4',
      'PSA 3',
      'PSA 2',
      'PSA 1',
      'Raw',
      'Ungraded',
      'LOOSE',
    ];
    for (const label of gradeLabels) {
      const escaped = label.replace(/\s/g, '\\s*');
      const re = new RegExp(`${escaped}[:\\s]*[$€][\\d,]+\\.?\\d*`, 'i');
      const m = bodyText.match(re);
      if (m) result[label] = this.extractPriceFromText(m[0]);
    }

    // Try generic "PSA N" pattern for any grade 1-10 not yet captured
    for (let grade = 1; grade <= 10; grade++) {
      const key = `PSA ${grade}`;
      if (result[key]) continue;
      const re = new RegExp(`PSA\\s*${grade}[:\\s]*[$€][\\d,]+\\.?\\d*`, 'i');
      const m = bodyText.match(re);
      if (m) result[key] = this.extractPriceFromText(m[0]);
    }

    // Raw fallback
    if (!result['Raw'] && !result['Ungraded']) {
      const rawMatch = bodyText.match(
        /(?:Raw|Ungraded|LOOSE)[:\s]*[$€][\d,]+\.?\d*/i,
      );
      if (rawMatch) result['Raw'] = this.extractPriceFromText(rawMatch[0]);
    }

    // If no prices found at all, use default multipliers from basePrice
    if (Object.keys(result).length === 0) {
      const multipliers: Record<string, number> = {
        'PSA 10': 1.6,
        'PSA 9': 1.35,
        'PSA 8': 1.15,
      };
      for (const [key, mult] of Object.entries(multipliers)) {
        result[key] = this.formatUsd(basePrice * mult);
      }
    }

    // Always ensure Raw exists
    if (!result['Raw']) {
      result['Raw'] = this.formatUsd(basePrice);
    }

    return result;
  }

  private async fetchCardmarketGradedPrices(
    cardName: string,
    seriesExpansion: string,
  ): Promise<{
    raw: string;
    psa8: string;
    psa9: string;
    psa10: string;
    link: string;
  }> {
    const query = [cardName, seriesExpansion].filter(Boolean).join(' ').trim();
    if (!query) return { raw: '', psa8: '', psa9: '', psa10: '', link: '' };

    try {
      const link = `${CARDMARKET_BASE_URL}/en/Pokemon/Products/Search?searchString=${encodeURIComponent(query)}`;
      const playwright = await import('playwright');
      const browser = await playwright.chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: BROWSER_USER_AGENT,
      });
      const page = await context.newPage();
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      const pageText = await page.evaluate(() =>
        document.body.innerText.slice(0, 3000),
      );
      await context.close();
      await browser.close();

      const psa10Match = pageText.match(/PSA\s*10[:\s]*[€][\d,]+\.?\d*/i);
      const psa9Match = pageText.match(/PSA\s*9[:\s]*[€][\d,]+\.?\d*/i);
      const psa8Match = pageText.match(/PSA\s*8[:\s]*[€][\d,]+\.?\d*/i);
      const rawMatch = pageText.match(/(?:Raw|Ungraded)[:\s]*[€][\d,]+\.?\d*/i);

      const parseEuro = (text: string) => {
        const m = text.match(/[€][\d,]+\.?\d*/);
        return m
          ? `€${parseFloat(m[0].replace('€', '').replace(',', '.')).toFixed(2)}`
          : '';
      };

      return {
        raw: rawMatch ? parseEuro(rawMatch[0]) : '',
        psa8: psa8Match ? parseEuro(psa8Match[0]) : '',
        psa9: psa9Match ? parseEuro(psa9Match[0]) : '',
        psa10: psa10Match ? parseEuro(psa10Match[0]) : '',
        link,
      };
    } catch {
      return { raw: '', psa8: '', psa9: '', psa10: '', link: '' };
    }
  }

  private defaultGradedPrices(
    rawPriceHint: string,
    cardName?: string,
    seriesExpansion?: string,
  ): {
    raw: string;
    gradedPrices: Record<string, string>;
    comparePrices: Array<{
      source: string;
      raw: string;
      gradedPrices: Record<string, string>;
      link: string;
    }>;
  } {
    const basePrice = this.parsePriceNumber(rawPriceHint, 50);
    const defaultGrades: Record<string, string> = {
      'PSA 8': this.formatUsd(basePrice * 1.15),
      'PSA 9': this.formatUsd(basePrice * 1.35),
      'PSA 10': this.formatUsd(basePrice * 1.6),
    };

    const query = [cardName, seriesExpansion].filter(Boolean).join(' ').trim();
    const comparePrices: Array<{
      source: string;
      raw: string;
      gradedPrices: Record<string, string>;
      link: string;
    }> = [];

    if (query) {
      comparePrices.push({
        source: 'TCGPlayer',
        raw: this.formatUsd(basePrice),
        gradedPrices: { ...defaultGrades },
        link: `${TCGPLAYER_BASE_URL}/search/pokemon/product?q=${encodeURIComponent(query)}&view=grid&ProductTypeName=Cards`,
      });
      comparePrices.push({
        source: 'Cardmarket',
        raw: this.formatUsd(basePrice),
        gradedPrices: { ...defaultGrades },
        link: `${CARDMARKET_BASE_URL}/en/Pokemon/Products/Search?searchString=${encodeURIComponent(query)}`,
      });
    }

    if (cardName) {
      comparePrices.push({
        source: 'eBay',
        raw: this.formatUsd(basePrice),
        gradedPrices: { ...defaultGrades },
        link: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(cardName + ' PSA')}&LH_BIN=1`,
      });
    }

    return {
      raw: this.formatUsd(basePrice),
      gradedPrices: defaultGrades,
      comparePrices,
    };
  }

  private extractPriceFromText(text: string): string {
    const m = text.match(/[$€][\d,]+\.?\d*/);
    return m ? m[0].trim() : '';
  }

  private buildPsaGradingResponse(
    psaAnalysis: any,
    lowestSubgrade: { name: string; score: number; description: string },
    centeringPass: { pass: boolean; detail: string },
    gradedPrices: any,
    cardName: string,
    seriesExpansion: string,
    language?: string,
    cardNameEn?: string,
    seriesExpansionEn?: string,
  ): any {
    const isVi = language === 'vi';

    // Parse estimated grade range
    const gradeStr = psaAnalysis.estimatedGrade || '?';
    const gradeParts = gradeStr
      .split('-')
      .map((s: string) => parseInt(s.trim()));
    const fromGrade = Math.max(1, Math.min(10, gradeParts[0] || 8));
    const toGrade = Math.max(
      fromGrade,
      Math.min(10, gradeParts[1] || fromGrade),
    );
    // target = floor of average of range (so "9-10" → 9)
    const targetGrade = Math.floor((fromGrade + toGrade) / 2);

    // Calculate confidence from subgrades
    const sub = {
      centering: psaAnalysis.centering?.score ?? 0,
      corners: psaAnalysis.corners?.score ?? 0,
      edges: psaAnalysis.edges?.score ?? 0,
      surface: psaAnalysis.surface?.score ?? 0,
    };
    const avgScore =
      (sub.centering + sub.corners + sub.edges + sub.surface) / 4;
    const spread =
      Math.max(...Object.values(sub)) - Math.min(...Object.values(sub));
    const confidence = Math.round(
      Math.max(60, Math.min(97, avgScore * 9.5 - spread * 8)),
    );

    // Parse prices
    const scrapedGrades: Record<string, string> =
      gradedPrices.gradedPrices || {};
    const rawPriceNum =
      this.parsePriceNumber(gradedPrices.raw, 0) ||
      this.parsePriceNumber(
        scrapedGrades['Raw'] || scrapedGrades['Ungraded'],
        0,
      ) ||
      50;

    // Dynamic grade list: range grades + one above
    // e.g. "7-8" → [7, 8, 9],  "9-10" → [8, 9, 10]
    const allGradesInWindow = [fromGrade, toGrade];

    // Product requirement: estimated 9-10 must still include PSA 8 for comparison.
    if (fromGrade === 9 && toGrade === 10) {
      allGradesInWindow.push(8);
    } else if (toGrade < 10) {
      allGradesInWindow.push(toGrade + 1);
    }

    const uniqueGrades = Array.from(new Set(allGradesInWindow)).sort(
      (a, b) => a - b,
    );

    // Dynamic multiplier: higher raw price = bigger PSA 9/10 premium
    // Raw < $20  → mild premium:  PSA 8=×1.15 / PSA 9=×1.35 / PSA 10=×1.70
    // Raw $20-100 → moderate:    PSA 8=×1.12 / PSA 9=×1.40 / PSA 10=×1.90
    // Raw > $100 → strong:       PSA 8=×1.08 / PSA 9=×1.55 / PSA 10=×2.50
    // PSA 7 and below: roughly ×0.95-1.05 of raw (not worth much more)
    const getMultiplier = (grade: number): number => {
      if (grade <= 5) return 1.0;
      if (grade === 6) return rawPriceNum < 20 ? 1.0 : 1.02;
      if (grade === 7)
        return rawPriceNum < 20 ? 1.05 : rawPriceNum < 100 ? 1.08 : 1.12;
      if (grade === 8)
        return rawPriceNum < 20 ? 1.15 : rawPriceNum < 100 ? 1.12 : 1.08;
      if (grade === 9)
        return rawPriceNum < 20 ? 1.35 : rawPriceNum < 100 ? 1.4 : 1.55;
      if (grade === 10)
        return rawPriceNum < 20 ? 1.7 : rawPriceNum < 100 ? 1.9 : 2.5;
      return 1 + (grade - 5) * 0.05;
    };

    const priceByGrade: any[] = uniqueGrades.map((grade) => {
      const label = `PSA ${grade}`;
      const scrapedPrice = scrapedGrades[label];
      const mult = getMultiplier(grade);
      const gradePriceNum = scrapedPrice
        ? this.parsePriceNumber(scrapedPrice, rawPriceNum * mult)
        : rawPriceNum * mult;
      return {
        grade,
        label,
        price: Math.round(gradePriceNum * 100) / 100,
        priceIncrease: Math.round((gradePriceNum - rawPriceNum) * 100) / 100,
        ...(grade === targetGrade ? { isEstimatedGrade: true } : {}),
      };
    });

    // Translate lowestSubgrade description
    const subgradeLabels: Record<string, string> = {
      Centering: isVi ? 'Căn lề' : 'Centering',
      Corners: isVi ? 'Góc' : 'Corners',
      Edges: isVi ? 'Cạnh' : 'Edges',
      Surface: isVi ? 'Bề mặt' : 'Surface',
    };
    const subLabel = subgradeLabels[lowestSubgrade.name] || lowestSubgrade.name;
    const description =
      lowestSubgrade.name !== 'Unknown'
        ? this.t('lowest_subgrade', language, {
            name: subLabel,
            score: lowestSubgrade.score.toFixed(1),
            desc: lowestSubgrade.description,
          })
        : '';

    // Worth grading note
    const worthGrading = targetGrade >= 8 && rawPriceNum > 5;
    const notes =
      psaAnalysis.notes ||
      (worthGrading
        ? this.t('notes_worth_grading', language)
        : this.t('notes_not_worth_grading', language));

    const normalizeCenteringPair = (
      first: unknown,
      second: unknown,
    ): [number, number] => {
      const firstNum = this.parseBoundedNumber(first, 50, 0, 100);
      const secondNum = this.parseBoundedNumber(second, 50, 0, 100);

      const total = firstNum + secondNum;
      if (total <= 0) {
        return [50, 50];
      }

      let normalizedFirst = Math.round((firstNum / total) * 100);
      normalizedFirst = Math.max(0, Math.min(100, normalizedFirst));
      let normalizedSecond = 100 - normalizedFirst;

      if (normalizedSecond < 0) {
        normalizedSecond = 0;
        normalizedFirst = 100;
      }

      return [normalizedFirst, normalizedSecond];
    };

    const [top, bottom] = normalizeCenteringPair(
      psaAnalysis.centering?.top,
      psaAnalysis.centering?.bottom,
    );
    const [left, right] = normalizeCenteringPair(
      psaAnalysis.centering?.left,
      psaAnalysis.centering?.right,
    );

    // Compare prices
    let comparePrices = (gradedPrices.comparePrices || []).map((p: any) => ({
      source: p.source,
      link: p.link,
    }));

    if (!comparePrices.length) {
      const fallbackQuery = [
        cardNameEn || cardName,
        seriesExpansionEn || seriesExpansion,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      if (fallbackQuery) {
        comparePrices = [
          {
            source: 'TCGPlayer',
            link: `${TCGPLAYER_BASE_URL}/search/pokemon/product?q=${encodeURIComponent(fallbackQuery)}&view=grid&ProductTypeName=Cards`,
          },
          {
            source: 'Cardmarket',
            link: `${CARDMARKET_BASE_URL}/en/Pokemon/Products/Search?searchString=${encodeURIComponent(fallbackQuery)}`,
          },
          {
            source: 'eBay',
            link: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent((cardNameEn || cardName) + ' PSA')}&LH_BIN=1`,
          },
        ];
      }
    }

    return {
      name: cardName,
      nameEn: cardNameEn || cardName,
      seriesExpansion,
      seriesExpansionEn: seriesExpansionEn || seriesExpansion,
      estimatedGrade: gradeStr,
      confidence,
      subgrades: {
        centering: Math.round((sub.centering || 0) * 10) / 10,
        corners: Math.round((sub.corners || 0) * 10) / 10,
        edges: Math.round((sub.edges || 0) * 10) / 10,
        surface: Math.round((sub.surface || 0) * 10) / 10,
      },
      description,
      centering: {
        top,
        bottom,
        left,
        right,
        t_b: centeringPass.pass,
        l_r: centeringPass.pass,
      },
      gradedPrices: {
        currency: 'USD',
        rawPrice: Math.round(rawPriceNum * 100) / 100,
        gradeWindow: { from: fromGrade, target: targetGrade, to: toGrade },
        priceByGrade,
      },
      comparePrices,
      notes,
    };
  }
}
