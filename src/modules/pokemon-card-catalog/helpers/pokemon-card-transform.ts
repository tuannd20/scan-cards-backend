import {
  energyImageToName,
  isEnergyImageUrl,
} from '../../../utils/energy-helper';

export interface RawPokemonCard {
  _id?: string;
  href?: string;
  name?: string;
  image?: string;
  hp?: string | number;
  type?: string[];
  attacks?: Array<{
    _id?: string;
    name?: string;
    damage?: string;
    description?: string;
    energy?: string[];
  }>;
  weakness?: string;
  resistance?: string;
  retreatCost?: string | number;
  expansion?: string;
  cardNumber?: string;
  rarity?: string;
  illustrator?: string;
  regulationMark?: string;
  cardFormat?: string;
  price?: string | number;
  evolutionStatus?: string;
  description?: string;
  tcgplayerProductId?: number;
  tcgplayerMatchedName?: string;
  tcgplayerMatchedSet?: string;
  tcgplayerMatchedNumber?: string;
  tcgplayerUrl?: string;
  priceHistory1Y?: {
    range?: string;
    variant?: string;
    fetchedAt?: string;
    points?: Array<{
      date?: string;
      marketPrice?: number;
      averageSalesPrice?: number;
      quantity?: number;
      variant?: string;
    }>;
  };
}

export interface MappedPokemonCard {
  sourceId?: string;
  collectorPath?: string;
  cardName?: string;
  imageUrl?: string;
  hitPoints?: number;
  typeImageUrls?: string[];
  typeNames?: string[];
  attacks?: Array<{
    attackName?: string;
    damage?: string;
    effectText?: string;
    energyCostUrls?: string[];
    energyCostTypes?: string[];
  }>;
  weaknessImageUrl?: string;
  weaknessType?: string;
  resistanceImageUrl?: string;
  resistanceType?: string;
  retreatCost?: number;
  setName?: string;
  cardNumber?: string;
  rarity?: string;
  illustrator?: string;
  regulationMark?: string;
  edition?: string;
  marketPrice?: number;
  evolutionStage?: string;
  evolvesFrom?: string;
  cardDescription?: string;
  tcgplayerProductId?: number;
  tcgplayerCardName?: string;
  tcgplayerSetName?: string;
  tcgplayerCardNumber?: string;
  tcgplayerUrl?: string;
  priceHistory?: {
    period?: string;
    variant?: string;
    lastFetchedAt?: string;
    snapshots?: Array<{
      recordedDate?: string;
      marketPrice?: number;
      averageSalePrice?: number;
      salesCount?: number;
      variant?: string;
    }>;
  };
}

export function parseNumericValue(
  value: string | number | null | undefined,
): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveEnergyName(value?: string): string | undefined {
  if (!value) return undefined;
  return isEnergyImageUrl(value) ? energyImageToName(value) : value;
}

export function resolveEnergyNames(values?: string[]): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => resolveEnergyName(value))
    .filter((value): value is string => Boolean(value));
}

export function parseEvolutionStatus(value?: string): {
  evolutionStage?: string;
  evolvesFrom?: string;
} {
  if (!value) return {};

  const parts = value
    .split('\n')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return {};
  if (parts.length === 1) return { evolutionStage: parts[0] };

  return {
    evolutionStage: parts[0],
    evolvesFrom: parts.slice(1).join(' '),
  };
}

