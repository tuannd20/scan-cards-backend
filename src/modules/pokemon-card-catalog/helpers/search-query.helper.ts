export type PokemonSearchSort =
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc';

export type PokemonPriceRange =
  | 'under_10'
  | '10_50'
  | '50_100'
  | 'over_100';

export interface PokemonSearchQueryOptions {
  sort: PokemonSearchSort;
  category?: string[];
  priceMin?: number;
  priceMax?: number;
}

const VALID_SORTS: PokemonSearchSort[] = [
  'price_asc',
  'price_desc',
  'name_asc',
  'name_desc',
];

const PRICE_RANGE_MAP: Record<
  PokemonPriceRange,
  { priceMin?: number; priceMax?: number }
> = {
  under_10: { priceMax: 10 },
  '10_50': { priceMin: 10, priceMax: 50 },
  '50_100': { priceMin: 50, priceMax: 100 },
  over_100: { priceMin: 100 },
};

export function normalizeSearchSort(value: unknown): PokemonSearchSort {
  const normalized = String(value || 'name_asc').toLowerCase();
  if (VALID_SORTS.includes(normalized as PokemonSearchSort)) {
    return normalized as PokemonSearchSort;
  }
  return 'name_asc';
}

export function normalizeStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];
  const cleaned = values
    .map((item) => String(item).trim())
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : undefined;
}

export function normalizePriceValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function normalizePriceRange(value: unknown): PokemonPriceRange | undefined {
  const normalized = String(value || '').toLowerCase();
  if (normalized in PRICE_RANGE_MAP) {
    return normalized as PokemonPriceRange;
  }
  return undefined;
}

export function buildPokemonSearchQueryOptions(input: {
  sort?: unknown;
  category?: unknown;
  expansion?: unknown;
  setName?: unknown;
  priceMin?: unknown;
  priceMax?: unknown;
  priceRange?: unknown;
}): PokemonSearchQueryOptions {
  const priceRange = normalizePriceRange(input.priceRange);
  const rangeBounds = priceRange ? PRICE_RANGE_MAP[priceRange] : {};

  const priceMin =
    normalizePriceValue(input.priceMin) ?? rangeBounds.priceMin;
  const priceMax =
    normalizePriceValue(input.priceMax) ?? rangeBounds.priceMax;

  return {
    sort: normalizeSearchSort(input.sort),
    category:
      normalizeStringArray(input.category) ??
      normalizeStringArray(input.expansion) ??
      normalizeStringArray(input.setName),
    priceMin,
    priceMax,
  };
}

export function buildMongoSort(
  sort: PokemonSearchSort,
): Record<string, 1 | -1> {
  switch (sort) {
    case 'price_asc':
      return { marketPrice: 1, cardName: 1 };
    case 'price_desc':
      return { marketPrice: -1, cardName: 1 };
    case 'name_desc':
      return { cardName: -1 };
    case 'name_asc':
    default:
      return { cardName: 1 };
  }
}

export function compareSportCards(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  sort: PokemonSearchSort,
): number {
  const leftName = String(left.playerName || left.name || '').toLowerCase();
  const rightName = String(right.playerName || right.name || '').toLowerCase();
  const leftPrice = parseFloat(String(left.price || 0)) || 0;
  const rightPrice = parseFloat(String(right.price || 0)) || 0;

  switch (sort) {
    case 'price_asc':
      return leftPrice - rightPrice || leftName.localeCompare(rightName);
    case 'price_desc':
      return rightPrice - leftPrice || leftName.localeCompare(rightName);
    case 'name_desc':
      return rightName.localeCompare(leftName);
    case 'name_asc':
    default:
      return leftName.localeCompare(rightName);
  }
}

export function matchesSportCategory(
  card: Record<string, unknown>,
  categories?: string[],
): boolean {
  if (!categories?.length) return true;

  const series = String(
    card.set_name || card.series || card.setName || '',
  ).toLowerCase();

  return categories.some((category) =>
    series.includes(category.toLowerCase()),
  );
}

export function matchesSportPriceRange(
  card: Record<string, unknown>,
  priceMin?: number,
  priceMax?: number,
): boolean {
  const price = parseFloat(String(card.price || 0)) || 0;

  if (priceMin !== undefined && price < priceMin) {
    return false;
  }

  if (priceMax !== undefined && price > priceMax) {
    return false;
  }

  return true;
}
