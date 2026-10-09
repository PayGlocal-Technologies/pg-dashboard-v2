"use client";

import { usePostQuery } from "@/lib/api/hooks";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { paTxnSearchApi } from "@/features/dashboard/pa-transactions/services";
import type { PaTransactionsResponse } from "@/features/dashboard/pa-transactions/types";
import type { TableReqBody } from "@/types/transactions";

/**
 * Whether the merchant has taken any PA payment: the transaction search with
 * no filters, one row, read for its total. What decides if the page still
 * leads with the banner. Null until it has answered.
 */
export function useHasPaTransactions(enabled: boolean): boolean | null {
  const { urlMid, midFilter, isReady } = useResolvedMids("PA");
  const body = buildTxnRequestBody({}, { selectedMid: midFilter, pageLimit: 1, from: 0 });

  const { data, isPending } = usePostQuery<PaTransactionsResponse, TableReqBody>(
    ["pa-transactions-any", urlMid, ...(midFilter?.value ?? [])],
    paTxnSearchApi(urlMid),
    body,
    { staleTime: 0 },
    enabled && isReady
  );

  if (!enabled || !isReady) return false;
  return isPending ? null : (data?.data?.totalCount ?? 0) > 0;
}
