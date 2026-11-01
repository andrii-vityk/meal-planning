export const productCategories = [
  "vegetables",
  "fruits",
  "meat",
  "fish",
  "dairy",
  "eggs",
  "grains",
  "legumes",
  "nutsAndSeeds",
  "sauces",
  "oils",
  "spices",
  "bakery",
  "other",
] as const;

export type ProductCategory = (typeof productCategories)[number];

/** Nutrients tracked qualitatively: a product either is a notable source or not. */
export const nutrients = ["protein", "fiber", "healthyFat"] as const;

export type Nutrient = (typeof nutrients)[number];

export type NutritionFlags = Readonly<Record<Nutrient, boolean>>;

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly category: ProductCategory;
  readonly nutrition: NutritionFlags;
  /** Almost always at home: never added to a shopping list. */
  readonly isStaple: boolean;
}

export type ProductLookup = ReadonlyMap<string, Product>;
