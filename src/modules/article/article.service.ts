import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import * as cheerio from 'cheerio';
import axios from 'axios';

export interface ArticleFilter {
  type?: 'pokemon' | 'sports'; // Filter by article type
  search?: string; // Search in title, description, or card number
  cardNumber?: string; // Search by exact card number
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);
  private readonly openaiApiKey = process.env.OPENROUTER_API_KEY;
  private readonly openaiApiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(
    @InjectModel(Article.name) private articleModel: Model<Article>,
  ) {}

  private readonly supportedLanguages = {
    'ZH': 'Chinese',      // 中文
    'HI': 'Hindi',        // हिन्दी
    'ES': 'Spanish',      // Española
    'AR': 'Arabic',       // عربي
    'FR': 'French',       // Français
    'BN': 'Bengali',      // বাংলা
    'EN': 'English',      // English
    'PT': 'Portuguese',   // Português
    'SW': 'Swahili',      // Kiswahili
    'ID': 'Indonesian',   // Bahasa Indo
    'JA': 'Japanese',     // 日本語
    'DE': 'German',       // Deutsch
    'PA': 'Punjabi',      // ਪੰਜਾਬੀ
    'IT': 'Italian'       // Italiano
  };

  private async translateArticleData(article: any, languageCode: string): Promise<any> {
    const targetLanguage = this.supportedLanguages[languageCode];
    if (!targetLanguage) {
      this.logger.warn(`Unsupported language code: ${languageCode}`);
      return article;
    }

    // Skip translation for English
    if (languageCode === 'EN') {
      return article;
    }

    const translatableFields = {
      title: article.title,
      description: article.description,
      sections: article.sections.map(section => ({
        heading: section.heading,
        content: section.content,
      })),
    };

    const prompt = `You are a professional translator. Translate the text fields in the following JSON object to ${targetLanguage} (${languageCode}).
The content is related to trading cards and sports news.
Return ONLY the translated JSON object. Maintain the exact same structure. Do not add explanations or markdown.

Original JSON:
${JSON.stringify(translatableFields, null, 2)}`;

    try {
      this.logger.log(`Starting translation to ${targetLanguage} (${languageCode})...`);
      
      const response = await axios.post(
        this.openaiApiUrl,
        {
          model: 'google/gemini-2.5-flash-lite',
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid API response structure');
      }

      let translatedContentString = response.data.choices[0].message.content.trim();
      this.logger.debug(`Raw translation response for ${languageCode}: ${translatedContentString.substring(0, 200)}...`);
      
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = translatedContentString.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        translatedContentString = jsonMatch[1];
        this.logger.debug(`Extracted JSON from markdown block`);
      }
      
      const translatedFields = JSON.parse(translatedContentString);
      
      const translatedArticle = JSON.parse(JSON.stringify(article)); 

      translatedArticle.title = translatedFields.title || article.title;
      translatedArticle.description = translatedFields.description || article.description;
      
      translatedArticle.sections = article.sections.map((originalSection, index) => ({
        ...originalSection,
        heading: translatedFields.sections?.[index]?.heading || originalSection.heading,
        content: translatedFields.sections?.[index]?.content || originalSection.content,
      }));

      this.logger.log(`✓ Successfully translated to ${targetLanguage} (${languageCode})`);
      return translatedArticle;

    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error(`✗ Failed to translate to ${targetLanguage} (${languageCode}): ${errorMsg}`);
      
      if (error.response?.data) {
        this.logger.debug(`API Error Details: ${JSON.stringify(error.response.data)}`);
      }
      
      // Return original article as fallback
      return article;
    }
  }

  // Create article manually
  async create(createArticleDto: CreateArticleDto): Promise<Article> {
    const translations = new Map<string, any>();
    const englishContent = {
      title: createArticleDto.title,
      description: createArticleDto.description,
      sections: createArticleDto.sections || [],
    };
    translations.set('EN', englishContent);

    const translationPromises = Object.keys(this.supportedLanguages)
    .filter(langCode => langCode !== 'EN')
    .map(langCode => 
      this.translateArticleData(englishContent, langCode).then(result => ({
        langCode,
        status: 'fulfilled' as const , 
        value: result
      })).catch(error => ({
        langCode,
        status: 'rejected' as const,
        reason: error.message
      }))
    );

    const results = await Promise.all(translationPromises);
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        translations.set(result.langCode, result.value);
      } else {
        this.logger.warn(`Could not translate article to ${result.langCode}: ${result.reason}`);
      }
    });
    try {
      const createdArticle = new this.articleModel({
        title: createArticleDto.title,
        bannerUrl: createArticleDto.bannerUrl,
        type: createArticleDto.type,
        cardNumber: createArticleDto.cardNumber,
        translations: translations,
      });

      return await createdArticle.save();
    } catch (error) {
      this.logger.error(`Error creating article: ${error.message}`);
      throw new Error(`Failed to create article: ${error.message}`);
    }
  }

  // Get all articles with filtering and pagination
  async findAll(
    filter: ArticleFilter = {},
    pagination: PaginationOptions = {},
    language?: string,
  ): Promise<{ articles: any[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const query: any = { isActive: true };
    const targetLang = (language && this.supportedLanguages[language.toUpperCase()]) 
      ? language.toUpperCase() 
      : 'EN';

    // Build filter query
    if (filter.type) {
      query.type = filter.type;
    }

    if (targetLang !== 'EN') {
      query[`translations.${targetLang}`] = { $exists: true, $ne: null };
    }

    // Search functionality - search in title, description, or card number
    if (filter.search) {
      query.$or = [
        { 'translations.EN.title': { $regex: filter.search, $options: 'i' } },
        { 'translations.EN.description': { $regex: filter.search, $options: 'i' } },
        { cardNumber: { $regex: filter.search, $options: 'i' } }
      ];
    }

    // Exact card number search
    if (filter.cardNumber) {
      query.cardNumber = filter.cardNumber;
    }

    const [articlesFromDb, total] = await Promise.all([
      this.articleModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.articleModel.countDocuments(query).exec(),
    ]);
    

    const articles = articlesFromDb.map(article => {
      if (article.translations && typeof article.translations === 'object') {
        const { translations, ...restOfArticle } = article;
        const translation = translations[targetLang];
        
        return {
          ...restOfArticle,
          ...(translation || {}), 
          language: targetLang,
        };
      }
      return {
        ...article,
        language: 'EN',
      };
      
    });

    return {
      articles,
      total,
      page,
      limit,
    };
  }

  // Get single article by ID
  async findOne(id: string, language: string): Promise<any> {
    const article = await this.articleModel.findById(id).exec();
    const targetLang = (language && this.supportedLanguages[language.toUpperCase()])
      ? language.toUpperCase()
      : 'EN';
    if (!article) {
      throw new Error('Article not found');
    }
    return article.translations.get(targetLang);
  }

  // Update article
  async update(id: string, updateData: Partial<CreateArticleDto>): Promise<Article> {
    try {
      const updatePayload: any = { ...updateData };
      
      if (updateData.sections) {
        updatePayload.sections = updateData.sections;
      }
      const updatedArticle = await this.articleModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      if (!updatedArticle) {
        throw new Error('Article not found');
      }

      return updatedArticle;
    } catch (error) {
      this.logger.error(`Error updating article: ${error.message}`);
      throw new Error(`Failed to update article: ${error.message}`);
    }
  }

  // Remove article (soft delete)
  async remove(id: string): Promise<void> {
    try {
      const result = await this.articleModel
        .findByIdAndUpdate(id, { isActive: false }, { new: true })
        .exec();

      if (!result) {
        throw new Error('Article not found');
      }

    } catch (error) {
      this.logger.error(`Error removing article: ${error.message}`);
      throw new Error(`Failed to remove article: ${error.message}`);
    }
  }

  // Delete all articles (hard delete)
  async removeAll(): Promise<{ deletedCount: number }> {
    try {
      const result = await this.articleModel.deleteMany({}).exec();
      this.logger.log(`Deleted ${result.deletedCount} articles`);
      return { deletedCount: result.deletedCount };
    } catch (error) {
      this.logger.error(`Error deleting all articles: ${error.message}`);
      throw new Error(`Failed to delete all articles: ${error.message}`);
    }
  }

}
