import type {
  FfmsSettlementSummaryRow,
  PaSettlementView,
  SettlementRow,
} from "@/features/dashboard/settlement-reports/types";

/**
 * Force a browser download of a presigned/settlement report URL. Ported
 * verbatim from pg-dashboard's `handleSuccessFullReport` (reports/helper.ts):
 * a hidden anchor click is the only cross-browser way to trigger a download
 * from a same-tab presigned URL without navigating away.
 */
export function triggerBrowserDownload(url: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Maps a thin PA settlement summary row onto the richer v2 SettlementRow the
 * table renders. The backend returns only date/amount/count/UTRs; the
 * remaining SettlementRow fields have no source and are set to neutral
 * structural defaults, NOT fabricated data:
 *
 *   // BACKEND GAP: status — the PA summary endpoint returns only settlements
 *   // that have already completed, so every row is terminal ("settled").
 *   // There is no per-row status in the payload.
 *   // BACKEND GAP: bankAccount / bankTransferStatus / paymentReceivedAt /
 *   // affectedByNonWorkingDay — not in the payload; these columns are hidden
 *   // or unused. `date` is the settlement date and doubles as the row id and
 *   // the download key (one settlement per date in the old contract).
 */
export function mapPaViewToRow(view: PaSettlementView): SettlementRow {
  const date = view.settlementDate ?? "";
  return {
    id: date,
    amount: Number(view.settlementAmount ?? 0),
    currency: "INR",
    status: "settled",
    bankAccount: "",
    transactionCount: Number(view.numberOfTransactions ?? 0),
    utrNumber: view.utrNumbers?.[0],
    utrNumbers: view.utrNumbers ?? [],
    date,
    paymentReceivedAt: date,
    reportAvailable: true,
    bankTransferStatus: "completed",
    affectedByNonWorkingDay: false,
  };
}

/**
 * Maps a thin FFMS (PACB) settlement summary row onto SettlementRow. Same gaps
 * as mapPaViewToRow; FFMS amount lives on `totalSettlementAmount` and the
 * terminal MCA state is "firc" (see the SettlementStatus doc comment in
 * types.ts).
 */
export function mapFfmsRowToRow(row: FfmsSettlementSummaryRow): SettlementRow {
  const date = row.settlementDate ?? "";
  return {
    id: date,
    amount: Number(row.totalSettlementAmount ?? 0),
    currency: "INR",
    status: "firc",
    bankAccount: "",
    transactionCount: Number(row.numberOfTransactions ?? 0),
    utrNumber: row.utrNumbers?.[0],
    utrNumbers: row.utrNumbers ?? [],
    date,
    paymentReceivedAt: date,
    reportAvailable: true,
    bankTransferStatus: "completed",
    affectedByNonWorkingDay: false,
    merchantId: row.merchantId ?? undefined,
  };
}
