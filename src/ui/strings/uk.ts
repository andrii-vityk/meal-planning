/**
 * All user-facing text lives here, keyed by English identifiers.
 * Components never contain Ukrainian literals.
 */
export const strings = {
  app: {
    title: "Кухня",
    tagline: "Рецепти, запаси й план харчування",
    loading: "Завантаження…",
  },
  data: {
    loading: "Завантажую дані…",
    unreachable: "Не вдається дістатися до бази. Дані можуть бути неактуальні.",
    summary: (products: number, recipes: number, frameworks: number) =>
      `У довіднику ${products} продукт(ів), ${recipes} рецепт(ів), ${frameworks} фреймворк(ів).`,
  },
  emptyState: {
    heading: "Тут з'являться ваші рецепти",
    body: "Збережіть страву, яка вдалася, і вона буде під рукою, коли вирішуватимете, що приготувати.",
  },
} as const;

export type Strings = typeof strings;
