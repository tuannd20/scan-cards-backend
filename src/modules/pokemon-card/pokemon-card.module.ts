import { Module } from '@nestjs/common';
import { PokemonCardService } from './pokemon-card.service';
import { PokemonCardController } from './pokemon-card.controller';
import { HttpModule } from '@nestjs/axios';
import { PokemonCardCatalogModule } from '../pokemon-card-catalog/pokemon-card-catalog.module';

@Module({
  imports: [HttpModule, PokemonCardCatalogModule],
  controllers: [PokemonCardController],
  providers: [PokemonCardService],
  exports: [PokemonCardService],
})
export class PokemonCardModule {}
