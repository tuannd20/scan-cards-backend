export type PriceMoverPeriod = 'today' | 'week' | 'month';
export type TrendingDirection = 'up' | 'down' | 'both';
export type TopMoverDirection = 'gainers' | 'losers';

export interface TrendingQueryOptions {
  period: PriceMoverPeriod;
  direction: TrendingDirection;
  minChangePercent: number;
  limit: number;
}

export interface TopMoversQueryOptions {
  period: PriceMoverPeriod;
  direction: TopMoverDirection;
  limit: number;
}

const MAX_LIMIT = 100;

export function normalizeLimit(value: unknown, defaultValue: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

export function normalizeMinChangePercent(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export function normalizePeriod(value: unknown, fallback: PriceMoverPeriod): PriceMoverPeriod {
  const normalized = String(value || fallback).toLowerCase();
  if (normalized === 'today' || normalized === 'week' || normalized === 'month') {
    return normalized;
  }
  return fallback;
}

export function normalizeTrendingDirection(
  value: unknown,
  fallback: TrendingDirection = 'both',
): TrendingDirection {
  const normalized = String(value || fallback).toLowerCase();
  if (normalized === 'up' || normalized === 'down' || normalized === 'both') {
    return normalized;
  }
  return fallback;
}

export function normalizeTopMoverDirection(
  value: unknown,
  fallback: TopMoverDirection = 'gainers',
): TopMoverDirection {
  const normalized = String(value || fallback).toLowerCase();
  if (normalized === 'gainers' || normalized === 'losers') {
    return normalized;
  }
  return fallback;
}

export function getPeriodStartDate(period: PriceMoverPeriod, now = new Date()): Date {
  const start = new Date(now);

  if (period === 'today') {
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  if (period === 'week') {
    start.setUTCDate(start.getUTCDate() - 7);
    return start;
  }

  start.setUTCDate(start.getUTCDate() - 30);
  return start;
}

export function getPeriodDayOffset(period: PriceMoverPeriod): number | null {
  if (period === 'today') return null;
  if (period === 'week') return 7;
  return 30;
}

export function buildTrendingQueryOptions(input: {
  period?: unknown;
  direction?: unknown;
  minChangePercent?: unknown;
  limit?: unknown;
}): TrendingQueryOptions {
  return {
    period: normalizePeriod(input.period, 'week'),
    direction: normalizeTrendingDirection(input.direction, 'both'),
    minChangePercent: normalizeMinChangePercent(input.minChangePercent),
    limit: normalizeLimit(input.limit, 20),
  };
}

export function buildTopMoversQueryOptions(input: {
  period?: unknown;
  direction?: unknown;
  limit?: unknown;
}): TopMoversQueryOptions {
  return {
    period: normalizePeriod(input.period, 'today'),
    direction: normalizeTopMoverDirection(input.direction, 'gainers'),
    limit: normalizeLimit(input.limit, 10),
  };
}

export interface PriceMoverItem {
  name: string;
  expansion: string;
  cardNumber: string;
  image: string;
  currentPrice: number;
  startPrice: number;
  changeValue: number;
  changePercent: number;
  period: PriceMoverPeriod;
  trend: 'up' | 'down';
}

export function mapPriceMoverItem(
  doc: {
    cardName?: string;
    setName?: string;
    cardNumber?: string;
    imageUrl?: string;
    currentPrice?: number;
    startPrice?: number;
    changeValue?: number;
    changePercent?: number;
  },
  period: PriceMoverPeriod,
): PriceMoverItem {
  const changePercent = Number(doc.changePercent ?? 0);
  return {
    name: doc.cardName || '',
    expansion: doc.setName || '',
    cardNumber: doc.cardNumber || '',
    image: doc.imageUrl || '',
    currentPrice: Number(doc.currentPrice ?? 0),
    startPrice: Number(doc.startPrice ?? 0),
    changeValue: Number(doc.changeValue ?? 0),
    changePercent,
    period,
    trend: changePercent >= 0 ? 'up' : 'down',
  };
}
