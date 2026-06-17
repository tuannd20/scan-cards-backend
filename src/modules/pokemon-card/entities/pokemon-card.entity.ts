import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Attack {
  @Prop()
  name: string;

  @Prop()
  damage: string;

  @Prop()
  description: string;

  @Prop([String])
  energy: string[];
}
export const AttackSchema = SchemaFactory.createForClass(Attack);

@Schema({ _id: false })
export class PokemonTranslation {
  @Prop({ required: true })
  name: string;

  @Prop([String])
  type: string[];

  @Prop({ type: [AttackSchema], default: [] })
  attacks: Attack[];

  @Prop()
  weakness: string;

  @Prop()
  resistance: string;

  @Prop()
  expansion: string;

  @Prop()
  rarity: string;

  @Prop()
  cardFormat: string;

  @Prop()
  evolutionStatus: string;
}
export const PokemonTranslationSchema = SchemaFactory.createForClass(PokemonTranslation);

@Schema()
export class Pokemon extends Document {
  @Prop()
  href: string;

  @Prop()
  name: string;

  @Prop()
  image: string;

  @Prop()
  hp: string;

  @Prop([String])
  type: string[];

  @Prop({ type: [Object] })
  attacks: Attack[];

  @Prop()
  weakness: string;

  @Prop()
  resistance: string;

  @Prop()
  retreatCost: string;

  @Prop()
  expansion: string;

  @Prop()
  cardNumber: string;

  @Prop()
  rarity: string;

  @Prop()
  illustrator: string;

  @Prop()
  regulationMark: string;

  @Prop()
  cardFormat: string;

  @Prop()
  price: string;

  @Prop()
  evolutionStatus: string;
}

export const PokemonSchema = SchemaFactory.createForClass(Pokemon);
