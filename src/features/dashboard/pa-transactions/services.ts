/** PA (Cards / UPI / NetBanking) OpenSearch endpoint */
export const paTxnSearchApi = (mid: string) => `/gcc/v1/search/txn/${mid}`;

/**
 * One transaction's details (pg-dashboard's PaTransactionDetails):
 * GET → `{ data: { transactionDetails } }`, read here for its `txnId` and
 * payment status, which the settlement read below is keyed by.
 */
export const paTxnDetailApi = (mid: string, gid: string) =>
  `/gcc/v1/transaction/detail/${mid}/gid/${encodeURIComponent(gid)}`;

/**
 * Its settlement: GET → `{ data: { settlementTxnDetail } }` (MDR fee, GST,
 * amount to be settled). Addressed by the detail's `txnId`, not the gid, and
 * only read for a captured or refunded payment, as pg-dashboard does.
 */
export const paSettlementDetailApi = (mid: string, txnId: string) =>
  `/gcc/v1/transaction/detail/settlement/${mid}/gid/${encodeURIComponent(txnId)}`;
