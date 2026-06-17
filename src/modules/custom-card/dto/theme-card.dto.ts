import { ApiProperty } from '@nestjs/swagger';

export class ThemeCardDto {
  @ApiProperty({ description: 'Card name in format baseSet - subtype - type', example: 'scarletAndViolet - basic - grass' })
  name: string;

  @ApiProperty({ description: 'Uploaded image URL', example: 'https://upload-services.limgrow.com/....png' })
  url: string;

  @ApiProperty({ description: 'Card type parsed from name (e.g. basic, stage1)', example: 'basic' })
  cardType?: string;

  @ApiProperty({ description: 'Base set parsed from name (e.g. scarletAndViolet)', example: 'scarletAndViolet' })
  baseSet?: string;
}
