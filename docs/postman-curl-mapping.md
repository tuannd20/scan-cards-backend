# Postman cURL Mapping

Base domain: `https://scan-cards-backend.vercel.app`

Scope:
- Included only active routes wired through `AppModule`.
- Excluded commented routes.
- Excluded modules currently commented or not imported in `AppModule`: `ScanModule`, `UploadKeystoreModule`, `AiChatModule`, `CustomCardModule`, `SportCardModule`.
- The app does not set a global API prefix. Vercel rewrites requests internally to `api/index.ts`, so public routes use the paths below directly.

## App

### GET `/`

```bash
curl --location 'https://scan-cards-backend.vercel.app/' \
  --header 'Accept: application/json'
```

### GET `/error`

```bash
curl --location 'https://scan-cards-backend.vercel.app/error' \
  --header 'Accept: application/json'
```

## Easy Card Scanner

### POST `/easy-card-scanner/cards/scans`

Multipart form-data.

Fields:
- `image`: required file.
- `language`: optional language code, for example `en`, `vi`, `ja`, `fr`.

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/cards/scans' \
  --header 'Accept: application/json' \
  --form 'image=@"/absolute/path/to/card.jpg"' \
  --form 'language="en"'
```

### GET `/easy-card-scanner/cards`

Query:
- `type`: optional, `all | pokemon | yugioh | soccer`; default `all`.
- `page`: optional. If provided, pagination is enabled.
- `limit`: optional. Default `20` when pagination is enabled.

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/cards?type=all&page=1&limit=20' \
  --header 'Accept: application/json'
```

Pokemon only:

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/cards?type=pokemon&page=1&limit=20' \
  --header 'Accept: application/json'
```

Yugioh only:

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/cards?type=yugioh&page=1&limit=20' \
  --header 'Accept: application/json'
```

Soccer only:

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/cards?type=soccer&page=1&limit=20' \
  --header 'Accept: application/json'
```

### GET `/easy-card-scanner/cards/search`

Query:
- `type`: required, `pokemon | yugioh | soccer`.
- `search`: required keyword.
- `page`: optional. If provided, pagination is enabled.
- `limit`: optional. Default `20` when pagination is enabled.

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/cards/search?type=pokemon&search=charizard&page=1&limit=20' \
  --header 'Accept: application/json'
```

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/cards/search?type=yugioh&search=dark%20magician&page=1&limit=20' \
  --header 'Accept: application/json'
```

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/cards/search?type=soccer&search=messi&page=1&limit=20' \
  --header 'Accept: application/json'
```

### POST `/easy-card-scanner/cards/currency-conversions`

JSON body:
- `base`: required source currency.
- `target`: required target currency.
- `data`: required full card response payload. Send the full object returned by scan/search if you want all nested price fields converted.

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/cards/currency-conversions' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "base": "USD",
    "target": "VND",
    "data": {
      "cardName": "Charizard ex",
      "price": "$25.50",
      "rawPrice": {
        "price": "$25.50",
        "currency": "USD"
      },
      "markets": [
        {
          "name": "TCGplayer",
          "price": "$25.50",
          "currency": "USD"
        }
      ]
    }
  }'
```

### POST `/easy-card-scanner/cards/grades`

Multipart form-data.

Fields:
- `image`: required file.
- `language`: optional language code, for example `en`, `vi`, `ja`, `fr`.

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/cards/grades' \
  --header 'Accept: application/json' \
  --form 'image=@"/absolute/path/to/card.jpg"' \
  --form 'language="en"'
```

## Card Scanner

### POST `/card-scanner/scan`

Multipart form-data.

Fields:
- `image`: required file. Allowed MIME types: JPEG, JPG, PNG, WebP. Max size: 10 MB.
- `cardType`: optional, `pokemon | sport`.
- `language`: optional language code.

```bash
curl --location 'https://scan-cards-backend.vercel.app/card-scanner/scan' \
  --header 'Accept: application/json' \
  --form 'image=@"/absolute/path/to/card.jpg"' \
  --form 'cardType="pokemon"' \
  --form 'language="vi"'
```

