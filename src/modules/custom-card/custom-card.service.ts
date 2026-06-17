import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryThemeDto } from './dto/query-theme.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomCard, CustomCardDocument } from './schemas/custom-card.schema';
import { CreateCustomCardDto } from './dto/create-custom-card.dto';
import * as path from 'path';
import * as fs from 'fs';

export interface ThemeCard {
  name: string;
  url: string;
  cardType?: string;
  baseSet?: string;
}

export interface TypeIcon {
  type: string;
  url: string;
}

export interface BackgroundItem {
  url: string[];
}

export interface ItemData {
  url: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CustomCardService implements OnModuleInit {
  private themes: ThemeCard[] = [];
  private types: TypeIcon[] = [];
  private backgrounds: BackgroundItem[] = [];
  private items: ItemData[] = [];

  constructor(@InjectModel(CustomCard.name) private customCardModel?: Model<CustomCardDocument>) {}

  onModuleInit() {
    this.loadThemes();
    this.loadTypes();
    this.loadBackgrounds();
    this.loadItems();
  }

  private formatCardName(name: string): string {
    const parts = name.split(' - ').map(p => p.trim());
    if (parts.length < 3) return name;

    const baseSet = parts[0];
    const cardType = parts[1];
    const type = parts[2];

    // Convert camelCase to Title Case
    const formatCamelCase = (str: string) => {
      return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
    };

    const formattedBaseSet = formatCamelCase(baseSet);
    const formattedCardType = formatCamelCase(cardType);
    const formattedType = type.charAt(0).toUpperCase() + type.slice(1);

    return `${formattedBaseSet} ${formattedCardType} (${formattedType})`;
  }

  private loadThemes() {
    try {
      const themesPath = path.join(process.cwd(), 'data/custom_card/uploaded-theme-images.json');
      if (fs.existsSync(themesPath)) {
        const data = fs.readFileSync(themesPath, 'utf-8');
        const raw: any[] = JSON.parse(data);
        this.themes = raw.map(item => {
          const name = (item.name || '').toString();
          const parts = name.split(' - ').map(p => p.trim());
          const baseSet = (item.baseSet || parts[0] || '').toString();
          const cardType = parts[1] || '';
          const formattedName = this.formatCardName(name);
          return {
            name: formattedName,
            url: item.url,
            cardType,
            baseSet,
          } as ThemeCard;
        });
        console.log(`Loaded ${this.themes.length} theme cards`);
      } else {
        console.warn('uploaded-theme-images.json not found');
      }
    } catch (error) {
      console.error('Error loading themes:', error);
    }
  }

  private loadTypes() {
    try {
      const typesPath = path.join(process.cwd(), 'uploaded-type-icons.json');
      if (fs.existsSync(typesPath)) {
        const data = fs.readFileSync(typesPath, 'utf-8');
        this.types = JSON.parse(data);
        console.log(`Loaded ${this.types.length} type icons`);
      } else {
        console.warn('uploaded-type-icons.json not found');
      }
    } catch (error) {
      console.error('Error loading types:', error);
    }
  }

  private loadBackgrounds() {
    try {
      const backgroundsPath = path.join(process.cwd(), 'data/custom_card/uploaded-background.json');
      if (fs.existsSync(backgroundsPath)) {
        const data = fs.readFileSync(backgroundsPath, 'utf-8');
        this.backgrounds = JSON.parse(data);
        console.log(`Loaded ${this.backgrounds.length} backgrounds`);
      } else {
        console.warn('uploaded-background.json not found');
      }
    } catch (error) {
      console.error('Error loading backgrounds:', error);
    }
  }

  private loadItems() {
    try {
      const itemsPath = path.join(process.cwd(), 'data/custom_card/uploaded-item.json');
      if (fs.existsSync(itemsPath)) {
        const data = fs.readFileSync(itemsPath, 'utf-8');
        this.items = JSON.parse(data);
        console.log(`Loaded ${this.items.length} items`);
      } else {
        console.warn('uploaded-item.json not found');
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  }

  findAllThemes(query: QueryThemeDto): PaginatedResponse<ThemeCard> {
    // limit results to only themes belonging to the 'swordAndShield' base set
    let filteredThemes = this.themes.filter(t => (t.baseSet || '').toString() === 'swordAndShield');

    // Apply search filter
    if (query.search && query.search.trim()) {
      const searchLower = query.search.toLowerCase().trim();
      filteredThemes = filteredThemes.filter(theme =>
        theme.name.toLowerCase().includes(searchLower)
      );
    }

    // Calculate pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const total = filteredThemes.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Get paginated data
    const data = filteredThemes.slice(startIndex, endIndex);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  findAllTypes(): TypeIcon[] {
    return this.types;
  }

  findAllBackgrounds(query: QueryThemeDto): PaginatedResponse<string> {
    const backgrounds = [...this.backgrounds];

    const page = Number(query.page) || 1;
    let limit = Number(query.limit) || 20;
    if (limit <= 0) limit = 20;

    // Flatten all background URLs first, then paginate over the flattened URL list
    const allUrls = backgrounds.reduce<string[]>((acc, b) => acc.concat(b.url || []), []);
    const total = allUrls.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const data = allUrls.slice(startIndex, endIndex);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  findAllItems(query: QueryThemeDto): PaginatedResponse<string> {
    const items = [...this.items];

    const page = Number(query.page) || 1;
    let limit = Number(query.limit) || 20;
    if (limit <= 0) limit = 20;

    // Flatten all item URLs first, then paginate over the flattened URL list
    const allUrls = items.reduce<string[]>((acc, it) => acc.concat(it.url || []), []);
    const total = allUrls.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const data = allUrls.slice(startIndex, endIndex);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Create and manage custom cards in MongoDB
  async createCustomCard(dto: CreateCustomCardDto) {
    if (!this.customCardModel) throw new Error('CustomCard model not initialized');
    const doc = await this.customCardModel.create(dto as any);
    return doc;
  }

  async findCustomCards(query: QueryThemeDto): Promise<PaginatedResponse<{ id: string; previewImage: string; illustrator?: string; like: number; downloads: number }>> {
    if (!this.customCardModel) {
      return { data: [], total: 0, page: query.page || 1, limit: query.limit || 20, totalPages: 0 };
    }
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const total = await this.customCardModel.countDocuments();
    const totalPages = Math.ceil(total / limit);
    const docs = await this.customCardModel
      .find()
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('previewImage like downloads illustrator')
      .lean();

    const data = docs.map(d => ({
      id: (d as any)._id.toString(),
      previewImage: (d as any).previewImage,
      illustrator: (d as any).illustrator || null,
      like: (d as any).like != null ? (d as any).like : 0,
      downloads: (d as any).downloads != null ? (d as any).downloads : 0,
    }));

    return { data, total, page, limit, totalPages };
  }

  async getCustomCardById(id: string) {
    if (!this.customCardModel) return null;
    return this.customCardModel.findById(id).lean();
  }

  async likeCards(ids: string[]) {
    if (!this.customCardModel) throw new Error('CustomCard model not initialized');
    if (!Array.isArray(ids) || ids.length === 0) return { matchedCount: 0, modifiedCount: 0 };
    const result = await this.customCardModel.updateMany({ _id: { $in: ids } }, { $inc: { like: 1 } });
    return result;
  }

  async likeCard(id: string) {
    if (!this.customCardModel) throw new Error('CustomCard model not initialized');
    if (!id) return null;
    const updated = await this.customCardModel.findByIdAndUpdate(id, { $inc: { like: 1 } }, { new: true });
    return updated;
  }

  async unlikeCard(id: string) {
    if (!this.customCardModel) throw new Error('CustomCard model not initialized');
    if (!id) return null;
    const doc = await this.customCardModel.findById(id);
    if (!doc) return null;
    const current = (doc as any).like != null ? (doc as any).like : 0;
    const next = Math.max(0, current - 1);
    (doc as any).like = next;
    await doc.save();
    return doc;
  }

  async downloadCard(id: string) {
    if (!this.customCardModel) throw new Error('CustomCard model not initialized');
    if (!id) return null;
    const updated = await this.customCardModel.findByIdAndUpdate(id, { $inc: { downloads: 1 } }, { new: true });
    return updated;
  }

  async deleteCustomCard(id: string) {
    if (!this.customCardModel) throw new Error('CustomCard model not initialized');
    return this.customCardModel.findByIdAndDelete(id);
  }
}
