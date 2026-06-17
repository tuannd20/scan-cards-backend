import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSportCardDto } from './dto/create-sport-card.dto';
import { UpdateSportCardDto } from './dto/update-sport-card.dto';
import { PlayerCardGroup } from './entities/sport-card.entity';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class SportCardService {
  create(createSportCardDto: CreateSportCardDto) {
    return 'This action adds a new sportCard';
  }

  findAll() {
    return `This action returns all sportCard`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sportCard`;
  }

  update(id: number, updateSportCardDto: UpdateSportCardDto) {
    return `This action updates a #${id} sportCard`;
  }

  remove(id: number) {
    return `This action removes a #${id} sportCard`;
  }
}