Sport card hint:

```bash
curl --location 'https://scan-cards-backend.vercel.app/card-scanner/scan' \
  --header 'Accept: application/json' \
  --form 'image=@"/absolute/path/to/sport-card.jpg"' \
  --form 'cardType="sport"' \
  --form 'language="en"'
```

### POST `/card-scanner/scan-title-openrouter`

Multipart form-data.

Fields:
- `image`: required file.

```bash
curl --location 'https://scan-cards-backend.vercel.app/card-scanner/scan-title-openrouter' \
  --header 'Accept: application/json' \
  --form 'image=@"/absolute/path/to/card.jpg"'
```

## Easy Card Scanner - Catalog

Browse and search the shared card catalog (pokemon, sport, and related categories).

### GET `/easy-card-scanner/catalog/cards/search`

Query:
- `categories`: required, `pokemon | sport`.
- `search`: optional keyword. Searches card name or card number.
- `page`: optional, default `1`.
- `limit`: optional, default `20`.
- Pokemon filters: repeated `type`, `weakness`, `resistance`, `rarity`, repeated `category`.
- Sport filters: repeated `sport`, repeated `category`.
- Price filters: `priceMin`, `priceMax`, or preset `priceRange`.
- `priceRange`: `under_10 | 10_50 | 50_100 | over_100`.
- `sort`: `price_asc | price_desc | name_asc | name_desc`; default `name_asc`.

Pokemon search:

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/catalog/cards/search?categories=pokemon&search=charizard&page=1&limit=20&type=Fire&weakness=Water&rarity=Rare%20Holo&category=Base%20Set&priceMin=10&priceMax=100&sort=price_desc' \
  --header 'Accept: application/json'
```

Pokemon search with repeated filters:

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/catalog/cards/search?categories=pokemon&search=pikachu&page=1&limit=20&type=Lightning&type=Colorless&rarity=Rare&rarity=Promo&category=Scarlet%20%26%20Violet&category=Promo&priceRange=10_50&sort=name_asc' \
  --header 'Accept: application/json'
```

Sport search:

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/catalog/cards/search?categories=sport&search=jordan&page=1&limit=20&sport=basketball&category=Prizm&priceRange=over_100&sort=price_desc' \
  --header 'Accept: application/json'
```

### GET `/easy-card-scanner/catalog/cards`

Query:
- `categories`: required, `pokemon | sport`.
- `sport`: optional, only for `categories=sport`.
- `page`: optional, default `1`.
- `limit`: optional, default `2` in controller.

Pokemon:

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/catalog/cards?categories=pokemon&page=1&limit=20' \
  --header 'Accept: application/json'
```

Sport all:

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/catalog/cards?categories=sport&page=1&limit=20' \
  --header 'Accept: application/json'
```

Sport filtered:

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/catalog/cards?categories=sport&sport=basketball&page=1&limit=20' \
  --header 'Accept: application/json'
```

### GET `/easy-card-scanner/catalog/stats`

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/catalog/stats' \
  --header 'Accept: application/json'
```

### GET `/easy-card-scanner/catalog/cards/trending`

Query:
- `period`: optional, `today | week | month`; default `week`.
- `direction`: optional, `up | down | both`; default `both`.
- `minChangePercent`: optional number; default `0`.
- `limit`: optional number; default `20`, max `100`.

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/catalog/cards/trending?period=week&direction=both&minChangePercent=5&limit=20' \
  --header 'Accept: application/json'
```

Only upward movers:

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/catalog/cards/trending?period=month&direction=up&minChangePercent=10&limit=50' \
  --header 'Accept: application/json'
```

### GET `/easy-card-scanner/catalog/cards/top-movers`

Query:
- `period`: optional, `today | week | month`; default `today`.
- `direction`: optional, `gainers | losers`; default `gainers`.
- `limit`: optional number; default `10`, max `100`.

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/catalog/cards/top-movers?period=today&direction=gainers&limit=10' \
  --header 'Accept: application/json'
```

