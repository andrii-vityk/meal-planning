import type { Framework } from "@/domain/framework";
import type { Product } from "@/domain/product";
import type { Recipe } from "@/domain/recipe";
import type { ManualShoppingItem, ShoppingCheck, WeekPlanEntry } from "@/domain/weekPlanning";

/** Everything the app stores, as one portable value. */
export interface BackupData {
  readonly products: readonly Product[];
  readonly recipes: readonly Recipe[];
  readonly frameworks: readonly Framework[];
  readonly planEntries: readonly WeekPlanEntry[];
  readonly shoppingItems: readonly ManualShoppingItem[];
  readonly shoppingChecks: readonly ShoppingCheck[];
}

export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupFormatError";
  }
}

/** Converts backups to and from text. decode validates untrusted input. */
export interface BackupCodec {
  encode(data: BackupData): string;
  /** Throws BackupFormatError when the text is not a backup of this app. */
  decode(text: string): BackupData;
}
