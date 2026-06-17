import { IsString, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateArticleSectionDto {
  @ApiProperty({ description: 'Section type', enum: ['heading', 'content'] })
  @IsString()
  type: 'heading' | 'content';

  @ApiProperty({ description: 'Heading text (for heading type)', required: false })
  @IsOptional()
  @IsString()
  heading?: string;

  @ApiProperty({ description: 'Content text' })
  @IsString()
  content: string;
}

export class UpdateArticleDetailsDto {
  @ApiProperty({ description: 'Published date', required: false })
  @IsOptional()
  @IsDateString()
  publishedDate?: string;

  @ApiProperty({ 
    description: 'Article sections with headings and content', 
    type: [UpdateArticleSectionDto],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateArticleSectionDto)
  sections?: UpdateArticleSectionDto[];
}
