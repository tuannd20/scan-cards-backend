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
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiExcludeEndpoint()
  @SetMetadata('skipResponse', true)
  getApiDocs(@Res({ passthrough: true }) response: Response): string {
    const result = this.appService.getApiDocsHtml();

    response.status(result.statusCode).type('text/html; charset=utf-8');

    return result.html;
  }

  @Get('/error')
  @ApiExcludeEndpoint()
  throwError(): string {
    throw new HttpException('Custom error occurred', HttpStatus.BAD_REQUEST);
  }
}
