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

Відмітка «куплено» для згенерованого рядка. Документ існує — куплено; немає документа — не куплено. Id документа: `<weekStart>~<productId>`.

```json
{ "schemaVersion": 1, "weekStart": "2026-11-02", "productId": "<id продукту>" }
```
