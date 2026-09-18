import type { CurrencyOption } from "@/components/common/filters/FilterChips";
import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";

/** Matches the tooltip styling already used by CopyableText across the app. */
export const TOOLTIP_CONTENT_CLASS =
  "rounded-lg bg-popover text-popover-foreground border border-border text-xs px-2 py-1 shadow-md z-[200]";

/**
 * Options for the Currency filter chip, shared by every MCA table that
 * offers one (Transactions, Links).
 *
 * Restricted to the seven currencies MCA actually has a receiving account
 * for, plus a Rest of the World catch-all, sourced straight from
 * MOCK_VIRTUAL_ACCOUNTS (the same list the Virtual Accounts page's region
 * selector renders), not the much larger set
 * of every currency countryCurrencyMap knows about. Most of those have no
 * MCA account behind them, so offering them here would just be dead filter
 * options with an empty guaranteed result.
 */
export const CURRENCY_FILTER_OPTIONS: CurrencyOption[] = MOCK_VIRTUAL_ACCOUNTS.map((account) =>
  account.iso2 === "ROW"
    ? // Rest of the World has no single real currency to filter by: the
      // account receives many over SWIFT (see mock-data.ts's own comment on
      // this entry). `account.currency` is "Dollar" — the account is
      // dollar-denominated, and the value stays distinct from the US
      // account's "USD" because these options are keyed by it (see
      // FilterChips). It stands in until the API supports an actual
      // "everything else" filter; filtering by it today will under-match
      // rather than show every non-local-rail transaction. The label is the
      // region name either way, so no currency value surfaces here.
      { value: account.currency, label: "Rest of the World" }
    : { value: account.currency, label: account.currency, iso2: account.iso2 }
);
