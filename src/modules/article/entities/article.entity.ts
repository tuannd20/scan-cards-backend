import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';


@Schema({ _id: false })
export class ArticleSection {
  @Prop()
  heading?: string; // Optional heading

  @Prop()
  content?: string; // Optional content

  @Prop()
  image?: string; // Optional image URL
}
export const ArticleSectionSchema = SchemaFactory.createForClass(ArticleSection);


@Schema({ _id: false })
export class ArticleTranslation {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: [ArticleSectionSchema], default: [] })
  sections: ArticleSection[];
}
export const ArticleTranslationSchema = SchemaFactory.createForClass(ArticleTranslation);



@Schema({ timestamps: true })
export class Article extends Document {
  @Prop({ required: true })
  title: string;


  @Prop()
  bannerUrl?: string; // Optional banner URL

  @Prop()
  description?: string; // Optional description

  @Prop({ enum: ['pokemon', 'sports'], required: false })
  type?: string; // Optional type: 'pokemon' or 'sports'

  @Prop()
  cardNumber?: string; // Optional card number for search

  @Prop({ type: [ArticleSection], default: [] })
  sections: ArticleSection[]; // List of sections, all fields optional


  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: MongooseSchema.Types.Map,
    of: ArticleTranslationSchema,
    required: true,
  })
  translations: Map<string, ArticleTranslation>;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);
