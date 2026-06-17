import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { configSwagger } from './configs/api-docs.config';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import * as path from 'path';  // ✅ thêm dòng này, bỏ import default

async function bootstrap() {
  const logger = new Logger(bootstrap.name);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const reflector = app.get(Reflector);

  app.useGlobalInterceptors(new ResponseInterceptor(reflector));
  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: '*',
  });

  configSwagger(app);

  // static cho served
  app.useStaticAssets(join(__dirname, './served'));

  // static cho uploads
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port, () =>
    logger.log(`🚀 Server running on: http://localhost:${port}/api-docs`),
  );
}
bootstrap();
