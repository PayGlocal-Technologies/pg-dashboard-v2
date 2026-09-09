import { COUNTRIES } from "@payglocal_ui/flux-ui";
import type {
  FfmsSettlementSummaryRow,
  McaSettlementPayment,
  PaSettlementView,
  SettlementDetailPayment,
  SettlementListItem,
  SettlementRow,
  SettlementSupplement,
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
 * table renders. This endpoint returns only date/amount/count/UTRs; the
 * remaining SettlementRow fields have no source and are set to neutral
 * structural defaults, NOT fabricated data:
 *
 *   // BACKEND GAP: paymentReceivedAt / affectedByNonWorkingDay — not in the
 *   // payload; derived from the holiday calendar where they are needed.
 *   // `date` is the settlement date and doubles as the row id and the
 *   // download key.
 */
export function mapPaViewToRow(view: PaSettlementView): SettlementRow {
  const date = view.settlementDate ?? "";
  return {
    id: date,
    amount: Number(view.settlementAmount ?? 0),
    currency: "INR",
    transactionCount: Number(view.numberOfTransactions ?? 0),
    utrNumbers: view.utrNumbers ?? [],
    date,
    paymentReceivedAt: date,
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
    transactionCount: Number(row.numberOfTransactions ?? 0),
    utrNumbers: row.utrNumbers ?? [],
    date,
    paymentReceivedAt: date,
    affectedByNonWorkingDay: false,
    merchantId: row.merchantId ?? undefined,
  };
}

// ── New contract mappers ────────────────────────────────────────────────────
// These replace mapPaViewToRow / mapFfmsRowToRow above once the settlement-list
// and settlement-detail endpoints deploy. They take the contract row plus the
// off-contract supplement (see Section B of mock-data.ts) precisely so that the
// day the supplement goes away, the call sites drop an argument and nothing
// else changes.

/**
 * A settlement-list row onto the SettlementRow the tables render.
 *
 * `id` is the settlement DATE: there is no settlement id, an account settles at
 * most once a day. It is NOT unique on its own across a UCIC-scoped response,
 * so anything keying or routing on a row must carry `merchantId` alongside it.
 */
export function mapSettlementListItemToRow(
  item: SettlementListItem,
  supplement: SettlementSupplement | null
): SettlementRow {
  const date = item.settlementDate;
  return {
    id: date,
    merchantId: item.merchantId,
    amount: item.amount,
    // INR by contract, not returned: settlements always land in INR.
    currency: "INR",
    transactionCount: item.transactionCount,
    date: `${date}T00:00:00+05:30`,
    // No UTR on the new contract. Left empty rather than omitted so the classic
    // table, which reads the old summary endpoints, keeps one shape to render.
    utrNumbers: [],
    // Derived, not returned — see SettlementSupplement.
    paymentReceivedAt: `${supplement?.paymentReceivedAt ?? date}T00:00:00+05:30`,
    affectedByNonWorkingDay: false,
  };
}

/** A settlement-detail payment onto the cross-border row the payments table
 *  renders. The status passes through as the raw API value, badged by
 *  mca-transactions' shared map. `countryName` is not in the response and is
 *  resolved from the alpha-2 code client-side, which is a real fix rather than
 *  a gap. */
export function mapDetailPaymentToMcaPayment(
  payment: SettlementDetailPayment
): McaSettlementPayment {
  return {
    id: payment.gid,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    createdOn: payment.createdTime,
    countryCode: payment.country,
    countryName: COUNTRIES.find((c) => c.code === payment.country)?.name ?? payment.country,
    remitterName: payment.remitterName,
  };
}
