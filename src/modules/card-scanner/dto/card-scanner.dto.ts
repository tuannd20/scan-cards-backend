import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';

export enum CardTypeEnum {
  POKEMON = 'pokemon',
  SPORT = 'sport',
}

export class UploadCardImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Ảnh thẻ cần quét (JPEG, PNG, WebP)',
    required: true,
  })
  image: any;

  @ApiProperty({
    enum: CardTypeEnum,
    description: 'Loại thẻ để tìm kiếm nhanh hơn (tùy chọn)',
    required: false,
    example: CardTypeEnum.POKEMON,
  })
  @IsOptional()
  @IsEnum(CardTypeEnum)
  cardType?: CardTypeEnum;

  @ApiProperty({
    description: 'Mã ngôn ngữ (tùy chọn)',
    example: 'vi',
    required: false, // Make language optional in Swagger
  })
  @IsOptional()
  language?: string;
}

export class UploadMultipleCardImagesDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Nhiều ảnh thẻ cần quét (tối đa 10 ảnh)',
    required: true,
  })
  images: any[];
  language: string;
}

export class ScanCardFromPathDto {
  @ApiProperty({
    description: 'Đường dẫn đến file ảnh',
    example: '/path/to/card/image.jpg',
    required: true,
  })
  imagePath: string;

  @ApiProperty({
    description: 'Tên file (tùy chọn)',
    example: 'pikachu-card.jpg',
    required: false,
  })
  filename?: string;

  @ApiProperty({
    enum: CardTypeEnum,
    description: 'Loại thẻ để tìm kiếm nhanh hơn (tùy chọn)',
    required: false,
    example: CardTypeEnum.POKEMON,
  })
  @IsOptional()
  @IsEnum(CardTypeEnum)
  cardType?: CardTypeEnum;
}
