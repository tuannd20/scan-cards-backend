import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as stringSimilarity from 'string-similarity';
import * as path from 'path';
import * as fs from 'fs';
import { PokemonCardCatalogService } from '../pokemon-card-catalog/pokemon-card-catalog.service';
import {
  buildTopMoversQueryOptions,
  buildTrendingQueryOptions,
} from '../pokemon-card-catalog/helpers/price-mover-query.helper';
import {
  buildPokemonSearchQueryOptions,
  compareSportCards,
  matchesSportCategory,
  matchesSportPriceRange,
  PokemonSearchSort,
} from '../pokemon-card-catalog/helpers/search-query.helper';

@Injectable()
export class PokemonCardService implements OnModuleInit {
  private sportCardsData: any[] = [];

  constructor(
    private readonly httpService: HttpService,
    private readonly pokemonCardCatalogService: PokemonCardCatalogService,
  ) {
    // Constructor should be lightweight - move file operations to onModuleInit
  }

  private readonly supportedLanguages = {
    ZH: 'Chinese', // 中文
    HI: 'Hindi', // हिन्दी
    ES: 'Spanish', // Española
    AR: 'Arabic', // عربي
    FR: 'French', // Français
    BN: 'Bengali', // বাংলা
    EN: 'English', // English
    PT: 'Portuguese', // Português
    SW: 'Swahili', // Kiswahili
    ID: 'Indonesian', // Bahasa Indo
    JA: 'Japanese', // 日本語
    DE: 'German', // Deutsch
    PA: 'Punjabi', // ਪੰਜਾਬੀ
    IT: 'Italian', // Italiano
  };

  async onModuleInit() {
    await this.initializePokemonCatalog();
    await this.loadSportCards();
  }

  async initializePokemonCatalog(): Promise<void> {
    try {
      const total = await this.pokemonCardCatalogService.countCards();
      console.log(
        `✅ Pokemon card catalog ready with ${total} cards in MongoDB`,
      );
    } catch (error) {
      console.error('❌ Error initializing Pokemon card catalog:', error);
    }
  }

  async loadPokemonCardsByLanguage(language: string) {
    try {
      const fileMap: Record<string, string> = {
        Chinese: 'pokemon_zh.json',
        Hindi: 'pokemon_hi.json',
        Spanish: 'pokemon_es.json',
        Arabic: 'pokemon_ar.json',
        French: 'pokemon_fr.json',
        Bengali: 'pokemon_bn.json',
        English: 'pokemon_en.json',
        Portuguese: 'pokemon_pt.json',
        Swahili: 'pokemon_sw.json',
        Indonesian: 'pokemon_id.json',
        Japanese: 'pokemon_ja.json',
        German: 'pokemon_de.json',
        Punjabi: 'pokemon_pa.json',
        Italian: 'pokemon_it.json',
      };

      // Normalize language input and provide safe fallback to English
      const langKey = (language || 'EN').toString().toUpperCase();
      const targetLang = this.supportedLanguages[langKey] || 'English';
      let filename = fileMap[targetLang];

      if (!filename) {
        console.warn(
          `Unsupported target language mapping for '${language}', falling back to English.`,
        );
        filename = fileMap['English'];
      }

      const filepath = path.join(process.cwd(), 'data', filename);

      if (!fs.existsSync(filepath)) {
        throw new BadRequestException(
          `Data file for ${targetLang} not found at ${filepath}`,
        );
      }

      const raw = fs.readFileSync(filepath, 'utf8');
      const data = JSON.parse(raw);

      return {
        data: data,
      };
    } catch (error) {
      console.error('❌ Error loading Pokemon cards:', error);
      // Re-throw the error so callers can handle it explicitly if needed
      throw error;
    }
  }