Losers:

```bash
curl --location 'https://scan-cards-backend.vercel.app/easy-card-scanner/catalog/cards/top-movers?period=week&direction=losers&limit=20' \
  --header 'Accept: application/json'
```

## Articles

### POST `/articles`

Creates an article manually. The service also tries to generate translations using OpenRouter, so this request can take longer and depends on `OPENROUTER_API_KEY` being configured.

JSON body:
- `title`: required string.
- `bannerUrl`: optional string.
- `description`: optional string.
- `type`: optional, `pokemon | sports`.
- `cardNumber`: optional string.
- `sections`: optional array of `{ heading, content, image }`.

```bash
curl --location 'https://scan-cards-backend.vercel.app/articles' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "title": "Charizard Market Watch",
    "bannerUrl": "https://example.com/banner.jpg",
    "description": "Short overview of Charizard card price movement.",
    "type": "pokemon",
    "cardNumber": "4/102",
    "sections": [
      {
        "heading": "Market summary",
        "content": "Charizard remains one of the most searched Pokemon cards.",
        "image": "https://example.com/section-image.jpg"
      },
      {
        "heading": "Collector notes",
        "content": "Condition, grading, and edition strongly affect value."
      }
    ]
  }'
```

### GET `/articles`

Query:
- `type`: optional, `pokemon | sports`.
- `page`: optional, default `1`.
- `limit`: optional, default `10`.
- `language`: optional language code. Supported by service: `ZH`, `HI`, `ES`, `AR`, `FR`, `BN`, `EN`, `PT`, `SW`, `ID`, `JA`, `DE`, `PA`, `IT`.

```bash
curl --location 'https://scan-cards-backend.vercel.app/articles?type=pokemon&page=1&limit=10&language=EN' \
  --header 'Accept: application/json'
```

Sports articles:

```bash
curl --location 'https://scan-cards-backend.vercel.app/articles?type=sports&page=1&limit=10&language=FR' \
  --header 'Accept: application/json'
```

### GET `/articles/:id`

Path:
- `id`: MongoDB article id.

Query:
- `language`: optional language code. Defaults to `EN` if omitted or unsupported.

```bash
curl --location 'https://scan-cards-backend.vercel.app/articles/REPLACE_ARTICLE_ID?language=EN' \
  --header 'Accept: application/json'
```

### PATCH `/articles/:id`

Path:
- `id`: MongoDB article id.

JSON body accepts partial `CreateArticleDto`.

```bash
curl --location --request PATCH 'https://scan-cards-backend.vercel.app/articles/REPLACE_ARTICLE_ID' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "title": "Updated Charizard Market Watch",
    "description": "Updated short overview.",
    "type": "pokemon",
    "cardNumber": "4/102",
    "sections": [
      {
        "heading": "Updated market summary",
        "content": "Updated article body."
      }
    ]
  }'
```

### DELETE `/articles/:id`

Soft delete by setting `isActive` to `false`.

```bash
curl --location --request DELETE 'https://scan-cards-backend.vercel.app/articles/REPLACE_ARTICLE_ID' \
  --header 'Accept: application/json'
```

### DELETE `/articles`

Hard delete all articles. Use carefully.

```bash
curl --location --request DELETE 'https://scan-cards-backend.vercel.app/articles' \
  --header 'Accept: application/json'
```

## Not Included

Commented routes omitted:
- `/card-scanner/scan-path`
- `/card-scanner/scan-search-full`
- `/card-scanner/scan-gemini`
- `/card-scanner/scan-search`
- `/get-all-recommended`
- `/autocomplete`
- `/sport-stats`
- `/stats`
- `/sports`
- `/sports/counts`

Inactive or not imported module routes omitted:
- `/scan/scan-card`
- `/upload-keystore/upload`
- `/upload-keystore/upload/:filename`
- `/ai-chat/message`
- `/ai-chat/search-card`
- `/ai-chat/rock-identifier`
- `/custom-card/...`
- `/sport-card/...`
