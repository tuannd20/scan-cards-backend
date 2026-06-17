import { ApiProperty } from '@nestjs/swagger';

export class PaginatedBackgroundDto {
  @ApiProperty({
    type: [String],
    description: 'Flattened array of background image URLs for the current page',
    example: [
      'https://upload-services.limgrow.com/uploads/l-cross-003-fitness/7881b503-04e7-40ef-9387-b54854eb619b.png',
      'https://upload-services.limgrow.com/uploads/l-cross-003-fitness/7881b503-04e7-40ef-9387-b54854eb619b.png'
    ]
  })
  data: string[];

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
