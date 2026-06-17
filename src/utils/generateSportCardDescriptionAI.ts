import axios from 'axios';

// Hàm sinh price riêng biệt, ưu tiên model openrouter/horizon-alpha, fallback mistral, qwen2.5-vl-72b
async function generateSportCardPriceAI(playerName: string, sport: string, setName?: string, setYear?: string, variation?: string): Promise<string> {
  const prompt = `Estimate a realistic price range for a ${sport} trading card of ${playerName}${setName ? ` from set ${setName}` : ''}${setYear ? ` (${setYear})` : ''}${variation ? `, variation: ${variation}` : ''} in USD (e.g. $5-10, $20-50, $100+). Only return the price range, no explanation. Format: {\"price\":\"...\"}`;
  const models = [
    'openrouter/horizon-alpha',
    'mistralai/mistral-small-3.1-24b-instruct:free',
    'qwen/qwen2.5-vl-72b-instruct:free',
  ];
  for (const model of models) {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 100,
          temperature: 0.5,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const message = response.data.choices[0]?.message;
      const content = message && message.content ? message.content.trim() : '';
      // Debug log content trả về từ model
      // console.debug(`[AI-PRICE-DEBUG][${model}] content:`, content);
      // Parse JSON hoặc tách thủ công
      let price = '';
      try {
        const parsed = JSON.parse(content);
        price = parsed.price || '';
      } catch {
        const match = content.match(/\{\s*\"price\":\s*\"([^\"]+)\"\s*\}/);
        if (match) {
          price = match[1];
        } else {
          // fallback: bắt nhiều pattern hơn
          const priceMatch = content.match(/\$[0-9,.]+\s*-\s*\$?[0-9,.]+|\$[0-9,.]+\+?|[0-9,.]+\s*USD|USD\s*[0-9,.]+|[0-9,.]+\s*\$/i);
          if (priceMatch) price = priceMatch[0];
          else price = content.replace(/[^\$0-9\-+,.]/g, '').trim();
        }
      }
      price = price.replace(/^"+|"+$/g, '').trim();
      if (price) return price;
    } catch (err) {
      // thử model tiếp theo
      continue;
    }
  }
  return 'Unknown';
}

// Trả về cả description và price
export async function generateSportCardDescriptionAI(playerName: string, sport: string, setName?: string, setYear?: string, variation?: string): Promise<{description: string, price: string}> {
  const prompt = `Write 2-3 concise, positive English sentences about the athlete \"${playerName}\" on a ${sport} trading card${setName ? ` from set ${setName}` : ''}${setYear ? ` (${setYear})` : ''}${variation ? `, variation: ${variation}` : ''}. Focus on achievements, style, or what makes them outstanding. Do not mention card value or collecting. Format: {\"description\":\"...\"}`;
  try {
    let response;
    try {
      response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'z-ai/glm-4.5',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 400,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (err) {
      response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'qwen/qwen3-coder:free',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 400,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    const message = response.data.choices[0]?.message;
    const content = message && message.content ? message.content.trim() : '';
    // Cố gắng parse JSON
    let desc = '';
    try {
      const parsed = JSON.parse(content);
      desc = parsed.description || '';
    } catch {
      // Nếu không phải JSON, tách thủ công
      const match = content.match(/\{\s*\"description\":\s*\"([^\"]+)\"\s*\}/);
      if (match) {
        desc = match[1];
      } else {
        // fallback: lấy đoạn đầu làm desc
        desc = content.trim();
      }
    }
    desc = desc.replace(/^"+|"+$/g, '').replace(/^Description for .+?:\s*/i, '').trim();
    // Gọi hàm sinh price mới
    const price = await generateSportCardPriceAI(playerName, sport, setName, setYear, variation);
    return { description: desc || `${playerName} is a remarkable ${sport} athlete.`, price: price || 'Unknown' };
  } catch (error: any) {
    console.error(`❌ Error generating description/price for ${playerName}:`, error.message);
    return { description: `${playerName} is a remarkable ${sport} athlete.`, price: 'Unknown' };
  }
}

// Gen price từ imageUrl, chỉ dùng model gemini khi thực sự cần quét ảnh, còn lại fallback
export async function generateSportCardPriceFromImage(imageUrl: string, playerName: string, sport: string): Promise<string> {
  if (!imageUrl) return 'Unknown';
  // Nếu cần quét ảnh thực sự, có thể enable model gemini ở đây, còn lại fallback trả về Unknown hoặc dùng mô hình khác
  return 'Unknown';
}