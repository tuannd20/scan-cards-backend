import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

class Source {
  @Prop({ type: String, default: null })
  url?: string | null;

  @Prop({ type: Number, default: null })
  color?: number | null;
}

class GenImageSource {
  @Prop({ type: String, default: null })
  url?: string | null;

  @Prop({ type: Number, default: null })
  drawable?: number | null;
}

class Gen {
  @Prop({ type: String, default: null })
  key?: string | null;

  @Prop({ type: Object })
  imageSource?: GenImageSource | null;
}

class Skill {
  @Prop({ type: String, default: null })
  name?: string | null;

  @Prop({ type: String, default: null })
  desc?: string | null;

  @Prop({ type: String, default: null })
  damage?: string | null;
}

@Schema({ timestamps: true })
export class CustomCard {
  @Prop({ required: true })
  previewImage: string;

  @Prop({ type: Number, default: 0 })
  like?: number | null;

  @Prop({ type: Number, default: 0 })
  downloads?: number | null;
  
  @Prop({ type: Object, default: null })
  itemSource?: Source | null;

  @Prop({ type: Object, default: null })
  backgroundSource?: Source | null;

  @Prop({ type: Object, default: null })
  gen?: Gen | null;

  @Prop({ type: Number, default: null })
  type?: number | null;

  @Prop({ type: String, default: null })
  hp?: string | null;

  @Prop({ type: String, default: null })
  cardName?: string | null;

  @Prop({ type: String, default: null })
  preEvolution?: string | null;

  @Prop({ type: [Number], default: null })
  skillType1?: number[] | null;

  @Prop({ type: [Number], default: null })
  skillType2?: number[] | null;

  @Prop({ type: [Number], default: null })
  skillType3?: number[] | null;

  @Prop({ type: [Number], default: null })
  retreatType?: number[] | null;

  @Prop({ type: Number, default: null })
  weaknessType?: number | null;

  @Prop({ type: Number, default: null })
  weaknessValue?: number | null;

  @Prop({ type: Number, default: null })
  resistanceType?: number | null;

  @Prop({ type: Number, default: null })
  resistanceValue?: number | null;

  @Prop({ type: String, default: null })
  illustrator?: string | null;

  @Prop({ type: Object, default: null })
  skill1?: Skill | null;

  @Prop({ type: Object, default: null })
  skill2?: Skill | null;

  @Prop({ type: Object, default: null })
  skill3?: Skill | null;

  @Prop({ type: [Number], default: null })
  matrix?: number[] | null;
}

export type CustomCardDocument = CustomCard & Document;
export const CustomCardSchema = SchemaFactory.createForClass(CustomCard);
