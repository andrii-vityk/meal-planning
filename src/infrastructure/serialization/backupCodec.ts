import type { BackupCodec, BackupData } from "@/application/ports/backup";
import { BackupFormatError } from "@/application/ports/backup";
import type { Json } from "./guards";
import { isNonEmptyString, isRecord } from "./guards";
import { parseFramework, parseProduct, parseRecipe, SCHEMA_VERSION, toDocument } from "./entities";
import { parsePlanEntry, parseShoppingCheck, parseShoppingItem } from "./weekRecords";

const APP_MARKER = "meal-planning";

/** Each record is written as its stored document plus its id. */
const withId = (record: { readonly id: string }): Json => ({ id: record.id, ...toDocument(record) });

function readRecords<T>(value: unknown, parse: (id: string, raw: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!isRecord(raw) || !isNonEmptyString(raw.id)) return [];
    const record = parse(raw.id, raw);
    return record === null ? [] : [record];
  });
}

/** JSON backups that reuse the database document format and its validation. */
export class JsonBackupCodec implements BackupCodec {
  encode(data: BackupData): string {
    return JSON.stringify(
      {
        app: APP_MARKER,
        schemaVersion: SCHEMA_VERSION,
        products: data.products.map(withId),
        recipes: data.recipes.map(withId),
        frameworks: data.frameworks.map(withId),
        planEntries: data.planEntries.map(withId),
        shoppingItems: data.shoppingItems.map(withId),
        shoppingChecks: data.shoppingChecks.map(withId),
      },
      null,
      2,
    );
  }

  decode(text: string): BackupData {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BackupFormatError("Not valid JSON");
    }
    if (!isRecord(parsed) || parsed.app !== APP_MARKER) {
      throw new BackupFormatError("Not a backup of this app");
    }
    return {
      products: readRecords(parsed.products, parseProduct),
      recipes: readRecords(parsed.recipes, parseRecipe),
      frameworks: readRecords(parsed.frameworks, parseFramework),
      planEntries: readRecords(parsed.planEntries, parsePlanEntry),
      shoppingItems: readRecords(parsed.shoppingItems, parseShoppingItem),
      shoppingChecks: readRecords(parsed.shoppingChecks, parseShoppingCheck),
    };
  }
}
