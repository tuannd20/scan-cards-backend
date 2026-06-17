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
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AiChatService } from './ai-chat.service';
import { ResponseMessage } from '../../decorators/response-message.decorator';
import { ChatWithAIDto, SearchCardByAIDto } from './dto/ai-chat.dto';

@ApiTags('🤖 AI Chat Assistant')
@Controller('ai-chat')
export class AiChatController {
  private readonly logger = new Logger(AiChatController.name);

  constructor(private readonly aiChatService: AiChatService) {}

  @Post('message')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: ' Chat với AI chuyên gia thẻ bài',
    description: 'Chat với AI chuyên gia về Pokemon và Sport cards. Có thể gửi tin nhắn text hoặc kèm theo ảnh thẻ để AI phân tích và tư vấn.'
  })
  @ApiBody({
    description: ' Tin nhắn chat (text) hoặc kèm ảnh thẻ',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Tin nhắn hoặc câu hỏi của bạn về thẻ bài (tùy chọn nếu chỉ gửi ảnh)',
          example: 'Thẻ này có giá trị bao nhiều? Nó thuộc loại hiếm không?'
        },
        messages: {
          type: 'string',
          description: 'JSON string chứa mảng các tin nhắn trước đó (tùy chọn)',
          example: '[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi!"}]'
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh thẻ bài để AI phân tích (tùy chọn)'
        },
        aiChat: {
          type: 'boolean',
          description: 'Chọn AI chat (true/false, có thể để trống)',
          example: true,
          nullable: true
        },
        language: {
          type: 'string',
          description: 'Language Code',
          example: 'vi'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Chat thành công',
    schema: {
      example: {
        reply: "Tôi đã tìm thấy thông tin về Pikachu ex! Bạn muốn biết thêm điều gì về thẻ này không? Giá hiện tại: $75. Độ hiếm: Ultra Rare. Tình trạng: Near Mint.",
        cardInfo: {
          id: 123,
          name: "Pikachu ex",
          cardType: "pokemon",
          rarity: "Ultra Rare",
          price: "$75",
          condition: "Near Mint",
          year: "2016",
          series: "XY Evolutions",
          hp: "170",
          pokemonType: "Lightning",
          weakness: "Fighting",
          resistance: null,
          retreatCost: "1",
          detected: true,
          confidence: 0.95,
          imageUrl: "https://example.com/pikachu-ex.jpg"
        },
        conversationId: "chat_1691234567_a1b2c3d4",
        timestamp: "2025-08-04T08:45:30.123Z",
        processingTime: "2.3s",
   
        messageCount: 5
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Lỗi request không hợp lệ',
    schema: {
      example: {
        success: false,
        message: "Vui lòng gửi tin nhắn hoặc ảnh"
      }
    }
  })
  @UseInterceptors(FileInterceptor('image'))
  @ResponseMessage('Chat với AI thành công')
  async chatWithAI(
    @Body('message') message?: string,
    @Body('messages') messages?: string,
    @Body('aiChat') aiChat?: boolean,
    @UploadedFile() image?: Express.Multer.File,
    @Body('language') language?: string
  ) {
    try {
      if (!message && !image) {
        throw new HttpException('❌ Vui lòng gửi tin nhắn hoặc ảnh', HttpStatus.BAD_REQUEST);
      }

      if (image) {
        // Validate image if provided
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(image.mimetype)) {
          throw new HttpException(
            '❌ Loại file không hợp lệ. Chỉ chấp nhận ảnh JPEG, PNG, và WebP.',
            HttpStatus.BAD_REQUEST,
          );
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (image.size > maxSize) {
          throw new HttpException(
            '❌ File quá lớn. Kích thước tối đa là 10MB.',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Luôn dùng AI cho endpoint này
      const useAI = true;

      // Call chat service
      const response = await this.aiChatService.chatWithAI(message, messages, image, aiChat ?? false, language);

      return response;
    } catch (error) {
      this.logger.error(`❌ AI Chat error: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('search-card')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: '🔍 Tìm kiếm thông tin thẻ bằng AI',
    description: 'Sử dụng AI để tìm kiếm thông tin chi tiết về thẻ bài khi database không có kết quả như mong muốn. AI sẽ trả về thông tin đầy đủ về thẻ bao gồm giá trị, độ hiếm, attacks, và nhiều thông tin khác.'
  })
  @ApiBody({
    description: '🔍 Tìm kiếm thẻ bằng AI (text) hoặc kèm ảnh thẻ',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Tin nhắn hoặc câu hỏi của bạn về thẻ bài (tùy chọn nếu chỉ gửi ảnh)',
          example: 'Tìm kiếm thông tin về Charizard ex'
        },
        messages: {
          type: 'string',
          description: 'JSON string chứa mảng các tin nhắn trước đó (tùy chọn)',
          example: '[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi!"}]'
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh thẻ bài để AI phân tích và tìm kiếm (tùy chọn)'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Tìm kiếm thẻ bằng AI thành công',
    schema: {
      example: {
        reply: "I found information about Charizard ex! Would you like to know anything else about this card? Current price: $50-100. Rarity: Rare Holo. Condition: Near Mint.",
        cardInfo: {
          title: "Charizard ex",
          foundInDatabase: false,
          imageUrl: null,
          name: "Charizard ex",
          number: "006/165",
          rarity: "Rare Holo",
          year: "2023",
          series: "151",
          hp: "180",
          type: ["Fire"],
          weakness: "Water",
          resistance: null,
          retreatCost: "2",
          attacks: [
            {
              name: "Fire Blast",
              damage: "120",
              description: "Discard an Energy from this Pokémon.",
              energy: ["Fire", "Fire", "Colorless"]
            }
          ],
          evolutionStatus: "ex",
          price: "$50-100",
          description: "Charizard ex is a powerful Fire-type Pokémon card with high HP and devastating attacks.",
          cardType: "pokemon",
          condition: "Near Mint",
          sport: null
        },
        processingTime: "2.15s",
        messageCount: 2
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: '❌ Lỗi request không hợp lệ',
    schema: {
      example: {
        success: false,
        message: "Vui lòng cung cấp tên thẻ cần tìm kiếm"
      }
    }
  })
  @UseInterceptors(FileInterceptor('image'))
  @ResponseMessage('Tìm kiếm thẻ bằng AI thành công')
  async searchCardByAI(
    @Body('message') message?: string,
    @Body('messages') messages?: string,
    @UploadedFile() image?: Express.Multer.File,
    @Body('language') language?: string
  ) {
    try {
      if (!message && !image) {
        throw new HttpException('❌ Vui lòng gửi tin nhắn hoặc ảnh', HttpStatus.BAD_REQUEST);
      }

      if (image) {
        // Validate image if provided
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(image.mimetype)) {
          throw new HttpException(
            '❌ Loại file không hợp lệ. Chỉ chấp nhận ảnh JPEG, PNG, và WebP.',
            HttpStatus.BAD_REQUEST,
          );
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (image.size > maxSize) {
          throw new HttpException(
            '❌ File quá lớn. Kích thước tối đa là 10MB.',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Use default message for search if only image is provided
      const finalMessage = message || 'Hãy tìm kiếm thông tin chi tiết về thẻ bài này.';

      this.logger.log(`🔍 New AI card search request - Message: "${(message || 'Chỉ ảnh').substring(0, 50)}${(message?.length || 0) > 50 ? '...' : ''}", Has Image: ${!!image}, Has Messages: ${!!messages}`);

      // Call search service with AI search logic
      const response = await this.aiChatService.searchCardByAI(finalMessage,messages ?? '',language || 'EN',image );

      return response;
    } catch (error) {
      this.logger.error(`❌ AI Card Search error: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('rock-identifier')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Chat với AI để nhận diện đá (rock identifier)', description: 'Gửi câu hỏi, hội thoại trước đó và/hoặc ảnh đá để AI nhận diện và mô tả loại đá.' })
  @ApiBody({
    description: 'Câu hỏi về đá, hội thoại trước đó, ảnh đá (tùy chọn)',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Câu hỏi hoặc mô tả về đá (tùy chọn nếu chỉ gửi ảnh)',
          example: 'Đây là loại đá gì? Nó có giá trị không?'
        },
        messages: {
          type: 'string',
          description: 'JSON string chứa mảng các tin nhắn trước đó (tùy chọn)',
          example: '[{"role":"user","content":"Hi"}]'
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh đá (tùy chọn)'
        },
        aiChat: {
          type: 'boolean',
          description: 'Chọn AI chat (true/false, có thể để trống)',
          example: true,
          nullable: true
        },
        language: {
          type: 'string',
          description: 'Mã ngôn ngữ (EN, VI, ...)',
          example: 'vi'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: '✅ Nhận diện đá thành công', schema: { example: { reply: 'This is granite...', cardInfo: {}, processingTime: 'N/A', messageCount: 2 } } })
  @ApiResponse({ status: 400, description: '❌ Lỗi request không hợp lệ', schema: { example: { success: false, message: 'Vui lòng gửi tin nhắn, hội thoại hoặc ảnh.' } } })
  @UseInterceptors(FileInterceptor('image'))
  @ResponseMessage('Nhận diện đá thành công')
  async chatWithAIRock(
    @Body('message') message?: string,
    @Body('messages') messages?: string,
    @Body('aiChat') aiChat?: boolean,
    @UploadedFile() image?: Express.Multer.File,
    @Body('language') language?: string
  ) {
    try {
      if (!message && !messages && !image) {
        throw new HttpException('❌ Vui lòng gửi tin nhắn, hội thoại hoặc ảnh.', HttpStatus.BAD_REQUEST);
      }
      // Gọi service, truyền đủ các trường như chatWithAI
      const response = await this.aiChatService.chatWithAIRock(messages, image, language, message);
      return response;
    } catch (error) {
      this.logger.error(`❌ AI Rock Identifier error: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}
