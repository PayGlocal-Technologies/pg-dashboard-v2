// ── Safe money arithmetic ────────────────────────────────────────────────────
// The existing codebase represents amounts as decimal numbers (parsed via
// parseFloat(transaction.totalAmount ?? "0")), not integer minor units.
// Summing/subtracting those decimals directly accumulates float error
// (0.1 + 0.2 !== 0.3), so every derived-amount calculation in this module
// routes through cent-integer arithmetic internally and converts back to a
// decimal at the boundary, this only affects the NEW derivation functions,
// no existing parseFloat-based display code is touched.

const CENTS_PER_UNIT = 100;

function toCents(amount: number): number {
  return Math.round(amount * CENTS_PER_UNIT);
}

function fromCents(cents: number): number {
  return cents / CENTS_PER_UNIT;
}

export function sumAmounts(amounts: number[]): number {
  return fromCents(amounts.reduce((total, amount) => total + toCents(amount), 0));
}

export function subtractAmounts(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

/** Never returns a negative amount, used for remaining/available-style
 * values that must not go below zero even if upstream data is inconsistent. */
export function clampToZero(amount: number): number {
  return amount < 0 ? 0 : amount;
}
