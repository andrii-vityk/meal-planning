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
  /** Almost always at home: left off the shopping list unless someone asks for it. */
  readonly isStaple: boolean;
}

export type ProductLookup = ReadonlyMap<string, Product>;

const normalizeName = (name: string) => name.trim().toLocaleLowerCase("uk");

/** Finds a product whose name or alias equals the given name, ignoring case. */
export function findProductByName(products: Iterable<Product>, name: string): Product | undefined {
  const wanted = normalizeName(name);
  if (wanted === "") return undefined;
  for (const product of products) {
    if ([product.name, ...product.aliases].some((candidate) => normalizeName(candidate) === wanted)) {
      return product;
    }
  }
  return undefined;
}
