/**
 * Use cases for the product directory and frameworks.
 */
import type { AppDependencies } from "@/application/dependencies";
import { newId } from "@/application/ids";
import { ensureProduct, ValidationError } from "@/application/recipes";
import type { Framework, FrameworkSlot, SlotOption } from "@/domain/framework";
import type { Product } from "@/domain/product";
import { isUsed, productUsage } from "@/domain/productUsage";

type Deps = Pick<AppDependencies, "products" | "recipes" | "frameworks" | "ai">;

export class ProductInUseError extends Error {
  constructor(readonly recipeCount: number, readonly frameworkCount: number) {
    super("Product is still used");
    this.name = "ProductInUseError";
  }
}

/** Adds a product by name (classified by the AI), or returns the existing one with that name. */
export function addProduct(deps: Deps, name: string): Promise<Product> {
  return ensureProduct(deps, name, new Map(deps.products.getSnapshot().items));
}

/** Deletes a product unless a recipe or framework still refers to it. */
export async function deleteProduct(deps: Deps, productId: string): Promise<void> {
  const usage = productUsage(
    productId,
    deps.recipes.getSnapshot().items.values(),
    deps.frameworks.getSnapshot().items.values(),
  );
  if (isUsed(usage)) throw new ProductInUseError(usage.recipeIds.length, usage.frameworkIds.length);
  await deps.products.remove(productId);
}

/** A framework option as entered: a product (possibly new) or plain text. */
export type OptionInput =
  | { readonly id?: string; readonly kind: "product"; readonly productName: string; readonly productId?: string; readonly kidFriendly: boolean }
  | { readonly id?: string; readonly kind: "text"; readonly text: string; readonly kidFriendly: boolean };

export interface SlotInput {
  readonly id?: string;
  readonly name: string;
  readonly required: boolean;
  readonly options: readonly OptionInput[];
}

export interface FrameworkInput {
  readonly id?: string;
  readonly title: string;
  readonly description?: string;
  readonly notes?: string;
  readonly kidFriendly: boolean;
  readonly slots: readonly SlotInput[];
}

/** Saves a framework, creating products named by its options that do not exist yet. */
export async function saveFramework(deps: Deps, input: FrameworkInput): Promise<Framework> {
  if (input.title.trim() === "") throw new ValidationError("title");
  const known = new Map(deps.products.getSnapshot().items);
  const slots: FrameworkSlot[] = [];

  for (const slot of input.slots) {
    if (slot.name.trim() === "") continue;
    const options: SlotOption[] = [];
    for (const option of slot.options) {
      const id = option.id ?? newId();
      if (option.kind === "text") {
        if (option.text.trim() !== "") options.push({ id, kind: "text", text: option.text.trim(), kidFriendly: option.kidFriendly });
        continue;
      }
      if (option.productName.trim() === "" && !option.productId) continue;
      const product =
        (option.productId && known.get(option.productId)) || (await ensureProduct(deps, option.productName, known));
      options.push({ id, kind: "product", productId: product.id, kidFriendly: option.kidFriendly });
    }
    slots.push({ id: slot.id ?? newId(), name: slot.name.trim(), required: slot.required, options });
  }

  const framework: Framework = {
    id: input.id ?? newId(),
    title: input.title.trim(),
    kidFriendly: input.kidFriendly,
    slots,
    ...(input.description?.trim() && { description: input.description.trim() }),
    ...(input.notes?.trim() && { notes: input.notes.trim() }),
  };
  await deps.frameworks.save(framework);
  return framework;
}
