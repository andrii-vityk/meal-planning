/**
 * Export and import of all stored data (FR-12).
 */
import type { AppDependencies } from "@/application/dependencies";
import type { BackupData } from "@/application/ports/backup";
import type { Repository } from "@/application/ports/repository";

const values = <T extends { readonly id: string }>(repository: Repository<T>) => [
  ...repository.getSnapshot().items.values(),
];

export function collectBackup(deps: AppDependencies): BackupData {
  return {
    products: values(deps.products),
    recipes: values(deps.recipes),
    frameworks: values(deps.frameworks),
    planEntries: values(deps.planEntries),
    shoppingItems: values(deps.shoppingItems),
    shoppingChecks: values(deps.shoppingChecks),
  };
}

export function backupFilename(date: string): string {
  return `meal-planning-${date}.json`;
}

/** Saves the backup as a file the user downloads. Resolves false if they declined. */
export function exportBackup(deps: AppDependencies, date: string): Promise<boolean> {
  return deps.files.save(backupFilename(date), deps.backup.encode(collectBackup(deps)));
}

export interface ImportSummary {
  readonly records: number;
}

/**
 * Restores a backup by merging: records with the same id are replaced,
 * everything else is kept. Nothing is deleted.
 */
export async function importBackup(deps: AppDependencies, text: string): Promise<ImportSummary> {
  const data = deps.backup.decode(text);
  const writes: Promise<void>[] = [
    ...data.products.map((item) => deps.products.save(item)),
    ...data.recipes.map((item) => deps.recipes.save(item)),
    ...data.frameworks.map((item) => deps.frameworks.save(item)),
    ...data.planEntries.map((item) => deps.planEntries.save(item)),
    ...data.shoppingItems.map((item) => deps.shoppingItems.save(item)),
    ...data.shoppingChecks.map((item) => deps.shoppingChecks.save(item)),
  ];
  await Promise.all(writes);
  return { records: writes.length };
}
