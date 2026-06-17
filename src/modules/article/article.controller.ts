import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ArticleService, ArticleFilter, PaginationOptions } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ResponseMessage } from '../../decorators/response-message.decorator';

@ApiTags('Articles')
@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new article manually' })
  @ApiResponse({ status: 201, description: 'Article created successfully' })
  @ResponseMessage('Article created successfully')
  async create(@Body() createArticleDto: CreateArticleDto) {
    try {
      const article = await this.articleService.create(createArticleDto);
      return {
        success: true,
        data: article,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all articles with pagination and filtering' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type (pokemon, sports)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'language', required: false, description: 'Language code for response (vi, en, fr, ...)' })
  @ResponseMessage('Articles retrieved successfully')
  async findAll(
    @Query('type') type?: 'pokemon' | 'sports',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('language') language?: string,
  ) {
    try {
      const filter: ArticleFilter = {};
      if (type) {
        filter.type = type;
      }
   
      
      const pagination: PaginationOptions = {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
      };

      // Truyền language vào service nếu cần
      const result = await this.articleService.findAll(filter, pagination, language);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single article by ID' })
  @ApiResponse({ status: 200, description: 'Article retrieved successfully' })
  @ResponseMessage('Article retrieved successfully')
  async findOne(@Param('id') id: string, @Query('language') language?: string) {
    try {
      const article = await this.articleService.findOne(id, language ?? 'EN');
      return {
        success: true,
        data: article,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an article' })
  @ApiResponse({ status: 200, description: 'Article updated successfully' })
  @ResponseMessage('Article updated successfully')
  async update(@Param('id') id: string, @Body() updateArticleDto: Partial<CreateArticleDto>) {
    try {
      const article = await this.articleService.update(id, updateArticleDto);
      return {
        success: true,
        data: article,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an article (soft delete)' })
  @ApiResponse({ status: 200, description: 'Article deleted successfully' })
  @ResponseMessage('Article deleted successfully')
  async remove(@Param('id') id: string) {
    try {
      await this.articleService.remove(id);
      return {
        success: true,
        message: 'Article deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all articles (hard delete)' })
  @ApiResponse({ status: 200, description: 'All articles deleted successfully' })
  @ResponseMessage('All articles deleted successfully')
  async removeAll() {
    try {
      const result = await this.articleService.removeAll();
      return {
        success: true,
        data: result,
        message: `Deleted ${result.deletedCount} articles`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
