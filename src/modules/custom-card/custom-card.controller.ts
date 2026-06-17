import { Controller, Get, Query, Delete } from '@nestjs/common';
import { CustomCardService, ThemeCard, TypeIcon, PaginatedResponse } from './custom-card.service';
import { Post, Body, Param } from '@nestjs/common';
import { CreateCustomCardDto } from './dto/create-custom-card.dto';
import { QueryThemeDto } from './dto/query-theme.dto';
import { ResponseMessage } from '../../decorators/response-message.decorator';
import { ApiTags, ApiOkResponse, ApiQuery, ApiExtraModels } from '@nestjs/swagger';
import { PaginatedThemeDto } from './dto/paginated-theme.dto';
import { ThemeCardDto } from './dto/theme-card.dto';
import { PaginatedBackgroundDto } from './dto/paginated-background.dto';
import { PaginatedItemDto } from './dto/paginated-item.dto';
import { LikeCardsDto } from './dto/like-cards.dto';

@ApiTags('custom-card')
@ApiExtraModels(PaginatedThemeDto, ThemeCardDto, PaginatedBackgroundDto, PaginatedItemDto)
@Controller('custom-card')
export class CustomCardController {
  constructor(private readonly customCardService: CustomCardService) {}

  @Get('themes')
  @ResponseMessage('Get themes successfully')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search string to match in card name' })
  @ApiOkResponse({ description: 'Paginated themes', type: PaginatedThemeDto })
  findAllThemes(@Query() query: QueryThemeDto): PaginatedResponse<ThemeCard> {
    return this.customCardService.findAllThemes(query);
  }

  @Get('types')
  @ResponseMessage('Get type icons successfully')
  @ApiOkResponse({ description: 'Type icons', type: [ThemeCardDto] })
  findAllTypes(): TypeIcon[] {
    return this.customCardService.findAllTypes();
  }

  @Get('backgrounds')
  @ResponseMessage('Get backgrounds successfully')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiOkResponse({ description: 'Paginated backgrounds', type: PaginatedBackgroundDto })
  findAllBackgrounds(@Query() query: QueryThemeDto): PaginatedResponse<string> {
    return this.customCardService.findAllBackgrounds(query);
  }

  @Get('items')
  @ResponseMessage('Get items successfully')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiOkResponse({ description: 'Paginated items', type: PaginatedItemDto })
  findAllItems(@Query() query: QueryThemeDto): PaginatedResponse<string> {
    return this.customCardService.findAllItems(query);
  }

  @Post('cards')
  @ResponseMessage('Create custom card successfully')
  createCard(@Body() body: CreateCustomCardDto) {
    return this.customCardService.createCustomCard(body);
  }

  @Post('cards/:id/like')
  @ResponseMessage('Like custom card successfully')
  @ApiOkResponse({ description: 'Like result' })
  likeCard(@Param('id') id: string) {
    return this.customCardService.likeCard(id);
  }

  @Post('cards/:id/unlike')
  @ResponseMessage('Unlike custom card successfully')
  @ApiOkResponse({ description: 'Unlike result' })
  unlikeCard(@Param('id') id: string) {
    return this.customCardService.unlikeCard(id);
  }

  @Post('cards/:id/download')
  @ResponseMessage('Download custom card successfully')
  @ApiOkResponse({ description: 'Download result' })
  downloadCard(@Param('id') id: string) {
    return this.customCardService.downloadCard(id);
  }


  @Get('cards')
  @ResponseMessage('Get custom cards list successfully')
  findCustomCards(@Query() query: QueryThemeDto): Promise<PaginatedResponse<{ id: string; previewImage: string; illustrator?: string; like: number; downloads: number }>> {
    return this.customCardService.findCustomCards(query);
  }

  @Get('cards/:id')
  @ResponseMessage('Get custom card detail successfully')
  findCustomCardById(@Param('id') id: string) {
    return this.customCardService.getCustomCardById(id);
  }

  @Delete('cards/:id')
  @ResponseMessage('Delete custom card successfully')
  deleteCustomCard(@Param('id') id: string) {
    return this.customCardService.deleteCustomCard(id);
  }
}
