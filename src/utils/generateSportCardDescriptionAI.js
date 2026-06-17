// Generate a sport card description using deepseek model
const axios = require('axios');

async function generateSportCardDescriptionAI(playerName, sport, setName, setYear, variation) {
  const prompt = `
Write a short (1-2 sentences) English description about the athlete "${playerName}" as featured on a ${sport} trading card${setName ? ` from the set ${setName}` : ''}${setYear ? ` (${setYear})` : ''}${variation ? `, variation: ${variation}` : ''}.

RULES:
- Focus on the athlete's achievements, style, or what makes them outstanding.
- Do NOT mention the card game, collecting, or card value.
- Be concise, natural, and positive.
- Example: "Cristiano Ronaldo is one of football's greatest players, known for his speed, power, and goal-scoring record. He has starred for clubs like Manchester United, Real Madrid, and Juventus, as well as the Portugal national team"

Description for ${playerName}:`;
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
          max_tokens: 100,
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
      // Fallback sang deepseek nếu model chính lỗi
      response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'deepseek/deepseek-chat-v3-0324:free',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 100,
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
    const description = response.data.choices[0]?.message?.content?.trim();
    let cleanDescription = description
      .replace(/^"+|"+$/g, '')
      .replace(/^Description for .+?:\s*/i, '')
      .trim();
    return cleanDescription || `${playerName} is a remarkable ${sport} athlete.`;
  } catch (error) {
    console.error(`❌ Error generating description for ${playerName}:`, error.message);
    return `${playerName} is a remarkable ${sport} athlete.`;
  }
}

module.exports = { generateSportCardDescriptionAI };
