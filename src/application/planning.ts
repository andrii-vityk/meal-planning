/**
 * Use cases for the week plan and the shopping list.
 */
import type { AppDependencies } from "@/application/dependencies";
import { newId } from "@/application/ids";
import type { IsoDate } from "@/domain/calendar";
import type { ShoppingStatus } from "@/domain/weekPlanning";
import { shoppingCheckId } from "@/domain/weekPlanning";

type ShoppingDeps = Pick<AppDependencies, "shoppingChecks" | "shoppingItems">;

/** Marks a generated shopping line as bought or at home; null = still to buy, stored as no record at all. */
export async function setShoppingStatus(
  deps: ShoppingDeps,
  weekStart: IsoDate,
  productId: string,
  status: ShoppingStatus | null,
): Promise<void> {
  const id = shoppingCheckId(weekStart, productId);
  if (status) await deps.shoppingChecks.save({ id, weekStart, productId, status });
  else await deps.shoppingChecks.remove(id);
}

export async function addShoppingItem(deps: ShoppingDeps, weekStart: IsoDate, text: string): Promise<void> {
  const trimmed = text.trim();
  if (trimmed === "") return;
  await deps.shoppingItems.save({ id: newId(), weekStart, text: trimmed, checked: false });
}
