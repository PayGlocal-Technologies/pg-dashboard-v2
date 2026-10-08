"use client";

import { useGet } from "@/lib/api/hooks";
import {
  paSettlementDetailApi,
  paTxnDetailApi,
} from "@/features/dashboard/pa-transactions/services";

/** pg-dashboard's SettlementTxnDetail. Amounts are in the settlement currency. */
export interface SettlementTxnDetail {
  mdrFixedFeeRate?: number | null;
  mdrPercentageFeeRate?: number | null;
  mdrFeeAmount?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  settlementExternalStatus?: string | null;
  settledDate?: string | null;
  conversionRate?: number | null;
  amtTobeSettled?: number | null;
  mdrFeeAmtNonConverted?: number | null;
  /** The figures are provisional until the payment is settled. */
  tentative?: boolean | null;
}

interface TxnDetailResponse {
  data?: {
    transactionDetails?: {
      txnId?: string | null;
      paymentDetails?: { paymentStatus?: string | null } | null;
    } | null;
  } | null;
}

interface SettlementTxnDetailResponse {
  data?: { settlementTxnDetail?: SettlementTxnDetail | null } | null;
}

/** Payment statuses pg-dashboard reads a settlement for. */
const SETTLEMENT_STATUSES = ["SENT_FOR_REFUND", "SENT_FOR_CAPTURE"];

/**
 * A PA transaction's settlement (MDR fee, GST, amount to be settled), read
 * the way pg-dashboard's PaTransactionDetails reads it: the transaction's
 * details first, for its `txnId` and payment status, then its settlement,
 * only for a captured or refunded payment. Null while loading or when there
 * is none yet.
 */
export function useSettlementDetail(
  mid: string | undefined,
  gid: string | undefined
): SettlementTxnDetail | null {
  const { data: detail } = useGet<TxnDetailResponse>(
    ["pa-txn-detail", mid, gid],
    mid && gid ? paTxnDetailApi(mid, gid) : "",
    undefined,
    { enabled: !!mid && !!gid, staleTime: 60_000 }
  );
  const txnId = detail?.data?.transactionDetails?.txnId ?? "";
  const paymentStatus = detail?.data?.transactionDetails?.paymentDetails?.paymentStatus ?? "";

  const { data: settlement } = useGet<SettlementTxnDetailResponse>(
    ["pa-txn-settlement", mid, txnId],
    mid && txnId ? paSettlementDetailApi(mid, txnId) : "",
    undefined,
    {
      enabled: !!mid && !!txnId && SETTLEMENT_STATUSES.includes(paymentStatus),
      staleTime: 60_000,
    }
  );
  return settlement?.data?.settlementTxnDetail ?? null;
}
