import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CardNewService } from './card-new.service';
import { ResponseMessage } from '../../decorators/response-message.decorator';


@ApiTags('card-new')
@Controller('card-new')
export class CardNewController {
  constructor(private readonly cardNewService: CardNewService) {}

  @Post('scan-card')
  @ApiOperation({
    summary: 'Scan card image with OpenRouter and return full card JSON',
    description:
      'Upload a card image and analyze it with OpenRouter vision, returning the full normalized card payload.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file of the card',
        },
        language: {
          type: 'string',
          description: 'Optional language code for translated text fields (vi, en, ja, fr, ...)',
        },
      },
      required: ['image'],
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  @ResponseMessage('Card scanned successfully')
  async scanCardOpenRouter(
    @UploadedFile() image: Express.Multer.File,
    @Body('language') language?: string,
  ): Promise<any> {
    if (!image) {
      throw new HttpException(
        'Image file must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.cardNewService.scanCardOpenRouter(
      image.buffer,
      image.originalname,
      language,
    );

    if (!result.success || !result.data) {
      throw new HttpException(
        result.message || 'Could not scan card from image',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return result.data;
  }

  @Get('get-all')
  @ApiOperation({
    summary: 'Get cards from pokemon, yugioh, soccer or all categories',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'all | pokemon | yugioh | soccer (default: all)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Optional. If provided, pagination will be enabled',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Optional. Default 20 when pagination is enabled',
  })
  getAll(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = page !== undefined ? Number(page) : undefined;
    const limitNumber = limit !== undefined ? Number(limit) : undefined;

    return this.cardNewService.getAllCards({
      type,
      page: pageNumber,
      limit: limitNumber,
    });
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search cards in one category file',
  })
  @ApiQuery({
    name: 'type',
    required: true,
    description: 'pokemon | yugioh | soccer',
  })
  @ApiQuery({
    name: 'search',
    required: true,
    description: 'Keyword for searching cards in selected type',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Optional. If provided, pagination will be enabled',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Optional. Default 20 when pagination is enabled',
  })
  search(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = page !== undefined ? Number(page) : undefined;
    const limitNumber = limit !== undefined ? Number(limit) : undefined;

    return this.cardNewService.searchCards({
      type,
      search,
      page: pageNumber,
      limit: limitNumber,
    });
  }

  @Post('convert-currency')
  @ApiOperation({
    summary: 'Convert all money fields in a full card payload',
    description:
      'Send base currency, target currency, and the full card payload. The API will convert all price fields and return the same payload shape with converted values.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        base: {
          type: 'string',
          example: 'USD',
        },
        target: {
          type: 'string',
          example: 'VND',
        },
        data: {
          type: 'object',
          description: 'Full card response data payload',
        },
      },
      required: ['base', 'target', 'data'],
    },
  })
  @ResponseMessage('Currency converted successfully')
  async convertCurrency(
    @Body('base') base?: string,
    @Body('target') target?: string,
    @Body('data') data?: any,
  ): Promise<any> {
    if (!base || !target || !data) {
      throw new HttpException(
        'base, target, and data must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.cardNewService.convertCurrencyPayload(data, base, target);
  }

  @Post('grade-card')
  @ApiOperation({
    summary: 'Grade a card image with PSA subgrades and estimate value',
    description:
      'Upload a card image and use OpenRouter vision to analyze PSA subgrades (Centering, Corners, Edges, Surface), corner percentages, estimated grade range, and compare RAW vs PSA8/9/10 prices.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file of the card',
        },
        language: {
          type: 'string',
          description: 'Optional language code for card identity detection (vi, en, ja, ...)',
        },
      },
      required: ['image'],
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  @ResponseMessage('Card graded successfully')
  async gradeCard(
    @UploadedFile() image: Express.Multer.File,
    @Body('language') language?: string,
  ): Promise<any> {
    if (!image) {
      throw new HttpException(
        'Image file must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.cardNewService.gradeCardOpenRouter(
      image.buffer,
      image.originalname,
      language,
    );

    if (!result.success) {
      throw new HttpException(
        result.message || 'Could not grade card from image',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return result.data;
  }
}
