import type { CurrencyOption } from "@/components/common/filters/FilterChips";
import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";

/**
 * Fixed landscape footprint (240×176), shared by every card and by the
 * loading skeleton — the row never reflows when data arrives. The width is
 * what the two standard-size ("sm") Copy/Share buttons revealed on hover need
 * to sit comfortably side by side; the height is trimmed to the content stack
 * (flag → title → country → two identifier rows ≈ 112px) plus the card's own
 * 16px padding, leaving real breathing room without the dead space a square
 * left below the identifiers. Anything too long for the width is truncated
 * rather than growing the card — see `overflow-hidden` + `truncate` in
 * VirtualAccountCard.
 */
export const CARD_SIZE_CLASS = "w-60 h-44";

/** Number of placeholder cards rendered while accounts are loading. */
export const SKELETON_CARD_COUNT = 4;

/** Matches the tooltip styling already used by CopyableText across the app. */
export const TOOLTIP_CONTENT_CLASS =
  "rounded-lg bg-popover text-popover-foreground border border-border text-xs px-2 py-1 shadow-md z-[200]";

/**
 * Options for the Currency filter chip, shared by every MCA table that
 * offers one (Transactions, Links).
 *
 * Restricted to the seven currencies MCA actually has a receiving account
 * for, plus a Rest of the World catch-all, sourced straight from
 * MOCK_VIRTUAL_ACCOUNTS (the same list the Virtual Account cards render, see
 * VirtualAccountCard/VirtualAccountActionRequired), not the much larger set
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
