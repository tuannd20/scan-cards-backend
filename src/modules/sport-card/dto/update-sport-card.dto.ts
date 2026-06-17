import { PartialType } from '@nestjs/mapped-types';
import { CreateSportCardDto } from './create-sport-card.dto';

export class UpdateSportCardDto extends PartialType(CreateSportCardDto) {}
