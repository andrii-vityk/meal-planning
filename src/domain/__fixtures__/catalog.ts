/**
 * Small invented catalog shared by domain tests.
 */
import type { Framework } from "@/domain/framework";
import type { NutritionFlags, Product, ProductCategory } from "@/domain/product";
import type { Recipe } from "@/domain/recipe";

const flags = (...set: (keyof NutritionFlags)[]): NutritionFlags => ({
  protein: set.includes("protein"),
  fiber: set.includes("fiber"),
  healthyFat: set.includes("healthyFat"),
});

const product = (
  id: string,
  name: string,
  category: ProductCategory,
  nutrition: NutritionFlags = flags(),
  isStaple = false,
): Product => ({ id, name, aliases: [], category, nutrition, isStaple });

export const productList: Product[] = [
  product("chicken", "Курка", "meat", flags("protein")),
  product("salmon", "Лосось", "fish", flags("protein", "healthyFat")),
  product("egg", "Яйця", "eggs", flags("protein")),
  product("lentils", "Сочевиця", "legumes", flags("protein", "fiber")),
  product("broccoli", "Броколі", "vegetables", flags("fiber")),
  product("onion", "Цибуля", "vegetables"),
  product("avocado", "Авокадо", "fruits", flags("fiber", "healthyFat")),
  product("rice", "Рис", "grains"),
  product("garlic", "Часник", "vegetables", flags(), true),
  product("soySauce", "Соєвий соус", "sauces", flags(), true),
  product("oliveOil", "Оливкова олія", "oils", flags("healthyFat"), true),
];

export const products = new Map(productList.map((item) => [item.id, item]));

export const stirFry: Recipe = {
  id: "stirFry",
  title: "Курка з броколі",
  servings: 2,
  ingredients: [
    { productId: "chicken", quantity: { amount: 400, unit: "g" } },
    { productId: "broccoli", quantity: { amount: 300, unit: "g" } },
    { productId: "rice", quantity: { amount: 0.2, unit: "kg" } },
    { productId: "soySauce", quantity: { amount: 2, unit: "tbsp" } },
    { productId: "garlic", quantity: { amount: 2, unit: "clove" } },
  ],
  steps: ["Обсмажити курку", "Додати броколі й соус"],
  tags: ["азійське"],
  kidFriendly: false,
};

export const lentilSoup: Recipe = {
  id: "lentilSoup",
  title: "Сочевичний суп",
  servings: 4,
  ingredients: [
    { productId: "lentils", quantity: { amount: 300, unit: "g" } },
    { productId: "onion", quantity: { amount: 1, unit: "piece" } },
    { productId: "oliveOil", quantity: { amount: 2, unit: "tbsp" } },
  ],
  steps: ["Обсмажити цибулю", "Варити сочевицю 25 хв"],
  tags: ["суп"],
  kidFriendly: true,
};

export const bowl: Framework = {
  id: "bowl",
  title: "Боул",
  kidFriendly: false,
  slots: [
    {
      id: "base",
      name: "Основа",
      required: true,
      options: [{ id: "base-rice", kind: "product", productId: "rice", kidFriendly: true }],
    },
    {
      id: "protein",
      name: "Білок",
      required: true,
      options: [
        { id: "protein-salmon", kind: "product", productId: "salmon", kidFriendly: false },
        { id: "protein-chicken", kind: "product", productId: "chicken", kidFriendly: true },
      ],
    },
    {
      id: "veg",
      name: "Овочі",
      required: true,
      options: [
        { id: "veg-broccoli", kind: "product", productId: "broccoli", kidFriendly: true },
        { id: "veg-avocado", kind: "product", productId: "avocado", kidFriendly: false },
      ],
    },
    {
      id: "sauce",
      name: "Соус",
      required: false,
      options: [{ id: "sauce-sesame", kind: "text", text: "Кунжутний соус", kidFriendly: true }],
    },
  ],
};

export const recipes = new Map([stirFry, lentilSoup].map((item) => [item.id, item]));
export const frameworks = new Map([bowl].map((item) => [item.id, item]));
