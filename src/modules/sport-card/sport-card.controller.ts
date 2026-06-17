import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SportCardService } from './sport-card.service';
import { CreateSportCardDto } from './dto/create-sport-card.dto';
import { UpdateSportCardDto } from './dto/update-sport-card.dto';

@Controller('sport-card')
export class SportCardController {
  constructor(private readonly sportCardService: SportCardService) {}

  @Post()
  create(@Body() createSportCardDto: CreateSportCardDto) {
    return this.sportCardService.create(createSportCardDto);
  }

  @Get()
  findAll() {
    return this.sportCardService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sportCardService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSportCardDto: UpdateSportCardDto) {
    return this.sportCardService.update(+id, updateSportCardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sportCardService.remove(+id);
  }
}
