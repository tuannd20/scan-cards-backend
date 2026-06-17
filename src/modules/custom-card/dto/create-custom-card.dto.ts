import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SourceDto {
  @ApiProperty({ example: 'https://cdn.xxx.com/item.png' })
  @IsOptional()
  @IsString()
  url?: string;
}

class GenImageSourceDto {
  @ApiProperty({ example: 'https://cdn.xxx.com/item.png' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ example: 5526 })
  @IsOptional()
  @IsNumber()
  drawable?: number;
}

class GenDto {
  @ApiProperty({ example: 'sword.basic' })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiProperty({ type: GenImageSourceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GenImageSourceDto)
  imageSource?: GenImageSourceDto;
}

class SkillDto {
  @ApiProperty({ example: 'Skill name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Description of skill' })
  @IsOptional()
  @IsString()
  desc?: string;

  @ApiProperty({ example: '30' })
  @IsOptional()
  @IsString()
  damage?: string;
}

export class CreateCustomCardDto {
  @ApiProperty({ example: 'https://cdn.xxx.com/card_preview.jpg' })
  @IsString()
  previewImage: string;

  @ApiProperty({ type: SourceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SourceDto)
  itemSource?: SourceDto;

  @ApiProperty({ type: SourceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SourceDto)
  backgroundSource?: SourceDto & { color?: number };

  @ApiProperty({ type: GenDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GenDto)
  gen?: GenDto;

  @ApiProperty({ example: 0 })
  @IsOptional()
  @IsNumber()
  type?: number;

  @ApiProperty({ example: '120' })
  @IsOptional()
  @IsString()
  hp?: string;

  @ApiProperty({ example: 'Charizard' })
  @IsOptional()
  @IsString()
  cardName?: string;

  @ApiProperty({ example: 'Charmeleon' })
  @IsOptional()
  @IsString()
  preEvolution?: string;

  @ApiProperty({ example: [0, 1] })
  @IsOptional()
  @IsArray()
  skillType1?: number[];

  @ApiProperty({ example: [0, 1] })
  @IsOptional()
  @IsArray()
  skillType2?: number[];

  @ApiProperty({ example: [0, 1] })
  @IsOptional()
  @IsArray()
  skillType3?: number[];

  @ApiProperty({ example: [0, 1] })
  @IsOptional()
  @IsArray()
  retreatType?: number[];

  @ApiProperty({ example: 0 })
  @IsOptional()
  @IsNumber()
  weaknessType?: number;

  @ApiProperty({ example: 20 })
  @IsOptional()
  @IsNumber()
  weaknessValue?: number;

  @ApiProperty({ example: 0 })
  @IsOptional()
  @IsNumber()
  resistanceType?: number;

  @ApiProperty({ example: 30 })
  @IsOptional()
  @IsNumber()
  resistanceValue?: number;

  @ApiProperty({ example: 'Ken Sugimori' })
  @IsOptional()
  @IsString()
  illustrator?: string;

  @ApiProperty({ type: SkillDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SkillDto)
  skill1?: SkillDto;

  @ApiProperty({ type: SkillDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SkillDto)
  skill2?: SkillDto;

  @ApiProperty({ type: SkillDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SkillDto)
  skill3?: SkillDto;

  @ApiProperty({ example: [1, 0, 0, 0, 1, 0, 0, 0, 1] })
  @IsOptional()
  @IsArray()
  matrix?: number[];
}
