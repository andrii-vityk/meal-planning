export const units = ["g", "kg", "ml", "l", "piece", "clove", "tsp", "tbsp", "cup", "pinch"] as const;

export type Unit = (typeof units)[number];

export interface Quantity {
  readonly amount: number;
  readonly unit: Unit;
}

/**
 * Units that convert to a common base unit. Units outside these groups
 * (pieces, spoons, cups) are only ever combined with themselves.
 */
const baseUnits: Partial<Record<Unit, { readonly base: Unit; readonly factor: number }>> = {
  kg: { base: "g", factor: 1000 },
  l: { base: "ml", factor: 1000 },
};

/** Rounds away floating-point noise such as 0.30000000000000004. */
function round(amount: number): number {
  return Math.round(amount * 1000) / 1000;
}

export function scaleQuantity(quantity: Quantity, factor: number): Quantity {
  return { amount: round(quantity.amount * factor), unit: quantity.unit };
}

function toBase(quantity: Quantity): Quantity {
  const conversion = baseUnits[quantity.unit];
  return conversion
    ? { amount: round(quantity.amount * conversion.factor), unit: conversion.base }
    : quantity;
}

/**
 * Sums quantities, merging those whose units convert to each other.
 * Returns one quantity per distinct base unit, in first-seen order:
 * 200 g + 0.5 kg + 2 piece -> [700 g, 2 piece].
 */
export function sumQuantities(quantities: readonly Quantity[]): Quantity[] {
  const totals = new Map<Unit, number>();
  for (const quantity of quantities) {
    const base = toBase(quantity);
    totals.set(base.unit, round((totals.get(base.unit) ?? 0) + base.amount));
  }
  return [...totals].map(([unit, amount]) => ({ amount, unit }));
}
