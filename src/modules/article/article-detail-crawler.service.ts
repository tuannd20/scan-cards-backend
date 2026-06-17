import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as cheerio from 'cheerio';
import { firstValueFrom } from 'rxjs';

export interface ArticleDetailData {
  publishedDate?: Date;
  sections: Array<{
    type: 'heading' | 'content';
    heading?: string;
    content: string;
  }>;
}

@Injectable()
export class ArticleDetailCrawlerService {
  private readonly logger = new Logger(ArticleDetailCrawlerService.name);

  constructor(private readonly httpService: HttpService) {}

  async crawlArticleDetails(sourceUrl: string, source: string): Promise<ArticleDetailData> {
    try {
      this.logger.log(`Crawling details from: ${sourceUrl}`);
      
      const response = await firstValueFrom(
        this.httpService.get(sourceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 15000
        })
      );

      const $ = cheerio.load(response.data);
      
      if (source === 'pokemon') {
        return this.crawlPokemonDetails($);
      } else if (source === 'sports') {
        return this.crawlSportsDetails($);
      }
      
      return { sections: [] };
    } catch (error) {
      this.logger.error(`Failed to crawl details from ${sourceUrl}:`, error.message);
      return { sections: [] };
    }
  }

  private crawlPokemonDetails($: any): ArticleDetailData {
    const sections: ArticleDetailData['sections'] = [];
    let publishedDate: Date | undefined;

    // Try to find publish date
    const dateSelectors = [
      '.article-date',
      '.publish-date',
      '.post-date',
      '[datetime]',
      'time',
      '.date'
    ];

    for (const selector of dateSelectors) {
      const dateElement = $(selector).first();
      if (dateElement.length > 0) {
        const dateText = dateElement.attr('datetime') || dateElement.text().trim();
        const parsedDate = new Date(dateText);
        if (!isNaN(parsedDate.getTime())) {
          publishedDate = parsedDate;
          break;
        }
      }
    }

    // Try to find main content area
    const contentSelectors = [
      '.article-content',
      '.post-content',
      '.content',
      '.entry-content',
      'main article',
      '.article-body'
    ];

    let contentArea: any = null;
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        contentArea = element;
        break;
      }
    }

    if (!contentArea) {
      contentArea = $('body');
    }

    // Extract headings and content
    let headingCount = 0;
    contentArea.find('h1, h2, h3, h4').each((_, element) => {
      if (headingCount >= 3) return false; // Limit to 3 headings

      const $heading = $(element);
      const headingText = $heading.text().trim();
      
      if (headingText && headingText.length > 5) {
        // Add heading
        sections.push({
          type: 'heading',
          heading: headingText,
          content: headingText
        });

        // Find content after this heading (until next heading or end)
        const nextElements = $heading.nextUntil('h1, h2, h3, h4');
        const contentParts: string[] = [];
        
        nextElements.each((_, el) => {
          const $el = $(el);
          if ($el.is('p, div, span') && $el.text().trim()) {
            contentParts.push($el.text().trim());
          }
        });

        if (contentParts.length > 0) {
          const content = contentParts.join(' ').substring(0, 500); // Limit content length
          sections.push({
            type: 'content',
            content: content
          });
        }

        headingCount++;
      }
    });

    return { publishedDate, sections };
  }

  private crawlSportsDetails($: any): ArticleDetailData {
    const sections: ArticleDetailData['sections'] = [];
    let publishedDate: Date | undefined;

    // Try to find publish date for cardlines specifically
    const dateSelectors = [
      '.entry-meta .posted-on time',
      '.entry-meta time',
      '.post-date',
      '.entry-date',
      '.published',
      '[datetime]',
      'time'
    ];

    for (const selector of dateSelectors) {
      const dateElement = $(selector).first();
      if (dateElement.length > 0) {
        const dateText = dateElement.attr('datetime') || dateElement.text().trim();
        if (dateText) {
          const parsedDate = new Date(dateText);
          if (!isNaN(parsedDate.getTime())) {
            publishedDate = parsedDate;
            break;
          }
        }
      }
    }

    // For cardlines.com, focus on the main article content
    const contentSelectors = [
      '.entry-content', 
      '.post-content', 
      '.content',
      'article .content',
      'main article'
    ];
    
    let contentArea: any = null;
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        contentArea = element;
        break;
      }
    }

    if (contentArea && contentArea.length > 0) {
      let headingCount = 0;
      
      // Look for h2, h3, h4 headings in the content
      contentArea.find('h2, h3, h4').each((_, element) => {
        if (headingCount >= 3) return false; // Limit to 3 headings

        const $heading = $(element);
        const headingText = $heading.text().trim();
        
        // Filter out unwanted headings
        const unwantedHeadings = [
          'More in Stories',
          'Latest videos', 
          'Popular Card Products',
          'Related news',
          'Cardlines Newsletter',
          'Additional Links'
        ];
        
        const isUnwanted = unwantedHeadings.some(unwanted => 
          headingText.toLowerCase().includes(unwanted.toLowerCase())
        );
        
        if (!isUnwanted && headingText && headingText.length > 5 && headingText.length < 200) {
          // Add heading
          sections.push({
            type: 'heading',
            heading: headingText,
            content: headingText
          });

          // Find content after this heading until next heading
          let nextElement = $heading.next();
          const contentParts: string[] = [];
          
          while (nextElement.length > 0 && !nextElement.is('h1, h2, h3, h4, h5, h6')) {
            if (nextElement.is('p')) {
              const text = nextElement.text().trim();
              if (text && text.length > 10) {
                contentParts.push(text);
              }
            }
            nextElement = nextElement.next();
          }

          if (contentParts.length > 0) {
            const content = contentParts.slice(0, 3).join(' ').substring(0, 500); // First 3 paragraphs, max 500 chars
            sections.push({
              type: 'content',
              content: content
            });
          }

          headingCount++;
        }
      });
    }

    return { publishedDate, sections };
  }
}
