"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import { MidGuard } from "@/components/common/MidGuard";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { McaInvoiceTable } from "@/features/dashboard/mca-invoices/components/McaInvoiceTable";
import { InvoiceSummaryCards } from "@/features/dashboard/mca-invoices/components/InvoiceSummaryCards";

/**
 * Invoice management, at /mca-invoices.
 *
 * Composition root only. Filter state that both the summary cards and the
 * table need lives here, because pg-dashboard's summary cards are shortcuts
 * into the table's own filters rather than a separate read-only panel:
 * clicking "Outstanding invoices" filters the list, and changing the summary's
 * date range moves the list's window too.
 */
export function McaInvoicesFeature() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <PageHeader title="Invoice management" />
      <MidGuard productType="PACB">
        <McaInvoicesContent />
      </MidGuard>
    </div>
  );
}

function McaInvoicesContent() {
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const paCbMids = useApp((s) => s.paCbMids);

  // The summary endpoint takes a single MID in its path, so it uses the
  // selected one, falling back to the first PACB MID exactly as production's
  // McaInvoiceSummary does.
  const summaryMid = selectedMid || (paCbMids[0] ?? "");

  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [relativeWindow, setRelativeWindow] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);

  const summary = useMemo(
    () => (
      <InvoiceSummaryCards
        merchantId={summaryMid}
        onStatusFilter={setStatusFilters}
        onRangeDaysChange={(days) => {
          if (days === undefined) {
            setRelativeWindow(null);
            return;
          }
          // Millis here, unlike the summary endpoint's own seconds: the search
          // body's startTime/endTime are epoch millis.
          const endTime = Date.now();
          setRelativeWindow({ startTime: endTime - days * 24 * 60 * 60 * 1000, endTime });
        }}
      />
    ),
    [summaryMid]
  );

  return (
    <McaInvoiceTable
      summarySection={summary}
      statusFilters={statusFilters}
      onStatusFiltersChange={setStatusFilters}
      relativeWindow={relativeWindow}
      onRelativeWindowChange={setRelativeWindow}
    />
  );
}
