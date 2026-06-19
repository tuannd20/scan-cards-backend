import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { PokemonCardService } from './pokemon-card.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { buildPokemonSearchQueryOptions } from '../pokemon-card-catalog/helpers/search-query.helper';
import {
  CATALOG_LIST_EXAMPLE,
  CATALOG_SEARCH_EXAMPLE,
  CATALOG_STATS_EXAMPLE,
  CATALOG_TOP_MOVERS_EXAMPLE,
  CATALOG_TRENDING_EXAMPLE,
} from '../../common/swagger/api-envelope.examples';
import { ApiCatalogReadResponses } from '../../common/swagger/api-standard-responses.decorator';

@ApiTags('Easy Card Scanner - Catalog')
@Controller('easy-card-scanner/catalog')
export class PokemonCardController {
  constructor(private readonly pokemonCardService: PokemonCardService) {}

  @Get('cards/search')
  @ApiOperation({
    summary: 'Search cards in the catalog by category',
    description:
      'Returns matching cards with pagination. Pokemon responses use `{ data, pagination, sort? }`. Sport responses may use `{ allCards, pagination }`.',
  })
  @ApiCatalogReadResponses({
    description: 'Search results retrieved successfully',
    example: CATALOG_SEARCH_EXAMPLE,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by card name or card number',
  })
  @ApiQuery({
    name: 'categories',
    required: true,
    description: 'Category: pokemon or sport',
  })
  @ApiQuery({ name: 'type', required: false, isArray: true })
  @ApiQuery({ name: 'weakness', required: false, isArray: true })
  @ApiQuery({ name: 'resistance', required: false, isArray: true })
  @ApiQuery({ name: 'rarity', required: false, isArray: true })
  @ApiQuery({
    name: 'sport',
    required: false,
    isArray: true,
    description: 'Sports filter (for sport category)',
  })
  @ApiQuery({ name: 'priceMin', required: false, description: 'Minimum price' })
  @ApiQuery({ name: 'priceMax', required: false, description: 'Maximum price' })
  @ApiQuery({
    name: 'priceRange',
    required: false,
    description: 'Preset price range: under_10 | 10_50 | 50_100 | over_100',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    isArray: true,
    description: 'Filter by set/expansion name (pokemon) or series (sport)',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort: price_asc | price_desc | name_asc | name_desc',
  })
  async search(
    @Query('search') keyword: string,
    @Query('categories') categories: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string[] | undefined,
    @Query('weakness') weakness?: string[] | undefined,
    @Query('resistance') resistance?: string[] | undefined,
    @Query('rarity') rarity?: string[] | undefined,
    @Query('sport') sport?: string[] | undefined,
    @Query('category') category?: string[] | undefined,
    @Query('priceMin') priceMin?: number | undefined,
    @Query('priceMax') priceMax?: number | undefined,
    @Query('priceRange') priceRange?: string | undefined,
    @Query('sort') sort?: string | undefined,
  ) {
    const searchOptions = buildPokemonSearchQueryOptions({
      sort,
      category,
      priceMin,
      priceMax,
      priceRange,
    });

    const filters = {
      type,
      weakness,
      resistance,
      rarity,
      sport,
      category: searchOptions.category,
      priceMin: searchOptions.priceMin,
      priceMax: searchOptions.priceMax,
      sort: searchOptions.sort,
    };

    const result = await this.pokemonCardService.searchCards(
      keyword,
      +page,
      +limit,
      categories,
      filters,
    );

    // // Thêm log để kiểm tra dữ liệu trả về từ service
    // console.log('[SEARCH] result.data:', JSON.stringify(result.data, null, 2));
    // console.log('[SEARCH] result.pagination:', result.pagination);
    // Chuẩn hóa allCards cho sport
    let allCards: any[] = [];
    let pagination = result.pagination;
    if (categories === 'sport' && result.data) {
      // Chuẩn hóa allCards: chỉ trả về các trường FE cần thiết cho từng card
      const allCards = result.data.map((card) => ({
        name: card.playerName || card.player || card.name,
        cardType: 'sport',
        matchedName: card.playerName || card.player || card.name,
        series: card.set_name || card.series,
        year: card.set_year || card.year,
        number: card.card_number || card.number,
        imageUrl: card.image_url || card.image || card.imageUrl || null,
        price: card.price,
        description: card.description,
        sport: card.sport,
      }));
      // pagination giữ nguyên
      const pagination = result.pagination;
      return {
        allCards,
        pagination,
      };
    }

    return result;
  }

