import type { FrameworkInput, OptionInput } from "@/application/catalog";
import { newId } from "@/application/ids";
import type { Framework, SlotOption } from "@/domain/framework";

export interface OptionRow {
  readonly key: string;
  readonly id?: string;
  readonly name: string;
  /** Kept only while the name still refers to that product. */
  readonly productId?: string;
  readonly textOnly: boolean;
  readonly kidFriendly: boolean;
}

export interface SlotRow {
  readonly key: string;
  readonly id?: string;
  readonly name: string;
  readonly required: boolean;
  readonly options: readonly OptionRow[];
}

export interface FrameworkFormState {
  readonly title: string;
  readonly description: string;
  readonly notes: string;
  readonly kidFriendly: boolean;
  readonly slots: readonly SlotRow[];
}

export const emptyOption = (): OptionRow => ({ key: newId(), name: "", textOnly: false, kidFriendly: false });

export const emptySlot = (): SlotRow => ({ key: newId(), name: "", required: true, options: [emptyOption()] });

function toOptionRow(option: SlotOption, nameOf: (productId: string) => string | undefined): OptionRow {
  return option.kind === "product"
    ? { key: newId(), id: option.id, name: nameOf(option.productId) ?? "", productId: option.productId, textOnly: false, kidFriendly: option.kidFriendly }
    : { key: newId(), id: option.id, name: option.text, textOnly: true, kidFriendly: option.kidFriendly };
}

export function toFrameworkFormState(
  framework: Framework | undefined,
  nameOf: (productId: string) => string | undefined,
): FrameworkFormState {
  if (!framework) return { title: "", description: "", notes: "", kidFriendly: false, slots: [emptySlot()] };
  return {
    title: framework.title,
    description: framework.description ?? "",
    notes: framework.notes ?? "",
    kidFriendly: framework.kidFriendly,
    slots: framework.slots.map((slot) => ({
      key: newId(),
      id: slot.id,
      name: slot.name,
      required: slot.required,
      options: slot.options.map((option) => toOptionRow(option, nameOf)),
    })),
  };
}

function toOptionInput(row: OptionRow): OptionInput | null {
  const name = row.name.trim();
  if (name === "") return null;
  const id = row.id ? { id: row.id } : {};
  return row.textOnly
    ? { ...id, kind: "text", text: name, kidFriendly: row.kidFriendly }
    : { ...id, kind: "product", productName: name, ...(row.productId && { productId: row.productId }), kidFriendly: row.kidFriendly };
}

export function fromFrameworkFormState(
  state: FrameworkFormState,
  id: string | undefined,
): { input: FrameworkInput } | { errors: { title: true } } {
  if (state.title.trim() === "") return { errors: { title: true } };
  return {
    input: {
      ...(id && { id }),
      title: state.title.trim(),
      description: state.description,
      notes: state.notes,
      kidFriendly: state.kidFriendly,
      slots: state.slots.map((slot) => ({
        ...(slot.id && { id: slot.id }),
        name: slot.name,
        required: slot.required,
        options: slot.options.flatMap((row) => {
          const option = toOptionInput(row);
          return option ? [option] : [];
        }),
      })),
    },
  };
}
