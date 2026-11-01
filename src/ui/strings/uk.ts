/**
 * All user-facing text lives here, keyed by English identifiers.
 * Components never contain Ukrainian literals.
 */
import type { AiErrorCode } from "@/application/ports/ai";
import type { ProductCategory } from "@/domain/product";
import type { Unit } from "@/domain/quantity";

const units: Record<Unit, string> = {
  g: "г",
  kg: "кг",
  ml: "мл",
  l: "л",
  piece: "шт",
  clove: "зубч.",
  tsp: "ч. л.",
  tbsp: "ст. л.",
  cup: "скл.",
  pinch: "дрібка",
};

const categories: Record<ProductCategory, string> = {
  vegetables: "Овочі",
  fruits: "Фрукти",
  meat: "М'ясо",
  fish: "Риба",
  dairy: "Молочне",
  eggs: "Яйця",
  grains: "Крупи й макарони",
  legumes: "Бобові",
  nutsAndSeeds: "Горіхи й насіння",
  sauces: "Соуси",
  oils: "Олії",
  spices: "Спеції",
  bakery: "Хліб і випічка",
  other: "Інше",
};

const aiErrors: Record<AiErrorCode, string> = {
  unavailable: "AI недоступний на цій сторінці для вашого акаунта.",
  rateLimited: "Досягнуто ліміту використання AI. Спробуйте пізніше.",
  invalidResponse: "Не вдалося зрозуміти відповідь AI. Спробуйте ще раз.",
  cancelled: "Скасовано.",
  failed: "Помилка зв'язку з AI. Спробуйте ще раз.",
};

export const strings = {
  app: {
    title: "Кухня",
    tagline: "Рецепти, запаси й план харчування",
    loading: "Завантаження…",
  },
  navigation: {
    label: "Розділи",
    recipes: "Рецепти",
  },
  data: {
    loading: "Завантажую дані…",
    unreachable: "Не вдається дістатися до бази. Дані можуть бути неактуальні.",
  },
  units,
  categories,
  aiErrors,
  common: {
    back: "Назад",
    cancel: "Скасувати",
    save: "Зберегти",
    saving: "Зберігаю…",
    edit: "Редагувати",
    delete: "Видалити",
    confirmDelete: "Так, видалити",
    remove: "Прибрати",
    minutes: (value: number) => `${value} хв`,
    unexpectedError: "Щось пішло не так. Спробуйте ще раз.",
  },
  recipes: {
    heading: "Рецепти",
    search: "Пошук рецептів",
    create: "Новий рецепт",
    import: "Імпорт з тексту",
    emptyHeading: "Тут з'являться ваші рецепти",
    emptyBody: "Збережіть страву, яка вдалася, і вона буде під рукою, коли вирішуватимете, що приготувати.",
    noMatches: "Нічого не знайдено.",
    kidFriendly: "Подобається дітям",
    servings: "Порції",
    ingredients: "Інгредієнти",
    steps: "Приготування",
    source: "Джерело рецепта",
    notes: "Нотатки",
    toTaste: "за смаком",
    notFound: "Рецепт не знайдено: можливо, його вже видалили.",
    deleteQuestion: "Видалити цей рецепт?",
    unknownProduct: "Невідомий продукт",
  },
  recipeForm: {
    newHeading: "Новий рецепт",
    editHeading: "Редагування рецепта",
    title: "Назва",
    servings: "Порцій",
    time: "Час, хв",
    ingredients: "Інгредієнти",
    productName: "Продукт",
    amount: "Кількість",
    unit: "Одиниця",
    noUnit: "—",
    note: "Примітка",
    addIngredient: "Додати інгредієнт",
    steps: "Кроки (кожен з нового рядка)",
    tags: "Мітки (через кому)",
    kidFriendly: "Подобається дітям",
    sourceUrl: "Посилання на джерело",
    notes: "Нотатки",
    titleRequired: "Вкажіть назву.",
    servingsInvalid: "Кількість порцій має бути більшою за нуль.",
    newProductsHint: "Нові продукти буде додано до довідника автоматично.",
  },
  recipeImport: {
    heading: "Імпорт рецепта з тексту",
    text: "Текст рецепта",
    placeholder: "Вставте текст рецепта або опишіть страву своїми словами",
    sourceUrl: "Посилання на джерело (якщо є)",
    parse: "Розібрати",
    parsing: "Розбираю…",
    hint: "AI перетворить текст на рецепт. Перед збереженням ви зможете все перевірити.",
  },
} as const;

export type Strings = typeof strings;
