"use client";

import { PageHeader } from "@/components/ui";
import { ReceiptsTable } from "@/features/dashboard/receipts/components/ReceiptsTable";
import { RECEIPTS_PAGE_SUBTITLE } from "@/features/dashboard/receipts/constants";

/**
 * Receipts, at /receipts. Reachable from two places in the sidebar — under
 * Finance, and under Payment Products while the MCA product context is active
 * (see navigation.ts) — because a receipt is both a finance record and a
 * multi-currency accounts artefact. One page either way.
 *
 * The title and its supporting line, then one container holding everything else:
 * the product tabs, the search/filter row, and the table, exactly as SkuTable
 * arranges the same three parts. The step between the header and that container
 * is spacing alone (PageHeader's own bottom margin plus space-y-4), with no
 * divider rule — the title is the strongest element on the page, and the
 * container is the one surface that carries everything below it.
 *
 * The supporting line rides PageHeader's own `subtitle` slot, which renders it as
 * text-sm text-muted-foreground directly under the h1: secondary to the title by
 * construction, and identical to every other page that explains itself, rather
 * than a paragraph styled by hand here.
 */
export function ReceiptsFeature() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader title="Receipts" subtitle={RECEIPTS_PAGE_SUBTITLE} />
      <ReceiptsTable />
    </div>
  );
}
