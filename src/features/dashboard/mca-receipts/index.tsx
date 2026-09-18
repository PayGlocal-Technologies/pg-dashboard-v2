"use client";

import { PageHeader } from "@/components/ui";
import { McaReceiptTable } from "@/features/dashboard/mca-receipts/components/McaReceiptTable";
import { RECEIPTS_PAGE_SUBTITLE } from "@/features/dashboard/mca-receipts/constants";

/**
 * MCA receipts, at /mca-receipts. Reachable from three places in the sidebar
 * (see navigation.ts) — Finance, Payment Products under the MCA context, and
 * Compliance Center as "GST Invoices" — because a receipt is a finance record,
 * a product artefact and a compliance one. One page either way.
 *
 * Scoped to multi-currency accounts alone. It used to carry a product tab bar
 * over MCA / PA / Fraud screening; the page now sits under MCA and asks the
 * endpoint for that product only (see RECEIPT_PRODUCT).
 *
 * The title and its supporting line, then one container holding everything else:
 * the search/filter row and the table, exactly as SkuTable arranges the same
 * parts. The step between the header and that container
 * is spacing alone (PageHeader's own bottom margin plus space-y-4), with no
 * divider rule — the title is the strongest element on the page, and the
 * container is the one surface that carries everything below it.
 *
 * The supporting line rides PageHeader's own `subtitle` slot, which renders it as
 * text-sm text-muted-foreground directly under the h1: secondary to the title by
 * construction, and identical to every other page that explains itself, rather
 * than a paragraph styled by hand here.
 */
export function McaReceiptsFeature() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader title="Receipts" subtitle={RECEIPTS_PAGE_SUBTITLE} />
      <McaReceiptTable />
    </div>
  );
}
