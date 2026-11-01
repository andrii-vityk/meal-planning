/**
 * Use cases for the week plan and the shopping list.
 */
import type { AppDependencies } from "@/application/dependencies";
import { newId } from "@/application/ids";
import type { IsoDate } from "@/domain/calendar";
import { shoppingCheckId } from "@/domain/weekPlanning";

type ShoppingDeps = Pick<AppDependencies, "shoppingChecks" | "shoppingItems">;

/** Marks a generated shopping line as bought or not. "Not bought" is stored as no record at all. */
export async function setBought(deps: ShoppingDeps, weekStart: IsoDate, productId: string, bought: boolean): Promise<void> {
  const id = shoppingCheckId(weekStart, productId);
  if (bought) await deps.shoppingChecks.save({ id, weekStart, productId });
  else await deps.shoppingChecks.remove(id);
}

export async function addShoppingItem(deps: ShoppingDeps, weekStart: IsoDate, text: string): Promise<void> {
  const trimmed = text.trim();
  if (trimmed === "") return;
  await deps.shoppingItems.save({ id: newId(), weekStart, text: trimmed, checked: false });
}
