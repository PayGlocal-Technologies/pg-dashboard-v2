"use client";

import { PageHeader } from "@/components/ui";
import { MidGuard } from "@/components/common/MidGuard";
import { McaLinkTable } from "@/features/dashboard/mca-links/components/McaLinkTable";

// Same page shell as the MCA Transactions page: a PageHeader over a
// MidGuard-wrapped table, so a MID without the MCA product gets the same
// NoFeatureView here as it does there.
export function McaLinksFeature() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader title="MCA Links" />

      <MidGuard productType="PACB">
        <McaLinkTable />
      </MidGuard>
    </div>
  );
}
