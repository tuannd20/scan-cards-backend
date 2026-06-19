import {
  Injectable,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { readFile } from 'fs/promises';
import { PokemonCardService } from '../pokemon-card/pokemon-card.service';
import { CardNewService } from '../card-new/card-new.service';
import * as stringSimilarity from 'string-similarity';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { prompts } from './prompts-search';
import { simplePrompts } from './prompts-simple';

export interface CardScanResult {
  title: string;
  foundInDatabase: boolean;
  cardInfo?: any;
  aiAnalysis?: any;
  imageUrl?: string;
  similarity?: number;
}

export interface CardAnalysis {
  title: string;
  cardType: string; // pokemon, sports
  rarity?: string;
  condition?: string;
  estimatedValue?: string;
  year?: string;
  series?: string;
  description: string;
  keyFeatures: string[];
  marketInsights?: string;
}

@Injectable()
export class CardScannerService {
  private readonly logger = new Logger(CardScannerService.name);

  constructor(
    private readonly pokemonCardService: PokemonCardService,
    private readonly cardNewService: CardNewService,
  ) {}

  private toError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error(typeof error === 'string' ? error : JSON.stringify(error));
  }

  private serializeForLog(data: unknown): string {
    try {
      const serialized =
        typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      return serialized.length > 2000
        ? `${serialized.slice(0, 2000)}... [truncated]`
        : serialized;
    } catch {
      return String(data);
    }
  }

  private logDetailedError(
    context: string,
    error: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    const normalizedError = this.toError(error);

    this.logger.error(`❌ ${context}: ${normalizedError.message}`);

    if (normalizedError.stack) {
      this.logger.error(`📚 ${context} stack: ${normalizedError.stack}`);
    }

    if (axios.isAxiosError(error)) {
      const axiosContext = {
        method: error.config?.method,
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
      };

      this.logger.error(
        `🌐 ${context} axios details: ${this.serializeForLog(axiosContext)}`,
      );
    }

    if (metadata) {
      this.logger.error(
        `🧩 ${context} metadata: ${this.serializeForLog(metadata)}`,
      );
    }
  }

  private async encodeImageToBase64(imagePath: string): Promise<string> {
    const buffer = await readFile(imagePath);
    const extension = this.getFileExtension(imagePath);
    return `data:image/${extension};base64,${buffer.toString('base64')}`;
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'jpeg';
  }

  async scanCard(
    imagePath: string,
    filename: string,
    cardType?: 'pokemon' | 'sport',
  ): Promise<CardScanResult | null> {
    try {
      this.logger.log(
        `🔍 Starting card scan for: ${filename} (Type hint: ${cardType || 'auto'})`,
      );

      // Step 1: Encode image to base64
      const base64Image = await this.encodeImageToBase64(imagePath);

      // Step 2: Extract card title using AI
      const cardTitle = await this.extractCardTitle(base64Image, filename);
      if (
        !cardTitle ||
        cardTitle.includes('Xin lỗi, tôi không thể đọc tên thẻ') ||
        cardTitle.toLowerCase().includes('unknown')
      ) {
        return null;
      }

      // Step 3: Extract HP and attacks for Pokemon cards (fast and effective)
      let cardDetails: any = null;
      if (cardType === 'pokemon' || !cardType) {
        cardDetails = await this.extractDetailedCardInfo(base64Image, filename);

        // Log thông tin chi tiết lấy được từ ảnh
        if (cardDetails) {
          this.logger.log(`📸 Thông tin chi tiết từ ảnh "${filename}":`);
          this.logger.log(`  ├─ Tên: ${cardDetails.name}`);
          this.logger.log(`  ├─ HP: ${cardDetails.hp}`);
          this.logger.log(
            `  ├─ Type: ${Array.isArray(cardDetails.type) ? cardDetails.type.join(', ') : cardDetails.type || 'Unknown'}`,
          );
          this.logger.log(`  ├─ Weakness: ${cardDetails.weakness || 'None'}`);
          this.logger.log(
            `  ├─ Resistance: ${cardDetails.resistance || 'None'}`,
          );
          this.logger.log(
            `  ├─ Retreat Cost: ${cardDetails.retreatCost || 'Unknown'}`,
          );

          if (
            cardDetails.attacks &&
            Array.isArray(cardDetails.attacks) &&
            cardDetails.attacks.length > 0
          ) {
            this.logger.log(`  └─ Attacks (${cardDetails.attacks.length}):`);
            cardDetails.attacks.forEach((attack: any, index: number) => {
              const isLast = index === cardDetails.attacks.length - 1;
              const prefix = isLast ? '    └─' : '    ├─';
              this.logger.log(
                `${prefix} ${attack.name || 'Unknown'}: ${attack.damage || 'No damage'} damage, Energy: ${attack.energyCost || 'Unknown'}`,
              );
              if (attack.description) {
                this.logger.log(
                  `${isLast ? '      ' : '    │ '}   Effect: ${attack.description}`,
                );
              }
            });
          } else {
            this.logger.log(`  └─ Attacks: None detected`);
          }
        } else {
          this.logger.warn(
            `⚠️ Không thể extract thông tin chi tiết từ ảnh: ${filename}`,
          );
        }
      }

      // Step 4: Search in database with enhanced matching
      const dbResult = await this.searchCardInDatabase(
        cardTitle,
        cardType,
        cardDetails,
      );

      // Step 5: Get AI analysis
      const aiAnalysis = await this.getCardAnalysis(
        base64Image,
        filename,
        cardTitle,
      );

      const result: CardScanResult = {
        title: cardTitle,
        foundInDatabase: dbResult.found,
        cardInfo: dbResult.cardInfo,
        aiAnalysis,
        imageUrl: dbResult.imageUrl,
      };
      return result;
    } catch (error) {
      this.logDetailedError('Error scanning card', error, {
        filename,
        imagePath,
        cardType,
      });
      const normalizedError = this.toError(error);
      throw new Error(`Failed to scan card: ${normalizedError.message}`);
    }
  }

  private async extractCardTitle(
    base64Image: string,
    filename: string,
  ): Promise<string> {
    const prompt = `
ĐỌC CHÍNH XÁC tên thẻ từ ảnh này. HÃY NHÌN THẬT KỸ vào tên được in trên thẻ.

HƯỚNG DẪN:
- Đọc CHÍNH XÁC từ ảnh, KHÔNG được đoán
- CHỈ trả về TÊN THẺ như được in trên thẻ
- Giữ NGUYÊN tất cả hậu tố (ex, GX, VMAX, V, etc.)
- KHÔNG thêm số thẻ, set name
- KHÔNG có dấu ngoặc kép hay giải thích

VÍ DỤ ĐÚNG (đọc từ ảnh):
- Snivy
- Serperior
- Charizard ex
- Pikachu VMAX
- Rayquaza GX

HÃY ĐỌC TÊN CHÍNH XÁC TỪNH ẢNH:`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image,
                  },
                },
              ],
            },
          ],
          max_tokens: 50,
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const rawTitle =
        response.data.choices[0]?.message?.content?.trim() || 'Unknown Card';

      // Clean up the title intelligently
      let cleanTitle = rawTitle
        .replace(/["""]/g, '') // Remove quotes
        .replace(/^(Card Name:|Tên thẻ:|Name:)/i, '') // Remove prefixes
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();

      // Smart cleaning: preserve important Pokemon suffixes but remove set info
      if (cleanTitle.length > 50) {
        // Don't split on important Pokemon suffixes
        const importantSuffixes = /(ex|EX|gx|GX|vmax|VMAX|vstar|VSTAR|v|V)\b/i;

        // If it contains important suffixes, be more careful about splitting
        if (importantSuffixes.test(cleanTitle)) {
          // Only remove after # (card numbers) or - (set names)
          cleanTitle = cleanTitle.split(/[#]/)[0].trim();
          // Also remove set names that come after " - "
          if (cleanTitle.includes(' - ')) {
            const parts = cleanTitle.split(' - ');
            // Keep the first part which should contain the Pokemon name + suffix
            cleanTitle = parts[0].trim();
          }
        } else {
          // For non-Pokemon or cards without special suffixes, use original logic
          cleanTitle = cleanTitle.split(/[#\-\(]/)[0].trim();
        }
      }

      return cleanTitle || 'Unknown Card';
    } catch (error) {
      this.logDetailedError('Error extracting card title', error, {
        filename,
      });
      throw new Error('Failed to extract card title');
    }
  }

  private async searchPokemonOnly(
    cardTitle: string,
    cardDetails?: any,
  ): Promise<{
    found: boolean;
    cardInfo?: any;
    imageUrl?: string;
    similarity?: number;
  }> {
    try {
      // Tăng số lượng tìm kiếm để có nhiều option hơn
      const pokemonSearchResult = await this.pokemonCardService.searchCards(
        cardTitle,
        1,
        100,
        'pokemon',
      );

      if (
        !pokemonSearchResult.items ||
        pokemonSearchResult.items.length === 0
      ) {
        return { found: false };
      }

      let bestMatch: any = null;
      let bestSimilarity = 0;
      let detailedMatches: any[] = [];

      for (const card of pokemonSearchResult.items) {
        // Base name similarity
        let similarity = stringSimilarity.compareTwoStrings(
          cardTitle.toLowerCase(),
          (card.name || '').toLowerCase(),
        );

        let bonusScore = 0;
        let matchDetails: any = {
          baseSimilarity: similarity,
          hpMatch: false,
          attackMatches: 0,
          totalAttacks: 0,
        };

        // Enhanced matching với HP và attacks
        if (cardDetails) {
          // HP matching - MỤC TIÊU CHÍNH để phân biệt các phiên bản
          if (cardDetails.hp && card.hp) {
            const extractedHP = parseInt(
              cardDetails.hp.toString().replace(/\D/g, ''),
            );
            const dbHP = parseInt(card.hp.toString().replace(/\D/g, ''));

            if (!isNaN(extractedHP) && !isNaN(dbHP) && extractedHP === dbHP) {
              bonusScore += 0.5; // Tăng bonus cho HP match (từ 0.4 lên 0.5)
              matchDetails.hpMatch = true;
            }
          }

          // Attack matching - CẢI THIỆN thuật toán với chi tiết attacks
          if (
            cardDetails.attacks &&
            Array.isArray(cardDetails.attacks) &&
            card.attacks &&
            Array.isArray(card.attacks)
          ) {
            const extractedAttacks = cardDetails.attacks
              .filter((a: any) => a && (a.name || typeof a === 'string'))
              .map((a: any) => ({
                name: (typeof a === 'string' ? a : a.name || '')
                  .toLowerCase()
                  .trim(),
                damage: typeof a === 'object' ? a.damage : null,
                description: typeof a === 'object' ? a.description : null,
                energyCost: typeof a === 'object' ? a.energyCost : null,
              }))
              .filter((a: any) => a.name && a.name !== 'unknown');

            const dbAttacks = card.attacks
              .filter((a: any) => a && a.name)
              .map((a: any) => ({
                name: a.name.toLowerCase().trim(),
                damage: a.damage || null,
                description: a.text || a.description || null,
                energyCost: a.cost
                  ? Array.isArray(a.cost)
                    ? a.cost.length
                    : a.cost
                  : null,
              }));

            matchDetails.totalAttacks = Math.max(
              extractedAttacks.length,
              dbAttacks.length,
            );

            if (extractedAttacks.length > 0 && dbAttacks.length > 0) {
              let attackMatches = 0;
              let exactMatches = 0;

              for (const extractedAttack of extractedAttacks) {
                let bestAttackMatch = 0;
                let bestDbAttack = null;

                for (const dbAttack of dbAttacks) {
                  // Name similarity
                  const nameSimilarity = stringSimilarity.compareTwoStrings(
                    extractedAttack.name,
                    dbAttack.name,
                  );
                  let totalMatch = nameSimilarity;

                  // Bonus for damage match
                  if (extractedAttack.damage && dbAttack.damage) {
                    const extractedDamage = extractedAttack.damage
                      .toString()
                      .replace(/\D/g, '');
                    const dbDamage = dbAttack.damage
                      .toString()
                      .replace(/\D/g, '');
                    if (
                      extractedDamage &&
                      dbDamage &&
                      extractedDamage === dbDamage
                    ) {
                      totalMatch += 0.2; // Bonus for exact damage match
                    }
                  }

                  // Bonus for energy cost match
                  if (extractedAttack.energyCost && dbAttack.energyCost) {
                    if (extractedAttack.energyCost === dbAttack.energyCost) {
                      totalMatch += 0.1; // Bonus for energy match
                    }
                  }

                  // Bonus for description similarity
                  if (extractedAttack.description && dbAttack.description) {
                    const descSimilarity = stringSimilarity.compareTwoStrings(
                      extractedAttack.description.toLowerCase(),
                      dbAttack.description.toLowerCase(),
                    );
                    if (descSimilarity > 0.5) {
                      totalMatch += 0.15 * descSimilarity; // Weighted bonus for description
                    }
                  }

                  if (totalMatch > bestAttackMatch) {
                    bestAttackMatch = totalMatch;
                    bestDbAttack = dbAttack;
                  }
                }

                // Accept match if similarity is high enough
                if (bestAttackMatch > 0.6) {
                  // Lower threshold but with weighted matching
                  attackMatches++;

                  // Count as exact match if very high similarity
                  if (bestAttackMatch > 0.9) {
                    exactMatches++;
                  }
                }
              }

              if (attackMatches > 0) {
                // Enhanced bonus calculation
                const attackRatio =
                  attackMatches /
                  Math.max(extractedAttacks.length, dbAttacks.length);
                const exactRatio =
                  exactMatches /
                  Math.max(extractedAttacks.length, dbAttacks.length);

                // Higher bonus for exact matches
                bonusScore += 0.25 * attackRatio + 0.15 * exactRatio;
                matchDetails.attackMatches = attackMatches;
                matchDetails.exactMatches = exactMatches;
              }
            }
          }

          // Final similarity calculation
          similarity = Math.min(1.0, similarity + bonusScore);
          matchDetails.finalSimilarity = similarity;
          matchDetails.bonusScore = bonusScore;
        }

        detailedMatches.push({
          card,
          similarity,
          matchDetails,
        });

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = card;
        }
      }

      // Sort matches by similarity để debug và ưu tiên HP match
      detailedMatches.sort((a, b) => {
        // Ưu tiên HP match trước
        if (a.matchDetails.hpMatch && !b.matchDetails.hpMatch) return -1;
        if (!a.matchDetails.hpMatch && b.matchDetails.hpMatch) return 1;

        // Sau đó sort theo similarity
        return b.similarity - a.similarity;
      });

      // Chọn match tốt nhất (đã được sort)
      const topMatch = detailedMatches[0];
      bestMatch = topMatch?.card;
      bestSimilarity = topMatch?.similarity || 0;

      // Debug log top matches

      // Giảm threshold từ 0.6 xuống 0.5 để dễ match hơn
      if (bestMatch && bestSimilarity > 0.5) {
        return {
          found: true,
          cardInfo: {
            ...bestMatch,
            cardType: 'pokemon',
            matchedName: bestMatch.name,
            similarity: bestSimilarity,
            matchingDetails: cardDetails
              ? {
                  hpMatch:
                    cardDetails.hp && bestMatch.hp
                      ? parseInt(
                          cardDetails.hp.toString().replace(/\D/g, ''),
                        ) ===
                        parseInt(bestMatch.hp.toString().replace(/\D/g, ''))
                      : false,
                  attacksFound: cardDetails.attacks
                    ? cardDetails.attacks.length
                    : 0,
                  dbAttacksCount: bestMatch.attacks
                    ? bestMatch.attacks.length
                    : 0,
                }
              : null,
          },
          imageUrl:
            bestMatch.images?.large ||
            bestMatch.images?.small ||
            bestMatch.image,
          similarity: bestSimilarity,
        };
      }

      return { found: false };
    } catch (error) {
      this.logDetailedError('Error searching Pokemon cards', error, {
        cardTitle,
        hasCardDetails: !!cardDetails,
      });
      return { found: false };
    }
  }

  private async searchSportOnly(
    cardTitle: string,
    cardDetails?: any,
  ): Promise<{
    found: boolean;
    cardInfo?: any;
    imageUrl?: string;
    similarity?: number;
  }> {
    try {
      // this.logger.log(`🔍 Searching Sport cards only for: "${cardTitle}"`);

      const sportSearchResult = await this.pokemonCardService.searchCards(
        cardTitle,
        1,
        20,
        'sport',
      );
      if (!sportSearchResult.items || sportSearchResult.items.length === 0) {
        // this.logger.warn(`[SPORT-SEARCH] No sport cards found for title: ${cardTitle}`);
        return { found: false };
      }

      let bestMatch: any = null;
      let bestSimilarity = 0;

      for (const playerGroup of sportSearchResult.items) {
        const playerName =
          playerGroup.player || playerGroup.playerName || playerGroup.name;
        const similarity =
          playerName && cardTitle
            ? require('string-similarity').compareTwoStrings(
                cardTitle.toLowerCase(),
                playerName.toLowerCase(),
              )
            : 0;
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = playerGroup;
        }
      }

      if (bestMatch && bestSimilarity > 0.6) {
        // Lấy card đầu tiên làm đại diện
        const cardInfo =
          bestMatch.cards && bestMatch.cards.length > 0
            ? bestMatch.cards[0]
            : bestMatch;
        return {
          found: true,
          cardInfo,
          imageUrl: cardInfo.imageUrl || cardInfo.image_url || cardInfo.image,
          similarity: bestSimilarity,
        };
      }

      // this.logger.warn(`[SPORT-SEARCH] No match found with similarity > 0.6 for title: ${cardTitle}`);
      return { found: false };
    } catch (error) {
      this.logDetailedError('Error searching Sport cards', error, {
        cardTitle,
        hasCardDetails: !!cardDetails,
      });
      return { found: false };
    }
  }

  private async searchCardInDatabase(
    cardTitle: string,
    cardType?: 'pokemon' | 'sport',
    cardDetails?: any,
  ): Promise<{
    found: boolean;
    cardInfo?: any;
    imageUrl?: string;
    similarity?: number;
  }> {
    try {
      let bestMatch: any = null;
      let bestSimilarity = 0;
      let detectedCardType = '';

      // this.logger.log(`🔍 Searching database for: "${cardTitle}" (Type: ${cardType || 'auto-detect'})`);

      // If user specified card type, search only that type (FASTER!)
      if (cardType === 'pokemon') {
        return await this.searchPokemonOnly(cardTitle, cardDetails);
      } else if (cardType === 'sport') {
        return await this.searchSportOnly(cardTitle, cardDetails);
      }

      // Otherwise, search both types (slower but comprehensive)
      // Search in Pokemon cards với enhanced matching
      const pokemonSearchResult = await this.pokemonCardService.searchCards(
        cardTitle,
        1,
        100,
        'pokemon',
      ); // Tăng từ 20 lên 100
      if (pokemonSearchResult.items && pokemonSearchResult.items.length > 0) {
        for (const card of pokemonSearchResult.items) {
          let similarity = stringSimilarity.compareTwoStrings(
            cardTitle.toLowerCase(),
            (card.name || '').toLowerCase(),
          );

          // Enhanced matching cho Pokemon với HP và attacks
          if (cardDetails) {
            let bonusScore = 0;

            // HP matching
            if (cardDetails.hp && card.hp) {
              const extractedHP = parseInt(
                cardDetails.hp.toString().replace(/\D/g, ''),
              );
              const dbHP = parseInt(card.hp.toString().replace(/\D/g, ''));

              if (!isNaN(extractedHP) && !isNaN(dbHP) && extractedHP === dbHP) {
                bonusScore += 0.5;
              }
            }

            // Attack matching
            if (
              cardDetails.attacks &&
              Array.isArray(cardDetails.attacks) &&
              card.attacks &&
              Array.isArray(card.attacks)
            ) {
              const extractedAttacks = cardDetails.attacks
                .filter((a: any) => {
                  if (typeof a === 'string') {
                    return (
                      a && a.toLowerCase() !== 'unknown' && a.trim() !== ''
                    );
                  } else if (a && a.name) {
                    return (
                      a.name &&
                      a.name.toLowerCase() !== 'unknown' &&
                      a.name.trim() !== ''
                    );
                  }
                  return false;
                })
                .map((a: any) => {
                  if (typeof a === 'string') {
                    return a.toLowerCase().trim();
                  } else if (a && a.name) {
                    return a.name.toLowerCase().trim();
                  }
                  return '';
                });

              const dbAttacks = card.attacks
                .filter((a: any) => a && a.name)
                .map((a: any) => a.name.toLowerCase().trim());

              if (extractedAttacks.length > 0 && dbAttacks.length > 0) {
                let attackMatches = 0;

                for (const extractedAttack of extractedAttacks) {
                  for (const dbAttack of dbAttacks) {
                    if (
                      stringSimilarity.compareTwoStrings(
                        extractedAttack,
                        dbAttack,
                      ) > 0.7
                    ) {
                      attackMatches++;
                      break;
                    }
                  }
                }

                if (attackMatches > 0) {
                  const attackRatio =
                    attackMatches /
                    Math.max(extractedAttacks.length, dbAttacks.length);
                  bonusScore += 0.3 * attackRatio;
                }
              }
            }

            similarity = Math.min(1.0, similarity + bonusScore);
          }

          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = card;
            detectedCardType = 'pokemon';
          }
        }
      }

      // Search in Sport cards với tìm kiếm mở rộng
      const sportSearchResult = await this.pokemonCardService.searchCards(
        cardTitle,
        1,
        50,
        'sport',
      ); // Tăng từ 20 lên 50
      if (sportSearchResult.items && sportSearchResult.items.length > 0) {
        for (const playerGroup of sportSearchResult.items) {
          // Check player name similarity
          const playerSimilarity = stringSimilarity.compareTwoStrings(
            cardTitle.toLowerCase(),
            (playerGroup.playerName || '').toLowerCase(),
          );

          if (playerSimilarity > bestSimilarity) {
            bestSimilarity = playerSimilarity;
            bestMatch = {
              ...playerGroup,
              matchedField: 'playerName',
            };
            detectedCardType = 'sport';
          }

          // Also check individual cards within the player group
          if (playerGroup.cards && Array.isArray(playerGroup.cards)) {
            for (const card of playerGroup.cards) {
              const cardSimilarity = stringSimilarity.compareTwoStrings(
                cardTitle.toLowerCase(),
                (card.player || playerGroup.playerName || '').toLowerCase(),
              );

              if (cardSimilarity > bestSimilarity) {
                bestSimilarity = cardSimilarity;
                bestMatch = {
                  ...card,
                  playerGroup: playerGroup.playerName,
                  matchedField: 'card',
                };
                detectedCardType = 'sport';
              }
            }
          }
        }
      }

      // Consider it a match if similarity is above 0.5 (50%) - giảm từ 0.6
      if (bestMatch && bestSimilarity > 0.5) {
        return {
          found: true,
          cardInfo: {
            ...bestMatch,
            cardType: detectedCardType,
            matchedName:
              detectedCardType === 'pokemon'
                ? bestMatch.name
                : bestMatch.player || bestMatch.playerName,
            similarity: bestSimilarity,
          },
          imageUrl:
            bestMatch.images?.large ||
            bestMatch.image ||
            bestMatch.images?.small ||
            bestMatch.imageUrl,
          similarity: bestSimilarity,
        };
      }

      return { found: false };
    } catch (error) {
      this.logDetailedError('Error searching database', error, {
        cardTitle,
        cardType,
        hasCardDetails: !!cardDetails,
      });
      return { found: false };
    }
  }

  private async getCardAnalysis(
    base64Image: string,
    filename: string,
    cardTitle: string,
  ): Promise<CardAnalysis> {
    const prompt = `
Phân tích chi tiết ảnh thẻ trading card này. Trả về CHÍNH XÁC theo format JSON sau:

{
  "title": "${cardTitle}",
  "cardType": "pokemon",
  "rarity": "Common",
  "condition": "Near Mint",
  "estimatedValue": "$5-10",
  "year": "2023",
  "series": "Scarlet & Violet",
  "description": "Mô tả chi tiết về thẻ",
  "keyFeatures": ["tính năng 1", "tính năng 2"],
  "marketInsights": "Thông tin thị trường"
}

QUY TẮC:
1. CHỈ trả về JSON, không có text khác
2. cardType: "pokemon" hoặc "sports"
3. rarity: Common, Uncommon, Rare, Ultra Rare, Secret Rare
4. condition: Near Mint, Lightly Played, Moderately Played, Heavily Played, Damaged
5. estimatedValue: ví dụ "$1-5", "$10-25", "$50-100"
6. year: năm phát hành của thẻ (ví dụ: "2023", "2022", "1999")
7. series: tên series/expansion của thẻ (ví dụ: "Base Set", "Scarlet & Violet", "Sword & Shield")
8. keyFeatures: mảng 2-5 tính năng quan trọng
9. Phải là JSON hợp lệ

Tên thẻ: ${cardTitle}`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const aiResponse = response.data.choices[0]?.message?.content?.trim();

      if (!aiResponse) {
        this.logger.warn(`⚠️ No AI response received`);
        return this.getFallbackAnalysis(cardTitle);
      }

      try {
        // Try to clean the response first
        let cleanedResponse = aiResponse;

        // Remove markdown code blocks if present
        cleanedResponse = cleanedResponse
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '');

        // Remove any text before the first {
        const jsonStart = cleanedResponse.indexOf('{');
        if (jsonStart > 0) {
          cleanedResponse = cleanedResponse.substring(jsonStart);
        }

        // Remove any text after the last }
        const jsonEnd = cleanedResponse.lastIndexOf('}');
        if (jsonEnd > 0) {
          cleanedResponse = cleanedResponse.substring(0, jsonEnd + 1);
        }

        const parsedResponse = JSON.parse(cleanedResponse);

        // Validate required fields
        const validatedResponse = {
          title: parsedResponse.title || cardTitle,
          cardType: parsedResponse.cardType || 'unknown',
          rarity: parsedResponse.rarity || 'Unknown',
          condition: parsedResponse.condition || 'Unknown',
          estimatedValue: parsedResponse.estimatedValue || 'Unknown',
          year: parsedResponse.year || 'Unknown',
          series: parsedResponse.series || 'Unknown',
          description: parsedResponse.description || 'No description available',
          keyFeatures: Array.isArray(parsedResponse.keyFeatures)
            ? parsedResponse.keyFeatures
            : [],
          marketInsights:
            parsedResponse.marketInsights || 'No market insights available',
        };

        // this.logger.log(`✅ AI analysis completed successfully for: ${validatedResponse.title}`);
        return validatedResponse;
      } catch (parseError) {
        // this.logger.warn(`⚠️ Failed to parse AI response as JSON: ${parseError.message}`);
        //  this.logger.warn(`📝 Original response: ${aiResponse}`);

        // Try to extract basic info from text response
        return this.extractFromTextResponse(aiResponse, cardTitle);
      }
    } catch (error) {
      this.logDetailedError('Error getting AI analysis', error, {
        filename,
        cardTitle,
      });
      return this.getFallbackAnalysis(cardTitle);
    }
  }

  private getFallbackAnalysis(cardTitle: string): CardAnalysis {
    return {
      title: cardTitle,
      cardType: 'unknown',
      rarity: 'Unknown',
      condition: 'Unknown',
      estimatedValue: 'Unknown',
      year: 'Unknown',
      series: 'Unknown',
      description: `Analysis unavailable for ${cardTitle}`,
      keyFeatures: ['AI analysis failed'],
      marketInsights: 'Market analysis unavailable',
    };
  }

  private extractFromTextResponse(
    textResponse: string,
    cardTitle: string,
  ): CardAnalysis {
    // Try to extract information from plain text response
    const lowerText = textResponse.toLowerCase();

    let cardType = 'unknown';
    if (
      lowerText.includes('pokemon') ||
      lowerText.includes('pikachu') ||
      lowerText.includes('charizard')
    ) {
      cardType = 'pokemon';
    } else if (
      lowerText.includes('sport') ||
      lowerText.includes('player') ||
      lowerText.includes('basketball') ||
      lowerText.includes('football')
    ) {
      cardType = 'sports';
    }

    let rarity = 'Unknown';
    if (lowerText.includes('rare')) rarity = 'Rare';
    if (lowerText.includes('common')) rarity = 'Common';
    if (lowerText.includes('uncommon')) rarity = 'Uncommon';
    if (lowerText.includes('ultra rare')) rarity = 'Ultra Rare';
    if (lowerText.includes('secret rare')) rarity = 'Secret Rare';

    let condition = 'Unknown';
    if (lowerText.includes('near mint')) condition = 'Near Mint';
    if (lowerText.includes('lightly played')) condition = 'Lightly Played';
    if (lowerText.includes('moderately played'))
      condition = 'Moderately Played';
    if (lowerText.includes('heavily played')) condition = 'Heavily Played';
    if (lowerText.includes('damaged')) condition = 'Damaged';

    return {
      title: cardTitle,
      cardType: cardType as 'pokemon' | 'sports' | 'unknown',
      rarity,
      condition,
      estimatedValue: 'Unknown',
      year: 'Unknown',
      series: 'Unknown',
      description: textResponse.substring(0, 200) + '...',
      keyFeatures: ['Extracted from text analysis'],
      marketInsights: 'Market analysis unavailable',
    };
  }

  async scanCardFromBuffer(
    imageBuffer: Buffer,
    filename: string,
    cardType?: 'pokemon' | 'sport',
    language?: string,
  ): Promise<CardScanResult> {
    try {
      // Convert buffer to base64
      const extension = this.getFileExtension(filename);
      const base64Image = `data:image/${extension};base64,${imageBuffer.toString('base64')}`;

      // Extract card title
      const cardTitle = await this.extractCardTitleFromBase64(
        base64Image,
        filename,
      );

      // Extract HP and attacks for Pokemon cards (fast and effective)
      let cardDetails: any = null;
      if (cardType === 'pokemon' || !cardType) {
        cardDetails = await this.extractDetailedCardInfo(base64Image, filename);
      }

      // Search in database with enhanced matching
      const dbResult = await this.searchCardInDatabase(
        cardTitle,
        cardType,
        cardDetails,
      );

      // Get AI analysis
      const aiAnalysis = await this.getCardAnalysisFromBase64(
        base64Image,
        filename,
        cardTitle,
      );

      return {
        title: cardTitle,
        foundInDatabase: dbResult.found,
        cardInfo: dbResult.cardInfo,
        aiAnalysis,
        imageUrl: dbResult.imageUrl,
      };
    } catch (error) {
      this.logDetailedError('Error scanning card from buffer', error, {
        filename,
        cardType,
      });
      const normalizedError = this.toError(error);
      throw new Error(`Failed to scan card: ${normalizedError.message}`);
    }
  }

  private async extractCardTitleFromBase64(
    base64Image: string,
    filename: string,
  ): Promise<string> {
    // Use the same logic as extractCardTitle
    return this.extractCardTitle(base64Image, filename);
  }

  async scanTitleOpenRouter(
    imageBuffer: Buffer,
    filename: string,
  ): Promise<{
    success: boolean;
    title?: string;
    tcgplayerProductId?: string | null;
    tcgplayerProductUrl?: string | null;
    message: string;
  }> {
    try {
      const extension = this.getFileExtension(filename);
      const base64Image = `data:image/${extension};base64,${imageBuffer.toString('base64')}`;

      const title = await this.extractCardTitle(base64Image, filename);

      const failTitle = 'Xin lỗi, tôi không thể xác định tên thẻ';
      const failTitle2 = 'Xin lỗi, tôi không thể đọc tên thẻ';
      const failTitle3 = 'Xin lỗi, tôi không thể giúp với yêu cầu đó';

      if (
        !title ||
        title.includes(failTitle) ||
        title.includes(failTitle2) ||
        title.includes(failTitle3) ||
        title.toLowerCase().includes('unknown')
      ) {
        return {
          success: false,
          message: 'Could not extract title from image',
        };
      }

      const tcgMatch = await this.cardNewService.lookupTcgplayerProduct(title);

      return {
        success: true,
        title,
        tcgplayerProductId: tcgMatch?.productId ?? null,
        tcgplayerProductUrl: tcgMatch?.productUrl ?? null,
        message: 'Title extracted successfully',
      };
    } catch (error) {
      this.logger.error(`Error scanning title from OpenRouter: ${error}`);
      return {
        success: false,
        message: 'Internal server error while extracting title',
      };
    }
  }

  private async getCardAnalysisFromBase64(
    base64Image: string,
    filename: string,
    cardTitle: string,
  ): Promise<CardAnalysis> {
    // Use the same logic as getCardAnalysis
    return this.getCardAnalysis(base64Image, filename, cardTitle);
  }

  private async extractDetailedCardInfo(
    base64Image: string,
    filename: string,
  ): Promise<any> {
    const prompt = `
PHÂN TÍCH CHI TIẾT ẢNH THẺ POKEMON - ĐỌC CHÍNH XÁC:

Hãy nhìn vào ảnh thẻ Pokemon và đọc CHÍNH XÁC tất cả thông tin sau:

1. TÊN POKEMON: Đọc tên ở đầu thẻ (có thể có hậu tố ex, GX, VMAX, V...)
2. HP: Số HP ở góc trên phải (ví dụ: 60, 90, 120, 210...)
3. TYPE: Loại Pokemon (Fire, Water, Grass, Electric, Psychic, Fighting, Darkness, Metal, Fairy, Dragon, Colorless...)
4. ABILITY: Nếu thẻ có ability thì đọc chính xác:
   - Tên ability (ví dụ: Static, Blaze, Overgrow)
   - Mô tả/hiệu ứng của ability
5. ATTACKS: Đọc chi tiết TẤT CẢ các chiêu thức bao gồm:
   - Tên attack (ví dụ: Tackle, Vine Whip, Solar Beam)
   - Energy cost (số lượng energy cần để dùng attack)
   - Damage (sát thương gây ra, ví dụ: 20, 60, 120)
   - Description/Effect (mô tả hiệu ứng của attack nếu có)

TRẢ VỀ JSON CHÍNH XÁC:
{
  "name": "Tên Pokemon CHÍNH XÁC từ ảnh",
  "hp": "Số HP (chỉ số, không có HP text)",
  "type": ["Fire", "Water"],
  "ability": {
    "name": "Tên Ability (nếu có)",
    "description": "Mô tả ability (nếu có)"
  },
  "attacks": [
    {
      "name": "Tên Attack 1",
      "energyCost": 2,
      "damage": "60",
      "energy": "Fire",
      "description": "Mô tả hiệu ứng attack (nếu có)"
    },
    {
      "name": "Tên Attack 2", 
      "energyCost": 3,
      "damage": "120",
      "energy": "Grass",
      "description": "Mô tả hiệu ứng attack (nếu có)"
    }
  ],
  "weakness": "Fighting",
  "resistance": "Psychic",
  "retreatCost": 2
}

QUY TẮC QUAN TRỌNG:
- CHỈ đọc từ ảnh, KHÔNG đoán hay tưởng tượng
- HP: CHỈ số (ví dụ: "60", "120"), KHÔNG có chữ "HP"
- Type: mảng các loại Pokemon
- Attacks: mảng chi tiết từng attack với đầy đủ thông tin
- energyCost: số lượng energy cần (số nguyên)
- damage: sát thương dạng string (ví dụ: "60", "120", "30+")
- description: mô tả chính xác hiệu ứng từ ảnh (có thể để "" nếu không có)
- Nếu không thấy rõ thông tin nào thì để "Unknown", null hoặc []
- CHỈ trả về JSON, KHÔNG có text khác

Phân tích ảnh:`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image,
                  },
                },
              ],
            },
          ],
          max_tokens: 600, // Tăng từ 300 lên 600 để chứa thông tin chi tiết hơn
          temperature: 0.05, // Giữ nguyên temperature thấp cho độ chính xác
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const aiResponse = response.data.choices[0]?.message?.content?.trim();

      if (!aiResponse) {
        return null;
      }

      try {
        // Enhanced response cleaning
        let cleanedResponse = aiResponse;

        // Remove markdown code blocks
        cleanedResponse = cleanedResponse
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '');
        cleanedResponse = cleanedResponse.replace(/```/g, '');

        // Remove any text before first {
        const jsonStart = cleanedResponse.indexOf('{');
        if (jsonStart > 0) {
          cleanedResponse = cleanedResponse.substring(jsonStart);
        }

        // Remove any text after last }
        const jsonEnd = cleanedResponse.lastIndexOf('}');
        if (jsonEnd > 0) {
          cleanedResponse = cleanedResponse.substring(0, jsonEnd + 1);
        }

        const cardDetails = JSON.parse(cleanedResponse);

        // Validate và clean data với thông tin mở rộng
        const cleanedCardDetails = {
          name: cardDetails.name || 'Unknown',
          hp: cardDetails.hp
            ? cardDetails.hp.toString().replace(/\D/g, '')
            : 'Unknown',
          type: Array.isArray(cardDetails.type)
            ? cardDetails.type
            : cardDetails.type
              ? [cardDetails.type]
              : [],
          ability: cardDetails.ability
            ? {
                name: cardDetails.ability.name || cardDetails.ability,
                description: cardDetails.ability.description || null,
              }
            : null,
          attacks: Array.isArray(cardDetails.attacks)
            ? cardDetails.attacks
                .filter(
                  (attack: any) =>
                    attack && (attack.name || typeof attack === 'string'),
                )
                .map((attack: any) => {
                  // Nếu attack là string (legacy format)
                  if (typeof attack === 'string') {
                    return {
                      name: attack.trim(),
                      energyCost: null,
                      damage: null,
                      description: null,
                    };
                  }
                  // Nếu attack là object (new format)
                  return {
                    name: attack.name || 'Unknown Attack',
                    energyCost: attack.energyCost || attack.energy_cost || null,
                    damage: attack.damage || null,
                    description: attack.description || attack.effect || null,
                  };
                })
            : [],
          weakness: cardDetails.weakness || null,
          resistance: cardDetails.resistance || null,
          retreatCost:
            cardDetails.retreatCost || cardDetails.retreat_cost || null,
        };

        return cleanedCardDetails;
      } catch (parseError) {
        this.logger.warn(
          `⚠️ Failed to parse detailed card info: ${this.toError(parseError).message}`,
        );
        // Fallback parsing - try to extract info from text
        try {
          const fallbackInfo = this.extractInfoFromText(aiResponse);
          if (fallbackInfo) {
            return fallbackInfo;
          }
        } catch (fallbackError) {
          // Silent fallback failure
        }

        return null;
      }
    } catch (error) {
      this.logDetailedError('Error extracting detailed card info', error, {
        filename,
      });
      return null;
    }
  }

  private extractInfoFromText(text: string): any | null {
    try {
      // Try to extract HP
      const hpMatch = text.match(/(?:hp|HP)[\s:]*(\d+)/i);
      const hp = hpMatch ? hpMatch[1] : 'Unknown';

      // Try to extract name
      const nameMatch = text.match(/(?:name|Name)[\s:]*["""']?([^"""'\n,]+)/i);
      const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

      // Try to extract type
      const typeMatch = text.match(/(?:type|Type)[\s:]*\[([^\]]+)\]/i);
      let type: string[] = [];
      if (typeMatch) {
        type = typeMatch[1]
          .split(',')
          .map((t: string) => t.trim().replace(/["""']/g, ''));
      }

      // Try to extract ability
      let ability: any = null;
      const abilityMatch = text.match(
        /(?:ability|Ability)[\s:]*["""']?([^"""'\n,]+)/i,
      );
      if (abilityMatch) {
        const abilityText = abilityMatch[1].trim();
        // Check if it's an object format
        if (abilityText.includes('{') && abilityText.includes('}')) {
          try {
            const abilityObj = JSON.parse(abilityText);
            ability = {
              name: abilityObj.name || abilityText,
              description: abilityObj.description || null,
            };
          } catch (e) {
            ability = {
              name: abilityText,
              description: null,
            };
          }
        } else {
          ability = {
            name: abilityText,
            description: null,
          };
        }
      }

      // Try to extract attacks from text patterns (enhanced)
      let attacks: any[] = [];

      // Try new format first
      const attackObjectMatches = text.match(
        /(?:attack|Attack)s?[\s:]*\[([^\]]+)\]/i,
      );
      if (attackObjectMatches) {
        try {
          // Try to parse as array of objects
          const attacksStr = attackObjectMatches[1];
          if (attacksStr.includes('{')) {
            // Parse complex attacks
            const attackMatches = attacksStr.match(/\{[^}]+\}/g);
            if (attackMatches) {
              attacks = attackMatches.map((attackStr: string) => {
                const nameMatch = attackStr.match(/"name":\s*"([^"]+)"/);
                const damageMatch = attackStr.match(/"damage":\s*"([^"]+)"/);
                const energyMatch = attackStr.match(/"energyCost":\s*(\d+)/);
                const descMatch = attackStr.match(/"description":\s*"([^"]+)"/);

                return {
                  name: nameMatch ? nameMatch[1] : 'Unknown Attack',
                  energyCost: energyMatch ? parseInt(energyMatch[1]) : null,
                  damage: damageMatch ? damageMatch[1] : null,
                  description: descMatch ? descMatch[1] : null,
                };
              });
            }
          } else {
            // Simple string array format
            attacks = attacksStr
              .split(',')
              .map((attack: string) => ({
                name: attack.replace(/["""']/g, '').trim(),
                energyCost: null,
                damage: null,
                description: null,
              }))
              .filter((attack: any) => attack.name && attack.name !== '');
          }
        } catch (parseError) {
          // Fallback to simple parsing
          attacks = attackObjectMatches[1]
            .split(',')
            .map((attack: string) => ({
              name: attack.replace(/["""']/g, '').trim(),
              energyCost: null,
              damage: null,
              description: null,
            }))
            .filter((attack: any) => attack.name && attack.name !== '');
        }
      }

      // Try to extract weakness and resistance
      const weaknessMatch = text.match(
        /(?:weakness|Weakness)[\s:]*["""']?([^"""'\n,]+)/i,
      );
      const weakness = weaknessMatch ? weaknessMatch[1].trim() : null;

      const resistanceMatch = text.match(
        /(?:resistance|Resistance)[\s:]*["""']?([^"""'\n,]+)/i,
      );
      const resistance = resistanceMatch ? resistanceMatch[1].trim() : null;

      const retreatMatch = text.match(
        /(?:retreatCost|retreat_cost|retreat)[\s:]*(\d+)/i,
      );
      const retreatCost = retreatMatch ? parseInt(retreatMatch[1]) : null;

      return {
        name,
        hp,
        type,
        ability,
        attacks,
        weakness,
        resistance,
        retreatCost,
      };
    } catch (error) {
      this.logDetailedError('Error extracting fallback info from text', error, {
        textPreview: text?.slice?.(0, 300),
      });
      return null;
    }
  }

  // Cập nhật price cho player vào file sport-cards tương ứng
  public async updateSportCardPriceInFile(
    sport: string,
    playerName: string,
    price: string,
  ) {
    const path = require('path');
    const fs = require('fs');
    const sportCardsDir = path.join(process.cwd(), 'sport-cards');
    const files = fs
      .readdirSync(sportCardsDir)
      .filter((file: string) => file.endsWith('.json'));
    let found = false;
    for (const file of files) {
      const sportName = this.extractSportName(file);
      if (sportName.toLowerCase() === sport.toLowerCase()) {
        const filePath = path.join(sportCardsDir, file);
        const rawData = fs.readFileSync(filePath, 'utf8');
        let playerGroups = JSON.parse(rawData);
        let changed = false;
        for (const group of playerGroups) {
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
          if (groupName === inputName) {
            group.price = price;
            if (group.cards && Array.isArray(group.cards)) {
              for (const card of group.cards) {
                card.price = price;
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
        }
      }
    }
    if (!found) {
      console.warn(
        `[updateSportCardPriceInFile] Không tìm thấy player '${playerName}' trong sport '${sport}' để cập nhật price.`,
      );
    }
  }

  // Hàm extractSportName để lấy tên sport từ tên file
  private extractSportName(filename: string): string {
    return filename
      .replace('-cards.json', '')
      .split('-')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Proxy public để controller gọi reload lại sport cards từ file
  public async reloadSportCardsFromFileProxy(sport: string) {
    if (this.pokemonCardService?.reloadSportCardsFromFile) {
      await this.pokemonCardService.reloadSportCardsFromFile(sport);
    }
  }

  /**
   * Extract card info (name, hp, attacks) from image
   * Stub implementation: returns nulls. Replace with actual logic.
   */
  async extractCardInfoFromImage(imageFile: Express.Multer.File): Promise<{
    name: string | null;
    hp: string | null;
    attacks: any[] | null;
  }> {
    // TODO: Implement actual image parsing logic here
    return {
      name: null,
      hp: null,
      attacks: null,
    };
  }

  @Post('scan-search')
  @UseInterceptors(FileInterceptor('file'))
  async scanSearchCardByAI(
    @UploadedFile() file: Express.Multer.File,
    imageUrl?: string,
    language?: string,
  ): Promise<any> {
    let finalImageUrl = imageUrl;

    // Nếu có file thì upload và tạo URL
    if (file) {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });

      const tempFileName = `${randomUUID()}.jpg`;
      const tempPath = path.join(uploadDir, tempFileName);
      fs.writeFileSync(tempPath, file.buffer);

      const baseUrl = (process.env.BASE_URL || '').replace(/\/+$/, '');
      finalImageUrl = `${baseUrl}/uploads/${tempFileName}`;

      // migrate từ src/uploads sang uploads (1 lần duy nhất)
      const legacyUploadDir = path.join(process.cwd(), 'src', 'uploads');
      if (fs.existsSync(legacyUploadDir)) {
        fs.readdirSync(legacyUploadDir).forEach((fileName) => {
          const oldPath = path.join(legacyUploadDir, fileName);
          const newPath = path.join(uploadDir, fileName);
          if (!fs.existsSync(newPath)) {
            fs.renameSync(oldPath, newPath);
          }
        });
      }
    }

    if (!finalImageUrl) {
      throw new Error('You must provide either a file or an imageUrl');
    }

    const prompt = prompts[language?.toUpperCase() || 'EN'];
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-4o:online',
          plugins: [{ id: 'web' }],
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: finalImageUrl } },
              ],
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'card_scan_schema',
              schema: {
                type: 'object',
                properties: {
                  cardName: { type: 'string' },
                  rarity: { type: 'string' },
                  year: { type: 'string' },
                  seriesExpansion: { type: 'string' },
                  description: { type: 'string' },
                  priceRange: { type: 'string' },
                  price: { type: 'string' },
                  recentPrices: {
                    type: 'array',
                    items: {
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
                    },
                  },
                  gradedPrices: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        grade: { type: 'string' },
                        price: { type: 'string' },
                      },
                      required: ['grade', 'price'],
                      additionalProperties: false,
                    },
                  },
                  priceSource: { type: 'string' },
                  priceLink: { type: 'string', format: 'uri' },
                  similarCards: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        cardName: { type: 'string' },
                        priceLink: { type: 'string', format: 'uri' },
                      },
                      required: ['cardName', 'priceLink'],
                      additionalProperties: false,
                    },
                  },
                },
                required: [
                  'cardName',
                  'rarity',
                  'year',
                  'seriesExpansion',
                  'description',
                  'priceRange',
                  'recentPrices',
                  'gradedPrices',
                  'priceSource',
                  'priceLink',
                  'similarCards',
                  'price',
                ],
                additionalProperties: false,
              },
            },
          },
          max_tokens: 3000,
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const aiMessage = response.data.choices?.[0]?.message?.content;
      return aiMessage;
    } finally {
      // Keep the uploaded image so the URL remains viewable.
      // Consider a scheduled cleanup for old files.
      // fs.unlink(tempPath, (err) => { if (err) console.error('❌ Error deleting temp file:', err); });
    }
  }

  async formatScanSearchAIResponse(aiRaw: any): Promise<any> {
    // 1) Parse raw into object (supports code fences and plain text)
    let data: any = {};
    if (typeof aiRaw === 'string') {
      let cleaned = aiRaw.replace(/```json|```/g, '').trim();
      const jsonStart = cleaned.indexOf('{');
      if (jsonStart > 0) cleaned = cleaned.substring(jsonStart);
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonEnd > 0) cleaned = cleaned.substring(0, jsonEnd + 1);
      try {
        data = JSON.parse(cleaned);
      } catch {
        return { error: 'Invalid AI response format', raw: aiRaw };
      }
    } else if (typeof aiRaw === 'object' && aiRaw !== null) {
      data = aiRaw;
    } else {
      return { error: 'Invalid AI response type', raw: aiRaw };
    }

    // 2) Support both new nested shape (mainCard + similarCards) and legacy flat shape
    const main = data.mainCard || data.maincard || data.main || data;

    // 3) Helpers
    const getHost = (url?: string) => {
      if (!url || typeof url !== 'string') return '';
      try {
        const u = new URL(url);
        return (u.hostname || '').replace(/^www\./, '');
      } catch {
        return '';
      }
    };

    const parseRecent = (
      input: any,
    ): Array<{ price: string; date: string }> => {
      const out: Array<{ price: string; date: string }> = [];
      const arr = Array.isArray(input)
        ? input
        : Array.isArray(data.recentPrices)
          ? data.recentPrices
          : [];

      for (const item of arr) {
        if (item && typeof item === 'object' && (item.price || item.amount)) {
          const price = String(item.price || item.amount || '').trim();
          const date = item.date ? String(item.date).trim() : '';
          out.push({ price, date });
        } else if (typeof item === 'string') {
          const dateMatch = item.match(/\b\d{4}-\d{2}-\d{2}\b/);
          const date = dateMatch ? dateMatch[0] : '';
          const pricePart = item
            .replace(dateMatch?.[0] || '', '')
            .trim()
            .replace(/^[-–:\s]+/, '');
          out.push({ price: pricePart || item.trim(), date });
        }
      }
      return out;
    };

    const parseGraded = (
      input: any,
    ): Array<{ grade: string; price: string }> => {
      const out: Array<{ grade: string; price: string }> = [];

      if (!input && Array.isArray(data.gradedPrices)) input = data.gradedPrices;

      if (Array.isArray(input)) {
        for (const item of input) {
          if (
            item &&
            typeof item === 'object' &&
            (item.grade || item.level) &&
            (item.price || item.value)
          ) {
            out.push({
              grade: String(item.grade || item.level),
              price: String(item.price || item.value),
            });
          } else if (typeof item === 'string') {
            // e.g. "PSA 10: $120" or "BGS 9 - $85"
            const m = item.match(/^(.*?)[\s:-]+\s*(\$?[\d,.]+.*)$/);
            if (m) out.push({ grade: m[1].trim(), price: m[2].trim() });
          }
        }
      } else if (input && typeof input === 'object') {
        for (const [grade, price] of Object.entries(input)) {
          out.push({ grade: String(grade), price: String(price as any) });
        }
      }

      return out;
    };

    const parseSimilar = (
      input: any,
    ): Array<{ cardName: string; priceLink: string }> => {
      const arr = Array.isArray(input)
        ? input
        : Array.isArray(data.similarCards)
          ? data.similarCards
          : [];
      return arr
        .map((item: any) => ({
          cardName: (item?.cardName || item?.card_name || '').toString(),
          priceLink: (
            item?.productPage ||
            item?.priceLink ||
            item?.price_link ||
            item?.link ||
            ''
          ).toString(),
        }))
        .filter((x) => x.cardName || x.priceLink);
    };

    // 4) Map to standardized schema
    const priceLink = (
      main?.productPage ||
      data.priceLink ||
      data.price_link ||
      ''
    ).toString();
    const priceSource =
      data.priceSource || data.price_source || getHost(priceLink);

    const recentPrices = parseRecent(main?.recentSales);
    const gradedPrices = parseGraded(main?.gradedPrices);
    const similarCards = parseSimilar(data.similarCards);

    return {
      cardName: (
        main?.cardName ||
        data.cardName ||
        data.card_name ||
        ''
      ).toString(),
      rarity: (main?.rarity || data.rarity || '').toString(),
      year: (main?.year || data.year || '').toString(),
      seriesExpansion: (
        main?.seriesExpansion ||
        data.seriesExpansion ||
        data.series_expansion ||
        data.series ||
        ''
      ).toString(),
      description: (main?.description || data.description || '').toString(),
      price: (data.price || '').toString(),
      priceSource,
      priceLink,
      priceRange: (main?.marketPriceRange || data.priceRange || '').toString(),
      recentPrices,
      gradedPrices,
      similarCards,
    };
  }

  async scanCardBasicAI(
    file: Express.Multer.File,
    imageUrl?: string,
    language?: string,
  ): Promise<any> {
    const FREE_MODELS = ['google/gemma-3-4b-it:free'];

    async function callOpenRouterWithRotation(
      promptText: string,
      imgUrl: string,
    ) {
      for (let i = 0; i < FREE_MODELS.length; i++) {
        const model = FREE_MODELS[i];

        try {
          const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              model,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: promptText },
                    { type: 'image_url', image_url: { url: imgUrl } },
                  ],
                },
              ],
              max_tokens: 1000,
              temperature: 0.2,
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
              },
              timeout: 25000,
            },
          );

          const msg = response?.data?.choices?.[0]?.message?.content;
          if (msg) return msg;
        } catch (err) {}
      }

      throw new Error('All free models failed');
    }

    let finalImageUrl = imageUrl;

    if (file) {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });

      const tempFileName = `${randomUUID()}.jpg`;
      const tempPath = path.join(uploadDir, tempFileName);
      fs.writeFileSync(tempPath, file.buffer);

      const baseUrl = (process.env.BASE_URL || '').replace(/\/+$/, '');
      finalImageUrl = `${baseUrl}/uploads/${tempFileName}`;

      const legacyUploadDir = path.join(process.cwd(), 'src', 'uploads');
      if (fs.existsSync(legacyUploadDir)) {
        fs.readdirSync(legacyUploadDir).forEach((fileName) => {
          const oldPath = path.join(legacyUploadDir, fileName);
          const newPath = path.join(uploadDir, fileName);
          if (!fs.existsSync(newPath)) fs.renameSync(oldPath, newPath);
        });
      }
    }

    if (!finalImageUrl) {
      throw new Error('You must provide either a file or an imageUrl');
    }

    const prompt = simplePrompts[language?.toUpperCase() || 'EN'];
    const aiMessageRaw = await callOpenRouterWithRotation(
      prompt,
      finalImageUrl,
    );

    let data: any = {};
    if (typeof aiMessageRaw === 'string') {
      let cleaned = aiMessageRaw.replace(/```json|```/g, '').trim();
      const jsonStart = cleaned.indexOf('{');
      if (jsonStart > 0) cleaned = cleaned.substring(jsonStart);
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonEnd > 0) cleaned = cleaned.substring(0, jsonEnd + 1);
      try {
        data = JSON.parse(cleaned);
      } catch {
        data = {};
      }
    }

    return {
      cardName: data.cardName || null,
      rarity: data.rarity || null,
      year: data.year || null,
      seriesExpansion: data.seriesExpansion || null,
      description: data.description || null,
      price: data.price || null,
      priceRange: data.priceRange || null,
      recentPrices: data.recentPrices || null,
      gradedPrices: data.gradedPrices || null,
      priceSource: data.priceSource || null,
      priceLink: data.priceLink || null,
      similarCards: data.similarCards || null,
    };
  }

  async scanCardWithGemini(
    file: Express.Multer.File,
    imageUrl?: string,
    language?: string,
  ): Promise<any> {
    let base64Image: string;

    if (file) {
      const extension = this.getFileExtension(file.originalname);
      base64Image = `data:image/${extension};base64,${file.buffer.toString('base64')}`;
    } else if (imageUrl) {
      // Fetch remote image and convert to base64
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const contentType = response.headers['content-type'] || 'image/jpeg';
      base64Image = `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`;
    } else {
      throw new Error('You must provide either a file or an imageUrl');
    }

    const prompt = simplePrompts[language?.toUpperCase() || 'EN'];

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: base64Image } },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const aiMessageRaw = response?.data?.choices?.[0]?.message?.content;

    let data: any = {};
    if (typeof aiMessageRaw === 'string') {
      let cleaned = aiMessageRaw.replace(/```json|```/g, '').trim();
      const jsonStart = cleaned.indexOf('{');
      if (jsonStart > 0) cleaned = cleaned.substring(jsonStart);
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonEnd > 0) cleaned = cleaned.substring(0, jsonEnd + 1);
      try {
        data = JSON.parse(cleaned);
      } catch {
        data = {};
      }
    }

    return {
      cardName: data.cardName || null,
      rarity: data.rarity || null,
      year: data.year || null,
      seriesExpansion: data.seriesExpansion || null,
      description: data.description || null,
      price: data.price || null,
      priceRange: data.priceRange || null,
      recentPrices: data.recentPrices || null,
      gradedPrices: data.gradedPrices || null,
      priceSource: data.priceSource || null,
      priceLink: data.priceLink || null,
      similarCards: data.similarCards || null,
    };
  }
}
