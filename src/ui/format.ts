import type { Quantity } from "@/domain/quantity";
import { strings } from "@/ui/strings/uk";

const numberFormat = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 });

export function formatAmount(amount: number): string {
  return numberFormat.format(amount);
}

export function formatQuantity(quantity: Quantity): string {
  return `${formatAmount(quantity.amount)} ${strings.units[quantity.unit]}`;
}
