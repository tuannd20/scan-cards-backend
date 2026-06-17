export const simplePrompts: Record<string, string> = {
  EN: `
Read ONLY the visible information from this trading card image and return a JSON object with these fields:
{
  "cardName": "",
  "rarity": "",
  "year": "",
  "seriesExpansion": "",
  "description": "",
  "price": "",
  "priceSource": "",
  "priceLink": "",
  "priceRange": "",
  "recentPrices": [],
  "gradedPrices": [],
  "similarCards": []
}
"description" must be 2-3 sentences summarizing the card's features or lore, based on the image. If possible, add interesting facts or lore about the card or pokemon that are not shown on the card.
For ALL fields, if the information is not visible, generate plausible fake data based on the card's context. Do NOT leave any field empty or null.
"price", "priceSource", "priceLink", "priceRange", "recentPrices", "gradedPrices", "similarCards" must all be filled with reasonable fake data, similar to price guides and recent sales.
"recentPrices" must contain 5-6 price objects with different dates and prices, showing realistic up and down price changes.
Respond ONLY in English for all text fields in the JSON.
Do NOT use web search or external data. Only analyze the image.
Return ONLY valid JSON, no explanation.

Example (must follow this format):
{
  "cardName": "Snivy",
  "rarity": "Basic",
  "year": "2013",
  "seriesExpansion": "Dark Explorers",
  "description": "Snivy is a Grass-type Pokémon known for its agile movements and sharp leaves. It uses the sunlight to enhance its movements and can swiftly attack its opponents.",
  "price": "$2.50",
  "priceSource": "tcgplayer.com",
  "priceLink": "https://www.tcgplayer.com/product/12345/snivy-dark-explorers",
  "priceRange": "$2 - $5",
  "recentPrices": [
    { "price": "$2.30", "date": "2025-10-10" },
    { "price": "$2.50", "date": "2025-10-05" },
    { "price": "$2.10", "date": "2025-10-01" },
    { "price": "$2.60", "date": "2025-09-28" },
    { "price": "$2.40", "date": "2025-09-25" },
    { "price": "$2.20", "date": "2025-09-20" }
  ],
  "gradedPrices": [
    { "grade": "PSA 10", "price": "$25" },
    { "grade": "PSA 9", "price": "$15" }
  ],
  "similarCards": [
    { "cardName": "Snivy (BW Promo)", "priceLink": "https://www.tcgplayer.com/product/67890/snivy-bw-promo" }
  ]
}
`,
  JA: `
JSON応答のすべてのテキストフィールドは日本語のみで記述すること。
このトレーディングカード画像から見える情報のみを読み取り、以下のフィールドを持つJSONオブジェクトで返してください:
{
  "cardName": "",
  "rarity": "",
  "year": "",
  "seriesExpansion": "",
  "description": "",
  "price": "",
  "priceSource": "",
  "priceLink": "",
  "priceRange": "",
  "recentPrices": [],
  "gradedPrices": [],
  "similarCards": []
}
"description"は画像から読み取れる特徴やストーリーを2〜3文でまとめ、可能であればカードやポケモンに関するカード上にない豆知識や背景情報も加えてください。
すべてのフィールドについて、情報が見えない場合はカードの文脈に基づいてもっともらしいダミーデータを生成してください。nullや空欄は使わず、すべての項目に適切なダミーデータを入力してください。
"price", "priceSource", "priceLink", "priceRange", "recentPrices", "gradedPrices", "similarCards" も必ず価格ガイドや最近の販売履歴のようなダミーデータで埋めてください。
"recentPrices"には5〜6件の異なる日付と価格の履歴を入れ、価格が上下するようにしてください。
ウェブ検索や外部データは使用せず、画像のみを分析してください。
説明なしで有効なJSONのみを返してください。

例:
{
  "cardName": "ツタージャ",
  "rarity": "ベーシック",
  "year": "2013",
  "seriesExpansion": "ダークエクスプローラーズ",
  "description": "ツタージャは素早い動きと鋭い葉が特徴のくさタイプポケモンです。太陽光を利用して動きを強化し、素早く攻撃します。",
  "price": "¥300",
  "priceSource": "tcgplayer.jp",
  "priceLink": "https://www.tcgplayer.jp/product/12345/snivy-dark-explorers",
  "priceRange": "¥250 - ¥500",
  "recentPrices": [
    { "price": "¥280", "date": "2025-10-10" },
    { "price": "¥300", "date": "2025-10-05" },
    { "price": "¥260", "date": "2025-10-01" },
    { "price": "¥320", "date": "2025-09-28" },
    { "price": "¥290", "date": "2025-09-25" },
    { "price": "¥270", "date": "2025-09-20" }
  ],
  "gradedPrices": [
    { "grade": "PSA 10", "price": "¥2500" },
    { "grade": "PSA 9", "price": "¥1500" }
  ],
  "similarCards": [
    { "cardName": "ツタージャ (BWプロモ)", "priceLink": "https://www.tcgplayer.jp/product/67890/snivy-bw-promo" }
  ]
}
`,
  FR: `
Tous les champs texte du JSON doivent être en français uniquement.
Lisez UNIQUEMENT les informations visibles sur cette image de carte à collectionner et retournez un objet JSON avec ces champs :
{
  "cardName": "",
  "rarity": "",
  "year": "",
  "seriesExpansion": "",
  "description": "",
  "price": "",
  "priceSource": "",
  "priceLink": "",
  "priceRange": "",
  "recentPrices": [],
  "gradedPrices": [],
  "similarCards": []
}
"description" doit être un résumé de 2-3 phrases des caractéristiques ou de l'histoire de la carte, basé sur l'image. Si possible, ajoutez des faits ou du lore sur la carte ou le pokémon qui ne figurent pas sur la carte.
Pour tous les champs, si l'information n'est pas visible, générez des données fictives plausibles selon le contexte de la carte. Ne laissez aucun champ vide ou null.
"price", "priceSource", "priceLink", "priceRange", "recentPrices", "gradedPrices", "similarCards" doivent tous être remplis avec des données fictives raisonnables, similaires aux guides de prix et ventes récentes.
"recentPrices" doit contenir 5 à 6 valeurs différentes avec des dates et des prix qui montent et descendent.
N'utilisez PAS la recherche web ou des données externes. Analysez uniquement l'image.
Retournez UNIQUEMENT un JSON valide, sans explication.

Exemple :
{
  "cardName": "Vipélierre",
  "rarity": "Basique",
  "year": "2013",
  "seriesExpansion": "Explorateurs Obscurs",
  "description": "Vipélierre est un Pokémon de type Plante connu pour sa rapidité et ses feuilles acérées. Il utilise la lumière du soleil pour améliorer ses mouvements et attaquer rapidement ses adversaires.",
  "price": "2,50 €",
  "priceSource": "tcgplayer.fr",
  "priceLink": "https://www.tcgplayer.fr/product/12345/vipelierre-explorateurs-obscurs",
  "priceRange": "2 € - 5 €",
  "recentPrices": [
    { "price": "2,30 €", "date": "2025-10-10" },
    { "price": "2,50 €", "date": "2025-10-05" },
    { "price": "2,10 €", "date": "2025-10-01" },
    { "price": "2,60 €", "date": "2025-09-28" },
    { "price": "2,40 €", "date": "2025-09-25" },
    { "price": "2,20 €", "date": "2025-09-20" }
  ],
  "gradedPrices": [
    { "grade": "PSA 10", "price": "25 €" },
    { "grade": "PSA 9", "price": "15 €" }
  ],
  "similarCards": [
    { "cardName": "Vipélierre (Promo BW)", "priceLink": "https://www.tcgplayer.fr/product/67890/vipelierre-bw-promo" }
  ]
}
`,
  ZH: `
JSON响应中的所有文本字段必须仅使用中文。
只读取此交易卡片图像中的可见信息，并返回包含以下字段的JSON对象：
{
  "cardName": "",
  "rarity": "",
  "year": "",
  "seriesExpansion": "",
  "description": "",
  "price": "",
  "priceSource": "",
  "priceLink": "",
  "priceRange": "",
  "recentPrices": [],
  "gradedPrices": [],
  "similarCards": []
}
"description"字段必须用2-3句话总结卡片的特点或背景（仅根据图片），如有可能请补充卡片或宝可梦的有趣知识或背景故事（不在卡片上显示）。
所有字段如果图片中不可见，请根据卡片内容合理伪造数据，不要留空或为null。
"price", "priceSource", "priceLink", "priceRange", "recentPrices", "gradedPrices", "similarCards"都必须填充合理的伪造数据，类似价格指南和近期成交。
"recentPrices"必须包含5-6个不同日期和价格的对象，价格有上下波动。
不要使用网络搜索或外部数据，只分析图片。
只返回有效的JSON，无需解释。

示例：
{
  "cardName": "藤藤蛇",
  "rarity": "基础",
  "year": "2013",
  "seriesExpansion": "黑暗探险者",
  "description": "藤藤蛇是一种以敏捷和锋利叶片著称的草系宝可梦。它利用阳光增强动作，能迅速攻击对手。",
  "price": "¥18",
  "priceSource": "tcgplayer.cn",
  "priceLink": "https://www.tcgplayer.cn/product/12345/snivy-dark-explorers",
  "priceRange": "¥15 - ¥30",
  "recentPrices": [
    { "price": "¥17", "date": "2025-10-10" },
    { "price": "¥18", "date": "2025-10-05" },
    { "price": "¥16", "date": "2025-10-01" },
    { "price": "¥19", "date": "2025-09-28" },
    { "price": "¥17", "date": "2025-09-25" },
    { "price": "¥15", "date": "2025-09-20" }
  ],
  "gradedPrices": [
    { "grade": "PSA 10", "price": "¥180" },
    { "grade": "PSA 9", "price": "¥120" }
  ],
  "similarCards": [
    { "cardName": "藤藤蛇 (BW促销)", "priceLink": "https://www.tcgplayer.cn/product/67890/snivy-bw-promo" }
  ]
}
`,
  HI: `
JSON प्रतिक्रिया में सभी टेक्स्ट फ़ील्ड केवल हिंदी में होने चाहिए।
केवल इस ट्रेडिंग कार्ड छवि से दिखाई देने वाली जानकारी पढ़ें और इन फ़ील्ड्स के साथ एक JSON ऑब्जेक्ट लौटाएँ:
{
  "cardName": "",
  "rarity": "",
  "year": "",
  "seriesExpansion": "",
  "description": "",
  "price": "",
  "priceSource": "",
  "priceLink": "",
  "priceRange": "",
  "recentPrices": [],
  "gradedPrices": [],
  "similarCards": []
}
"description" में कार्ड की विशेषताओं या कहानी का 2-3 वाक्यों में सारांश दें (केवल छवि के आधार पर)। यदि संभव हो तो कार्ड या पोकेमोन के बारे में कोई रोचक तथ्य या जानकारी जोड़ें जो कार्ड पर नहीं है।
अगर कोई जानकारी दिखाई नहीं देती है तो सभी फ़ील्ड के लिए कार्ड के संदर्भ के अनुसार उपयुक्त नकली डेटा जनरेट करें। कोई फ़ील्ड खाली या null न छोड़ें।
"price", "priceSource", "priceLink", "priceRange", "recentPrices", "gradedPrices", "similarCards" सभी में उचित नकली डेटा भरें, जैसे price guide और हाल की बिक्री।
"recentPrices" में 5-6 अलग-अलग तारीखों और कीमतों के ऑब्जेक्ट हों, जिनमें कीमतें ऊपर-नीचे होती रहें।
वेब खोज या बाहरी डेटा का उपयोग न करें। केवल छवि का विश्लेषण करें।
केवल मान्य JSON लौटाएँ, कोई स्पष्टीकरण नहीं।

उदाहरण:
{
  "cardName": "स्निवी",
  "rarity": "बेसिक",
  "year": "2013",
  "seriesExpansion": "डार्क एक्सप्लोरर्स",
  "description": "स्निवी एक घास-प्रकार का पोकेमोन है जो अपनी फुर्तीली चाल और तेज पत्तियों के लिए जाना जाता है। यह सूर्य की रोशनी का उपयोग अपनी गति बढ़ाने के लिए करता है और जल्दी हमला करता है।",
  "price": "₹200",
  "priceSource": "tcgplayer.in",
  "priceLink": "https://www.tcgplayer.in/product/12345/snivy-dark-explorers",
  "priceRange": "₹150 - ₹300",
  "recentPrices": [
    { "price": "₹180", "date": "2025-10-10" },
    { "price": "₹200", "date": "2025-10-05" },
    { "price": "₹170", "date": "2025-10-01" },
    { "price": "₹210", "date": "2025-09-28" },
    { "price": "₹190", "date": "2025-09-25" },
    { "price": "₹160", "date": "2025-09-20" }
  ],
  "gradedPrices": [
    { "grade": "PSA 10", "price": "₹2000" },
    { "grade": "PSA 9", "price": "₹1200" }
  ],
  "similarCards": [
    { "cardName": "स्निवी (BW प्रोमो)", "priceLink": "https://www.tcgplayer.in/product/67890/snivy-bw-promo" }
  ]
}
`,
  ES: `
TODOS los campos de texto en el JSON deben estar únicamente en español.
Lee SOLO la información visible de esta imagen de carta coleccionable y devuelve un objeto JSON con estos campos:
{
  "cardName": "",
  "rarity": "",
  "year": "",
  "seriesExpansion": "",
  "description": "",
  "price": "",
  "priceSource": "",
  "priceLink": "",
  "priceRange": "",
  "recentPrices": [],
  "gradedPrices": [],
  "similarCards": []
}
"description" debe ser un resumen de 2-3 frases sobre las características o historia de la carta, basado en la imagen. Si es posible, añade datos curiosos o lore sobre la carta o el pokémon que no aparecen en la carta.
Si algún campo no es visible, genera datos falsos plausibles según el contexto de la carta. No dejes ningún campo vacío o null.
"price", "priceSource", "priceLink", "priceRange", "recentPrices", "gradedPrices", "similarCards" deben estar rellenos con datos falsos razonables, similares a guías de precios y ventas recientes.
"recentPrices" debe tener 5-6 objetos con fechas y precios diferentes, mostrando subidas y bajadas realistas.
NO uses búsqueda web ni datos externos. Solo analiza la imagen.
Devuelve SOLO JSON válido, sin explicación.

Ejemplo:
{
  "cardName": "Snivy",
  "rarity": "Básica",
  "year": "2013",
  "seriesExpansion": "Exploradores Oscuros",
  "description": "Snivy es un Pokémon de tipo Planta conocido por su agilidad y hojas afiladas. Utiliza la luz solar para mejorar sus movimientos y atacar rápidamente.",
  "price": "€2.50",
  "priceSource": "tcgplayer.es",
  "priceLink": "https://www.tcgplayer.es/product/12345/snivy-dark-explorers",
  "priceRange": "€2 - €5",
  "recentPrices": [
    { "price": "€2.30", "date": "2025-10-10" },
    { "price": "€2.50", "date": "2025-10-05" },
    { "price": "€2.10", "date": "2025-10-01" },
    { "price": "€2.60", "date": "2025-09-28" },
    { "price": "€2.40", "date": "2025-09-25" },
    { "price": "€2.20", "date": "2025-09-20" }
  ],
  "gradedPrices": [
    { "grade": "PSA 10", "price": "€25" },
    { "grade": "PSA 9", "price": "€15" }
  ],
  "similarCards": [
    { "cardName": "Snivy (BW Promo)", "priceLink": "https://www.tcgplayer.es/product/67890/snivy-bw-promo" }
  ]
}
`,
  PT: `
TODOS os campos de texto no JSON DEVEM estar apenas em português.
Leia SOMENTE as informações visíveis desta imagem de carta colecionável e retorne um objeto JSON com estes campos:
{
  "cardName": "",
  "rarity": "",
  "year": "",
  "seriesExpansion": "",
  "description": "",
  "price": "",
  "priceSource": "",
  "priceLink": "",
  "priceRange": "",
  "recentPrices": [],
  "gradedPrices": [],
  "similarCards": []
}
"description" deve ser um resumo de 2-3 frases sobre as características ou história do card, baseado na imagem. Se possível, acrescente curiosidades ou lore sobre o card ou pokémon que não estão no card.
Se alguma informação não estiver visível, gere dados fictícios plausíveis com base no contexto do card. Não deixe nenhum campo vazio ou null.
"price", "priceSource", "priceLink", "priceRange", "recentPrices", "gradedPrices", "similarCards" devem ser preenchidos com dados fictícios razoáveis, como guias de preços e vendas recentes.
"recentPrices" deve conter 5-6 objetos com datas e preços diferentes, mostrando variações realistas para cima e para baixo.
NÃO use busca na web ou dados externos. Analise apenas a imagem.
Retorne SOMENTE JSON válido, sem explicação.

Exemplo:
{
  "cardName": "Snivy",
  "rarity": "Básico",
  "year": "2013",
  "seriesExpansion": "Exploradores Sombrios",
  "description": "Snivy é um Pokémon do tipo Planta conhecido por sua agilidade e folhas afiadas. Ele usa a luz do sol para melhorar seus movimentos e atacar rapidamente.",
  "price": "R$12,50",
  "priceSource": "tcgplayer.com.br",
  "priceLink": "https://www.tcgplayer.com.br/product/12345/snivy-dark-explorers",
  "priceRange": "R$10 - R$20",
  "recentPrices": [
    { "price": "R$12,30", "date": "2025-10-10" },
    { "price": "R$12,50", "date": "2025-10-05" },
    { "price": "R$12,10", "date": "2025-10-01" },
    { "price": "R$12,60", "date": "2025-09-28" },
    { "price": "R$12,40", "date": "2025-09-25" },
    { "price": "R$12,20", "date": "2025-09-20" }
  ],
  "gradedPrices": [
    { "grade": "PSA 10", "price": "R$125" },
    { "grade": "PSA 9", "price": "R$75" }
  ],
  "similarCards": [
    { "cardName": "Snivy (BW Promo)", "priceLink": "https://www.tcgplayer.com.br/product/67890/snivy-bw-promo" }
  ]
}
`,
};