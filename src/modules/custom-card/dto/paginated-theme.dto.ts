import { ApiProperty } from '@nestjs/swagger';
import { ThemeCardDto } from './theme-card.dto';

export class PaginatedThemeDto {
  @ApiProperty({ type: [ThemeCardDto] })
  data: ThemeCardDto[];

  @ApiProperty({ example: 308 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 16 })
  totalPages: number;
}
