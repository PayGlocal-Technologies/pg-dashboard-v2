"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { ReceiptsTable } from "@/features/dashboard/receipts/components/ReceiptsTable";
import {
  DEFAULT_RECEIPT_PRODUCT,
  RECEIPT_PRODUCT_TABS,
} from "@/features/dashboard/receipts/constants";
import type { ReceiptProduct } from "@/features/dashboard/receipts/types";

/**
 * Receipts, at /receipts. Reachable from two places in the sidebar — under
 * Finance, and under Payment Products while the MCA product context is active
 * (see navigation.ts) — because a receipt is both a finance record and a
 * multi-currency accounts artefact. One page either way.
 *
 * Four things stacked in the main content container: the title, the product tab
 * bar, the search/filter controls, then the table. The steps between them are
 * spacing alone (space-y-4, plus PageHeader's own bottom margin), with no
 * divider rules: the title is the strongest element, the tabs establish which
 * product is in view, the controls read as secondary, and the table is the
 * surface that actually carries data.
 */
export function ReceiptsFeature() {
  const [product, setProduct] = useState<ReceiptProduct>(DEFAULT_RECEIPT_PRODUCT);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader title="Receipts" />

      {/* Product context, not a filter: the tab bar sits directly on the page
          with no surrounding container, immediately under the title, the same
          way the MCA Links page carries its own tab bar.

          scrollbar-none + overflow-x-auto so the three labels stay on one line
          and scroll on a narrow phone instead of wrapping or forcing the page
          itself sideways. UnderlineTabs measures its own indicator from the DOM,
          so it tracks the selected tab correctly at any scroll offset. */}
      <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
        <UnderlineTabs
          tabs={RECEIPT_PRODUCT_TABS}
          value={product}
          onValueChange={(value) => setProduct(value as ReceiptProduct)}
        />
      </div>

      {/* Keyed on the product so switching tabs starts that product's receipts
          on a clean search, no filters and page 1 — rather than carrying one
          product's query onto another product's rows, where it would silently
          match nothing. Remounting is what resets it, so no effect has to. */}
      <ReceiptsTable key={product} product={product} />
    </div>
  );
}
