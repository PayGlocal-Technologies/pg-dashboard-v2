import { COUNTRIES } from "@payglocal_ui/flux-ui";
import { downloadBlob } from "@/lib/utils/format";
import type {
  McaSettlementPayment,
  SettlementDetailPayment,
  SettlementListItem,
  SettlementRow,
  SettlementSupplement,
} from "@/features/dashboard/mca-settlement-report/types";

/**
 * Force a browser download of a presigned report URL. Ported verbatim from
 * pg-dashboard's `handleSuccessFullReport` (reports/helper.ts): a hidden anchor
 * click is the only cross-browser way to trigger a download from a same-tab
 * presigned URL without navigating away.
 *
 * The file lands with whatever name the bucket's Content-Disposition gives it.
 * An anchor cannot override that here — see downloadPresignedFile below.
 */
export function triggerBrowserDownload(url: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** ".xlsx" from a presigned URL's object key, ignoring the query string that
 *  carries the signature. Empty when the key has no extension. */
function extensionFromUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  const lastSegment = path.slice(path.lastIndexOf("/") + 1);
  const dot = lastSegment.lastIndexOf(".");
  return dot > 0 ? lastSegment.slice(dot) : "";
}

/**
 * Download a presigned report under a name we choose.
 *
 * The `download` attribute is ignored for CROSS-ORIGIN urls, and a presigned
 * S3 link always is, so the plain anchor above can never rename the file: it
 * arrives as whatever the bucket's Content-Disposition says, today
 * "daily_settlement_report". Fetching the bytes and handing the browser a
 * same-origin `blob:` url instead is the only way a chosen name sticks.
 *
 * That fetch needs the bucket's CORS policy to allow this origin. When it does
 * not — or the request fails for any other reason — this falls back to the
 * plain anchor, so the download still happens, just under the server's own
 * name. Renaming is an improvement layered on top of a working download, never
 * a new way for it to fail.
 *
 * The durable fix is server-side: presign with `ResponseContentDisposition` so
 * every client gets a named file. That cannot be done from here, because
 * appending the parameter to an already-signed url invalidates its signature.
 */
export async function downloadPresignedFile(url: string, baseName: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Report download failed: ${response.status}`);
    const blob = await response.blob();
    downloadBlob(blob, `${baseName}${extensionFromUrl(url)}`);
  } catch {
    triggerBrowserDownload(url);
  }
}

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
): SettlementRow | null {
  // A settlement with no date has no primary key: nothing can link to it,
  // download it, or place it on the calendar. Returning null lets the caller
  // drop it, which beats rendering a row whose every date-derived field is
  // "Invalid Date". See SettlementListItem for why this is not hypothetical.
  const date = item.settlementDate;
  if (!date) return null;

  return {
    id: date,
    merchantId: item.merchantId ?? undefined,
    // Coerced, not trusted: the sibling settlement endpoints send amounts as
    // nullable strings and this one is not guaranteed to differ.
    amount: Number(item.amount ?? 0),
    // INR by contract, not returned: settlements always land in INR.
    currency: "INR",
    transactionCount: Number(item.transactionCount ?? 0),
    date: `${date}T00:00:00+05:30`,
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