  async loadSportCards(): Promise<void> {
    try {
      const sportCardsDir = path.join(process.cwd(), 'sport-cards');
      console.log('🏃 Loading sport cards from directory:', sportCardsDir);

      if (!fs.existsSync(sportCardsDir)) {
        console.error('❌ sport-cards directory not found at:', sportCardsDir);
        return;
      }

      const files = fs
        .readdirSync(sportCardsDir)
        .filter((file) => file.endsWith('.json'));
      console.log(`📁 Found ${files.length} sport card files`);

      this.sportCardsData = [];
      let totalPlayers = 0;

      for (const file of files) {
        try {
          const sportName = this.extractSportName(file);
          const filePath = path.join(sportCardsDir, file);

          console.log(`📄 Loading ${file} (${sportName})...`);
          const rawData = fs.readFileSync(filePath, 'utf8');
          const playerGroups = JSON.parse(rawData);

          const processedGroups = playerGroups.map((group) => ({
            ...group,
            sport: sportName,
            cards: group.cards.map((card) => ({
              ...card,
              sport: sportName,
            })),
          }));

          this.sportCardsData.push(...processedGroups);
          totalPlayers += processedGroups.length;

          console.log(
            `   ✅ Loaded ${processedGroups.length} players from ${sportName}`,
          );
        } catch (error) {
          console.error(`❌ Error loading ${file}:`, error.message);
        }
      }

      console.log(`✅ Total sport cards loaded: ${totalPlayers} players`);
    } catch (error) {
      console.error('❌ Error loading sport cards:', error);
    }
  }

