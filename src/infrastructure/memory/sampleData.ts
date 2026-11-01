/**
 * Invented example data shown in local development, so the UI is not empty.
 * Never used when the app runs on the platform.
 */
import type { Framework } from "@/domain/framework";
import type { NutritionFlags, Product, ProductCategory } from "@/domain/product";
import type { Recipe } from "@/domain/recipe";

const flags = (protein: boolean, fiber: boolean, healthyFat: boolean): NutritionFlags => ({ protein, fiber, healthyFat });

const product = (
  id: string,
  name: string,
  category: ProductCategory,
  nutrition = flags(false, false, false),
  isStaple = false,
  aliases: string[] = [],
): Product => ({ id, name, aliases, category, nutrition, isStaple });

export const sampleProducts: Product[] = [
  product("chicken", "Курка", "meat", flags(true, false, false), false, ["куряче філе", "курячі стегна"]),
  product("salmon", "Лосось", "fish", flags(true, false, true), false, ["сьомга"]),
  product("eggs", "Яйця", "eggs", flags(true, false, false)),
  product("chickpeas", "Нут", "legumes", flags(true, true, false)),
  product("broccoli", "Броколі", "vegetables", flags(false, true, false)),
  product("bellPepper", "Болгарський перець", "vegetables", flags(false, true, false)),
  product("onion", "Цибуля", "vegetables", flags(false, false, false), true),
  product("garlic", "Часник", "vegetables", flags(false, false, false), true),
  product("avocado", "Авокадо", "fruits", flags(false, true, true)),
  product("rice", "Рис", "grains", flags(false, false, false), true),
  product("soySauce", "Соєвий соус", "sauces", flags(false, false, false), true),
  product("mirin", "Мірін", "sauces", flags(false, false, false), true),
  product("oliveOil", "Оливкова олія", "oils", flags(false, false, true), true),
  product("sesame", "Кунжут", "nutsAndSeeds", flags(false, true, true)),
];

export const sampleRecipes: Recipe[] = [
  {
    id: "teriyakiChicken",
    title: "Курка теріякі з рисом",
    servings: 2,
    timeMinutes: 30,
    ingredients: [
      { productId: "chicken", quantity: { amount: 400, unit: "g" } },
      { productId: "soySauce", quantity: { amount: 3, unit: "tbsp" } },
      { productId: "mirin", quantity: { amount: 2, unit: "tbsp" } },
      { productId: "garlic", quantity: { amount: 2, unit: "clove" } },
      { productId: "rice", quantity: { amount: 160, unit: "g" } },
      { productId: "broccoli", quantity: { amount: 200, unit: "g" } },
      { productId: "sesame", note: "для подачі" },
    ],
    steps: [
      "Зварити рис.",
      "Обсмажити курку шматочками до рум'яної скоринки.",
      "Додати соєвий соус, мірін і часник, уварити до глазурі.",
      "Подати з рисом і броколі, посипати кунжутом.",
    ],
    tags: ["азійське", "швидко"],
    kidFriendly: true,
  },
];

export const sampleFrameworks: Framework[] = [
  {
    id: "bowl",
    title: "Боул",
    description: "Основа, білок, овочі й соус у будь-якому поєднанні.",
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
          { id: "protein-chickpeas", kind: "product", productId: "chickpeas", kidFriendly: false },
        ],
      },
      {
        id: "vegetables",
        name: "Овочі",
        required: true,
        options: [
          { id: "veg-broccoli", kind: "product", productId: "broccoli", kidFriendly: true },
          { id: "veg-pepper", kind: "product", productId: "bellPepper", kidFriendly: true },
          { id: "veg-avocado", kind: "product", productId: "avocado", kidFriendly: false },
        ],
      },
      {
        id: "sauce",
        name: "Соус",
        required: false,
        options: [{ id: "sauce-soy", kind: "product", productId: "soySauce", kidFriendly: true }],
      },
    ],
  },
];
