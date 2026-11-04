# Модель збережених даних

Контракт для всіх, хто пише в базу артефакту: сам застосунок і зовнішні записи (FR-13). Код: `src/infrastructure/serialization/entities.ts`.

## Загальні правила

- Кожна сутність — окремий документ у колекції; **ідентифікатор документа = id сутності**, усередині документа `id` не зберігається.
- Кожен документ має поле `schemaVersion` (зараз `1`).
- Читання не довіряє документам: документ без обов'язкових полів ігнорується, некоректні необов'язкові поля відкидаються.
- Персональних даних немає: жодних ідентифікаторів, імен чи email користувачів.

## Колекції

### `products`

```json
{
  "schemaVersion": 1,
  "name": "Нут",
  "aliases": ["турецький горох"],
  "category": "legumes",
  "nutrition": { "protein": true, "fiber": true, "healthyFat": false },
  "isStaple": false
}
```

Обов'язкове: `name`. `category` — одне з `productCategories` (`src/domain/product.ts`), інакше `other`.

### `recipes`

```json
{
  "schemaVersion": 1,
  "title": "Сочевичний суп",
  "servings": 4,
  "timeMinutes": 40,
  "ingredients": [
    { "productId": "<id продукту>", "quantity": { "amount": 300, "unit": "g" } },
    { "productId": "<id продукту>", "note": "за смаком" }
  ],
  "steps": ["Обсмажити цибулю", "Варити сочевицю 25 хв"],
  "tags": ["суп"],
  "kidFriendly": true,
  "sourceUrl": "https://…",
  "notes": "…"
}
```

Обов'язкове: `title`, `servings > 0`. `unit` — одне з `units` (`src/domain/quantity.ts`). Інгредієнт без `productId` відкидається.

### `frameworks`

```json
{
  "schemaVersion": 1,
  "title": "Боул",
  "description": "…",
  "kidFriendly": false,
  "slots": [
    {
      "id": "protein",
      "name": "Білок",
      "required": true,
      "options": [
        { "id": "protein-chicken", "kind": "product", "productId": "<id продукту>", "kidFriendly": true },
        { "id": "protein-tofu", "kind": "text", "text": "Тофу", "kidFriendly": false }
      ]
    }
  ]
}
```

Обов'язкове: `title`; у слоті — `id`, `name`; у варіанті — `id` і `productId` або `text` відповідно до `kind`.

### `planEntries`

Одна страва в плані тижня. Окремий документ на кожну страву, щоб одночасне редагування одного тижня з кількох клієнтів не перезаписувало чужі зміни.

```json
{
  "schemaVersion": 1,
  "weekStart": "2026-11-02",
  "dish": { "kind": "recipe", "recipeId": "<id рецепта>" },
  "servings": 4,
  "slots": [
    { "date": "2026-11-02", "meal": "dinner" },
    { "date": "2026-11-03", "meal": "lunch" }
  ]
}
```

`weekStart` — понеділок тижня. `dish.kind`: `recipe` (`recipeId`), `framework` (`frameworkId`, `choices`: id слота → id варіанта) або `text` (`text`). `meal` — одне з `meals` (`src/domain/plan.ts`). Перший слот — день приготування, решта — залишки.

### `shoppingItems`

Позиція списку покупок, додана вручну.

```json
{ "schemaVersion": 1, "weekStart": "2026-11-02", "text": "Серветки", "checked": false }
```

### `shoppingChecks`

Стан згенерованого рядка списку покупок. `status`: `bought` — куплено, `atHome` — уже є вдома, купувати не треба; `needed` — базовий запас, який цього тижня треба купити. Немає документа — звичайний продукт треба купити, базовий запас — ні. Документ без `status` (записаний до появи поля) означає `bought`. Id документа: `<weekStart>~<productId>`.

```json
{ "schemaVersion": 1, "weekStart": "2026-11-02", "productId": "<id продукту>", "status": "atHome" }
```

### `aiLog`

Журнал AI-запитів для діагностики збоїв. Пише застосунок після кожного запиту; у резервну копію не входить. Зміст запитів і будь-які дані про користувача не зберігаються.

```json
{
  "schemaVersion": 1,
  "startedAt": "2026-11-04T08:00:00.000Z",
  "operation": "draftWeek",
  "durationMs": 41200,
  "outcome": "error",
  "errorCode": "failed",
  "detail": "network_error",
  "hiddenAtStart": false,
  "hiddenDuring": true,
  "hiddenAtEnd": false,
  "online": true,
  "mobile": true
}
```

`operation` — метод `AiService`; `errorCode` — `AiErrorCode`; `detail` — код або повідомлення хоста (до 300 символів); `hidden*` — чи була сторінка прихована на початку, будь-коли під час і наприкінці запиту.

## Фото

`recipes.photoAssetId` — id файлу у сховищі артефакту; хост віддає його за адресою `/_blob/<id>`. Фото зменшуються до ~1600 px по довшій стороні перед завантаженням.

## Резервна копія

Файл JSON із тими самими документами, що й у базі, плюс `id` кожного запису:

```json
{
  "app": "meal-planning",
  "schemaVersion": 1,
  "products": [{ "id": "…", "schemaVersion": 1, "name": "…" }],
  "recipes": [],
  "frameworks": [],
  "planEntries": [],
  "shoppingItems": [],
  "shoppingChecks": []
}
```

Імпорт об'єднує дані: записи з тим самим `id` замінюються, решта зберігається, нічого не видаляється. Самі файли фото в копію не входять.