  private extractSportName(filename: string): string {
    return filename
      .replace('-cards.json', '')
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async searchCards(
    keyword: string,
    page: number,
    limit: number,
    categories: string,
    filters?: {
      type?: string[];
      weakness?: string[];
      resistance?: string[];
      rarity?: string[];
      category?: string[];
      priceMin?: number;
      priceMax?: number;
      priceRange?: string;
      sort?: PokemonSearchSort;
      sport?: string[];
    },
  ): Promise<{
    items: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    sort?: PokemonSearchSort;
  }> {
    if (categories === 'pokemon') {
      return this.searchPokemonCards(keyword, page, limit, filters);
    } else if (categories === 'sport') {
      const searchOptions = buildPokemonSearchQueryOptions({
        sort: filters?.sort,
        category: filters?.category,
        priceMin: filters?.priceMin,
        priceMax: filters?.priceMax,
        priceRange: filters?.priceRange,
      });

      let allCards: any[] = [];
      let filteredPlayers = [...this.sportCardsData];
      if (filters?.sport?.length) {
        filteredPlayers = filteredPlayers.filter((player) =>
          filters.sport!.some(
            (filterSport) =>
              player.sport.toLowerCase() === filterSport.toLowerCase(),
          ),
        );
      }
      for (const player of filteredPlayers) {
        if (player.cards && Array.isArray(player.cards)) {
          for (const card of player.cards) {
            let match = true;
            if (keyword) {
              const keywordNorm = this.normalizePlayerName(keyword);
              const playerNorm = this.normalizePlayerName(player.playerName);
              const cardNumberNorm = (card.card_number || card.number || '')
                .toString()
                .toLowerCase();
              match =
                playerNorm.includes(keywordNorm) ||
                cardNumberNorm.includes(keywordNorm);
            }

            const enrichedCard = {
              ...card,
              playerName: player.playerName,
              sport: player.sport,
            };

            if (
              match &&
              matchesSportCategory(enrichedCard, searchOptions.category) &&
              matchesSportPriceRange(
                enrichedCard,
                searchOptions.priceMin,
                searchOptions.priceMax,
              )
            ) {
              allCards.push(enrichedCard);
            }
          }
        }
      }

      allCards.sort((left, right) =>
        compareSportCards(left, right, searchOptions.sort),
      );

      const total = allCards.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCards = allCards.slice(startIndex, endIndex);
      return {
        items: paginatedCards,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        sort: searchOptions.sort,
      };
    } else {
      throw new Error(
        'Invalid category. Supported categories: "pokemon", "sport"',
      );
    }
  }

  async getAll(categories: string, page = 1, limit = 20, sport?: string) {
    if (categories === 'pokemon') {
      return this.getAllPokemon(page, limit);
    } else if (categories === 'sport') {
      // Gom toàn bộ card của tất cả player thành mảng phẳng
      let allCards: any[] = [];
      let filteredPlayers = [...this.sportCardsData];
      if (sport) {
        filteredPlayers = filteredPlayers.filter(
          (player) => player.sport.toLowerCase() === sport.toLowerCase(),
        );
      }
      for (const player of filteredPlayers) {
        if (player.cards && Array.isArray(player.cards)) {
          for (const card of player.cards) {
            allCards.push({
              ...card,
              playerName: player.playerName,
              sport: player.sport,
            });
          }
        }
      }
      // Phân trang trực tiếp trên mảng card
      const total = allCards.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCards = allCards.slice(startIndex, endIndex);
      return {
        items: paginatedCards,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } else {
      throw new Error(
        'Invalid category. Supported categories: "pokemon", "sport"',
      );
    }
  }

  async getAllPokemonRecommend(language?: string, reqPath?: string) {
    try {
      const page = 1;
      const limit = 20;
      let data;
      try {
        data = await this.loadPokemonCardsByLanguage(language ?? 'EN');
      } catch (err) {
        console.error('Failed to load language data:', err.message || err);
        throw new Error(
          err.message || 'Failed to load data file for requested language',
        );
      }

      const allData = data?.data || [];
      const total = allData.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedData = allData.slice((page - 1) * limit, page * limit);

      return {
        items: paginatedData,
        pagination: {
          total,
          page: page.toString(),
          limit: limit.toString(),
          totalPages,
        },
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  private async getAllPokemon(page: number, limit: number) {
    return this.pokemonCardCatalogService.findAll(page, limit);
  }

  private getAllSport(page: number, limit: number, sport?: string) {
    let filteredData = [...this.sportCardsData];

    if (sport) {
      filteredData = filteredData.filter(
        (player) => player.sport.toLowerCase() === sport.toLowerCase(),
      );
    }

    const total = filteredData.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      items: paginatedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Hàm chuẩn hóa tên player: loại bỏ dấu, khoảng trắng, chấm, chuyển lowercase
  private normalizePlayerName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }

  private async searchPokemonCards(
    keyword: string,
    page: number,
    limit: number,
    filters?: {
      type?: string[];
      weakness?: string[];
      resistance?: string[];
      rarity?: string[];
      category?: string[];
      priceMin?: number;
      priceMax?: number;
      priceRange?: string;
      sort?: PokemonSearchSort;
    },
  ) {
    const searchOptions = buildPokemonSearchQueryOptions({
      sort: filters?.sort,
      category: filters?.category,
      priceMin: filters?.priceMin,
      priceMax: filters?.priceMax,
      priceRange: filters?.priceRange,
    });

    return this.pokemonCardCatalogService.search(keyword, page, limit, {
      type: filters?.type,
      weakness: filters?.weakness,
      resistance: filters?.resistance,
      rarity: filters?.rarity,
      category: searchOptions.category,
      priceMin: searchOptions.priceMin,
      priceMax: searchOptions.priceMax,
      sort: searchOptions.sort,
    });
  }

  private searchSportCards(
    keyword: string,
    page: number,
    limit: number,
    filters?: {
      sport?: string[];
    },
  ): {
    items: any[];
    pagination: {
      total: number;
      page: string;
      limit: string;
      totalPages: number;
    };
  } {
    let filteredData = [...this.sportCardsData];

    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      filteredData = filteredData.filter((player) => {
        // Search in player name
        if (player.playerName.toLowerCase().includes(keywordLower)) {
          return true;
        }

        // Search in card numbers within player's cards
        if (player.cards && Array.isArray(player.cards)) {
          return player.cards.some(
            (card) =>
              card.card_number &&
              card.card_number.toLowerCase().includes(keywordLower),
          );
        }

        return false;
      });
    }

    if (filters?.sport?.length) {
      filteredData = filteredData.filter((player) =>
        filters.sport!.some(
          (filterSport) =>
            player.sport.toLowerCase() === filterSport.toLowerCase(),
        ),
      );
    }

    const total = filteredData.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      items: paginatedData,
      pagination: {
        total,
        page: String(page),
        limit: String(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async autocomplete(search: string, category = 'pokemon'): Promise<string[]> {
    if (category === 'pokemon') {
      return this.autocompletePokemon(search);
    } else if (category === 'sport') {
      return this.autocompleteSport(search);
    } else {
      throw new Error(
        'Invalid category. Supported categories: "pokemon", "sport"',
      );
    }
  }

  private async autocompletePokemon(search: string): Promise<string[]> {
    return this.pokemonCardCatalogService.autocomplete(search);
  }

  private autocompleteSport(search: string): string[] {
    const searchLower = search.toLowerCase();

    // Get player names
    const playerNames = this.sportCardsData
      .map((player) => player.playerName)
      .filter((name) => name.toLowerCase().includes(searchLower));

    // Get card numbers that match
    const cardNumbers: string[] = [];
    this.sportCardsData.forEach((player) => {
      if (player.cards && Array.isArray(player.cards)) {
        player.cards.forEach((card) => {
          if (
            card.card_number &&
            card.card_number.toLowerCase().includes(searchLower)
          ) {
            cardNumbers.push(card.card_number);
          }
        });
      }
    });

    // Combine and remove duplicates
    const allSuggestions = [...playerNames, ...cardNumbers];

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

  async getSportStats(): Promise<any> {
    const sportStats: Record<
      string,
      { playerCount: number; totalCards: number }
    > = {};

    this.sportCardsData.forEach((player) => {
      const sport = player.sport;
      if (!sportStats[sport]) {
        sportStats[sport] = {
          playerCount: 0,
          totalCards: 0,
        };
      }
      sportStats[sport].playerCount++;
      sportStats[sport].totalCards += player.cards.length;
    });

    return {
      totalPlayers: this.sportCardsData.length,
      totalCards: this.sportCardsData.reduce(
        (sum, player) => sum + player.cards.length,
        0,
      ),
      sportBreakdown: Object.entries(sportStats)
        .map(([sport, stats]) => ({
          sport,
          playerCount: stats.playerCount,
          totalCards: stats.totalCards,
        }))
        .sort((a, b) => b.playerCount - a.playerCount),
    };
  }

  async getPokemonStats(): Promise<any> {
    return this.pokemonCardCatalogService.getStats();
  }

  async getTrendingCards(query: {
    period?: unknown;
    direction?: unknown;
    minChangePercent?: unknown;
    limit?: unknown;
  }) {
    const options = buildTrendingQueryOptions(query);
    const items =
      await this.pokemonCardCatalogService.getTrendingCards(options);

    return {
      period: options.period,
      direction: options.direction,
      minChangePercent: options.minChangePercent,
      limit: options.limit,
      total: items.length,
      items,
    };
  }

  async getTopMovers(query: {
    period?: unknown;
    direction?: unknown;
    limit?: unknown;
  }) {
    const options = buildTopMoversQueryOptions(query);
    const items = await this.pokemonCardCatalogService.getTopMovers(options);

    return {
      period: options.period,
      direction: options.direction,
      limit: options.limit,
      total: items.length,
      items,
    };
  }

  async getAvailableSports(): Promise<string[]> {
    const sports = [
      ...new Set(this.sportCardsData.map((player) => player.sport)),
    ];
    return sports.sort();
  }

  async getSportPlayersCount(): Promise<{ sport: string; count: number }[]> {
    const sportCounts: Record<string, number> = {};

    this.sportCardsData.forEach((player) => {
      const sport = player.sport;
      sportCounts[sport] = (sportCounts[sport] || 0) + 1;
    });

    return Object.entries(sportCounts)
      .map(([sport, count]) => ({ sport, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Cập nhật description cho player vào file sport-cards tương ứng
   */
  async updateSportCardDescriptionInFile(
    sport: string,
    playerName: string,
    description: string,
  ) {
    const sportCardsDir = path.join(process.cwd(), 'sport-cards');
    // Tìm file sport-cards tương ứng
    const files = fs
      .readdirSync(sportCardsDir)
      .filter((file) => file.endsWith('.json'));
    let found = false;
    for (const file of files) {
      const sportName = this.extractSportName(file);
      if (sportName.toLowerCase() === sport.toLowerCase()) {
        const filePath = path.join(sportCardsDir, file);
        const rawData = fs.readFileSync(filePath, 'utf8');
        let playerGroups = JSON.parse(rawData);
        let changed = false;
        let foundPlayer = false;
        for (const group of playerGroups) {
          // So sánh playerName không phân biệt hoa thường, loại bỏ khoảng trắng dư thừa
          const groupName = (
            group.playerName ||
            group.player ||
            group.name ||
            ''
          )
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
          const inputName = (playerName || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
          // Log so sánh playerName
          //console.log('[DEBUG][updateSportCardDescriptionInFile] groupName:', groupName, '| inputName:', inputName);
          if (groupName === inputName) {
            foundPlayer = true;
            group.description = description;
            if (group.cards && Array.isArray(group.cards)) {
              for (const card of group.cards) {
                card.description = description;
              }
            }
            changed = true;
          }
        }
        if (changed) {
          fs.writeFileSync(
            filePath,
            JSON.stringify(playerGroups, null, 2),
            'utf8',
          );
          found = true;
          // console.log(`[DEBUG][updateSportCardDescriptionInFile] Đã cập nhật description cho player '${playerName}' trong file ${file}`);
        }
        if (!foundPlayer) {
          console.warn(
            `[updateSportCardDescriptionInFile] Không tìm thấy player '${playerName}' trong sport '${sport}'. Danh sách player trong file:`,
            playerGroups.map((g) => g.playerName || g.player || g.name),
          );
        }
      }
    }
    if (!found) {
      console.warn(
        `[updateSportCardDescriptionInFile] Không tìm thấy file sport-cards cho sport '${sport}'`,
      );
    }
  }

  // Hàm reload lại sport cards từ file cho 1 sport cụ thể
  async reloadSportCardsFromFile(sport: string) {
    const sportCardsDir = path.join(process.cwd(), 'sport-cards');
    if (!fs.existsSync(sportCardsDir)) return;
    const files = fs
      .readdirSync(sportCardsDir)
      .filter((file) => file.endsWith('.json'));
    let reloaded = false;
    for (const file of files) {
      const sportName = this.extractSportName(file);
      if (sportName.toLowerCase() === sport.toLowerCase()) {
        const filePath = path.join(sportCardsDir, file);
        const rawData = fs.readFileSync(filePath, 'utf8');
        const playerGroups = JSON.parse(rawData);
        // Xóa các player cũ của sport này khỏi sportCardsData
        this.sportCardsData = this.sportCardsData.filter(
          (g) => (g.sport || '').toLowerCase() !== sportName.toLowerCase(),
        );
        // Thêm lại các player mới
        const processedGroups = playerGroups.map((group) => ({
          ...group,
          sport: sportName,
          cards: group.cards.map((card) => ({
            ...card,
            sport: sportName,
          })),
        }));
        this.sportCardsData.push(...processedGroups);
        reloaded = true;
        console.log(
          `[reloadSportCardsFromFile] Reloaded sport cards for sport '${sportName}' (${file})`,
        );
      }
    }
    if (!reloaded) {
      console.warn(
        `[reloadSportCardsFromFile] Không tìm thấy file sport-cards cho sport '${sport}'`,
      );
    }
  }
}
