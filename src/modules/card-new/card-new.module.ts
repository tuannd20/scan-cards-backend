import { Module } from '@nestjs/common';
import { CardNewController } from './card-new.controller';
import { CardNewService } from './card-new.service';

@Module({
  controllers: [CardNewController],
  providers: [CardNewService],
  exports: [CardNewService],
})
export class CardNewModule {}
