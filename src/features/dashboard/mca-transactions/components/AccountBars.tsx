"use client";

import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import type { SettledAccountRow } from "@/features/dashboard/mca-transactions/types";

// Per-account (region) settled-amount bar list, shared by the Transactions
// page's SettlementAnalyticsCard and the Multi-Currency Settled amount card so
// the two read as the same graph. The amount/count figures come from the
// settled-by-account endpoint (useSettledByAccount).

/** Account currency → display label + flag ISO2. REST_OF_WORLD has no flag. */
export const ACCOUNT_META: Record<string, { label: string; iso2: string }> = {
  USD: { label: "USD Account", iso2: "US" },
  GBP: { label: "GBP Account", iso2: "GB" },
  EUR: { label: "EUR Account", iso2: "EU" },
  CAD: { label: "CAD Account", iso2: "CA" },
  AED: { label: "AED Account", iso2: "AE" },
  SGD: { label: "SGD Account", iso2: "SG" },
  AUD: { label: "AUD Account", iso2: "AU" },
  CNY: { label: "CNY Account", iso2: "CN" },
  REST_OF_WORLD: { label: "Rest of world", iso2: "" },
};

export function accountMeta(currency: string): { label: string; iso2: string } {
  return ACCOUNT_META[currency] ?? { label: `${currency} Account`, iso2: "" };
}

/** Currencies that don't get their own bar — their amount + count are folded
 *  into REST_OF_WORLD instead. */
const FOLD_INTO_REST = new Set(["AED", "SGD"]);

/** Collapse AED + SGD into the REST_OF_WORLD bucket, leaving every other
 *  currency as its own bar. */
export function foldRestOfWorld(accounts: SettledAccountRow[]): SettledAccountRow[] {
  const kept: SettledAccountRow[] = [];
  let restAmount = 0;
  let restCount = 0;
  let hasRest = false;

  for (const account of accounts) {
    if (account.currency === "REST_OF_WORLD" || FOLD_INTO_REST.has(account.currency)) {
      restAmount += account.amount;
      restCount += account.count;
      hasRest = true;
    } else {
      kept.push(account);
    }
  }

  if (hasRest) kept.push({ currency: "REST_OF_WORLD", amount: restAmount, count: restCount });
  return kept;
}

/** Compact ₹ for the narrow bar-value column (amounts share one reporting
 *  currency — they sum to totalAmount). */
export function formatBarAmount(amount: number): string {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}

export interface AccountBarRowData {
  accountId: string;
  label: string;
  iso2: string;
  value: number;
  valueLabel: string;
}

/** One virtual account's row in the per-account graph: flag + name, a bar
 *  scaled against the ranked list's own top value, then the figure. Shared
 *  between the always-visible first five and the rows Show more reveals, so
 *  the two stay pixel-identical. */
export function AccountBarRow({ row, maxValue }: { row: AccountBarRowData; maxValue: number }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      {/* w-24 below sm: as a carousel page the card is narrower than the
          viewport, and the label column, the value column, and the card's
          own padding are all fixed width, so a 144px label would leave the
          bar (the only flexible element in the row) too narrow to read as a
          bar at all. Account names are short enough to still fit, and
          truncate covers the rest. */}
      <div className="flex w-24 min-w-0 shrink-0 items-center gap-2 sm:w-36">
        <CountryFlagAvatar iso2={row.iso2} countryName={row.label} className="h-6 w-6" />
        <span className="truncate font-medium text-foreground">{row.label}</span>
      </div>
      <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${maxValue > 0 ? Math.min(100, (row.value / maxValue) * 100) : 0}%`,
            background: "linear-gradient(90deg, var(--chart-1), var(--chart-3))",
          }}
        />
      </div>
      <span className="w-16 shrink-0 text-left text-xs font-semibold tabular-nums text-foreground">
        {row.valueLabel}
      </span>
    </li>
  );
}
