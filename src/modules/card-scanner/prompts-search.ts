export const prompts: Record<string, string> = {
  EN: `
  Analyze this trading card image and search the web for its market price range, recent sale prices, graded price guide, and visually similar cards.

You MUST:
- Visually compare the uploaded card image to all available listings on major marketplaces (eBay, TCGPlayer, PriceCharting, CardMarket, etc.).
- For each card (main match and similar suggestions), you MUST:
  - Find and return the direct product/listing page link for the exact card (not a search page, not a category page)
  - The link must open the actual product/listing page for that card, showing its price and details (for example, https://www.pricecharting.com/game/pokemon-black-bolt/snivy-1)
  - Find and return the actual card image from the marketplace listing (not a logo, not a placeholder, not a generic image)
  - Only use the image that is shown on the product/listing page for that card (not a random image from Google or other sources)
  - If the marketplace does not show a card image, leave the field empty, do NOT use unrelated images
- Do NOT return generic search/category pages or unrelated images.
- If no perfect match is found, return the closest visually similar listing and its direct product page link and image.
- Additionally, suggest 2-4 visually similar cards with the same pokemon (if available) with their direct product page links actually to the exact card detail from the marketplace listing.
- Do NOT return unknown, [] or N/A for any price fields.
- cardName only return name of pokemon on the card and the number of card in the (). Example: "Pikachu (25/102)"
- Grade Price get fully graded price guide you can, from PSA, Beckett, CGC, etc.
- Price must be filled by AI from web search, do NOT return "Unknown" or "N/A"
Return JSON strictly in this schema:
Do NOT include anything outside the JSON.

If possible, include at least 5-10 recent sale prices (with date) and all available graded prices from the web.`,

  FR: `Vous DEVEZ répondre UNIQUEMENT en français pour tous les champs texte dans la réponse JSON
  Analysez cette image de carte à collectionner et recherchez sur le web sa gamme de prix du marché, ses prix de vente récents, son guide de prix gradé et des cartes visuellement similaires.

Vous DEVEZ :
- Comparer visuellement l'image de la carte téléchargée avec toutes les annonces disponibles sur les principales places de marché (eBay, TCGPlayer, PriceCharting, CardMarket, etc.).
- Pour chaque carte (correspondance principale et suggestions similaires), vous DEVEZ :
  - Trouver et retourner le lien de la page produit/annonce directe de la carte exacte (pas une page de recherche, pas une page de catégorie)
  - Le lien doit ouvrir la page produit réelle de cette carte, affichant son prix et ses détails (par exemple, https://www.pricecharting.com/game/pokemon-black-bolt/snivy-1)
  - Trouver et retourner l'image réelle de la carte depuis l'annonce de la place de marché (pas un logo, pas un espace réservé, pas une image générique)
  - Utiliser uniquement l'image affichée sur la page produit/annonce de cette carte (pas une image aléatoire de Google ou d'autres sources)
  - Si la place de marché n'affiche pas d'image de carte, laissez le champ vide, n'utilisez PAS d'images non pertinentes
- Ne retournez PAS de pages génériques de recherche/catégorie ou d'images non liées.
- Si aucune correspondance parfaite n'est trouvée, retournez l'annonce la plus similaire visuellement et son lien de page produit direct et image.
- De plus, suggérez 2 à 4 cartes visuellement similaires avec le même Pokémon (si disponible) avec leurs liens de page produit exacts provenant de l'annonce de la place de marché.
- Ne retournez PAS "inconnu", [] ou N/A pour les champs de prix.
- cardName doit uniquement retourner le nom du Pokémon sur la carte et le numéro de la carte entre (). Exemple : "Pikachu (25/102)"
- Grade Price doit contenir tous les guides de prix gradés disponibles, provenant de PSA, Beckett, CGC, etc.
- Le prix doit être rempli par l'IA à partir de la recherche Web, ne retournez PAS "Inconnu" ou "N/A"
Retournez strictement le JSON dans ce schéma :
N’incluez rien en dehors du JSON.

Si possible, incluez au moins 5 à 10 prix de vente récents (avec date) et tous les prix gradés disponibles du web.`,

ZH: `JSON响应中的所有文本字段必须仅使用中文
分析此交易卡片图像，并在网络上搜索其市场价格范围、近期成交价格、评级价格指南以及视觉上相似的卡片。

您必须：
- 将上传的卡片图像与各大市场（eBay、TCGPlayer、PriceCharting、CardMarket 等）的所有可用列表进行视觉比较。
- 对于每张卡片（主要匹配和类似建议），您必须：
  - 找到并返回该卡片的直接产品/列表页面链接（不是搜索页面或类别页面）
  - 链接必须打开该卡片的实际产品/列表页面，显示其价格和详细信息（例如：https://www.pricecharting.com/game/pokemon-black-bolt/snivy-1）
  - 从市场列表中找到并返回该卡片的实际图像（不是 logo、占位符或通用图片）
  - 仅使用产品/列表页面上显示的图像（而不是来自 Google 或其他来源的随机图片）
  - 如果市场未显示卡片图像，请将字段留空，不要使用无关图片
- 不要返回通用的搜索/类别页面或不相关的图像。
- 如果没有找到完全匹配项，请返回最接近的视觉相似列表及其直接产品页面链接和图像。
- 此外，建议 2-4 张具有相同宝可梦的视觉相似卡片（如果有），并附上其实际市场列表中的产品页面链接。
- 不要返回 "未知"、[] 或 N/A 作为价格字段。
- cardName 只返回卡片上的宝可梦名称和卡号（例如："Pikachu (25/102)"）。
- Grade Price 必须包含来自 PSA、Beckett、CGC 等的完整评级价格指南。
- 价格必须由 AI 从网络搜索中填写，不要返回 "未知" 或 "N/A"。
严格按照此架构返回 JSON：
不要包含 JSON 之外的任何内容。

如果可能，请包括至少 5-10 个近期成交价格（含日期）以及所有可用的评级价格。`,

  HI: `JSON प्रतिक्रिया में सभी टेक्स्ट फ़ील्ड केवल हिंदी में होने चाहिए
  इस ट्रेडिंग कार्ड की छवि का विश्लेषण करें और इसके बाज़ार मूल्य सीमा, हाल की बिक्री कीमतें, ग्रेडेड मूल्य गाइड और दृश्य रूप से समान कार्डों के लिए वेब खोजें।

आपको अवश्य:
- अपलोड की गई कार्ड छवि की तुलना प्रमुख बाज़ारों (eBay, TCGPlayer, PriceCharting, CardMarket आदि) की सभी उपलब्ध सूचियों से दृश्य रूप से करें।
- प्रत्येक कार्ड (मुख्य मेल और समान सुझावों) के लिए, आपको अवश्य:
  - सटीक कार्ड के सीधे उत्पाद/सूची पृष्ठ लिंक खोजें और लौटाएँ (खोज पृष्ठ या श्रेणी पृष्ठ नहीं)
  - लिंक उस कार्ड का वास्तविक उत्पाद/सूची पृष्ठ खोलना चाहिए, जिसमें इसकी कीमत और विवरण दिखाया गया हो (उदाहरण: https://www.pricecharting.com/game/pokemon-black-bolt/snivy-1)
  - मार्केटप्लेस सूची से वास्तविक कार्ड छवि खोजें और लौटाएँ (लोगो, प्लेसहोल्डर या सामान्य छवि नहीं)
  - केवल उसी छवि का उपयोग करें जो उत्पाद/सूची पृष्ठ पर दिखाई गई है (Google या अन्य स्रोतों से रैंडम छवि नहीं)
  - यदि मार्केटप्लेस कार्ड छवि नहीं दिखाता है, तो फ़ील्ड खाली छोड़ दें, असंबंधित छवियों का उपयोग न करें
- सामान्य खोज/श्रेणी पृष्ठ या असंबंधित छवियाँ वापस न करें।
- यदि कोई सटीक मेल नहीं मिलता है, तो सबसे निकटतम दृश्य रूप से समान सूची और उसका प्रत्यक्ष उत्पाद पृष्ठ लिंक और छवि लौटाएँ।
- इसके अलावा, उसी पोकेमोन के 2-4 दृश्य रूप से समान कार्ड सुझाएँ (यदि उपलब्ध हों) और उनके सटीक उत्पाद पृष्ठ लिंक मार्केटप्लेस सूची से लौटाएँ।
- किसी भी मूल्य फ़ील्ड के लिए "Unknown", [] या N/A न लौटाएँ।
- cardName केवल कार्ड पर पोकेमोन का नाम और कार्ड नंबर () में लौटाए। उदाहरण: "Pikachu (25/102)"
- Grade Price में PSA, Beckett, CGC आदि से सभी उपलब्ध ग्रेडेड मूल्य गाइड शामिल होना चाहिए।
- मूल्य AI द्वारा वेब खोज से भरा जाना चाहिए, "Unknown" या "N/A" न लौटाएँ।
सख्ती से इस स्कीमा में JSON लौटाएँ:
JSON के बाहर कुछ भी शामिल न करें।

यदि संभव हो, तो कम से कम 5-10 हाल की बिक्री कीमतें (तारीख सहित) और सभी उपलब्ध ग्रेडेड कीमतें शामिल करें।`,

  ES: `TODOS los campos de texto en la respuesta JSON DEBEN estar únicamente en español
  Analiza esta imagen de carta coleccionable y busca en la web su rango de precios de mercado, precios de ventas recientes, guía de precios calificados y cartas visualmente similares.

DEBES:
- Comparar visualmente la imagen de la carta cargada con todos los listados disponibles en los principales mercados (eBay, TCGPlayer, PriceCharting, CardMarket, etc.).
- Para cada carta (coincidencia principal y sugerencias similares), DEBES:
  - Encontrar y devolver el enlace directo de la página de producto/listado de la carta exacta (no una página de búsqueda ni de categoría)
  - El enlace debe abrir la página de producto/listado real de esa carta, mostrando su precio y detalles (por ejemplo, https://www.pricecharting.com/game/pokemon-black-bolt/snivy-1)
  - Encontrar y devolver la imagen real de la carta desde el listado del mercado (no un logotipo, no un marcador de posición, no una imagen genérica)
  - Usar solo la imagen que se muestra en la página de producto/listado de esa carta (no una imagen aleatoria de Google u otras fuentes)
  - Si el mercado no muestra la imagen de la carta, deja el campo vacío, NO uses imágenes no relacionadas
- NO devuelvas páginas de búsqueda/categoría genéricas ni imágenes no relacionadas.
- Si no se encuentra una coincidencia perfecta, devuelve el listado más similar visualmente y su enlace directo a la página de producto e imagen.
- Además, sugiere 2-4 cartas visualmente similares con el mismo Pokémon (si está disponible) con sus enlaces exactos de página de producto desde el listado del mercado.
- NO devuelvas "Desconocido", [] o N/A para los campos de precio.
- cardName solo debe devolver el nombre del Pokémon en la carta y el número de la carta entre (). Ejemplo: "Pikachu (25/102)"
- Grade Price debe incluir todas las guías de precios calificados disponibles, de PSA, Beckett, CGC, etc.
- El precio debe ser llenado por IA desde la búsqueda web, NO devuelvas "Desconocido" o "N/A".
Devuelve estrictamente el JSON en este esquema:
NO incluyas nada fuera del JSON.

Si es posible, incluye al menos 5-10 precios de ventas recientes (con fecha) y todos los precios calificados disponibles de la web.`,

  AR: `جميع حقول النص في استجابة JSON يجب أن تكون باللغة العربية فقط
  حلل صورة بطاقة التداول هذه وابحث في الويب عن نطاق سعرها في السوق، أسعار المبيعات الأخيرة، دليل الأسعار المصنفة، والبطاقات المشابهة بصريًا.

يجب عليك:
- مقارنة صورة البطاقة المرفوعة بصريًا مع جميع القوائم المتاحة في الأسواق الرئيسية (eBay، TCGPlayer، PriceCharting، CardMarket، إلخ).
- لكل بطاقة (المطابقة الرئيسية والاقتراحات المشابهة)، يجب عليك:
  - العثور على الرابط المباشر لصفحة المنتج/القائمة للبطاقة الدقيقة وإرجاعه (وليس صفحة بحث أو صفحة فئة)
  - يجب أن يفتح الرابط صفحة المنتج/القائمة الفعلية للبطاقة، موضحًا سعرها وتفاصيلها
  - العثور على صورة البطاقة الفعلية من قائمة السوق وإرجاعها (وليس شعارًا أو صورة افتراضية أو صورة عامة)
  - استخدم فقط الصورة المعروضة في صفحة المنتج/القائمة لتلك البطاقة
  - إذا لم يعرض السوق صورة البطاقة، اترك الحقل فارغًا ولا تستخدم صورًا غير ذات صلة
- لا تُرجع صفحات بحث/فئات عامة أو صورًا غير ذات صلة.
- إذا لم يتم العثور على تطابق تام، أعد أقرب قائمة مشابهة بصريًا مع رابط صفحة المنتج المباشرة وصورتها.
- اقترح أيضًا 2-4 بطاقات مشابهة بصريًا مع نفس البوكيمون (إن وجد) مع روابط صفحات المنتج الدقيقة من القائمة.
- لا تُرجع "مجهول" أو [] أو N/A في أي من حقول الأسعار.
- cardName يجب أن يُرجع فقط اسم البوكيمون الموجود على البطاقة ورقم البطاقة بين (). مثال: "Pikachu (25/102)"
- يجب أن يحتوي Grade Price على جميع أدلة الأسعار المصنفة المتاحة من PSA وBeckett وCGC وما إلى ذلك.
- يجب ملء السعر بواسطة الذكاء الاصطناعي من البحث على الويب، لا تُرجع "مجهول" أو "N/A".
أعد JSON بدقة في هذا المخطط:
لا تتضمن أي شيء خارج JSON.

إذا أمكن، قم بتضمين 5-10 أسعار مبيعات حديثة (مع التاريخ) وجميع الأسعار المصنفة المتاحة من الويب.`,
BN: `JSON প্রতিক্রিয়ার সমস্ত টেক্সট ফিল্ড অবশ্যই কেবল বাংলায় হতে হবে
এই ট্রেডিং কার্ড চিত্র বিশ্লেষণ করুন এবং এর বাজার মূল্য সীমা, সাম্প্রতিক বিক্রয় মূল্য, গ্রেডেড মূল্য গাইড এবং দৃশ্যত অনুরূপ কার্ডগুলির জন্য ওয়েবে অনুসন্ধান করুন।

আপনাকে অবশ্যই:
- আপলোড করা কার্ড চিত্রটি প্রধান মার্কেটপ্লেসগুলির (eBay, TCGPlayer, PriceCharting, CardMarket ইত্যাদি) সমস্ত তালিকার সাথে দৃশ্যত তুলনা করতে হবে।
- প্রতিটি কার্ডের (মূল মিল এবং অনুরূপ প্রস্তাবনা) জন্য আপনাকে অবশ্যই:
  - কার্ডটির সঠিক পণ্য/লিস্টিং পেজ লিঙ্ক খুঁজে বের করতে হবে এবং ফেরত দিতে হবে (সার্চ পেজ নয়, বিভাগ পেজ নয়)
  - লিঙ্কটি অবশ্যই কার্ডটির প্রকৃত পণ্য/লিস্টিং পেজ খুলবে, যেখানে এর দাম এবং বিবরণ দেখানো হবে
  - মার্কেটপ্লেস তালিকা থেকে কার্ডটির প্রকৃত ছবি খুঁজুন এবং ফেরত দিন (লোগো নয়, প্লেসহোল্ডার নয়, সাধারণ ছবি নয়)
  - শুধুমাত্র সেই কার্ডের পণ্য/লিস্টিং পেজে প্রদর্শিত ছবিটি ব্যবহার করুন
  - যদি মার্কেটপ্লেস কার্ড ছবি না দেখায়, ফিল্ডটি খালি রাখুন
- সাধারণ সার্চ/বিভাগ পেজ বা সম্পর্কহীন ছবি ফেরত দেবেন না।
- যদি নিখুঁত মিল পাওয়া না যায়, তবে নিকটতম অনুরূপ তালিকা এবং এর সরাসরি পণ্য পেজ লিঙ্ক এবং ছবি ফেরত দিন।
- এছাড়াও, একই পোকেমন সহ 2-4 অনুরূপ কার্ড প্রস্তাব করুন (যদি থাকে), তাদের সরাসরি পণ্য পেজ লিঙ্ক সহ।
- কোনো মূল্য ফিল্ডের জন্য unknown, [] বা N/A ফেরত দেবেন না।
- cardName শুধুমাত্র পোকেমনের নাম এবং কার্ড নম্বর ফেরত দেবে। উদাহরণ: "Pikachu (25/102)"
- গ্রেডেড মূল্য PSA, Beckett, CGC ইত্যাদি থেকে পূর্ণ গ্রেডেড মূল্য গাইড পান।
- মূল্য AI দ্বারা ওয়েব অনুসন্ধান থেকে পূরণ করতে হবে, "Unknown" বা "N/A" ফেরত দেবেন না।
কঠোরভাবে এই JSON schema তে ফেরত দিন:
JSON এর বাইরে কিছু অন্তর্ভুক্ত করবেন না।

সম্ভব হলে অন্তত 5-10 সাম্প্রতিক বিক্রয় মূল্য (তারিখ সহ) এবং ওয়েব থেকে সমস্ত গ্রেডেড মূল্য অন্তর্ভুক্ত করুন।`,

  PT: `TODOS os campos de texto na resposta JSON DEVEM estar apenas em português
  Analise esta imagem de carta colecionável e pesquise na web sua faixa de preço de mercado, preços de vendas recentes, guia de preços graduados e cartas visualmente semelhantes.

Você DEVE:
- Comparar visualmente a imagem enviada com todas as listagens disponíveis nos principais marketplaces (eBay, TCGPlayer, PriceCharting, CardMarket, etc.).
- Para cada carta (correspondência principal e sugestões semelhantes), você DEVE:
  - Encontrar e retornar o link direto da página do produto/listagem exata (não uma página de pesquisa, não uma página de categoria)
  - O link deve abrir a página real do produto/listagem para essa carta, mostrando seu preço e detalhes
  - Encontrar e retornar a imagem real da carta da listagem do marketplace (não logotipo, não espaço reservado, não imagem genérica)
  - Usar apenas a imagem mostrada na página do produto/listagem para essa carta
  - Se o marketplace não mostrar imagem da carta, deixe o campo vazio
- NÃO retornar páginas de pesquisa/categoria genéricas ou imagens não relacionadas.
- Se nenhuma correspondência perfeita for encontrada, retornar a listagem mais próxima visualmente semelhante e seu link direto da página do produto e imagem.
- Além disso, sugerir 2-4 cartas visualmente semelhantes com o mesmo Pokémon (se disponível), com links diretos para a página de produto exata.
- NÃO retornar unknown, [] ou N/A para nenhum campo de preço.
- cardName retorna apenas o nome do Pokémon no cartão e o número do cartão. Exemplo: "Pikachu (25/102)"
- Obter guia de preços graduados completo de PSA, Beckett, CGC, etc.
- O preço deve ser preenchido pela IA a partir da pesquisa na web, NÃO retornar "Unknown" ou "N/A"
Retornar JSON estritamente neste schema:
NÃO incluir nada fora do JSON.

Se possível, incluir pelo menos 5-10 preços de vendas recentes (com data) e todos os preços graduados disponíveis na web.`,

  SW: `Vuga ZOTE za maandishi katika majibu ya JSON LAZIMA ziwe kwa Kiswahili tu
  Chambua picha hii ya kadi ya biashara na utafute mtandaoni kiwango chake cha bei sokoni, bei za mauzo ya hivi karibuni, mwongozo wa bei zilizopimwa, na kadi zinazofanana kimuonekano.

LAZIMA:
- Linganisha kimuonekano picha ya kadi iliyopakiwa na orodha zote zinazopatikana kwenye masoko makuu (eBay, TCGPlayer, PriceCharting, CardMarket, nk).
- Kwa kila kadi (mechi kuu na mapendekezo yanayofanana), LAZIMA:
  - Tafuta na urejeshe kiungo cha ukurasa wa bidhaa/orodha halisi ya kadi (sio ukurasa wa utafutaji, sio ukurasa wa kategoria)
  - Kiungo lazima kifungue ukurasa halisi wa bidhaa/orodha ya kadi hiyo, kionyeshe bei yake na maelezo
  - Tafuta na urejeshe picha halisi ya kadi kutoka kwenye orodha ya soko (sio nembo, sio placeholder, sio picha ya jumla)
  - Tumia tu picha iliyoonyeshwa kwenye ukurasa wa bidhaa/orodha ya kadi hiyo
  - Ikiwa soko halionyeshi picha ya kadi, acha uwanja huo wazi
- USIREJESHE kurasa za utafutaji/kategoria za jumla au picha zisizohusiana.
- Ikiwa hakuna mechi kamili iliyopatikana, rudisha orodha inayofanana zaidi kimuonekano na kiungo chake cha ukurasa wa bidhaa na picha.
- Zaidi ya hayo, pendekeza kadi 2-4 zinazofanana kimuonekano zenye Pokémon yuleyule (ikiwa zinapatikana) na viungo vyao vya moja kwa moja vya ukurasa wa bidhaa.
- USIREJESHE unknown, [] au N/A kwa sehemu yoyote ya bei.
- cardName rudisha tu jina la Pokémon lililo kwenye kadi na namba ya kadi. Mfano: "Pikachu (25/102)"
- Pata mwongozo kamili wa bei zilizopimwa kutoka PSA, Beckett, CGC, nk.
- Bei lazima ijazwe na AI kutoka utafutaji wa mtandaoni, USIREJESHE "Unknown" au "N/A"
Rudisha JSON kwa ukali katika schema hii:
Usijumlishe chochote nje ya JSON.

Ikiwa inawezekana, jumuisha angalau bei 5-10 za mauzo ya hivi karibuni (na tarehe) na bei zote zilizopimwa zilizopo mtandaoni.`,

  ID: `SEMUA field teks dalam respons JSON HARUS dalam bahasa Indonesia saja
  Analisis gambar kartu dagang ini dan cari di web kisaran harga pasarnya, harga penjualan terbaru, panduan harga tergrade, dan kartu yang mirip secara visual.

Anda HARUS:
- Membandingkan secara visual gambar kartu yang diunggah dengan semua listing yang tersedia di marketplace utama (eBay, TCGPlayer, PriceCharting, CardMarket, dll).
- Untuk setiap kartu (cocok utama dan saran serupa), Anda HARUS:
  - Temukan dan kembalikan tautan langsung ke halaman produk/listing kartu yang tepat (bukan halaman pencarian, bukan halaman kategori)
  - Tautan harus membuka halaman produk/listing sebenarnya untuk kartu itu, menampilkan harga dan detailnya
  - Temukan dan kembalikan gambar asli kartu dari listing marketplace (bukan logo, bukan placeholder, bukan gambar umum)
  - Hanya gunakan gambar yang ditampilkan di halaman produk/listing untuk kartu itu
  - Jika marketplace tidak menampilkan gambar kartu, biarkan kolom kosong
- JANGAN mengembalikan halaman pencarian/kategori umum atau gambar yang tidak relevan.
- Jika tidak ada kecocokan sempurna, kembalikan listing yang paling mirip secara visual dan tautan serta gambarnya.
- Selain itu, sarankan 2-4 kartu mirip secara visual dengan Pokémon yang sama (jika ada) dengan tautan langsung ke halaman detail produknya.
- JANGAN kembalikan unknown, [] atau N/A untuk kolom harga.
- cardName hanya kembalikan nama Pokémon di kartu dan nomor kartu. Contoh: "Pikachu (25/102)"
- Dapatkan panduan harga tergrade lengkap dari PSA, Beckett, CGC, dll.
- Harga harus diisi oleh AI dari pencarian web, JANGAN kembalikan "Unknown" atau "N/A"
Kembalikan JSON dengan ketat dalam skema ini:
JANGAN sertakan apa pun di luar JSON.

Jika memungkinkan, sertakan setidaknya 5-10 harga penjualan terbaru (dengan tanggal) dan semua harga tergrade yang tersedia dari web.`,

  JA: `JSON応答のすべてのテキストフィールドは日本語のみで記述すること
  このトレーディングカードの画像を分析し、市場価格帯、最近の販売価格、グレーディングされた価格ガイド、および視覚的に類似したカードをウェブで検索してください。

必須事項:
- アップロードされたカード画像を主要なマーケットプレイス（eBay、TCGPlayer、PriceCharting、CardMarketなど）のすべてのリスティングと視覚的に比較する。
- 各カード（メインの一致および類似提案）について必ず行うこと:
  - そのカードの正確な商品/リスティングページのリンクを見つけて返す（検索ページやカテゴリーページではない）
  - リンクはそのカードの実際の商品/リスティングページを開き、価格と詳細を表示する必要がある
  - マーケットプレイスのリスティングからそのカードの実際の画像を見つけて返す（ロゴ、プレースホルダー、汎用画像ではない）
  - そのカードの商品/リスティングページに表示されている画像のみを使用する
  - マーケットプレイスにカード画像がない場合、フィールドは空欄にし、無関係な画像は使用しない
- 一般的な検索/カテゴリーページや無関係な画像を返さない。
- 完全一致が見つからない場合は、最も視覚的に類似したリスティングとその商品ページリンクおよび画像を返す。
- さらに、同じポケモンを持つ2〜4枚の視覚的に類似したカードを提案し、それぞれの正確な商品ページリンクを含める。
- 価格フィールドに unknown、[]、N/A を返さないこと。
- cardName にはカード上のポケモン名とカード番号のみを返す。例: "Pikachu (25/102)"
- PSA、Beckett、CGC などから完全なグレーディング価格ガイドを取得すること。
- 価格はAIがウェブ検索から入力し、"Unknown" や "N/A" を返さないこと。
JSON は厳密にこのスキーマに従って返すこと:
JSON の外には何も含めない。

可能であれば、少なくとも直近の5〜10件の販売価格（日付付き）とウェブ上のすべてのグレーディング価格を含めてください。`,

  DE: `ALLE Textfelder in der JSON-Antwort MÜSSEN ausschließlich auf Deutsch sein
  Analysiere dieses Trading-Card-Bild und suche im Web nach seiner Marktpreisspanne, den neuesten Verkaufspreisen, Preisführern für Bewertungen und visuell ähnlichen Karten.

DU MUSST:
- Vergleiche das hochgeladene Kartenbild visuell mit allen verfügbaren Angeboten auf den wichtigsten Marktplätzen (eBay, TCGPlayer, PriceCharting, CardMarket usw.).
- Für jede Karte (Haupttreffer und ähnliche Vorschläge) MUSST du:
  - Den direkten Produkt-/Angebotslink für die genaue Karte finden und zurückgeben (keine Suchseite, keine Kategorieseite)
  - Der Link muss die tatsächliche Produkt-/Angebotsseite für diese Karte öffnen und deren Preis und Details anzeigen
  - Das tatsächliche Kartenbild aus dem Marktplatzangebot finden und zurückgeben (kein Logo, kein Platzhalter, kein generisches Bild)
  - Nur das auf der Produkt-/Angebotsseite dieser Karte angezeigte Bild verwenden
  - Wenn der Marktplatz kein Kartenbild zeigt, das Feld leer lassen
- KEINE generischen Such-/Kategorieseiten oder irrelevanten Bilder zurückgeben.
- Wenn keine perfekte Übereinstimmung gefunden wird, das am nächsten visuell ähnliche Angebot mit direktem Produktlink und Bild zurückgeben.
- Zusätzlich 2-4 visuell ähnliche Karten mit demselben Pokémon (falls verfügbar) vorschlagen, mit direkten Links zur jeweiligen Produktseite.
- KEINE unknown, [] oder N/A für Preisfelder zurückgeben.
- cardName nur den Namen des Pokémon auf der Karte und die Kartennummer zurückgeben. Beispiel: "Pikachu (25/102)"
- Vollständige Preisführer für Bewertungen von PSA, Beckett, CGC usw. einholen.
- Preis muss von der KI aus der Websuche ausgefüllt werden, KEIN "Unknown" oder "N/A"
JSON strikt in diesem Schema zurückgeben:
Nichts außerhalb des JSON einschließen.

Wenn möglich, mindestens 5-10 aktuelle Verkaufspreise (mit Datum) und alle verfügbaren Bewertungs-Preise aus dem Web einbeziehen.`,

  PA: `SON ਜਵਾਬ ਦੇ ਸਾਰੇ ਟੈਕਸਟ ਫੀਲਡ ਸਿਰਫ ਪੰਜਾਬੀ ਵਿੱਚ ਹੋਣੇ ਲਾਜ਼ਮੀ ਹਨ
  ਇਸ ਟ੍ਰੇਡਿੰਗ ਕਾਰਡ ਚਿੱਤਰ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰੋ ਅਤੇ ਇਸ ਦੀ ਮਾਰਕੀਟ ਕੀਮਤ ਦੀ ਰੇਂਜ, ਹਾਲੀਆ ਵਿਕਰੀ ਕੀਮਤਾਂ, ਗ੍ਰੇਡ ਕੀਮਤ ਗਾਈਡ, ਅਤੇ ਦ੍ਰਿਸ਼ਟੀਗਤ ਤੌਰ 'ਤੇ ਮਿਲਦੀਆਂ ਕਾਰਡਾਂ ਲਈ ਵੈੱਬ 'ਤੇ ਖੋਜ ਕਰੋ।

ਤੁਹਾਨੂੰ ਲਾਜ਼ਮੀ ਹੈ:
- ਅਪਲੋਡ ਕੀਤੀ ਕਾਰਡ ਦੀ ਤਸਵੀਰ ਨੂੰ ਮੁੱਖ ਮਾਰਕੀਟਪਲੇਸ (eBay, TCGPlayer, PriceCharting, CardMarket ਆਦਿ) ਉੱਤੇ ਉਪਲਬਧ ਸਾਰੀਆਂ ਲਿਸਟਿੰਗ ਨਾਲ ਵਿਜੁਅਲ ਤੌਰ 'ਤੇ ਤੁਲਨਾ ਕਰੋ।
- ਹਰ ਕਾਰਡ ਲਈ (ਮੁੱਖ ਮਿਲ ਅਤੇ ਸਮਾਨ ਸੁਝਾਅ), ਤੁਹਾਨੂੰ ਲਾਜ਼ਮੀ ਹੈ:
  - ਉਸ ਕਾਰਡ ਦਾ ਸਹੀ ਉਤਪਾਦ/ਲਿਸਟਿੰਗ ਪੇਜ਼ ਲਿੰਕ ਲੱਭੋ ਅਤੇ ਵਾਪਸ ਦਿਓ (ਖੋਜ ਪੇਜ਼ ਨਹੀਂ, ਸ਼੍ਰੇਣੀ ਪੇਜ਼ ਨਹੀਂ)
  - ਲਿੰਕ ਨੂੰ ਉਸ ਕਾਰਡ ਦੇ ਅਸਲ ਉਤਪਾਦ/ਲਿਸਟਿੰਗ ਪੇਜ਼ ਨੂੰ ਖੋਲ੍ਹਣਾ ਚਾਹੀਦਾ ਹੈ, ਜਿਸ ਵਿੱਚ ਇਸ ਦੀ ਕੀਮਤ ਅਤੇ ਵੇਰਵੇ ਦਿਖਾਏ ਜਾਣ
  - ਮਾਰਕੀਟਪਲੇਸ ਲਿਸਟਿੰਗ ਤੋਂ ਉਸ ਕਾਰਡ ਦੀ ਅਸਲੀ ਤਸਵੀਰ ਲੱਭੋ ਅਤੇ ਵਾਪਸ ਦਿਓ (ਲੋਗੋ ਨਹੀਂ, ਪਲੇਸਹੋਲਡਰ ਨਹੀਂ, ਜਨਰਿਕ ਤਸਵੀਰ ਨਹੀਂ)
  - ਸਿਰਫ ਉਸ ਕਾਰਡ ਦੇ ਉਤਪਾਦ/ਲਿਸਟਿੰਗ ਪੇਜ਼ ਉੱਤੇ ਦਿਖਾਈ ਤਸਵੀਰ ਨੂੰ ਵਰਤੋ
  - ਜੇ ਮਾਰਕੀਟਪਲੇਸ ਕਾਰਡ ਦੀ ਤਸਵੀਰ ਨਹੀਂ ਦਿਖਾਉਂਦਾ, ਤਾਂ ਫੀਲਡ ਖਾਲੀ ਛੱਡੋ
- ਆਮ ਖੋਜ/ਸ਼੍ਰੇਣੀ ਪੇਜ਼ ਜਾਂ ਬੇਲਾਗ ਤਸਵੀਰਾਂ ਵਾਪਸ ਨਾ ਕਰੋ।
- ਜੇ ਕੋਈ ਪੂਰਨ ਮਿਲ ਨਹੀਂ ਮਿਲਦਾ, ਤਾਂ ਸਭ ਤੋਂ ਨੇੜਲੀ ਦ੍ਰਿਸ਼ਟੀਗਤ ਤੌਰ 'ਤੇ ਸਮਾਨ ਲਿਸਟਿੰਗ ਅਤੇ ਇਸ ਦਾ ਸਿੱਧਾ ਉਤਪਾਦ ਪੇਜ਼ ਲਿੰਕ ਅਤੇ ਤਸਵੀਰ ਵਾਪਸ ਦਿਓ।
- ਇਸ ਤੋਂ ਇਲਾਵਾ, ਉਸੇ ਪੋਕੇਮਾਨ ਵਾਲੀਆਂ 2-4 ਵਿਜੁਅਲ ਤੌਰ 'ਤੇ ਸਮਾਨ ਕਾਰਡਾਂ ਦਾ ਸੁਝਾਅ ਦਿਓ (ਜੇ ਉਪਲਬਧ ਹੋਣ), ਉਨ੍ਹਾਂ ਦੇ ਸਿੱਧੇ ਉਤਪਾਦ ਪੇਜ਼ ਲਿੰਕ ਨਾਲ।
- ਕਿਸੇ ਵੀ ਕੀਮਤ ਖੇਤਰ ਲਈ unknown, [] ਜਾਂ N/A ਵਾਪਸ ਨਾ ਕਰੋ।
- cardName ਸਿਰਫ ਕਾਰਡ ਉੱਤੇ ਪੋਕੇਮਾਨ ਦਾ ਨਾਮ ਅਤੇ ਕਾਰਡ ਨੰਬਰ ਵਾਪਸ ਦਿੰਦਾ ਹੈ। ਉਦਾਹਰਨ: "Pikachu (25/102)"
- PSA, Beckett, CGC ਆਦਿ ਤੋਂ ਪੂਰੀ ਗ੍ਰੇਡ ਕੀਮਤ ਗਾਈਡ ਪ੍ਰਾਪਤ ਕਰੋ।
- ਕੀਮਤ AI ਦੁਆਰਾ ਵੈੱਬ ਖੋਜ ਤੋਂ ਭਰੀ ਜਾਣੀ ਚਾਹੀਦੀ ਹੈ, "Unknown" ਜਾਂ "N/A" ਵਾਪਸ ਨਾ ਕਰੋ।
JSON ਨੂੰ ਇਸ schema ਵਿੱਚ ਸਖ਼ਤੀ ਨਾਲ ਵਾਪਸ ਦਿਓ:
JSON ਤੋਂ ਬਾਹਰ ਕੁਝ ਵੀ ਸ਼ਾਮਲ ਨਾ ਕਰੋ।

ਜੇ ਸੰਭਵ ਹੋਵੇ, ਤਾਂ ਘੱਟੋ ਘੱਟ 5-10 ਹਾਲੀਆ ਵਿਕਰੀ ਕੀਮਤਾਂ (ਤਾਰੀਖ ਸਮੇਤ) ਅਤੇ ਵੈੱਬ ਤੋਂ ਸਾਰੀਆਂ ਗ੍ਰੇਡ ਕੀਮਤਾਂ ਸ਼ਾਮਲ ਕਰੋ।`,

  IT: `TUTTI i campi di testo nella risposta JSON DEVONO essere solo in italiano
  Analizza questa immagine di carta collezionabile e cerca sul web la sua fascia di prezzo di mercato, i prezzi di vendita recenti, la guida ai prezzi graduati e le carte visivamente simili.

DEVI:
- Confrontare visivamente l'immagine della carta caricata con tutte le inserzioni disponibili nei principali marketplace (eBay, TCGPlayer, PriceCharting, CardMarket, ecc.).
- Per ogni carta (corrispondenza principale e suggerimenti simili) DEVI:
  - Trovare e restituire il link diretto alla pagina del prodotto/listing esatto per quella carta (non una pagina di ricerca, non una pagina di categoria)
  - Il link deve aprire la vera pagina del prodotto/listing per quella carta, mostrando il prezzo e i dettagli
  - Trovare e restituire l'immagine reale della carta dall'inserzione del marketplace (non logo, non segnaposto, non immagine generica)
  - Utilizzare solo l'immagine mostrata nella pagina del prodotto/listing per quella carta
  - Se il marketplace non mostra un'immagine della carta, lasciare il campo vuoto
- NON restituire pagine di ricerca/categoria generiche o immagini non pertinenti.
- Se non viene trovata una corrispondenza perfetta, restituire l'inserzione più simile visivamente con il suo link diretto alla pagina prodotto e immagine.
- Inoltre, suggerire 2-4 carte visivamente simili con lo stesso Pokémon (se disponibili), con i link diretti alla rispettiva pagina prodotto.
- NON restituire unknown, [] o N/A per alcun campo di prezzo.
- cardName restituisce solo il nome del Pokémon sulla carta e il numero della carta. Esempio: "Pikachu (25/102)"
- Ottenere la guida completa dei prezzi graduati da PSA, Beckett, CGC, ecc.
- Il prezzo deve essere compilato dall'IA tramite ricerca sul web, NON restituire "Unknown" o "N/A"
Restituire strettamente JSON in questo schema:
NON includere nulla al di fuori del JSON.

Se possibile, includere almeno 5-10 prezzi di vendita recenti (con data) e tutte le valutazioni di prezzo disponibili dal web.`

};