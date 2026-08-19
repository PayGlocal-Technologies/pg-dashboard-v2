"use client";

import { useMemo, useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  PageHeader,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { McaInvoiceTable } from "@/features/dashboard/mca-invoices/components/McaInvoiceTable";
import { InvoiceSummaryCards } from "@/features/dashboard/mca-invoices/components/InvoiceSummaryCards";
import { useZohoPullSync } from "@/features/dashboard/zoho-integration/hooks";

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
      <PageHeader title="Invoice management" actions={<ZohoSyncAction />} />
      <MidGuard productType="PACB">
        <McaInvoicesContent />
      </MidGuard>
    </div>
  );
}

/**
 * "Sync from Zoho", the invoice-list twin of the one Client Management shows.
 *
 * Only for a merchant who has actually connected Zoho: production gates it on
 * the connection status rather than showing a disabled control. When the
 * account has several PACB MIDs and none is selected, the sync has to be told
 * which one it applies to first, so the button becomes a menu of MIDs.
 */
function ZohoSyncAction() {
  // Invoices only. The same endpoint can pull clients across, and this list
  // deliberately doesn't ask it to, mirroring Client Management's inverse.
  const { isConnected, isSyncing, sync, pacbMids, selectedMid } = useZohoPullSync({
    isClientSync: false,
    isInvoiceSync: true,
  });

  if (!isConnected) return null;

  const needsMidChoice = pacbMids.length > 1 && !selectedMid;
  const glyph = <Icon name="zoho-logo" className="h-3.5 w-3.5" />;

  if (!needsMidChoice) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={glyph}
        isLoading={isSyncing}
        onClick={() => sync()}
      >
        Sync from Zoho
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" leftIcon={glyph} isLoading={isSyncing}>
          Sync from Zoho
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Which merchant ID?</DropdownMenuLabel>
        {pacbMids.map((mid) => (
          <DropdownMenuItem key={mid} onSelect={() => sync(mid)} className="tabular-nums">
            {mid}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
