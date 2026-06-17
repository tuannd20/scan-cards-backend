import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class PriceSnapshot {
  @Prop()
  recordedDate?: string;

  @Prop()
  marketPrice?: number;

  @Prop()
  averageSalePrice?: number;

  @Prop()
  salesCount?: number;

  @Prop()
  variant?: string;
}
export const PriceSnapshotSchema = SchemaFactory.createForClass(PriceSnapshot);

@Schema({ _id: false })
export class PriceHistory {
  @Prop()
  period?: string;

  @Prop()
  variant?: string;

  @Prop()
  lastFetchedAt?: string;

  @Prop({ type: [PriceSnapshotSchema], default: [] })
  snapshots?: PriceSnapshot[];
}
export const PriceHistorySchema = SchemaFactory.createForClass(PriceHistory);

@Schema({ _id: false })
export class CardAttack {
  @Prop()
  attackName?: string;

  @Prop()
  damage?: string;

  @Prop()
  effectText?: string;

  @Prop({ type: [String], default: [] })
  energyCostUrls?: string[];

  @Prop({ type: [String], default: [] })
  energyCostTypes?: string[];
}
export const CardAttackSchema = SchemaFactory.createForClass(CardAttack);

@Schema({ collection: 'pokemon_cards', timestamps: true })
export class PokemonCardCatalog extends Document {
  @Prop({ required: true, unique: true })
  collectorPath: string;

  @Prop()
  sourceId?: string;

  @Prop({ required: true, index: true })
  cardName: string;

  @Prop()
  imageUrl?: string;

  @Prop()
  hitPoints?: number;

  @Prop({ type: [String], default: [] })
  typeImageUrls?: string[];

  @Prop({ type: [String], default: [], index: true })
  typeNames?: string[];

  @Prop({ type: [CardAttackSchema], default: [] })
  attacks?: CardAttack[];

  @Prop()
  weaknessImageUrl?: string;

  @Prop({ index: true })
  weaknessType?: string;

  @Prop()
  resistanceImageUrl?: string;

  @Prop({ index: true })
  resistanceType?: string;

  @Prop()
  retreatCost?: number;

  @Prop({ index: true })
  setName?: string;

  @Prop({ index: true })
  cardNumber?: string;

  @Prop({ index: true })
  rarity?: string;

  @Prop()
  illustrator?: string;

  @Prop()
  regulationMark?: string;

  @Prop()
  edition?: string;

  @Prop({ index: true })
  marketPrice?: number;

  @Prop()
  evolutionStage?: string;

  @Prop()
  evolvesFrom?: string;

  @Prop()
  cardDescription?: string;

  @Prop({ sparse: true, unique: true })
  tcgplayerProductId?: number;

  @Prop()
  tcgplayerCardName?: string;

  @Prop()
  tcgplayerSetName?: string;

  @Prop()
  tcgplayerCardNumber?: string;

  @Prop()
  tcgplayerUrl?: string;

  @Prop({ type: PriceHistorySchema })
  priceHistory?: PriceHistory;
}

export type PokemonCardCatalogDocument = PokemonCardCatalog & Document;
export const PokemonCardCatalogSchema =
  SchemaFactory.createForClass(PokemonCardCatalog);

PokemonCardCatalogSchema.index({ setName: 1, cardNumber: 1 });
PokemonCardCatalogSchema.index({ cardName: 'text', setName: 'text' });
