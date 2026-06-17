import { Module } from '@nestjs/common';
import { CustomCardService } from './custom-card.service';
import { CustomCardController } from './custom-card.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomCard, CustomCardSchema } from './schemas/custom-card.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: CustomCard.name, schema: CustomCardSchema }])],
  controllers: [CustomCardController],
  providers: [CustomCardService],
  exports: [CustomCardService],
})
export class CustomCardModule {}
