import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChatWithAIDto {
  @ApiProperty({
    description: 'Tin nhắn hoặc câu hỏi của bạn về thẻ bài (tùy chọn nếu chỉ gửi ảnh)',
    example: 'Thẻ này có giá trị bao nhiều? Nó thuộc loại nào?',
    required: false,
    minLength: 1
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Tin nhắn không được để trống' })
  message?: string;

  @ApiProperty({
    description: 'Mảng các tin nhắn trước đó để AI có context (tùy chọn)',
    example: '[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi there!"}]',
    required: false
  })
  @IsOptional()
  @IsString()
  messages?: string; // JSON string của array messages

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Ảnh thẻ bài để AI phân tích (tùy chọn)',
    required: false,
  })
  @IsOptional()
  image?: any;
}

export class SearchCardByAIDto {
  @ApiProperty({
    description: 'Tên thẻ cần tìm kiếm bằng AI',
    example: 'Charizard ex',
    required: true,
    minLength: 1
  })
  @IsString()
  @MinLength(1, { message: 'Tên thẻ không được để trống' })
  cardName: string;

  @ApiProperty({
    description: 'Mảng các tin nhắn trước đó để AI có context (tùy chọn)',
    example: '[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi there!"}]',
    required: false
  })
  @IsOptional()
  @IsString()
  messages?: string; // JSON string của array messages
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | any[];
  timestamp?: string;
  hasImage?: boolean;
}

export interface CardInfo {
  id?: number;
  name: string;
  sport?: string;
  year?: string;
  brand?: string;
  cardNumber?: string;
  playerTeam?: string;
  cardType?: string;
  condition?: string;
  price?: string;
  rarity?: string;
  set?: string;
  series?: string;
  category?: string;
  artist?: string;
  releaseDate?: string;
  hp?: string;
  stage?: string;
  weakness?: string;
  resistance?: string;
  retreatCost?: string;
  attacks?: string;
  pokemonType?: string;
  description?: string;
  imageUrl?: string;
  detected: boolean;
  confidence?: number;
}

export interface ChatResponse {
  reply: string;
  cardInfo: CardInfo | {}; // Luôn trả về object, không bao giờ null
  processingTime?: string;

  messageCount: number;
}
