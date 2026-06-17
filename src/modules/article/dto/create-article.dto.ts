
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ArticleSectionDto {
  @ApiProperty({ description: 'Section heading', required: false })
  @IsOptional()
  @IsString()
  heading?: string;

  @ApiProperty({ description: 'Section content', required: false })
  @IsOptional()
  @IsString()
  content?: string;


  @ApiProperty({ description: 'Section image URL', required: false })
  @IsOptional()
  @IsString()
  image?: string;
}


export class CreateArticleDto {
  @ApiProperty({ description: 'Article title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Banner image URL', required: false })
  @IsOptional()

  @IsString()
  bannerUrl?: string;

  @ApiProperty({ description: 'Article description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Article type', enum: ['pokemon', 'sports'], required: false })
  @IsOptional()
  @IsString()
  type?: 'pokemon' | 'sports';

  @ApiProperty({ description: 'Card number for search', required: false })
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @ApiProperty({ 
    description: 'Article sections', 
    type: [ArticleSectionDto],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleSectionDto)
  sections?: ArticleSectionDto[];

}
