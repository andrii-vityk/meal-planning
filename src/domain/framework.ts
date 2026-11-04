/**
 * A framework is a dish template: a set of slots (base, protein, vegetables,
 * sauce...) where each slot can be filled by one of several options.
 */
export type SlotOption =
  | { readonly id: string; readonly kind: "product"; readonly productId: string; readonly kidFriendly: boolean }
  | { readonly id: string; readonly kind: "text"; readonly text: string; readonly kidFriendly: boolean };

export interface FrameworkSlot {
  readonly id: string;
  readonly name: string;
  /** A dish cannot be made without filling every required slot. */
  readonly required: boolean;
  readonly options: readonly SlotOption[];
}

export interface Framework {
  readonly id: string;
  readonly title: string;
  readonly slots: readonly FrameworkSlot[];
  readonly kidFriendly: boolean;
  readonly description?: string;
  readonly notes?: string;
}

export type FrameworkLookup = ReadonlyMap<string, Framework>;
