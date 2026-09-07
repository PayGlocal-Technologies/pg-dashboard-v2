"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { useUrlAction } from "@/lib/hooks/useUrlAction";
import { MidGuard } from "@/components/common/MidGuard";
import { McaLinkTable } from "@/features/dashboard/mca-links/components/McaLinkTable";
import { CreateMcaLinkPage } from "@/features/dashboard/mca-links/components/CreateMcaLinkPage";

// Same page shell as the MCA Transactions page: a PageHeader over a
// MidGuard-wrapped table, so a MID without the MCA product gets the same
// NoFeatureView here as it does there.
export function McaLinksFeature() {
  // The Create flow replaces this whole page (its own title and CTA sit where
  // the list's do), rather than overlaying it — the same in-place swap
  // TransactionDetailsPage does, which is what makes Back restore the table's
  // filters, ordering, and page for free.
  const [isCreating, setIsCreating] = useState(false);

  // "Create link" picked from the header search lands here as ?action=create,
  // and opens the same in-place create flow the table's own button opens.
  useUrlAction("create", () => setIsCreating(true));

  if (isCreating) {
    return (
      <MidGuard productType="PACB">
        <CreateMcaLinkPage onBack={() => setIsCreating(false)} />
      </MidGuard>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader title="MCA Links" />

      <MidGuard productType="PACB">
        <McaLinkTable onCreateLink={() => setIsCreating(true)} />
      </MidGuard>
    </div>
  );
}
