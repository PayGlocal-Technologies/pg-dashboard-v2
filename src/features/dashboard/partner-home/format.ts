import { formatCurrencyShort } from "@/lib/utils/format";

/** Whole rupees under a lakh ("₹48,250"); the app's short lakh/crore form
 *  from there ("₹46.20L", "₹1.84Cr"). Dashboard figures, not ledger ones. */
export function inr(amount: number) {
  return Math.abs(amount) < 100_000
    ? `₹${Math.round(amount).toLocaleString("en-IN")}`
    : formatCurrencyShort(amount, "INR");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-07" → "7 Oct". */
export function dayMonth(dateKey: string) {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${d} ${MONTHS[m! - 1]}`;
}
