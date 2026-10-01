"use client";

import { Alert, AlertDescription, Button, Card, CardContent } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useGet } from "@/lib/api/hooks";
import { useFircDownload } from "@/features/dashboard/mca-transactions/hooks";
import { mcaTxnTimelineApi } from "@/features/dashboard/mca-transactions/services";
import { isInvoiceUploadAwaited } from "@/features/dashboard/mca-transactions/timeline/buildSettlementTimeline";
import { UploadInvoiceForm } from "@/features/dashboard/mca-transactions/components/UploadInvoiceForm";
import type {
  McaTransaction,
  TimelineApiResponse,
} from "@/features/dashboard/mca-transactions/types";

// Same reversal set TransactionDetailsPage/SettlementTimelineSection use —
// once funds have gone back there is nothing left to do about this
// transaction, so this card renders nothing rather than offering an upload
// or a download that would no longer be honoured.
const REVERSED_STATUSES = new Set(["REVERSAL_FOR_RISK_REJECTED", "REVERSAL_FOR_NOT_SUPPORTED"]);

interface SettlementActionCardProps {
  row: McaTransaction;
  onUploaded?: (row: McaTransaction) => void;
}

/**
 * The one thing (if any) a merchant needs to DO about this transaction right
 * now — upload an invoice, or download its FIRC — as its own card, pulled
 * out of Settlement Timeline rather than sitting inline above that card's
 * own (purely informational) banners. Renders nothing when there's no such
 * action, so it never leaves a stray empty card behind.
 *
 * Rendered by TransactionDetailsContent, shared verbatim by both the full
 * page and the drawer layout (see TransactionDetailsPage.tsx) — same
 * component either way, just placed inside whichever layout's own
 * column/stack, so the two views can never disagree about what action (if
 * any) a given transaction needs.
 */
export function SettlementActionCard({ row, onUploaded }: SettlementActionCardProps) {
  const { downloadFirc, isDownloading: isFircDownloading } = useFircDownload();
  // Same query (same key) the timeline section already runs, so this reads
  // its cache rather than firing a second request.
  const {
    data: timelineData,
    isPending: isTimelinePending,
    isError: isTimelineError,
  } = useGet<TimelineApiResponse>(["mca-txn-timeline", row.gid], mcaTxnTimelineApi(row.gid), {
    enabled: !!row.gid,
  });

  if (REVERSED_STATUSES.has(row.externalStatus)) return null;

  // The upload form shows only while the timeline is actually waiting on an
  // invoice, pg-dashboard's own rule (see isInvoiceUploadAwaited). The row's
  // status alone isn't enough: right after a submit it can still read
  // DOCUMENT_PENDING (a held copy, or a backend that updates it a beat
  // later), and the form would come back with the same file ready to submit
  // twice. Nothing renders while the timeline loads, as in pg-dashboard. If
  // the timeline call fails outright, the status alone decides, so a timeline
  // outage can never block an upload.
  const awaitingInvoice = isTimelineError
    ? true
    : !isTimelinePending &&
      isInvoiceUploadAwaited(
        timelineData?.data?.timeLineEvents,
        timelineData?.data?.multipleTimelineEvents
      );

  if (row.externalStatus === "DOCUMENT_PENDING" && awaitingInvoice) {
    return (
      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Upload invoice
        </h3>
        {/* Same diagonal white-to-blue wash as International Accounts' own
            Account details card (see VirtualAccountDetails/platforms
            index.tsx) — this is this page's equivalent "the thing you still
            need to act on" card. */}
        <Card
          size="sm"
          className="shadow-none border-blue-100 bg-linear-to-br from-white via-white to-blue-100/70 dark:border-blue-900/40 dark:from-card dark:via-card dark:to-blue-950/40"
        >
          <CardContent>
            <UploadInvoiceForm row={row} variant="inline" onSuccess={() => onUploaded?.(row)} />
          </CardContent>
        </Card>
      </section>
    );
  }

  if (row.externalStatus === "FIRC_SETTLED") {
    return (
      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          FIRC
        </h3>
        {/* Alert alone, no surrounding Card: it already carries its own
            tinted background/border, so nesting it inside a plain Card too
            would just double the box around it. */}
        <Alert variant="success">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            Amount credited and FIRC is ready to download.
            <Button
              type="button"
              size="sm"
              leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
              onClick={() => downloadFirc(row.merchantId, row.gid)}
              disabled={isFircDownloading}
            >
              Download FIRC
            </Button>
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  return null;
}