  @Get('cards')
  @ApiOperation({
    summary: 'List cards in the catalog by category',
    description:
      'Returns paginated cards for the selected category. Pokemon responses use `{ data, pagination }`. Sport responses may use `{ allCards, pagination }`.',
  })
  @ApiCatalogReadResponses({
    description: 'Catalog list retrieved successfully',
    example: CATALOG_LIST_EXAMPLE,
  })
  @ApiQuery({
    name: 'categories',
    required: true,
    description: 'Category: pokemon or sport',
  })
  @ApiQuery({
    name: 'sport',
    required: false,
    description: 'Filter by specific sport (for sport category)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 2 })
  async getAll(
    @Query('categories') categories: string,
    @Query('sport') sport?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNumber = page && page > 0 ? page : 1;
    const limitNumber = limit && limit > 0 ? limit : 2;

    const result = await this.pokemonCardService.getAll(
      categories,
      pageNumber,
      limitNumber,
      sport,
    );

    // Thêm log để kiểm tra dữ liệu trả về từ service
    // console.log('[GET-ALL] result.data:', JSON.stringify(result.data, null, 2));
    // console.log('[GET-ALL] result.pagination:', result.pagination);
    // Chuẩn hóa allCards cho sport
    let allCards: any[] = [];
    let pagination = result.pagination;
    if (categories === 'sport' && result.data) {
      // Chuẩn hóa allCards: chỉ trả về các trường FE cần thiết cho từng card
      const allCards = result.data.map((card) => ({
        name: card.playerName || card.player || card.name,
        cardType: 'sport',
        matchedName: card.playerName || card.player || card.name,
        series: card.set_name || card.series,
        year: card.set_year || card.year,
        number: card.card_number || card.number,
        imageUrl: card.image_url || card.image || card.imageUrl || null,
        price: card.price,
        description: card.description,
        sport: card.sport,
      }));
      // pagination giữ nguyên
      const pagination = result.pagination;
      return {
        allCards,
        pagination,
      };
    }

    return result;
  }

  // @Get('get-all-recommended')
  // @ApiQuery({ name: 'language', required: false, description: 'User language' })
  // async getAllRecommended(@Query('language') language: string) {
  //   return this.pokemonCardService.getAllPokemonRecommend(language);
  // }

  // @Get('autocomplete')
  // @ApiQuery({ name: 'search', required: true, description: 'Search term for autocomplete (card names or card numbers)' })
  // @ApiQuery({ name: 'category', required: false, description: 'Category: pokemon or sport (default: pokemon)' })
  // async autocomplete(
  //   @Query('search') search: string,
  //   @Query('category') category = 'pokemon'
  // ) {
  //   if (!search) return [];

  //   return this.pokemonCardService.autocomplete(search, category);
  // }

  // @Get('sport-stats')
  // async getSportStats() {
  //   return this.pokemonCardService.getSportStats();
  // }

  @Get('stats')
  @ApiOperation({ summary: 'Get catalog statistics' })
  @ApiCatalogReadResponses({
    description: 'Catalog statistics retrieved successfully',
    example: CATALOG_STATS_EXAMPLE,
  })
  async getPokemonStats() {
    return this.pokemonCardService.getPokemonStats();
  }

  @Get('cards/trending')
  @ApiOperation({ summary: 'Get trending cards by price movement' })
  @ApiCatalogReadResponses({
    description: 'Trending cards retrieved successfully',
    example: CATALOG_TRENDING_EXAMPLE,
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'today | week | month (default: week)',
  })
  @ApiQuery({
    name: 'direction',
    required: false,
    description: 'up | down | both (default: both)',
  })
  @ApiQuery({
    name: 'minChangePercent',
    required: false,
    description: 'Minimum absolute price change percent',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (default: 20, max: 100)',
  })
  async getTrendingCards(
    @Query('period') period?: string,
    @Query('direction') direction?: string,
    @Query('minChangePercent') minChangePercent?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.pokemonCardService.getTrendingCards({
      period,
      direction,
      minChangePercent,
      limit,
    });

    return result;
  }

  @Get('cards/top-movers')
  @ApiOperation({ summary: 'Get top price gainers or losers in the catalog' })
  @ApiCatalogReadResponses({
    description: 'Top movers retrieved successfully',
    example: CATALOG_TOP_MOVERS_EXAMPLE,
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'today | week | month (default: today)',
  })
  @ApiQuery({
    name: 'direction',
    required: false,
    description: 'gainers | losers (default: gainers)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (default: 10, max: 100)',
  })
  async getTopMovers(
    @Query('period') period?: string,
    @Query('direction') direction?: string,
    @Query('limit') limit?: number,
  ) {
    const result = await this.pokemonCardService.getTopMovers({
      period,
      direction,
      limit,
    });

    return result;
  }

  // @Get('stats')
  // @ApiQuery({
  //   name: 'categories',
  //   required: false,
  //   description: 'Category: pokemon, sport, or all (default: all)',
  // })
  // async getStats(@Query('categories') categories = 'all') {
  //   if (categories === 'pokemon') {
  //     return {
  //       status: true,
  //       message: 'Pokemon stats retrieved successfully',
  //       data: await this.pokemonCardService.getPokemonStats(),
  //     };
  //   } else if (categories === 'sport') {
  //     return {
  //       status: true,
  //       message: 'Sport stats retrieved successfully',
  //       data: await this.pokemonCardService.getSportStats(),
  //     };
  //   } else {
  //     // Return both stats
  //     const [pokemonStats, sportStats] = await Promise.all([
  //       this.pokemonCardService.getPokemonStats(),
  //       this.pokemonCardService.getSportStats(),
  //     ]);

  //     return {
  //       status: true,
  //       message: 'All stats retrieved successfully',
  //       data: {
  //         pokemon: pokemonStats,
  //         sport: sportStats,
  //       },
  //     };
  //   }
  // }

  // @Get('sports')
  // async getAvailableSports() {
  //   const sports = await this.pokemonCardService.getAvailableSports();
  //   return {
  //     status: true,
  //     message: 'Available sports retrieved successfully',
  //     data: sports,
  //     timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
  //   };
  // }

  // @Get('sports/counts')
  // async getSportCounts() {
  //   const sportCounts = await this.pokemonCardService.getSportPlayersCount();
  //   return {
  //     status: true,
  //     message: 'Sport player counts retrieved successfully',
  //     data: sportCounts,
  //     timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
  //   };
  // }
}
