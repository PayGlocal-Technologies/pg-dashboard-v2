/**
 * Placeholder figures for the per-account breakdown on the Transactions
 * page's settlement analytics card (see SettlementAnalyticsCard.tsx).
 *
 * TODO: replace with a real per-virtual-account settlement endpoint. The MCA
 * business-overview API that now backs every other figure on that card
 * (getPacbOverview, see useMcaOverview) reports whole-account totals only and
 * carries no per-account breakdown, so this list has no live source yet.
 * Every number below is dummy data. The shape is deliberately keyed by the
 * same virtual account ids MOCK_VIRTUAL_ACCOUNTS uses, so wiring the backend
 * up means replacing the source, not the component.
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
