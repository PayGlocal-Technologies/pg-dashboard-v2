"use client";

import { useState } from "react";
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
import { useScopeId } from "@/lib/hooks/useScopeId";
import { McaInvoiceTable } from "@/features/dashboard/mca-invoices/components/McaInvoiceTable";
import { InvoiceSummaryCards } from "@/features/dashboard/mca-invoices/components/InvoiceSummaryCards";
import { useZohoPullSync } from "@/features/dashboard/zoho-integration/hooks";
import {
  ALL_TIME_RANGE_VALUE,
  INVOICE_DATA_KEYS,
  type SummaryRange,
} from "@/features/dashboard/mca-invoices/constants";
import { endOfDayMs, summaryWindowSeconds } from "@/features/dashboard/mca-invoices/helpers";

/**
 * Invoice management, at /mca-invoices.
 *
 * Composition root only. The one piece of state shared between the summary and
 * the table is the status filter, because a summary card is a shortcut into the
 * list: clicking "Outstanding invoices" filters it, exactly as pg-dashboard
 * does. The summary's period and the table's Date chip are NOT shared — see
 * SUMMARY_RANGE_OPTIONS for why they stopped being.
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
  //
  // A pull can add or restate any number of invoices, so both the list and the
  // summary counts have to refetch once it lands.
  const { isConnected, isSyncing, sync, pacbMids, selectedMid } = useZohoPullSync(
    { isClientSync: false, isInvoiceSync: true },
    INVOICE_DATA_KEYS
  );

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
  // The summary endpoint takes a single id in its path: the product MID, the
  // selected MID, or the UCIC id for a multi-MID account with nothing selected
  // (see lib/hooks/useScopeId.ts).
  const { scopeId: summaryMid } = useScopeId("PACB");

  const [statusFilters, setStatusFilters] = useState<string[]>([]);

  /** The summary's own period. The table's Date chip is its own, inside it. */
  const [summaryRange, setSummaryRange] = useState<SummaryRange>(ALL_TIME_RANGE_VALUE);

  // Read once, and bucketed to the end of the local day: this is the open end
  // of the summary's window, and therefore part of its react-query key, so a
  // second-resolution "now" would produce a fresh key on every mount and the
  // cards could never paint from cache.
  const [defaultEndMs] = useState(() => endOfDayMs(new Date()));

  const summary = (
    <InvoiceSummaryCards
      merchantId={summaryMid}
      range={summaryRange}
      onRangeChange={setSummaryRange}
      windowSeconds={summaryWindowSeconds(summaryRange, defaultEndMs)}
      onStatusFilter={setStatusFilters}
    />
  );

  return (
    <McaInvoiceTable
      summarySection={summary}
      statusFilters={statusFilters}
      onStatusFiltersChange={setStatusFilters}
    />
  );
}
