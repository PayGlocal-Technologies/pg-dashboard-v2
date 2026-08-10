/**
 * Placeholder figures for the Transactions page's settlement analytics card
 * (see SettlementAnalyticsCard.tsx). Every number here is dummy data, swap
 * this module for a real settlement-analytics endpoint once one exists; the
 * shape is deliberately keyed by the same virtual account ids
 * MOCK_VIRTUAL_ACCOUNTS uses, so wiring the backend up means replacing the
 * source, not the component.
 */

/** One virtual account's settled volume, keyed to MOCK_VIRTUAL_ACCOUNTS by id. */
export interface SettlementAnalyticsRow {
  accountId: string;
  /** Total settled amount for this account, converted to a common USD basis
   *  so every bar is comparable on one scale (see SettlementAnalyticsCard's
   *  "amount settled" mode). Mixing raw native-currency totals on a single
   *  axis would make bar length meaningless across different currencies. */
  settledUsd: number;
  /** Total settled transaction count for this account (the "transactions" toggle). */
  transactionCount: number;
}

// USD figures sum to exactly 128,400 (the card's "$128.4K" headline KPI);
// transaction counts sum to 3,842 (the "Transactions" mode headline).
export const SETTLEMENT_ANALYTICS_BY_ACCOUNT: SettlementAnalyticsRow[] = [
  { accountId: "us-usd", settledUsd: 52_000, transactionCount: 1_540 },
  { accountId: "gb-gbp", settledUsd: 28_500, transactionCount: 812 },
  { accountId: "eu-eur", settledUsd: 21_300, transactionCount: 640 },
  { accountId: "ca-cad", settledUsd: 9_800, transactionCount: 310 },
  { accountId: "ae-aed", settledUsd: 7_200, transactionCount: 260 },
  { accountId: "au-aud", settledUsd: 5_100, transactionCount: 155 },
  { accountId: "sg-sgd", settledUsd: 2_900, transactionCount: 92 },
  { accountId: "row-swift", settledUsd: 1_600, transactionCount: 33 },
];

export const SETTLEMENT_ANALYTICS_TOTALS = {
  settledUsdLabel: "$128.4K",
  settledInrLabel: "₹1,22,31,384.00",
  transactionCountLabel: "3,842",
};

/** Derived from SETTLEMENT_ANALYTICS_BY_ACCOUNT rather than a third literal
 *  next to SETTLEMENT_ANALYTICS_TOTALS, so OutstandingAmountCard's
 *  settlement-progress bar can never drift out of sync with the per-account
 *  figures it's computed from. */
export const TOTAL_SETTLED_USD = SETTLEMENT_ANALYTICS_BY_ACCOUNT.reduce(
  (sum, row) => sum + row.settledUsd,
  0
);

/** Received from customers but not yet settled (see OutstandingAmountCard).
 *  Its INR line is derived from this at render time via MCA_FX_RATES_TO_INR,
 *  not stored as a second literal, so it can never drift from the USD figure. */
export const OUTSTANDING_AMOUNT_USD = 14_200;

/** Outstanding transactions still awaiting settlement (see OutstandingAmountCard's KPI row). */
export const PENDING_TRANSACTIONS_COUNT = 12;

/** SavedAmountCard's single KPI. */
export const SAVED_AMOUNT_INR_LABEL = "₹8,240.25";
