import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadKeystoreModule } from './modules/upload-keystore/upload-keystore.module';
import { PokemonCardModule } from './modules/pokemon-card/pokemon-card.module';
import { ArticleModule } from './modules/article/article.module';
import { CardScannerModule } from './modules/card-scanner/card-scanner.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { CardNewModule } from './modules/card-new/card-new.module';
import { ScanModule } from './modules/scan/scan.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CardNewModule,
    // ScanModule,
    // UploadKeystoreModule,
    PokemonCardModule,
    ArticleModule,
    // CardScannerModule,
    // AiChatModule,

    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // Time window in milliseconds
        limit: 10, // Max requests per IP per window
      },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('DATABASE_URI') ||
          configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      connectionName: 'cardScanner',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const baseUri = configService.get<string>('DATABASE_CARD_SCANNER');
        if (!baseUri) {
          throw new Error('DATABASE_CARD_SCANNER is not configured');
        }

        const normalizedUri = baseUri.replace(/\/$/, '');
        return {
          uri: normalizedUri.endsWith('/card-scanner')
            ? normalizedUri
            : `${normalizedUri}/card-scanner`,
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
