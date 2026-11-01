/**
 * Prompts sent to the model. Each asks for JSON only and spells out the
 * exact shape, which the matching parser in responses.ts then checks.
 * The model sees no conversation history: everything it needs is here.
 */
import type { Product } from "@/domain/product";
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
