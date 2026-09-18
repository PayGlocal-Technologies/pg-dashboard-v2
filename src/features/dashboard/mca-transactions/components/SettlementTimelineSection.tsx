"use client";

import { useState, type ReactNode } from "react";
import { Alert, AlertDescription, Button, Card, CardContent, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useGet } from "@/lib/api/hooks";
import {
  mcaAdditionalDocConversationApi,
  mcaFrmStatusApi,
  mcaTxnDocumentsApi,
  mcaTxnTimelineApi,
} from "@/features/dashboard/mca-transactions/services";
import { useDocumentDownload, useFircDownload } from "@/features/dashboard/mca-transactions/hooks";
import { useVirtualAccounts } from "@/features/dashboard/multi-currency/hooks";
import {
  buildSettlementTimeline,
  getDocumentPendingMessage,
  hasTimelineReversal,
} from "@/features/dashboard/mca-transactions/timeline/buildSettlementTimeline";
import { formatMoney } from "@/features/dashboard/mca-transactions/timeline/format";
import { SettlementTimelineStepper } from "@/features/dashboard/mca-transactions/components/SettlementTimelineStepper";
import {
  TransactionQueriesDrawer,
  type TransactionQueriesTab,
} from "@/features/dashboard/mca-transactions/components/TransactionQueriesDrawer";
import type {
  AdditionalDocConversationResponse,
  FrmStatusResponse,
  McaTransaction,
  TimelineApiResponse,
  TxnDocumentsResponse,
} from "@/features/dashboard/mca-transactions/types";

interface SettlementTimelineSectionProps {
  row: McaTransaction;
  /** The invoice upload form, nested under the timeline's upload step while
   *  that step is awaiting the merchant's file. */
  uploadSlot?: ReactNode;
}

function TimelineSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Shimmer className="h-4 w-4 shrink-0" rounded="full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Shimmer className="h-3.5 w-2/3" />
            <Shimmer className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The settlement timeline, fetched and rendered from live data.
 *
 * Four endpoints feed this one card, all keyed on the transaction: the
 * timeline itself, the documents already uploaded against it (the legacy
 * source of an invoice's file name), and the two compliance threads, which
 * only decide whether the "we need more documents" banner shows. The three
 * supporting calls are cheap and independent, so they run alongside the
 * timeline rather than waiting on it.
 */
export function SettlementTimelineSection({ row, uploadSlot }: SettlementTimelineSectionProps) {
  const hasIds = !!row.merchantId && !!row.gid;

  const {
    data: timelineData,
    isPending,
    isError,
    refetch,
  } = useGet<TimelineApiResponse>(["mca-txn-timeline", row.gid], mcaTxnTimelineApi(row.gid), {
    enabled: !!row.gid,
  });

  const { data: documentsData } = useGet<TxnDocumentsResponse>(
    ["mca-txn-documents", row.merchantId, row.gid],
    mcaTxnDocumentsApi(row.merchantId, row.gid),
    { enabled: hasIds }
  );

  const { data: frmData } = useGet<FrmStatusResponse>(
    ["mca-txn-frm-status", row.merchantId, row.gid],
    mcaFrmStatusApi(row.merchantId, row.gid),
    { enabled: hasIds }
  );

  const { data: additionalDocData } = useGet<AdditionalDocConversationResponse>(
    ["mca-txn-additional-doc", row.merchantId, row.gid],
    mcaAdditionalDocConversationApi(row.merchantId, row.gid),
    { enabled: hasIds }
  );

  const { downloadFirc, isDownloading: isFircDownloading } = useFircDownload();
  const { downloadDocument } = useDocumentDownload();
  // Fallback source for the first step's masked account number when this
  // transaction's own timeline data doesn't carry accountDetails: the
  // merchant's real virtual account for the transaction's currency, from the
  // same live endpoint the Multi-currency Accounts page itself reads.
  const { accounts: virtualAccounts } = useVirtualAccounts("general");

  // Which thread the queries drawer opens on depends on what prompted it —
  // null means closed.
  const [queriesTab, setQueriesTab] = useState<TransactionQueriesTab | null>(null);

  const timeline = timelineData?.data;
  const events = timeline?.timeLineEvents;
  const documents = documentsData?.data?.documentsPresent ?? [];

  const isFrmPending = frmData?.data?.frmStatus?.status === "PENDING_MERCHANT_UPLOAD";
  const isAwaitingAdditionalDocs = additionalDocData?.data?.status === "OPS";
  const isReversed = hasTimelineReversal(events, timeline?.multipleTimelineEvents);

  const steps = events
    ? buildSettlementTimeline({
        data: events,
        multipleTimelineEvents: timeline?.multipleTimelineEvents,
        documents,
        row,
        isAmzTxn: timeline?.isAmzTxn ?? false,
        isFundDelayed: timeline?.isFundDelayed ?? false,
        isSameBankSettlement: timeline?.isSameBankSettlement ?? false,
        accountDetails: timeline?.accountDetails,
        virtualAccounts,
        onDownloadDocument: downloadDocument,
        onDownloadFirc: () => downloadFirc(row.merchantId, row.gid),
        isFircDownloading,
        uploadSlot,
      })
    : [];

  // Status banners above the timeline. A reversal supersedes all of them:
  // once the funds have gone back, nothing else about the transaction's
  // progress is actionable.
  const banners = isReversed ? (
    <Alert variant="warning">
      <AlertDescription>Your funds have been reversed.</AlertDescription>
    </Alert>
  ) : (
    <>
      {(isFrmPending || isAwaitingAdditionalDocs) && (
        <Alert variant="warning">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            We need additional documents to process your transaction.
            <Button
              type="button"
              size="sm"
              onClick={() => setQueriesTab(isFrmPending ? "compliance" : "additional")}
            >
              View details
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {row.externalStatus === "DOCUMENT_PENDING" && (
        <Alert variant="warning">
          <AlertDescription>
            {getDocumentPendingMessage(timeline?.multipleTimelineEvents)}
          </AlertDescription>
        </Alert>
      )}
      {row.externalStatus === "FUNDS_ON_HOLD" && (
        <Alert variant="info">
          <AlertDescription>
            {formatMoney(row.amount, row.currency)} received and held in virtual account.
          </AlertDescription>
        </Alert>
      )}
      {row.externalStatus === "SENT_FOR_REVIEW" && !isFrmPending && (
        <Alert variant="info">
          <AlertDescription>We are reviewing your invoice, no action needed.</AlertDescription>
        </Alert>
      )}
      {row.externalStatus === "FIRC_SETTLED" && (
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
      )}
    </>
  );

  // A thread worth opening is one that already has messages, or one ops is
  // actively waiting on the merchant for.
  const hasComplianceThread =
    (frmData?.data?.frmStatus?.conversation?.length ?? 0) > 0 &&
    frmData?.data?.frmStatus?.status !== "NO_FRM";
  const hasAdditionalDocThread = (additionalDocData?.data?.data?.length ?? 0) > 0;
  const hasQueries =
    hasComplianceThread || hasAdditionalDocThread || isFrmPending || isAwaitingAdditionalDocs;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Settlement timeline
        </h3>
        {hasQueries && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="message-circle" className="h-3.5 w-3.5" />}
            onClick={() =>
              setQueriesTab(hasComplianceThread || isFrmPending ? "compliance" : "additional")
            }
            className="h-auto min-h-0 py-1 text-[12px] text-muted-foreground hover:text-foreground"
          >
            Transaction queries
          </Button>
        )}
      </div>
      <Card size="sm">
        <CardContent className="space-y-4">
          {isError ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Icon name="alert-circle" className="h-6 w-6 text-red-600" />
              <p className="text-[13px] text-muted-foreground">
                Couldn&apos;t load the settlement timeline.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : isPending ? (
            <TimelineSkeleton />
          ) : steps.length === 0 ? (
            <p className="py-4 text-[13px] text-muted-foreground">
              No settlement events have been recorded for this transaction yet.
            </p>
          ) : (
            <>
              {banners}
              <SettlementTimelineStepper items={steps} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Opens over the transaction details drawer this section sits in.
          Mounted only once a thread has been asked for, so its two
          conversation queries don't fire on every details view. */}
      {queriesTab && (
        <TransactionQueriesDrawer
          open
          onOpenChange={(next) => {
            if (!next) setQueriesTab(null);
          }}
          mid={row.merchantId}
          gid={row.gid}
          defaultTab={queriesTab}
        />
      )}
    </section>
  );
}
