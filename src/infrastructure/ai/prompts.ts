/**
 * Prompts sent to the model. Each asks for JSON only and spells out the
 * exact shape, which the matching parser in responses.ts then checks.
 * The model sees no conversation history: everything it needs is here.
 */
import type { DraftChangeRequest, WeekDraftRequest } from "@/application/ports/ai";
import { meals } from "@/domain/plan";
import type { NutritionFlags, Product } from "@/domain/product";
import { productCategories } from "@/domain/product";
import { units } from "@/domain/quantity";

const directory = (products: readonly Product[]): string =>
  JSON.stringify(products.map((product) => ({ id: product.id, n: product.name, a: product.aliases })));

export function matchProductsPrompt(text: string, products: readonly Product[]): string {
  return `Ти зіставляєш продукти для кулінарного застосунку. Нижче довідник продуктів (id, назва n, синоніми a) і текст користувача українською.
Знайди в тексті всі продукти. Враховуй відмінки, зменшувальні форми, синоніми й кількості («півпачки рису» → рис). Зіставляй лише з id з довідника. Продукт, явно названий у тексті, але відсутній у довіднику, додай в unknown у називному відмінку. Не вигадуй продуктів, яких у тексті немає.
Поверни ЛИШЕ JSON: {"productIds":["<id>"],"unknown":["<назва>"]}

Довідник: ${directory(products)}

Текст: ${text}`;
}

export function classifyProductPrompt(name: string): string {
  return `Класифікуй харчовий продукт «${name}».
category — одне з: ${productCategories.join(", ")}.
protein / fiber / healthyFat — true, лише якщо продукт є помітним джерелом білка / клітковини / корисних (ненасичених) жирів у звичайній порції.
Поверни ЛИШЕ JSON: {"category":"<category>","protein":true|false,"fiber":true|false,"healthyFat":true|false}`;
}

export function parseRecipePrompt(text: string, products: readonly Product[], hasImage: boolean): string {
  return `Перетвори рецепт на структуровані дані українською.${hasImage ? " До тексту додано фото страви або рецепта: використай його як додаткове джерело." : ""}
Інгредієнти зіставляй із довідником продуктів (id, назва n, синоніми a); productId став лише за точного збігу продукту, інакше пропусти поле. productName — назва в називному відмінку.
unit — одне з: ${units.join(", ")}. Кількість без одиниці («за смаком») — без поля quantity. Кроки — короткі окремі речення.
Поверни ЛИШЕ JSON:
{"title":"...","servings":<число>,"timeMinutes":<число або null>,"tags":["..."],"steps":["..."],"ingredients":[{"productId":"<id або відсутнє>","productName":"...","quantity":{"amount":<число>,"unit":"<unit>"},"note":"<або відсутнє>"}]}

Довідник: ${directory(products)}

Рецепт:
${text}`;
}

export function substitutionsPrompt(missing: readonly Product[], available: readonly Product[]): string {
  return `Для домашньої кухні запропонуй заміни відсутнім продуктам з того, що є, або з поширених продуктів. Заміна має зберігати роль продукту у страві. Якщо доброї заміни немає, пропусти продукт.
Відсутні: ${JSON.stringify(missing.map((product) => ({ id: product.id, n: product.name })))}
Є вдома: ${JSON.stringify(available.map((product) => product.name))}
Поверни ЛИШЕ JSON: {"substitutions":[{"productId":"<id відсутнього>","suggestion":"<коротко, українською>"}]}`;
}

/** "pfh" letters for protein, fiber and healthy fat, to keep the prompt short. */
const flags = (nutrition: NutritionFlags): string =>
  `${nutrition.protein ? "p" : ""}${nutrition.fiber ? "f" : ""}${nutrition.healthyFat ? "h" : ""}`;

