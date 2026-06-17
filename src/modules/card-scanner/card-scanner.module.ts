import { Module } from '@nestjs/common';
import { CardScannerService } from './card-scanner.service';

import { PokemonCardModule } from '../pokemon-card/pokemon-card.module';
import { CardNewModule } from '../card-new/card-new.module';
import { CardScannerController } from './card-scanner.controller';

@Module({
  imports: [PokemonCardModule, CardNewModule],
  controllers: [CardScannerController],
  providers: [CardScannerService],
  exports: [CardScannerService],
})
export class CardScannerModule {}
