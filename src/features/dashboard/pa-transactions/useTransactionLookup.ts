"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePost } from "@/lib/api/hooks";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { paTxnSearchApi } from "@/features/dashboard/pa-transactions/services";
import type {
  PaTransaction,
  PaTransactionsResponse,
} from "@/features/dashboard/pa-transactions/types";
import type { TableReqBody } from "@/types/transactions";

/**
 * Open one PA transaction by its GID, where a page only has the id (a
 * scheduler attempt, a mandate's initiating payment). pg-dashboard's
 * PaTransactionDetails by mid + gid: the PA search, under that MID, with the
 * GID as the query, taking the exact match. Feed `transaction` and `open` to
 * the PA TransactionDetailsDrawer.
 */
export function useTransactionLookup() {
  const { urlMid } = useResolvedMids("PA");
  const [transaction, setTransaction] = useState<PaTransaction | null>(null);
  const [open, setOpen] = useState(false);
  const { mutate } = usePost<PaTransactionsResponse, TableReqBody>(paTxnSearchApi(urlMid), {
    invalidateQueries: false,
  });

  const openTransaction = (gid: string, mid: string) =>
    mutate(
      buildTxnRequestBody(
        {},
        { searchQuery: gid, selectedMid: { key: "merchantId", value: [mid] }, pageLimit: 9 }
      ),
      {
        onSuccess: (res) => {
          const match = res?.data?.data?.find((txn) => txn.gid === gid);
          if (!match) {
            toast.error("Couldn't find this transaction");
            return;
          }
          setTransaction(match);
          setOpen(true);
        },
        onError: (error) => toast.error(error.message || "Couldn't load this transaction"),
      }
    );

  return { transaction, open, setOpen, openTransaction };
}
