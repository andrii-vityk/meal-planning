/**
 * All user-facing text lives here, keyed by English identifiers.
 * Components never contain Ukrainian literals.
 */
export const strings = {
  app: {
    title: "Кухня",
    tagline: "Рецепти, запаси й план харчування",
  },
  emptyState: {
    heading: "Тут з'являться ваші рецепти",
    body: "Збережіть страву, яка вдалася, і вона буде під рукою, коли вирішуватимете, що приготувати.",
  },
} as const;

export type Strings = typeof strings;
