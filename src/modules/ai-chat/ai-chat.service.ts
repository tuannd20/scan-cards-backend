import { Injectable, Logger } from '@nestjs/common';
import { ChatResponse, ChatMessage, CardInfo } from './dto/ai-chat.dto';
import { CardScannerService, CardScanResult } from '../card-scanner/card-scanner.service';
import axios from 'axios';
import { AiResponseParser } from './ai-response-parser';
import { EnergyTypeService } from './energy-type.service';
import { cardPrompts } from './cardPrompts';
@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private readonly openaiApiKey = process.env.OPENROUTER_API_KEY;
  private readonly openaiApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  


  constructor(private readonly cardScannerService: CardScannerService) {}

  async chatWithAI(message?: string, messages?: string, imageFile?: Express.Multer.File, aiChat?: boolean, language?: string): Promise<ChatResponse> {
    try {
      if (aiChat === undefined) aiChat = false;
      if (!this.openaiApiKey) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
      }

      // Validate input - either message or image must be provided
      if (!message && !imageFile) {
        throw new Error('Vui lòng cung cấp tin nhắn hoặc ảnh thẻ bài');
      }

      // Use default message if only image is provided
      const finalMessage = message || 'Hãy phân tích thẻ bài này cho tôi.';
      const startTime = Date.now();
      let base64Image: string | null = null;
      if (imageFile) {
        base64Image = imageFile.buffer.toString('base64');
      }
      let previousMessages: ChatMessage[] = [];
      if (messages) {
        try {
          const parsedMessages = JSON.parse(messages);
          if (Array.isArray(parsedMessages)) {
            previousMessages = parsedMessages;
          }
        } catch (error) {
          this.logger.warn(`⚠️ Failed to parse messages: ${error.message}`);
        }
      }
      const apiMessages = this.buildMessagesForAPI(previousMessages, finalMessage, language, imageFile, base64Image || undefined);
      let cardInfo: any = {};
      let finalReply = '';
      let aiReply = '';
      // Nếu aiChat=true thì search AI, ngược lại search DB
      if (aiChat) {
        // Search bằng AI
        const response = await axios.post(
          this.openaiApiUrl,
          {
            model: 'google/gemini-2.5-flash-lite-preview-09-2025',
            messages: apiMessages,
            max_tokens: 2000,
            temperature: 0.7
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.openaiApiKey}`
            }
          }
        );
        
        aiReply = response.data.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời câu hỏi này.';
        // Tách block JSON ra khỏi reply
        const jsonBlock = this.extractFullJsonBlock(aiReply);
        if (jsonBlock) {
          try {
            cardInfo = JSON.parse(jsonBlock);
          } catch (err) {
            cardInfo = {};
          }
        } else {
          cardInfo = {};
        }
        // --- Mapping logic for AI results ---
        if (cardInfo.type) {
          if (Array.isArray(cardInfo.type)) {
            cardInfo.type = cardInfo.type.map(t => EnergyTypeService.getEnergyImg(t) || t);
          } else {
            cardInfo.type = [EnergyTypeService.getEnergyImg(cardInfo.type) || cardInfo.type];
          }
        }
        if (cardInfo.weakness) {
          let weaknessName = typeof cardInfo.weakness === 'string' ? cardInfo.weakness.split(' ')[0] : cardInfo.weakness;
          let img = EnergyTypeService.getEnergyImg(weaknessName);
          cardInfo.weakness = img || cardInfo.weakness;
        }
        if (Array.isArray(cardInfo.attacks)) {
          cardInfo.attacks = cardInfo.attacks.map(atk => {
            if (!('energy' in atk)) {
              atk.energy = null;
            }
            if (atk.energy) {
              if (Array.isArray(atk.energy)) {
                atk.energy = atk.energy.map(e => EnergyTypeService.getEnergyImg(e) || e);
              } else {
                atk.energy = [EnergyTypeService.getEnergyImg(atk.energy) || atk.energy];
              }
            }
            if (atk.effect) {
              atk.description = atk.effect;
              delete atk.effect;
            }
            if (atk.text && !atk.description) {
              atk.description = atk.text;
              delete atk.text;
            }
            return atk;
          });
        }
        // --- End mapping logic ---
        // reply chỉ giữ lại phần text, loại bỏ block JSON
        finalReply = aiReply.replace(/(```json[\s\S]*?```|'''json[\s\S]*?''')/g, '').replace(/```[\s\S]*?```/g, '').replace(/'''[\s\S]*?'''/g, '').trim();
      } else {
        // Search bằng DB như cũ
        if (imageFile) {
          // Scan trực tiếp từ buffer thay vì gửi ảnh qua axios
          const scanResult = await this.cardScannerService.scanCardFromBuffer(
            imageFile.buffer,
            imageFile.originalname,
            'pokemon' // hoặc lấy từ request nếu cần
          );
          if (scanResult && scanResult.foundInDatabase && scanResult.cardInfo) {
            cardInfo = scanResult.cardInfo;
            finalReply = this.generateSimpleCardResponse(cardInfo, finalMessage, language || 'EN');
          } else {
            cardInfo = {};
            finalReply = 'Không tìm thấy thông tin thẻ trong database.';
          }
        } else {
          cardInfo = {};
          finalReply = 'Vui lòng gửi ảnh thẻ để tra cứu database.';
        }
      }
      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const messageCount = previousMessages.length + 2;
      return {
        reply: finalReply,
        cardInfo: cardInfo,
        processingTime: `${processingTime}s`,
        messageCount: messageCount
      };
    } catch (error) {
      this.logger.error(`❌ Error in AI chat: ${error.message}`);
      if (error.response) {
        this.logger.error(`API Response Error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
        throw new Error(`AI API Error: ${error.response.data?.error?.message || 'API request failed'}`);
      } else if (error.request) {
        this.logger.error(`Network Error: No response received`);
        throw new Error('Network error: Unable to connect to AI service');
      } else {
        throw new Error(`AI chat failed: ${error.message}`);
      }
    }
  }

  // Tách riêng hàm search AI
  private async searchByAIOnly(finalMessage: string, previousMessages: ChatMessage[], langugage: string, imageFile?: Express.Multer.File, base64Image?: string, detectedLang?: string): Promise<ChatResponse> {
    const apiMessages = this.buildMessagesForAPI(previousMessages, finalMessage, langugage, imageFile, base64Image || undefined);
    const startTime = Date.now();
    let cardInfo: any = {};
    let finalReply = '';
    let aiReply = '';
    const response = await axios.post(
      this.openaiApiUrl,
      {
        model: 'google/gemini-2.5-flash',
        messages: apiMessages,
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        }
      }
    );
    aiReply = response.data.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời câu hỏi này.';
    finalReply = aiReply.replace(/(```json[\s\S]*?```|'''json[\s\S]*?''')/g, '').trim();
    // Nếu có ảnh, cố gắng parse thông tin thẻ từ reply của AI
    if (imageFile) {
      try {
        let jsonString = this.extractFullJsonBlock(aiReply);
        let aiCard: any = {};
        if (jsonString) {
          jsonString = jsonString.replace(/}(\n|\r|\s)*"([a-zA-Z0-9_]+)"\s*:/g, '},$1"$2":');
          try {
            aiCard = this.parseAISearchResponse(String(jsonString), '', detectedLang || 'EN');
            // Mapping weakness: trả về 1 link ảnh hoặc null
            if (aiCard.weakness) {
              let weaknessName = typeof aiCard.weakness === 'string' ? aiCard.weakness.split(' ')[0] : aiCard.weakness;
              let img = EnergyTypeService.getEnergyImg(weaknessName);
              aiCard.weakness = img || null;
            }
            // Mapping type: luôn trả về mảng link ảnh
            if (aiCard.type) {
              if (Array.isArray(aiCard.type)) {
                aiCard.type = aiCard.type.map(t => EnergyTypeService.getEnergyImg(t) || t);
              } else {
                aiCard.type = [EnergyTypeService.getEnergyImg(aiCard.type) || aiCard.type];
              }
            }
            // Mapping attacks energy: trả về mảng link ảnh, đổi effect thành description nếu có
            if (Array.isArray(aiCard.attacks)) {
              aiCard.attacks = aiCard.attacks.map(atk => {
                if (!('energy' in atk)) {
                  atk.energy = null;
                }
                if (atk.energy) {
                  if (Array.isArray(atk.energy)) {
                    atk.energy = atk.energy.map(e => EnergyTypeService.getEnergyImg(e) || e);
                  } else {
                    atk.energy = [EnergyTypeService.getEnergyImg(atk.energy) || atk.energy];
                  }
                }
                if (atk.effect) {
                  atk.description = atk.effect;
                  delete atk.effect;
                }
                if (atk.text && !atk.description) {
                  atk.description = atk.text;
                  delete atk.text;
                }
                return atk;
              });
            }
            cardInfo = aiCard;
          } catch (err) {
            cardInfo = Object.keys(aiCard).length ? aiCard : {};
          }
        }
      } catch (error) {
        cardInfo = Object.keys(cardInfo).length ? cardInfo : {};
      }
    }
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    const messageCount = previousMessages.length + 2;
    return {
      reply: finalReply,
      cardInfo: cardInfo,
      processingTime: `${processingTime}s`,
      messageCount: messageCount
    };
  }

  /**
   * Search card information using AI when database search fails
   * Uses the same logic and response format as chatWithAI
   */
  async searchCardByAI(message: string, messages: string, language: string, imageFile?: Express.Multer.File): Promise<ChatResponse> {
    try {
      if (!this.openaiApiKey) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
      }

      // Validate input - either message or image must be provided
      if (!message && !imageFile) {
        throw new Error('Vui lòng cung cấp tin nhắn hoặc ảnh thẻ bài');
      }

      // Use default message if only image is provided
      const finalMessage = message || 'Hãy tìm kiếm thông tin chi tiết về thẻ bài này. Và trả lời theo language: ' + language;

      const startTime = Date.now();

      let base64Image: string | null = null;
      if (imageFile) {
        base64Image = imageFile.buffer.toString('base64');
      }

      // Parse previous messages if provided (same logic as chatWithAI)
      let previousMessages: ChatMessage[] = [];
      if (messages) {
        try {
          const parsedMessages = JSON.parse(messages);
          if (Array.isArray(parsedMessages)) {
            previousMessages = parsedMessages;
          }
        } catch (error) {
          this.logger.warn(`⚠️ Failed to parse messages: ${error.message}`);
        }
      }

      // Build messages for API call (same method as chatWithAI)
      const apiMessages = this.buildMessagesForAPI(previousMessages, finalMessage, language, imageFile, base64Image || undefined);

      // Call OpenAI API (same configuration as chatWithAI)
      const response = await axios.post(
        this.openaiApiUrl,
        {
          model: 'openai/gpt-5-chat',
          messages: apiMessages,
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          }
        }
      );

      const aiReply = response.data.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời câu hỏi này.';
      let cardInfo: any = {};
      let finalReply = aiReply;
      try {
        
        cardInfo = this.parseAISearchResponse(aiReply, 'Unknown Card', language);
        // --- Mapping logic for AI results ---
        if (cardInfo) {
          // Map type to image links
          this.logger.log('Mapping type:', cardInfo.type);
          if (cardInfo.type) {
            if (Array.isArray(cardInfo.type)) {
              cardInfo.type = cardInfo.type.map(t => EnergyTypeService.getEnergyImg(t) || t);
            } else {
              cardInfo.type = [EnergyTypeService.getEnergyImg(cardInfo.type) || cardInfo.type];
            }
            this.logger.log('Mapped type:', cardInfo.type);
          }
          // Map weakness to image link
          this.logger.log('Mapping weakness:', cardInfo.weakness);
          if (cardInfo.weakness) {
            let weaknessName = typeof cardInfo.weakness === 'string' ? cardInfo.weakness.split(' ')[0] : cardInfo.weakness;
            let img = EnergyTypeService.getEnergyImg(weaknessName);
            cardInfo.weakness = img || cardInfo.weakness;
            this.logger.log('Mapped weakness:', cardInfo.weakness);
          }
          // Map attacks.energy to image links, use description
          this.logger.log('Mapping attacks:', cardInfo.attacks);
          if (Array.isArray(cardInfo.attacks)) {
            cardInfo.attacks = cardInfo.attacks.map(atk => {
              if (!('energy' in atk)) {
                atk.energy = null;
              }
              if (atk.energy) {
                if (Array.isArray(atk.energy)) {
                  atk.energy = atk.energy.map(e => EnergyTypeService.getEnergyImg(e) || e);
                } else {
                  atk.energy = [EnergyTypeService.getEnergyImg(atk.energy) || atk.energy];
                }
              }
              if (atk.effect) {
                atk.description = atk.effect;
                delete atk.effect;
              }
              if (atk.text && !atk.description) {
                atk.description = atk.text;
                delete atk.text;
              }
              return atk;
            });
            this.logger.log('Mapped attacks:', cardInfo.attacks);
          }
        }
        // --- End mapping logic ---
        if (imageFile && cardInfo && (cardInfo.name || cardInfo.title)) {
          cardInfo.foundInDatabase = false;
        } else if (!imageFile && finalMessage !== 'Hãy tìm kiếm thông tin chi tiết về thẻ bài này.') {
          const extractedCardName = this.extractCardNameFromMessage(finalMessage);
          if (extractedCardName) {
            cardInfo = this.parseAISearchResponse(aiReply, extractedCardName, language);
          }
        }
      } catch (error) {
        this.logger.error(`❌ AI search parsing error: ${error.message}`);
        cardInfo = {};
      }

      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      // Calculate message count (same logic as chatWithAI)
      const messageCount = previousMessages.length + 2;

      // Return unified response format (identical to chatWithAI)
      return {
        reply: finalReply,
        cardInfo: cardInfo,
        processingTime: `${processingTime}s`,
        messageCount: messageCount
      };

    } catch (error) {
      this.logger.error(`❌ Error in AI card search: ${error.message}`);
      
      // Provide more specific error messages (same logic as chatWithAI)
      if (error.response) {
        this.logger.error(`API Response Error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
        throw new Error(`AI API Error: ${error.response.data?.error?.message || 'API request failed'}`);
      } else if (error.request) {
        this.logger.error(`Network Error: No response received`);
        throw new Error('Network error: Unable to connect to AI service');
      } else {
        throw new Error(`AI search failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate a simple card response for DB search result
   */
  generateSimpleCardResponse(cardInfo: any, message: string, language: string): string {
    const lang = language ? language.toUpperCase() : 'EN';

    // Nếu không có thông tin card
    if (!cardInfo) {
      const noInfoMap: Record<string, string> = {
        'ZH': '未找到卡片信息。',
        'HI': 'कार्ड की जानकारी नहीं मिली।',
        'ES': 'No se encontró información de la tarjeta.',
        'AR': 'لم يتم العثور على معلومات البطاقة.',
        'FR': "Aucune information sur la carte trouvée.",
        'BN': 'কার্ডের তথ্য পাওয়া যায়নি।',
        'EN': 'No card information found.',
        'PT': 'Nenhuma informação sobre o cartão encontrada.',
        'SW': 'Hakuna taarifa za kadi zilizopatikana.',
        'ID': 'Informasi kartu tidak ditemukan.',
        'JA': 'カード情報が見つかりません。',
        'DE': 'Keine Karteninformationen gefunden.',
        'PA': 'ਕਾਰਡ ਦੀ ਜਾਣਕਾਰੀ ਨਹੀਂ ਮਿਲੀ।',
        'IT': 'Nessuna informazione sulla carta trovata.',
        'VI': 'Không tìm thấy thông tin thẻ.'
      };
      return noInfoMap[lang] || noInfoMap['EN'];
  }

  // Extract key fields
  const name = cardInfo.name || cardInfo.title || '';
  const price = cardInfo.price !== undefined ? cardInfo.price : 'Không xác định';
  const rarity = cardInfo.rarity || 'Không xác định';
  const condition = cardInfo.condition || 'Không xác định';
  
  // Responses cho từng ngôn ngữ
  const responseMap: Record<string, string> = {
    'ZH': `这是关于 ${name} 的详细信息。还有其他我可以帮您的吗？当前价格: ${price}。稀有度: ${rarity}。状态: ${condition}。`,
    'HI': `${name} के बारे में विस्तृत जानकारी यहाँ है। क्या मैं और कुछ मदद कर सकता हूँ? वर्तमान मूल्य: ${price}। दुर्लभता: ${rarity}। स्थिति: ${condition}।`,
    'ES': `Aquí están los detalles de ${name}. ¿Hay algo más en lo que pueda ayudarte? Precio actual: ${price}. Rareza: ${rarity}. Condición: ${condition}.`,
    'AR': `إليك تفاصيل البطاقة ${name}. هل يمكنني مساعدتك بشيء آخر؟ السعر الحالي: ${price}. الندرة: ${rarity}. الحالة: ${condition}.`,
    'FR': `Voici les informations détaillées sur ${name}. Puis-je vous aider avec autre chose ? Prix actuel : ${price}. Rareté : ${rarity}. État : ${condition}.`,
    'BN': `${name} সম্পর্কিত বিস্তারিত তথ্য এখানে। আরও কিছু সাহায্য প্রয়োজন? বর্তমান মূল্য: ${price}। বিরলতা: ${rarity}। অবস্থা: ${condition}।`,
    'EN': `Here are the details for ${name}. Is there anything else I can help you with? Current price: ${price}. Rarity: ${rarity}. Condition: ${condition}.`,
    'PT': `Aqui estão os detalhes de ${name}. Há algo mais em que eu possa ajudar? Preço atual: ${price}. Raridade: ${rarity}. Condição: ${condition}.`,
    'SW': `Hapa kuna maelezo ya ${name}. Kuna jambo jingine ambalo naweza kusaidia? Bei ya sasa: ${price}. Upekee: ${rarity}. Hali: ${condition}.`,
    'ID': `Berikut adalah detail untuk ${name}. Apakah ada yang bisa saya bantu lagi? Harga saat ini: ${price}. Kelangkaan: ${rarity}. Kondisi: ${condition}.`,
    'JA': `${name} の詳細情報はこちらです。他にお手伝いできることはありますか？現在の価格: ${price}。希少度: ${rarity}。状態: ${condition}。`,
    'DE': `Hier sind die Details für ${name}. Gibt es noch etwas, wobei ich helfen kann? Aktueller Preis: ${price}. Seltenheit: ${rarity}. Zustand: ${condition}.`,
    'PA': `${name} ਬਾਰੇ ਵਿਸਥਾਰਤ ਜਾਣਕਾਰੀ ਇੱਥੇ ਹੈ। ਕੀ ਮੈਂ ਹੋਰ ਕਿਸੇ ਚੀਜ਼ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ? ਮੌਜੂਦਾ ਕੀਮਤ: ${price}। ਦੁਰਲਭਤਾ: ${rarity}। ਹਾਲਤ: ${condition}।`,
    'IT': `Ecco i dettagli per ${name}. C'è qualcos'altro con cui posso aiutarti? Prezzo attuale: ${price}. Rarità: ${rarity}. Condizione: ${condition}.`,
    'VI': `Đây là thông tin chi tiết về ${name}. Có gì khác tôi có thể giúp bạn? Giá hiện tại: ${price}. Độ hiếm: ${rarity}. Tình trạng: ${condition}.`
  };

  return responseMap[lang] || responseMap['EN'];
}


  private getLanguageName(langCode?: string): string {
    if (!langCode) return 'English';
    const map: Record<string, string> = {
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
    'IT': 'Italian'       // Italiana
  };
    return map[String(langCode).toUpperCase()] || 'English';
  }

  private buildSystemPrompt(requestedLanguage?: string): string {
  const langCode = (requestedLanguage || 'EN').toUpperCase();
  return cardPrompts[langCode] || cardPrompts['EN'];
}

  private buildMessagesForAPI(
    previousMessages: ChatMessage[],
    currentMessage: string,
    langugage?: string,
    imageFile?: Express.Multer.File,
    base64Image?: string
  ): any[] {
    const messages: any[] = [];

    // Add system prompt first
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(langugage || 'EN')
    });

    // Add previous messages (if any)
    previousMessages.forEach(msg => {
      if (msg.role !== 'system') { // Skip system messages from previous array
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });

    // Add current user message
    if (imageFile && base64Image) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: currentMessage },
          { 
            type: 'image_url',
            image_url: {
              url: `data:${imageFile.mimetype};base64,${base64Image}`
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: currentMessage
      });
    }

    return messages;
  }

  private buildSearchMessagesForAPI(
    previousMessages: ChatMessage[],
    searchPrompt: string,
    language: string
  ): any[] {
    const messages: any[] = [];

    // Add system prompt first
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(language)
    });

    // Add previous messages (if any)
    previousMessages.forEach(msg => {
      if (msg.role !== 'system') { // Skip system messages from previous array
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });

    // Add search prompt as the current user message
    messages.push({
      role: 'user',
      content: searchPrompt
    });

    return messages;
  }



  /**
   * Build search prompt for AI card search
   */
  

  /**
   * Parse AI response to extract structured card information
   */
  private parseAISearchResponse(input: string, cardName: string, language: string): any {
    try {
      let jsonString: string | null = null;
      // Nếu đầu vào là chuỗi JSON, parse trực tiếp
      const trimmed = input.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        jsonString = trimmed;
      } else {
        // Nếu là toàn bộ reply, extract block JSON
        jsonString = this.extractFullJsonBlock(trimmed);
      }
      if (jsonString) {
        jsonString = jsonString.replace(/,\s*(?=[}\]])/g, '');
        const cardInfo = JSON.parse(jsonString);
        if (cardInfo && typeof cardInfo === 'object' && (cardInfo.title || cardInfo.name)) {
          return cardInfo;
        } else {
          throw new Error('Invalid card information structure');
        }
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    } catch (error) {
      this.logger.error(`❌ Error parsing AI search response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract full JSON block from AI response text
   * Assumes JSON is always wrapped in '''json ... '''
   */
  private extractFullJsonBlock(responseText: string): string | null {
    try {
      // Tìm đoạn text giữa các dấu '''json và ''' (hoặc ```json và ```)
      let match = responseText.match(/'''json([\s\S]*?)'''|```json([\s\S]*?)```/);
      if (match) {
        // Lấy nhóm đầu tiên không rỗng
        let jsonBlock = match[1] || match[2];
        if (jsonBlock) {
          // Loại bỏ mọi ký tự không hợp lệ ở đầu và cuối
          jsonBlock = jsonBlock.trim();
          // Nếu khối JSON có dấu phẩy ở cuối, loại bỏ dấu phẩy đó
          jsonBlock = jsonBlock.replace(/,\s*}$/, '}').replace(/,\s*]$/, ']');
          return jsonBlock;
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error extracting JSON block: ${error.message}`);
    }
    return null;
  }

  /**
   * Stub: Extract card name from message
   */
  private extractCardNameFromMessage(message: string): string {
    // TODO: Implement actual extraction logic if needed
    return '';
  }

  // Normalize energy/type/weakness names to English for mapping
  private normalizeEnergyName(name: string): string {
    if (!name) return '';
    const map: Record<string, string> = {
      'Plante': 'Grass',
      'Feu': 'Fire',
      'Eau': 'Water',
      'Fée': 'Fairy',
      'Combat': 'Fighting',
      'Psy': 'Psychic',
      'Métal': 'Metal',
      'Obscurité': 'Darkness',
      'Électrique': 'Lightning',
      'Dragon': 'Dragon',
      'Incolore': 'Colorless',
      'Herbe': 'Grass',
      'Feuer': 'Fire',
      'Wasser': 'Water',
      'Fee': 'Fairy',
      'Kampf': 'Fighting',
      'Psycho': 'Psychic',
      'Metall': 'Metal',
      'Finsternis': 'Darkness',
      'Elektro': 'Lightning',
      'Drache': 'Dragon',
      'Farblos': 'Colorless',
      // Add more mappings as needed
    };
    return map[name.trim()] || name.trim();
  }

  /**
   * Sinh prompt hệ thống cho AI identifier rock
   */
  buildPromptForIdentifierRock(language?: string): string {
    const langCode = (language || 'EN').toUpperCase();
    const prompts: Record<string, string> = {
      EN: 'You are a geology expert. Identify the rock. Answer very briefly, cover all main points, use full sentences, do not stop abruptly.',
      VI: 'Bạn là chuyên gia địa chất. Nhận diện đá. Trả lời thật ngắn gọn, đủ các ý chính, đủ câu, không ngắt giữa chừng.',
      ZH: '你是地质专家。请识别岩石。回答要非常简洁，涵盖所有要点，句子完整，不要中断。',
      HI: 'आप भूविज्ञान विशेषज्ञ हैं। चट्टान की पहचान करें। बहुत संक्षिप्त, सभी मुख्य बिंदु, पूरे वाक्य, बीच में न रुकें।',
      ES: 'Eres experto en geología. Identifica la roca. Responde muy breve, todos los puntos clave, frases completas, sin cortar a medias.',
      AR: 'أنت خبير جيولوجيا. حدد الصخرة. أجب بإيجاز شديد، كل النقاط الرئيسية، جمل كاملة، دون توقف مفاجئ.',
      FR: 'Vous êtes expert en géologie. Identifiez la roche. Répondez très brièvement, tous les points clés, phrases complètes, sans coupure.',
      BN: 'আপনি ভূতত্ত্ব বিশেষজ্ঞ। শিলাটি চিহ্নিত করুন। খুব সংক্ষেপে, সব মূল পয়েন্ট, সম্পূর্ণ বাক্য, মাঝপথে থামবেন না।',
      PT: 'Você é especialista em geologia. Identifique a rocha. Responda de forma muito breve, todos os pontos principais, frases completas, senza parar no meio.',
      SW: 'Wewe ni mtaalamu wa jiolojia. Tambua mwamba. Jibu kwa ufupi sana, mambo yote muhimu, sentensi kamili, usikate katikati.',
      ID: 'Anda ahli geologi. Identifikasi batuan. Jawab sangat singkat, semua poin utama, kalimat lengkap, jangan berhenti di tengah.',
      JA: 'あなたは地質学の専門家です。岩石を特定してください。非常に簡潔に、すべての要点を含め、文を完結させて、中断しないでください。',
      DE: 'Sie sind Geologie-Experte. Identifizieren Sie den Stein. Antworten Sie sehr kurz, alle Hauptpunkte, vollständige Sätze, nicht mitten im Satz abbrechen.',
      PA: 'ਤੁਸੀਂ ਭੂਗੋਲ ਵਿਸ਼ੇਸ਼ਜ्ञ ਹੋ। ਪੱਥਰ ਦੀ ਪਛਾਣ ਕਰੋ। ਬਹੁਤ ਸੰਖੇਪ, ਸਾਰੇ ਮੁੱਖ ਬਿੰਦੂ, ਪੂਰੀਆਂ ਲਾਈਨਾਂ, ਵਿਚਕਾਰ ਨਾ ਰੁਕੋ।',
      IT: 'Sei un esperto di geologia. Identifica la roccia. Rispondi molto brevemente, tutti i punti principali, frasi complete, senza interromperti.'
    };
    return prompts[langCode] || prompts['EN'];
  }

  /**
   * Sinh messages cho AI identifier rock (có thể kèm ảnh base64)
   */
  buildMessagesForIdentifierRock(
    prompt: string,
    previousMessages?: ChatMessage[],
    imageBase64?: string
  ): any[] {
    const messages: any[] = [];
    messages.push({ role: 'system', content: prompt });
    if (previousMessages && Array.isArray(previousMessages)) {
      previousMessages.forEach(msg => {
        if (msg.role !== 'system') messages.push({ role: msg.role, content: msg.content });
      });
    }
    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Please identify this rock.' },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: 'Please identify this rock.' });
    }
    return messages;
  }

  /**
   * Chat với AI về rock identifier
   */
  async chatWithAIRock(
    messages?: string,
    imageFile?: Express.Multer.File,
    language?: string,
    message?: string,
    aiChat?: boolean
  ): Promise<ChatResponse> {
    if (!this.openaiApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
    const prompt = this.buildPromptForIdentifierRock(language);
    let base64Image: string | undefined = undefined;
    if (imageFile) base64Image = imageFile.buffer.toString('base64');
    let previousMessages: ChatMessage[] = [];
    if (messages) {
      try { previousMessages = JSON.parse(messages); } catch {}
    }
    // Build messages array flexibly: previousMessages + current message (if any) + image (if any)
    const chatMessages: any[] = [];
    chatMessages.push({ role: 'system', content: prompt });
    if (previousMessages && Array.isArray(previousMessages)) {
      previousMessages.forEach(msg => {
        if (msg.role !== 'system') chatMessages.push({ role: msg.role, content: msg.content });
      });
    }
    // Add current user message if provided
    if (message) {
      if (imageFile && base64Image) {
        chatMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: message },
            { type: 'image_url', image_url: { url: `data:${imageFile.mimetype};base64,${base64Image}` } }
          ]
        });
      } else {
        chatMessages.push({ role: 'user', content: message });
      }
    } else if (imageFile && base64Image) {
      // No message, only image
      chatMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Please identify this rock.' },
          { type: 'image_url', image_url: { url: `data:${imageFile.mimetype};base64,${base64Image}` } }
        ]
      });
    }
    // If neither message nor image, fallback to a default question (should not happen due to controller validation)
    if (chatMessages.length === 1) {
      chatMessages.push({ role: 'user', content: 'Please identify this rock.' });
    }
    const startTime = Date.now();
    const response = await axios.post(
      this.openaiApiUrl,
      {
        model: 'google/gemini-2.5-flash-lite-preview-09-2025',
        messages: chatMessages,
        max_tokens: 2000,
        temperature: 0.5
      },
       {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.openaiApiKey}`
            }
          }
    );
    const aiReply = response.data.choices[0]?.message?.content || 'Sorry, I could not identify this rock.';
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    return {
      reply: aiReply,
      cardInfo: {},
      processingTime: `${processingTime}s`,
      messageCount: chatMessages.length
    };
  }
}