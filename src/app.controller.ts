import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Res,
  SetMetadata,
} from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @SetMetadata('skipResponse', true)
  getApiDocs(@Res({ passthrough: true }) response: Response): string {
    const result = this.appService.getApiDocsHtml();

    response.status(result.statusCode).type('text/html; charset=utf-8');

    return result.html;
  }

  @Get('/error')
  throwError(): string {
    throw new HttpException('Custom error occurred', HttpStatus.BAD_REQUEST);
  }
}
