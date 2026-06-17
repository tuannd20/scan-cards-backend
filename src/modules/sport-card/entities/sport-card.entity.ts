import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class GradeStats {
  @Prop()
  allEndAvgSalePrice: number;

  @Prop()
  lastSaleDate: string;

  @Prop()
  last30SalePriceChangePercentage: number;

  @Prop()
  last30SalePriceChangeAmount: number;

  @Prop()
  last14AvgSalePrice: number;
}

@Schema({ _id: false })
export class Grade {
  @Prop()
  card_id: number;

  @Prop()
  card_query: string;

  @Prop()
  grade_name: string;

  @Prop()
  grade_id: number;

  @Prop({ type: GradeStats })
  stats: GradeStats;

  @Prop()
  status: string;
}

@Schema({ _id: false })
export class Trend {
  @Prop()
  seven_day: number;

  @Prop()
  fourteen_day: number;

  @Prop()
  thirty_day: number;
}

@Schema({ _id: false })
export class Card {
  @Prop()
  indexedAt: string;

  @Prop()
  id: string;

  @Prop()
  collectible_id: string;

  @Prop()
  index_id: string;

  @Prop()
  global_rank: number;

  @Prop()
  org_global_rank: number;

  @Prop()
  rank_score: number;

  @Prop()
  org_sport_rank: number;

  @Prop()
  sport_rank: number;

  @Prop()
  price_score: string;

  @Prop()
  excluded: boolean;

  @Prop()
  popularity_score: number;

  @Prop({ type: Trend })
  trend: Trend;

  @Prop()
  set_id: number;

  @Prop()
  set_name: string;

  @Prop()
  set_year: string;

  @Prop()
  sport: string;

  @Prop()
  sport_id: number;

  @Prop()
  image_url: string;

  @Prop()
  slug_shallow: string;

  @Prop()
  slug_structured: string;

  @Prop()
  legacy_id: string;

  @Prop()
  player: string;

  @Prop()
  player_id: number;

  @Prop()
  variation: string;

  @Prop()
  variation_id: number;

  @Prop()
  print_run: string;

  @Prop()
  is_rc: boolean;

  @Prop()
  card_number: string;

  @Prop()
  specific_qualifier: string;

  @Prop()
  default_grade_card_id: number;

  @Prop({ type: [Grade] })
  grades: Grade[];

  @Prop()
  set_variation_id: number;

  @Prop()
  master_card_id: number;

  @Prop()
  status: string;
}

@Schema()
export class PlayerCardGroup extends Document {
  @Prop()
  playerName: string;

  @Prop()
  playerId: number;

  @Prop()
  sport: string;

  @Prop({ type: [Card] })
  cards: Card[];
}

export const GradeStatsSchema = SchemaFactory.createForClass(GradeStats);
export const GradeSchema = SchemaFactory.createForClass(Grade);
export const TrendSchema = SchemaFactory.createForClass(Trend);
export const CardSchema = SchemaFactory.createForClass(Card);
export const PlayerCardGroupSchema = SchemaFactory.createForClass(PlayerCardGroup);
