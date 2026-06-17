import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PokemonCardCatalog,
  PokemonCardCatalogSchema,
} from './schemas/pokemon-card-catalog.schema';
import { PokemonCardCatalogService } from './pokemon-card-catalog.service';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: PokemonCardCatalog.name, schema: PokemonCardCatalogSchema }],
      'cardScanner',
    ),
  ],
  providers: [PokemonCardCatalogService],
  exports: [PokemonCardCatalogService],
})
export class PokemonCardCatalogModule {}
