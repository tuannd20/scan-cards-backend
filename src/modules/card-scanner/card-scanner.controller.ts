import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  HttpException,
  Body,
  Get,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CardScannerService } from './card-scanner.service';
import { ResponseMessage } from '../../decorators/response-message.decorator';
import {
  UploadCardImageDto,
  ScanCardFromPathDto,
  CardTypeEnum,
} from './dto/card-scanner.dto';
import { AiChatService } from '../ai-chat/ai-chat.service';

@ApiTags('🎴 Card Scanner')
@Controller('card-scanner')
export class CardScannerController {
  private readonly logger = new Logger(CardScannerController.name);

  constructor(private readonly cardScannerService: CardScannerService) {}

  @Post('scan')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '📸 Chọn file ảnh thẻ cần quét và loại thẻ (tùy chọn)',
    type: UploadCardImageDto,
  })
  @ApiResponse({
    status: 200,
    description: '✅ Quét thẻ thành công',
    schema: {
      example: {
        success: true,
        data: {
          title: 'Charizard ex',
          foundInDatabase: true,
          searchType: 'pokemon',
          processingTime: '0.8s',
          cardInfo: {
            name: 'Charizard ex',
            type: ['Fire', 'Flying'],
            hp: 120,
            rarity: 'Rare Holo',
            cardType: 'pokemon',
            similarity: 0.95,
          },
          aiAnalysis: {
            title: 'Charizard ex',
            cardType: 'pokemon',
            rarity: 'Rare Holo',
            condition: 'Near Mint',
            estimatedValue: '$50-100',
            description:
              'Iconic Fire/Flying type Pokemon card with ex designation',
            keyFeatures: ['Holographic', 'ex card', 'High HP'],
          },
          imageUrl: 'https://images.pokemontcg.io/base1/4_hires.png',
          similarity: 0.95,
          fileInfo: {
            originalName: 'charizard.jpg',
            size: '245.2KB',
            type: 'image/jpeg',
          },
        },
        message: 'Tìm thấy thẻ "Charizard ex" trong database (pokemon)!',
        meta: {
          foundInDatabase: true,
          similarity: '95.0%',
          aiAnalysisCompleted: true,
          searchOptimized: true,
          processingTime: '0.8s',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '❌ Lỗi file không hợp lệ',
    schema: {
      example: {
        success: false,
        message:
          'Loại file không hợp lệ. Chỉ chấp nhận ảnh JPEG, PNG, và WebP.',
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  @ResponseMessage('Quét thẻ thành công')
  async scanCard(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadCardImageDto,
    @Body('language') language?: string,
  ) {
    try {
      const startTime = Date.now();
      const cardType = uploadDto.cardType;

      if (!file) {
        throw new HttpException(
          '❌ Không có file ảnh được cung cấp',
          HttpStatus.BAD_REQUEST,
        );
      }

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/webp',
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new HttpException(
          '❌ Loại file không hợp lệ. Chỉ chấp nhận ảnh JPEG, PNG, và WebP.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new HttpException(
          '❌ File quá lớn. Kích thước tối đa là 10MB.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.cardScannerService.scanCardFromBuffer(
        file.buffer,
        file.originalname,
        cardType,
        language, // truyền language vào service
      );

      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      // Nếu không đọc được tên thẻ hoặc không nhận diện được, trả về response chuẩn
      const failTitle = 'Xin lỗi, tôi không thể xác định tên thẻ';
      const failTitle2 = 'Xin lỗi, tôi không thể đọc tên thẻ';
      const failTitle3 = 'Xin lỗi, tôi không thể giúp với yêu cầu đó';
      const cardName = result?.cardInfo?.name || result?.title || '';

      if (
        !result ||
        (typeof result.title === 'string' &&
          (result.title.includes(failTitle) ||
            result.title.includes(failTitle2) ||
            result.title.includes(failTitle3))) ||
        (typeof cardName === 'string' &&
          (cardName.includes(failTitle) ||
            cardName.includes(failTitle2) ||
            cardName.includes(failTitle3)))
      ) {
        return {};
      }

      // Nếu không tìm thấy trong DB thì gọi AI để lấy thông tin thẻ
      let responseData: any = {};
      if (result.foundInDatabase === false) {
        // Gọi AI chat để lấy thông tin thẻ theo ngôn ngữ
        const aiChatInstance = new AiChatService(this.cardScannerService);
        const aiResult = await aiChatInstance.chatWithAI(
          undefined, // message
          undefined, // messages
          file,
          true,
          language,
        );
        const cardInfo =
          aiResult.cardInfo && typeof aiResult.cardInfo === 'object'
            ? (aiResult.cardInfo as any)
            : {};
        responseData = {
          ...cardInfo,
          description: cardInfo.description || aiResult.reply,
          foundInDatabase: false,
          title: cardInfo.title || result.title,
          imageUrl: cardInfo.imageUrl || result.imageUrl,
          cardType: cardInfo.cardType || 'pokemon',
          condition: cardInfo.condition || 'Unknown',
          // ...other fields
        };
      } else {
        // Chuẩn hóa response format cho cả sport và pokemon
        if (
          result.cardInfo?.cardType === 'sport' ||
          (result.cardInfo && result.cardInfo.sport)
        ) {
          // Sport card - gen price nếu thiếu
          let price =
            result.cardInfo?.price || result.aiAnalysis?.price || null;
          if (!price || price === 'Unknown') {
            const {
              generateSportCardDescriptionAI,
            } = require('../../utils/generateSportCardDescriptionAI');
            const playerName =
              result.cardInfo?.name ||
              result.cardInfo?.player ||
              result.cardInfo?.playerName ||
              result.title;
            const sport = result.cardInfo?.sport;
            const aiResult = await generateSportCardDescriptionAI(
              playerName,
              sport,
              result.cardInfo?.series,
              result.cardInfo?.year,
            );
            price = aiResult.price;
            if (price && playerName && sport) {
              await this.cardScannerService.updateSportCardPriceInFile(
                sport,
                playerName,
                price,
              );
              await this.cardScannerService.reloadSportCardsFromFileProxy(
                sport,
              );
            }
          }

          responseData = {
            title: result.title,
            foundInDatabase: result.foundInDatabase,
            imageUrl:
              result.cardInfo?.imageUrl ||
              result.cardInfo?.image_url ||
              result.cardInfo?.image ||
              result.imageUrl,
            name:
              result.cardInfo?.name ||
              result.cardInfo?.player ||
              result.cardInfo?.playerName ||
              result.title,
            number: result.cardInfo?.number || result.cardInfo?.card_number,
            rarity: result.cardInfo?.rarity || null,
            year: result.cardInfo?.year || result.cardInfo?.set_year,
            series: result.cardInfo?.series || result.cardInfo?.set_name,
            // Các trường chỉ pokemon có - trả về null cho sport
            hp: null,
            type: null,
            weakness: null,
            resistance: null,
            retreatCost: null,
            attacks: null,
            evolutionStatus: null,
            // Các trường chung
            price: price,
            description:
              result.cardInfo?.description ||
              result.aiAnalysis?.description ||
              null,
            cardType: 'sport',
            condition: result.aiAnalysis?.condition || 'Unknown',
            sport: result.cardInfo?.sport,
          };
        } else {
          // Pokemon card
          const price = result.cardInfo?.price || null;
          responseData = {
            title: result.title,
            foundInDatabase: result.foundInDatabase,
            imageUrl:
              result.imageUrl ||
              (result.foundInDatabase
                ? result.cardInfo?.images?.large ||
                  result.cardInfo?.images?.small ||
                  result.cardInfo?.image
                : null),
            name: result.cardInfo?.name || result.title,
            number: result.cardInfo?.cardNumber || null,
            rarity: result.cardInfo?.rarity || result.aiAnalysis?.rarity,
            year: result.cardInfo?.year || result.aiAnalysis?.year,
            series:
              result.cardInfo?.expansion ||
              result.cardInfo?.series ||
              result.aiAnalysis?.series,
            // Các trường pokemon
            hp: result.cardInfo?.hp || null,
            type: result.cardInfo?.type || null,
            weakness: result.cardInfo?.weakness || null,
            resistance: result.cardInfo?.resistance || null,
            retreatCost: result.cardInfo?.retreatCost || null,
            attacks: result.cardInfo?.attacks || null,
            evolutionStatus: result.cardInfo?.evolutionStatus || null,
            // Các trường chung
            price: price,
            description:
              result.cardInfo?.description ||
              result.aiAnalysis?.description ||
              null,
            cardType: result.aiAnalysis?.cardType || 'pokemon',
            condition: result.aiAnalysis?.condition || 'Unknown',
            sport: null,
          };
        }
      }

      return responseData;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Internal server error';

      throw new HttpException(
        {
          success: false,
          message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @Post('scan-path')
  // @ApiOperation({
  //   summary: '📁 Quét thẻ từ đường dẫn file',
  //   description:
  //     'Quét thẻ từ file có sẵn trên server (dành cho testing). Có thể chọn loại thẻ để tìm kiếm nhanh hơn.',
  // })
  // @ApiResponse({ status: 200, description: 'Quét thẻ từ path thành công' })
  // @ResponseMessage('Quét thẻ từ path thành công')
  // async scanCardFromPath(@Body() scanCardDto: ScanCardFromPathDto) {
  //   try {
  //     const startTime = Date.now();

  //     if (!scanCardDto.imagePath) {
  //       throw new HttpException(
  //         '❌ Đường dẫn ảnh là bắt buộc',
  //         HttpStatus.BAD_REQUEST,
  //       );
  //     }

  //     this.logger.log(
  //       `🔍 Scanning card from path with type hint: ${scanCardDto.cardType || 'auto-detect'}`,
  //     );

  //     const result = await this.cardScannerService.scanCard(
  //       scanCardDto.imagePath,
  //       scanCardDto.filename || 'card.jpg',
  //       scanCardDto.cardType,
  //     );

  //     // Nếu không đọc được tên thẻ hoặc không nhận diện được thẻ, trả về response chuẩn
  //     const failTitle = 'Xin lỗi, tôi không thể xác định tên thẻ';
  //     const failTitle2 = 'Xin lỗi, tôi không thể đọc tên thẻ';
  //     const failTitle3 = 'Xin lỗi, tôi không thể giúp với yêu cầu đó';
  //     const cardName = result?.cardInfo?.name || result?.title || '';

  //     if (
  //       !result ||
  //       (typeof result.title === 'string' &&
  //         (result.title.includes(failTitle) ||
  //           result.title.includes(failTitle2) ||
  //           result.title.includes(failTitle3))) ||
  //       (typeof cardName === 'string' &&
  //         (cardName.includes(failTitle) ||
  //           cardName.includes(failTitle2) ||
  //           cardName.includes(failTitle3)))
  //     ) {
  //       return {};
  //     }

  //     const endTime = Date.now();
  //     const processingTime = ((endTime - startTime) / 1000).toFixed(2);

  //     // Chuẩn hóa response format cho cả sport và pokemon
  //     let responseData: any = {};

  //     if (
  //       result.cardInfo?.cardType === 'sport' ||
  //       (result.cardInfo && result.cardInfo.sport)
  //     ) {
  //       // Sport card
  //       responseData = {
  //         title: result.title,
  //         foundInDatabase: result.foundInDatabase,
  //         imageUrl:
  //           result.cardInfo?.imageUrl ||
  //           result.cardInfo?.image_url ||
  //           result.cardInfo?.image ||
  //           result.imageUrl,
  //         name:
  //           result.cardInfo?.name ||
  //           result.cardInfo?.player ||
  //           result.cardInfo?.playerName ||
  //           result.title,
  //         number: result.cardInfo?.number || result.cardInfo?.card_number,
  //         rarity: result.cardInfo?.rarity || null,
  //         year: result.cardInfo?.year || result.cardInfo?.set_year,
  //         series: result.cardInfo?.series || result.cardInfo?.set_name,
  //         // Các trường chỉ pokemon có - trả về null cho sport
  //         hp: null,
  //         type: null,
  //         weakness: null,
  //         resistance: null,
  //         retreatCost: null,
  //         attacks: null,
  //         evolutionStatus: null,
  //         // Các trường chung
  //         price: result.cardInfo?.price || null,
  //         description:
  //           result.cardInfo?.description ||
  //           result.aiAnalysis?.description ||
  //           null,
  //         cardType: 'sport',
  //         condition: result.aiAnalysis?.condition || 'Unknown',
  //         sport: result.cardInfo?.sport,
  //       };
  //     } else {
  //       // Pokemon card
  //       responseData = {
  //         title: result.title,
  //         foundInDatabase: result.foundInDatabase,
  //         imageUrl:
  //           result.imageUrl ||
  //           (result.foundInDatabase
  //             ? result.cardInfo?.images?.large ||
  //               result.cardInfo?.images?.small ||
  //               result.cardInfo?.image
  //             : null),
  //         name: result.cardInfo?.name || result.title,
  //         number: result.cardInfo?.cardNumber || null,
  //         rarity: result.cardInfo?.rarity || result.aiAnalysis?.rarity,
  //         year: result.cardInfo?.year || result.aiAnalysis?.year,
  //         series:
  //           result.cardInfo?.expansion ||
  //           result.cardInfo?.series ||
  //           result.aiAnalysis?.series,
  //         // Các trường pokemon
  //         hp: result.cardInfo?.hp || null,
  //         type: result.cardInfo?.type || null,
  //         weakness: result.cardInfo?.weakness || null,
  //         resistance: result.cardInfo?.resistance || null,
  //         retreatCost: result.cardInfo?.retreatCost || null,
  //         attacks: result.cardInfo?.attacks || null,
  //         evolutionStatus: result.cardInfo?.evolutionStatus || null,
  //         // Các trường chung
  //         price: result.cardInfo?.price || null,
  //         description:
  //           result.cardInfo?.description ||
  //           result.aiAnalysis?.description ||
  //           null,
  //         cardType: result.aiAnalysis?.cardType || 'pokemon',
  //         condition: result.aiAnalysis?.condition || 'Unknown',
  //         sport: null,
  //       };
  //     }

  //     return responseData;
  //   } catch (error) {
  //     const message =
  //       error instanceof Error
  //         ? error.message
  //         : typeof error === 'string'
  //           ? error
  //           : 'Internal server error';

  //     throw new HttpException(
  //       {
  //         success: false,
  //         message,
  //         timestamp: new Date().toISOString(),
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Post('scan-search-full')
  // @ApiOperation({
  //   summary:
  //     'Scan and analyze card from image using GPT-4o Vision (returns full AI response)',
  // })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       image: {
  //         type: 'string',
  //         format: 'binary',
  //         description: 'Image file of the card',
  //       },
  //       language: {
  //         type: 'string',
  //         example: 'en',
  //         description:
  //           'Optional language code for AI response (en, ja, fr, ...)',
  //       },
  //       imageUrl: {
  //         type: 'string',
  //         example: 'https://example.com/card.jpg',
  //         description: 'Optional image URL if not uploading a file',
  //       },
  //     },
  //   },
  // })
  // @UseInterceptors(FileInterceptor('image'))
  // @ResponseMessage('Card scanned successfully')
  // async scanSearchCardByAIEndpoint(
  //   @UploadedFile() image: Express.Multer.File,
  //   @Body('language') language?: string,
  //   @Body('imageUrl') imageUrl?: string,
  // ) {
  //   if (!image && !imageUrl) {
  //     throw new HttpException(
  //       'Either image file or imageUrl must be provided',
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }

  //   const aiResult = await this.cardScannerService.scanSearchCardByAI(
  //     image,
  //     imageUrl,
  //     language,
  //   );
  //   //const aiResult = await this.cardScannerService.scanCardBasicAI(image, imageUrl, language);
  //   const formatted =
  //     await this.cardScannerService.formatScanSearchAIResponse(aiResult);

  //   if (formatted?.error || !formatted || Object.keys(formatted).length === 0) {
  //     throw new HttpException(
  //       formatted?.error ||
  //         'Failed to analyze card. Please try again with a clearer image.',
  //       HttpStatus.UNPROCESSABLE_ENTITY,
  //     );
  //   }

  //   if (!formatted.cardName || formatted.cardName === 'Unknown') {
  //     throw new HttpException(
  //       'Could not identify card name. Please try again with a clearer image.',
  //       HttpStatus.UNPROCESSABLE_ENTITY,
  //     );
  //   }

  //   return formatted;
  // }

  // @Post('scan-gemini')
  // @ApiOperation({
  //   summary: '🔮 Scan card using Gemini Vision (direct base64 upload)',
  //   description:
  //     'Scan and analyze a trading card by sending the image directly as base64 to Gemini. No URL required — faster and avoids public URL issues.',
  // })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       image: {
  //         type: 'string',
  //         format: 'binary',
  //         description: 'Image file of the card',
  //       },
  //       language: {
  //         type: 'string',
  //         example: 'en',
  //         description:
  //           'Optional language code for AI response (en, ja, fr, vi, ja, ...)',
  //       },
  //       imageUrl: {
  //         type: 'string',
  //         example: 'https://example.com/card.jpg',
  //         description: 'Optional image URL if not uploading a file',
  //       },
  //     },
  //   },
  // })
  // @UseInterceptors(FileInterceptor('image'))
  // @ResponseMessage('Card scanned successfully')
  // async scanCardWithGeminiEndpoint(
  //   @UploadedFile() image: Express.Multer.File,
  //   @Body('language') language?: string,
  //   @Body('imageUrl') imageUrl?: string,
  // ) {
  //   if (!image && !imageUrl) {
  //     throw new HttpException(
  //       'Either image file or imageUrl must be provided',
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }

  //   this.logger.log('🔮 Starting Gemini card scan (base64 direct)');
  //   const aiResult = await this.cardScannerService.scanCardWithGemini(
  //     image,
  //     imageUrl,
  //     language,
  //   );
  //   const formatted =
  //     await this.cardScannerService.formatScanSearchAIResponse(aiResult);

  //   if (formatted?.error || !formatted || Object.keys(formatted).length === 0) {
  //     throw new HttpException(
  //       formatted?.error ||
  //         'Failed to analyze card. Please try again with a clearer image.',
  //       HttpStatus.UNPROCESSABLE_ENTITY,
  //     );
  //   }

  //   if (!formatted.cardName || formatted.cardName === 'Unknown') {
  //     throw new HttpException(
  //       'Could not identify card name. Please try again with a clearer image.',
  //       HttpStatus.UNPROCESSABLE_ENTITY,
  //     );
  //   }

  //   return { formatted };
  // }

  // @Post('scan-search')
  // @ApiOperation({
  //   summary:
  //     'Scan and analyze card from image using GPT-4o Vision (returns full AI response)',
  // })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       image: {
  //         type: 'string',
  //         format: 'binary',
  //         description: 'Image file of the card',
  //       },
  //       language: {
  //         type: 'string',
  //         example: 'en',
  //         description:
  //           'Optional language code for AI response (en, ja, fr, ...)',
  //       },
  //       imageUrl: {
  //         type: 'string',
  //         example: 'https://example.com/card.jpg',
  //         description: 'Optional image URL if not uploading a file',
  //       },
  //     },
  //   },
  // })
  // @UseInterceptors(FileInterceptor('image'))
  // @ResponseMessage('Card scanned successfully')
  // async scanSearchCardByAIEndpointSimple(
  //   @UploadedFile() image: Express.Multer.File,
  //   @Body('language') language?: string,
  //   @Body('imageUrl') imageUrl?: string,
  // ) {
  //   if (!image && !imageUrl) {
  //     throw new HttpException(
  //       'Either image file or imageUrl must be provided',
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }
  //   //const aiResult = await this.cardScannerService.scanSearchCardByAI(image, imageUrl, language);
  //   const aiResult = await this.cardScannerService.scanCardBasicAI(
  //     image,
  //     imageUrl,
  //     language,
  //   );
  //   const formatted =
  //     await this.cardScannerService.formatScanSearchAIResponse(aiResult);

  //   if (formatted?.error || !formatted || Object.keys(formatted).length === 0) {
  //     throw new HttpException(
  //       formatted?.error ||
  //         'Failed to analyze card. Please try again with a clearer image.',
  //       HttpStatus.UNPROCESSABLE_ENTITY,
  //     );
  //   }

  //   if (!formatted.cardName || formatted.cardName === 'Unknown') {
  //     throw new HttpException(
  //       'Could not identify card name. Please try again with a clearer image.',
  //       HttpStatus.UNPROCESSABLE_ENTITY,
  //     );
  //   }

  //   return { formatted };
  // }

  @Post('scan-title-openrouter')
  @ApiOperation({
    summary: '🔍 Quét và lấy tên thẻ sử dụng OpenRouter',
    description:
      'Chụp ảnh thẻ, gửi qua OpenRouter để tách tên thẻ, sau đó tìm kiếm TCGplayer để lấy product ID.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file of the card',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  @ResponseMessage('Title extracted successfully')
  async scanTitleOpenRouter(@UploadedFile() image: Express.Multer.File) {
    if (!image) {
      throw new HttpException(
        'Image file must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.cardScannerService.scanTitleOpenRouter(
      image.buffer,
      image.originalname,
    );

    if (!result.success) {
      throw new HttpException(
        result.message || 'Could not extract title from image',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return {
      title: result.title,
      tcgplayerProductId: result.tcgplayerProductId ?? null,
      tcgplayerProductUrl: result.tcgplayerProductUrl ?? null,
      message: result.message,
    };
  }
}
