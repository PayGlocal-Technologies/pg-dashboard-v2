import type { GuideStep } from "@/components/common/guide/types";

/** Storage id for the MCA transactions walkthrough. Bump the version suffix
 *  if the steps below change enough that returning merchants should see it. */
export const MCA_TRANSACTIONS_GUIDE_KEY = "mca-transactions-v2";

/**
 * First-visit coach-marks for the MCA transactions page. `target` values match
 * the `data-guide` attributes placed on the analytics summary
 * (McaTransactionTable) and the row-level Upload Invoice button (columns.tsx).
 * Copy carried over verbatim from the design annotations.
 */
export const MCA_TRANSACTIONS_GUIDE_STEPS: GuideStep[] = [
  {
    target: "mca-txn-analytics",
    title: "View analytics",
    description: "Get a quick overview of how your virtual accounts are performing.",
    side: "bottom",
    align: "center",
  },
  {
    target: "mca-txn-upload-invoice",
    title: "Upload invoice to settle",
    description: "Upload an invoice directly from the table to move the transaction toward settlement.",
    side: "top",
    align: "start",
  },
];

/** Storage id for the transaction-details drawer walkthrough — a separate,
 *  single-step tour that runs the first time the drawer is opened. */
export const TXN_DETAIL_GUIDE_KEY = "mca-txn-detail-v2";

/**
 * First-visit coach-mark inside the transaction details drawer. `target`
 * matches the `data-guide` on the expand-to-full-page button
 * (TransactionDetailsDrawer.tsx). Copy carried over from the design annotation.
 */
export const TXN_DETAIL_GUIDE_STEPS: GuideStep[] = [
  {
    target: "mca-txn-detail-expand",
    title: "Detailed view",
    description: "See the details and settlement status for this transaction.",
    side: "bottom",
    align: "start",
  },
];
