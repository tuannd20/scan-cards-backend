import { ApiProperty } from '@nestjs/swagger';

export class ItemDataDto {
  @ApiProperty({ 
    type: [String],
    description: 'Array of item image URLs',
    example: [
      'https://upload-services.limgrow.com/uploads/l-cross-003-fitness/7881b503-04e7-40ef-9387-b54854eb619b.png',
      'https://upload-services.limgrow.com/uploads/l-cross-003-fitness/7881b503-04e7-40ef-9387-b54854eb619b.png'
    ]
  })
  url: string[];
}