export function weekDraftPrompt(request: WeekDraftRequest): string {
  const data = {
    open: request.open,
    planned: request.planned,
    recipes: request.recipes.map((recipe) => ({
      id: recipe.id,
      t: recipe.title,
      tags: recipe.tags,
      s: recipe.servings,
      n: flags(recipe.nutrition),
    })),
    frameworks: request.frameworks.map((framework) => ({
      id: framework.id,
      t: framework.title,
      parts: framework.slots.map((slot) => ({
        id: slot.id,
        n: slot.name,
        req: slot.required,
        o: slot.options.map((option) => ({ id: option.id, n: option.name, nf: flags(option.nutrition) })),
      })),
    })),
    avoidRecipeIds: request.avoidRecipeIds,
  };
  const replacing =
    request.avoidTitles.length > 0
      ? `\n- Це заміна: запропонуй іншу страву, ніж ${request.avoidTitles.map((title) => `«${title}»`).join(", ")}.`
      : "";
  const wishes = request.wishes ? `\nПобажання користувача: ${request.wishes}` : "";

  return `Ти складаєш план домашнього харчування на тиждень. Дані нижче — JSON.
Заповни слоти з "open" (дата і прийом їжі: ${meals.join(", ")}). Страви в "planned" уже заплановані: враховуй їх для різноманітності й харчування, але не змінюй.
Правила:
- Обирай страви з "recipes" (поле recipeId) і "frameworks" (поле frameworkId). Для конструктора вкажи "choices": {"<id складової>":"<id варіанта>"}; для складових з req=true варіант обов'язковий.
- Не пропонуй рецептів з "avoidRecipeIds" і не повторюй рецепт двічі. Конструктор можна повторювати з іншими основними варіантами.
- Перекуси (snack) — коротким текстом у полі "text", наприклад «Яблуко й горіхи».
- Нових страв, яких немає в списках, — не більше ${request.maxIdeas}; їх теж пиши в "text".
- Залишки: страву можна приготувати раз і доїсти наступного дня — тоді в одному записі кілька слотів, перший — коли готують.
- Складову конструктора (наприклад, гарнір) можна приготувати раз і використати наступного дня чи через день в іншому конструкторі з іншим білком.
- Щодня має бути джерело білка (p), клітковини (f) і корисних жирів (h); позначки є в рецептах (n) і варіантах (nf).
- Кожен слот з "open" — не більше ніж в одному записі; слоти поза "open" не використовуй.
- servings — кількість порцій на одне приготування.${replacing}${wishes}
Поверни ЛИШЕ JSON: {"entries":[{"recipeId":"<id>" | "frameworkId":"<id>","choices":{} | "text":"...","servings":<число>,"slots":[{"date":"YYYY-MM-DD","meal":"<прийом>"}]}]}

Дані: ${JSON.stringify(data)}`;
}

export function draftChangePrompt(request: DraftChangeRequest): string {
  const data = {
    entries: request.entries.map((entry) => ({
      i: entry.index,
      t: entry.title,
      slots: entry.slots,
      recipeId: entry.recipeId,
      frameworkId: entry.frameworkId,
      ing: entry.ingredients,
    })),
    products: request.products.map((product) => ({ id: product.id, n: product.name, a: product.aliases })),
    recipes: request.recipes.map((recipe) => ({ id: recipe.id, t: recipe.title })),
    frameworks: request.frameworks.map((framework) => ({ id: framework.id, t: framework.title })),
  };
  return `Користувач переглядає чернетку плану харчування на тиждень і просить її змінити. Розбери прохання на дані; саму зміну зробить застосунок.
- excludeProductIds: продукти з довідника "products", яких не має бути в жодній страві («без грибів» → id грибів і їх різновидів). Лише id з довідника.
- excludeRecipeIds / excludeFrameworkIds: збережені страви, які не використовувати в цій чернетці взагалі («прибери боул», «не хочу борщ»). Лише id з "recipes" / "frameworks".
- replaceEntries: номери i записів чернетки, які треба замінити, якщо прохання стосується конкретних записів («у середу замість риби…», «заміни перекус у п'ятницю»), а також страв, записаних текстом, яких стосується прохання.
- note: решта прохання, яку треба врахувати, обираючи заміни («щось м'ясне»), або порожній рядок. Якщо продукту немає в довіднику, згадай його тут («без кінзи»).
Поверни ЛИШЕ JSON: {"excludeProductIds":[],"excludeRecipeIds":[],"excludeFrameworkIds":[],"replaceEntries":[],"note":""}

Дані: ${JSON.stringify(data)}

Прохання: ${request.instruction}`;
}
