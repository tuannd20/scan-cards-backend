import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage } from 'mongoose';
import * as stringSimilarity from 'string-similarity';
import {
  PokemonCardCatalog,
  PokemonCardCatalogDocument,
} from './schemas/pokemon-card-catalog.schema';
import { toLegacyCardResponse } from './helpers/pokemon-card-transform';
import {
  getPeriodDayOffset,
  mapPriceMoverItem,
  PriceMoverItem,
  PriceMoverPeriod,
  TopMoversQueryOptions,
  TrendingQueryOptions,
} from './helpers/price-mover-query.helper';
import {
  buildMongoSort,
  PokemonSearchSort,
} from './helpers/search-query.helper';

export interface PokemonSearchFilters {
  type?: string[];
  weakness?: string[];
  resistance?: string[];
  rarity?: string[];
  category?: string[];
  priceMin?: number;
  priceMax?: number;
  sort?: PokemonSearchSort;
}

@Injectable()
export class PokemonCardCatalogService {
  constructor(
    @InjectModel(PokemonCardCatalog.name, 'cardScanner')
    private readonly pokemonCardModel: Model<PokemonCardCatalogDocument>,
  ) {}

  async countCards(): Promise<number> {
    return this.pokemonCardModel.countDocuments();
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.pokemonCardModel.find().skip(skip).limit(limit).lean().exec(),
      this.pokemonCardModel.countDocuments(),
    ]);

    return {
      data: docs.map((doc) => toLegacyCardResponse(doc)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async search(
    keyword: string,
    page: number,
    limit: number,
    filters?: PokemonSearchFilters,
  ) {
    const query = this.buildSearchQuery(keyword, filters);
    const sort = buildMongoSort(filters?.sort || 'name_asc');
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      this.pokemonCardModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.pokemonCardModel.countDocuments(query),
    ]);

    return {
      data: docs.map((doc) => toLegacyCardResponse(doc)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      sort: filters?.sort || 'name_asc',
    };
  }

  async autocomplete(search: string): Promise<string[]> {
    const searchLower = search.toLowerCase();
    const regex = new RegExp(this.escapeRegex(search), 'i');

    const [nameMatches, numberMatches] = await Promise.all([
      this.pokemonCardModel.distinct('cardName', { cardName: regex }),
      this.pokemonCardModel.distinct('cardNumber', { cardNumber: regex }),
    ]);

    const allSuggestions = [...nameMatches, ...numberMatches.filter(Boolean)];

    const sorted = allSuggestions
      .map((item) => ({
        item,
        score: stringSimilarity.compareTwoStrings(
          searchLower,
          item.toLowerCase(),
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item)
      .slice(0, 10);

    return [...new Set(sorted)];
  }

  async getTrendingCards(options: TrendingQueryOptions): Promise<PriceMoverItem[]> {
    const pipeline = this.buildPriceMoverPipeline(options.period);

    if (options.direction === 'up') {
      pipeline.push({ $match: { changePercent: { $gt: 0 } } });
    } else if (options.direction === 'down') {
      pipeline.push({ $match: { changePercent: { $lt: 0 } } });
    }

    if (options.minChangePercent > 0) {
      pipeline.push({
        $match: { absChangePercent: { $gte: options.minChangePercent } },
      });
    }

    pipeline.push({ $sort: { absChangePercent: -1 } }, { $limit: options.limit });

    const docs = await this.pokemonCardModel.aggregate(pipeline).exec();
    return docs.map((doc) => mapPriceMoverItem(doc, options.period));
  }

  async getTopMovers(options: TopMoversQueryOptions): Promise<PriceMoverItem[]> {
    const pipeline = this.buildPriceMoverPipeline(options.period);

    if (options.direction === 'gainers') {
      pipeline.push({ $match: { changePercent: { $gt: 0 } } });
      pipeline.push({ $sort: { changePercent: -1 } });
    } else {
      pipeline.push({ $match: { changePercent: { $lt: 0 } } });
      pipeline.push({ $sort: { changePercent: 1 } });
    }

    pipeline.push({ $limit: options.limit });

    const docs = await this.pokemonCardModel.aggregate(pipeline).exec();
    return docs.map((doc) => mapPriceMoverItem(doc, options.period));
  }

  private buildPriceMoverPipeline(period: PriceMoverPeriod): PipelineStage[] {
    const dayOffset = getPeriodDayOffset(period);

    const periodSnapshotsExpression =
      period === 'today'
        ? { $slice: ['$allSnapshots', -2] }
        : {
            $filter: {
              input: '$allSnapshots',
              as: 'snap',
              cond: {
                $and: [
                  { $ne: ['$$snap.marketPrice', null] },
                  {
                    $gte: [
                      {
                        $dateFromString: {
                          dateString: '$$snap.recordedDate',
                          onError: null,
                        },
                      },
                      {
                        $dateSubtract: {
                          startDate: '$anchorDateParsed',
                          unit: 'day',
                          amount: dayOffset,
                        },
                      },
                    ],
                  },
                ],
              },
            },
          };

    return [
      {
        $match: {
          'priceHistory.snapshots.1': { $exists: true },
        },
      },
      {
        $project: {
          cardName: 1,
          setName: 1,
          cardNumber: 1,
          imageUrl: 1,
          marketPrice: 1,
          allSnapshots: {
            $sortArray: {
              input: {
                $filter: {
                  input: { $ifNull: ['$priceHistory.snapshots', []] },
                  as: 'snap',
                  cond: {
                    $and: [
                      { $ne: ['$$snap.recordedDate', null] },
                      { $ne: ['$$snap.marketPrice', null] },
                    ],
                  },
                },
              },
              sortBy: { recordedDate: 1 },
            },
          },
        },
      },
      {
        $match: {
          'allSnapshots.1': { $exists: true },
        },
      },
      {
        $addFields: {
          anchorDateParsed: {
            $dateFromString: {
              dateString: { $arrayElemAt: ['$allSnapshots.recordedDate', -1] },
              onError: null,
            },
          },
        },
      },
      {
        $addFields: {
          periodSnapshots: periodSnapshotsExpression,
        },
      },
      {
        $match: {
          'periodSnapshots.1': { $exists: true },
        },
      },
      {
        $addFields: {
          startPrice: { $arrayElemAt: ['$periodSnapshots.marketPrice', 0] },
          currentPrice: { $arrayElemAt: ['$periodSnapshots.marketPrice', -1] },
        },
      },
      {
        $match: {
          startPrice: { $gt: 0 },
          currentPrice: { $gt: 0 },
        },
      },
      {
        $addFields: {
          changeValue: { $subtract: ['$currentPrice', '$startPrice'] },
          changePercent: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$currentPrice', '$startPrice'] },
                  '$startPrice',
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $addFields: {
          absChangePercent: { $abs: '$changePercent' },
        },
      },
    ];
  }

  async getStats() {
    const [totalCards, typeAggregation, rarityAggregation] = await Promise.all([
      this.pokemonCardModel.countDocuments(),
      this.pokemonCardModel.aggregate([
        { $unwind: '$typeImageUrls' },
        { $group: { _id: '$typeImageUrls', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.pokemonCardModel.aggregate([
        { $match: { rarity: { $exists: true, $ne: '' } } },
        { $group: { _id: '$rarity', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      totalCards,
      typeBreakdown: typeAggregation.map((item) => ({
        type: item._id,
        count: item.count,
      })),
      rarityBreakdown: rarityAggregation.map((item) => ({
        rarity: item._id,
        count: item.count,
      })),
    };
  }

  private buildSearchQuery(
    keyword: string,
    filters?: PokemonSearchFilters,
  ): FilterQuery<PokemonCardCatalogDocument> {
    const query: FilterQuery<PokemonCardCatalogDocument> = {};

    if (keyword) {
      const regex = new RegExp(this.escapeRegex(keyword), 'i');
      query.$or = [{ cardName: regex }, { cardNumber: regex }];
    }

    if (filters?.type?.length) {
      query.typeNames = { $in: filters.type };
    }

    if (filters?.weakness?.length) {
      query.weaknessType = { $in: filters.weakness };
    }

    if (filters?.resistance?.length) {
      query.resistanceType = { $in: filters.resistance };
    }

    if (filters?.rarity?.length) {
      query.rarity = { $in: filters.rarity };
    }

    if (filters?.category?.length) {
      query.setName = { $in: filters.category };
    }

    if (filters?.priceMin !== undefined || filters?.priceMax !== undefined) {
      query.marketPrice = {};
      if (filters.priceMin !== undefined) {
        query.marketPrice.$gte = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        query.marketPrice.$lte = filters.priceMax;
      }
    }

    return query;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
