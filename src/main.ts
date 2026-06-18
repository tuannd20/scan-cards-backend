import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.factory';

async function bootstrap() {
  const logger = new Logger(bootstrap.name);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  const port = process.env.PORT || 4000;

  await app.listen(port, () =>
    logger.log(`🚀 Server running on: http://localhost:${port}/api-docs`),
  );
}
bootstrap();
