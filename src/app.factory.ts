import { ValidationPipe } from '@nestjs/common';
import { AbstractHttpAdapter, NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as path from 'path';
import { AppModule } from './app.module';
import { configSwagger } from './configs/api-docs.config';
import { ResponseInterceptor } from './interceptors/response.interceptor';

export async function createConfiguredApp(httpAdapter?: AbstractHttpAdapter) {
  const app = httpAdapter
    ? await NestFactory.create<NestExpressApplication>(AppModule, httpAdapter)
    : await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  return app;
}

export function configureApp(app: NestExpressApplication) {
  const reflector = app.get(Reflector);

  app.useGlobalInterceptors(new ResponseInterceptor(reflector));
  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: '*',
  });

  configSwagger(app);

  app.useStaticAssets(join(__dirname, './served'));
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
}