export function mapPokemonRecord(raw: RawPokemonCard): MappedPokemonCard {
  const typeImageUrls = Array.isArray(raw.type) ? raw.type : [];
  const evolution = parseEvolutionStatus(raw.evolutionStatus);

  return {
    sourceId: raw._id,
    collectorPath: raw.href,
    cardName: raw.name,
    imageUrl: raw.image,
    hitPoints: parseNumericValue(raw.hp),
    typeImageUrls,
    typeNames: resolveEnergyNames(typeImageUrls),
    attacks: Array.isArray(raw.attacks)
      ? raw.attacks.map((attack) => ({
          attackName: attack.name,
          damage: attack.damage,
          effectText: attack.description,
          energyCostUrls: attack.energy,
          energyCostTypes: resolveEnergyNames(attack.energy),
        }))
      : [],
    weaknessImageUrl: raw.weakness,
    weaknessType: resolveEnergyName(raw.weakness),
    resistanceImageUrl: raw.resistance,
    resistanceType: resolveEnergyName(raw.resistance),
    retreatCost: parseNumericValue(raw.retreatCost),
    setName: raw.expansion,
    cardNumber: raw.cardNumber,
    rarity: raw.rarity,
    illustrator: raw.illustrator,
    regulationMark: raw.regulationMark,
    edition: raw.cardFormat,
    marketPrice: parseNumericValue(raw.price),
    evolutionStage: evolution.evolutionStage,
    evolvesFrom: evolution.evolvesFrom,
    cardDescription: raw.description,
    tcgplayerProductId: raw.tcgplayerProductId,
    tcgplayerCardName: raw.tcgplayerMatchedName,
    tcgplayerSetName: raw.tcgplayerMatchedSet,
    tcgplayerCardNumber: raw.tcgplayerMatchedNumber,
    tcgplayerUrl: raw.tcgplayerUrl,
    priceHistory: raw.priceHistory1Y
      ? {
          period: raw.priceHistory1Y.range,
          variant: raw.priceHistory1Y.variant,
          lastFetchedAt: raw.priceHistory1Y.fetchedAt,
          snapshots: Array.isArray(raw.priceHistory1Y.points)
            ? raw.priceHistory1Y.points.map((point) => ({
                recordedDate: point.date,
                marketPrice: point.marketPrice,
                averageSalePrice: point.averageSalesPrice,
                salesCount: point.quantity,
                variant: point.variant,
              }))
            : [],
        }
      : undefined,
  };
}

export function toLegacyCardResponse(
  doc: MappedPokemonCard & { _id?: unknown },
): Record<string, unknown> {
  const evolutionStatus =
    doc.evolutionStage && doc.evolvesFrom
      ? `${doc.evolutionStage}\n                    ${doc.evolvesFrom}`
      : doc.evolutionStage;

  return {
    _id: doc._id ? String(doc._id) : doc.sourceId,
    href: doc.collectorPath,
    name: doc.cardName,
    image: doc.imageUrl,
    hp: doc.hitPoints != null ? String(doc.hitPoints) : undefined,
    type: doc.typeImageUrls,
    attacks: (doc.attacks || []).map((attack) => ({
      name: attack.attackName,
      damage: attack.damage,
      description: attack.effectText,
      energy: attack.energyCostUrls,
    })),
    weakness: doc.weaknessImageUrl,
    resistance: doc.resistanceImageUrl,
    retreatCost: doc.retreatCost != null ? String(doc.retreatCost) : undefined,
    expansion: doc.setName,
    cardNumber: doc.cardNumber,
    rarity: doc.rarity,
    illustrator: doc.illustrator,
    regulationMark: doc.regulationMark,
    cardFormat: doc.edition,
    price: doc.marketPrice != null ? String(doc.marketPrice) : undefined,
    evolutionStatus,
    description: doc.cardDescription,
    tcgplayerProductId: doc.tcgplayerProductId,
    tcgplayerMatchedName: doc.tcgplayerCardName,
    tcgplayerMatchedSet: doc.tcgplayerSetName,
    tcgplayerMatchedNumber: doc.tcgplayerCardNumber,
    tcgplayerUrl: doc.tcgplayerUrl,
    priceHistory1Y: doc.priceHistory
      ? {
          range: doc.priceHistory.period,
          variant: doc.priceHistory.variant,
          fetchedAt: doc.priceHistory.lastFetchedAt,
          points: (doc.priceHistory.snapshots || []).map((point) => ({
            date: point.recordedDate,
            marketPrice: point.marketPrice,
            averageSalesPrice: point.averageSalePrice,
            quantity: point.salesCount,
            variant: point.variant,
          })),
        }
      : undefined,
  };
}
