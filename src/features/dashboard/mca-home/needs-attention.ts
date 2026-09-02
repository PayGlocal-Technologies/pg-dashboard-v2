import { formatDate, parseDateKey } from "@/lib/utils/format";
import type { NeedsAttentionInvoice } from "@/features/dashboard/mca-home/types";

/**
 * Presentation shared by the Needs attention card and its "View all" drawer.
 * Both render the same invoice in two densities, so the tone, the label and the
 * action's name are decided here once rather than diverging between them.
 */

/** "EUR 850" / "USD 1,200", ISO currency code prefix, no symbol, no decimals. */
export function formatCurrencyCode(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US")}`;
}

/** Human "day(s)" without the pluralisation logic repeated at every call site. */
export function dayCount(n: number): string {
  return `${n} day${n === 1 ? "" : "s"}`;
}

/**
 * "2026-08-25" → "25 Aug 2026". Parsed via parseDateKey rather than handed to
 * formatDate as a string: `new Date("2026-08-25")` is UTC midnight, which reads
 * as the previous day anywhere behind UTC.
 */
export function formatDueDate(dueDate: string): string {
  if (!dueDate) return "—";
  return formatDate(parseDateKey(dueDate), { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * How the row reads, from `attentionStatus` + `daysRemaining`. Overdue rows
 * carry a negative `daysRemaining` (−6 = six days past due); due-soon rows a
 * small positive one. The action names what the merchant would do next — chase
 * an overdue invoice, or just look at one still in its window. Both land on the
 * invoice's details page, which is where the reminder email is sent from.
 */
export function attentionMeta(invoice: NeedsAttentionInvoice): {
  tone: "danger" | "warning";
  label: string;
  actionLabel: string;
} {
  if (invoice.attentionStatus === "OVERDUE") {
    const days = Math.abs(invoice.daysRemaining);
    return {
      tone: "danger",
      label: days > 0 ? `Overdue by ${dayCount(days)}` : "Overdue",
      actionLabel: "Remind",
    };
  }
  return {
    tone: "warning",
    label: invoice.daysRemaining <= 0 ? "Due today" : `Due in ${dayCount(invoice.daysRemaining)}`,
    actionLabel: "View",
  };
}

/** Amount colour for a tone — the card and the drawer both key off it. */
export const TONE_TEXT_CLASS: Record<"danger" | "warning", string> = {
  danger: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
};
