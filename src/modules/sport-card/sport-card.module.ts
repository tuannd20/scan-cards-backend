import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SportCardService } from './sport-card.service';
import { SportCardController } from './sport-card.controller';
import { PlayerCardGroup, PlayerCardGroupSchema } from './entities/sport-card.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlayerCardGroup.name, schema: PlayerCardGroupSchema }
    ])
  ],
  controllers: [SportCardController],
  providers: [SportCardService],
})
export class SportCardModule {}
