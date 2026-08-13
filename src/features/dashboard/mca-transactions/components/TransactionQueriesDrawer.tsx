"use client";

import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  Shimmer,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useBreakpoint,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useGet } from "@/lib/api/hooks";
import {
  mcaAdditionalDocConversationApi,
  mcaAdditionalDocFileApi,
  mcaFrmConversationApi,
  mcaFrmFileApi,
  mcaFrmStatusApi,
} from "@/features/dashboard/mca-transactions/services";
import { useQueryThread } from "@/features/dashboard/mca-transactions/useQueryThread";
import { ConversationThread } from "@/features/dashboard/mca-transactions/components/ConversationThread";
import { QueryComposer } from "@/features/dashboard/mca-transactions/components/QueryComposer";
import type { BadgeVariant } from "@payglocal_ui/flux-ui";
import type {
  AdditionalDocConversationResponse,
  FrmStatus,
  FrmStatusResponse,
} from "@/features/dashboard/mca-transactions/types";

export type TransactionQueriesTab = "compliance" | "additional";

const FRM_STATUS_BADGE: Record<FrmStatus, { variant: BadgeVariant; label: string }> = {
  PENDING_MERCHANT_UPLOAD: { variant: "warning", label: "Action Required" },
  REVIEW_IN_PROGRESS: { variant: "muted", label: "Under Review" },
  APPROVED: { variant: "success", label: "Resolved" },
  NO_FRM: { variant: "success", label: "No Issues" },
};

function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-border px-3.5 py-3">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="mt-2 h-3.5 w-full" />
          <Shimmer className="mt-1.5 h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function EmptyThread() {
  return (
    <Alert variant="info">
      <AlertDescription>No queries at this time.</AlertDescription>
    </Alert>
  );
}

/**
 * Compliance (FRM) queries. The merchant can only reply while compliance is
 * actually waiting on them — outside PENDING_MERCHANT_UPLOAD the thread is
 * read-only, since an unsolicited reply has nothing to attach itself to.
 */
function ComplianceQueriesTab({ mid, gid }: { mid: string; gid: string }) {
  const {
    data,
    isPending,
    refetch,
  } = useGet<FrmStatusResponse>(
    ["mca-txn-frm-status", mid, gid],
    mcaFrmStatusApi(mid, gid),
    { enabled: !!mid && !!gid }
  );

  const thread = useQueryThread({
    fileApi: mcaFrmFileApi(mid, gid),
    sendApi: mcaFrmConversationApi(mid, gid),
    onSent: () => void refetch(),
  });

  const frmStatus = data?.data?.frmStatus;
  const conversation = frmStatus?.conversation ?? [];
  const badge = frmStatus?.status ? FRM_STATUS_BADGE[frmStatus.status] : undefined;
  const canReply = frmStatus?.status === "PENDING_MERCHANT_UPLOAD";

  if (isPending) return <ThreadSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      {badge && frmStatus?.status !== "NO_FRM" && (
        <div className="flex justify-end">
          <StatusBadge variant={badge.variant} label={badge.label} size="sm" />
        </div>
      )}

      {conversation.length > 0 ? (
        <ConversationThread entries={conversation} onDownload={thread.downloadAttachment} />
      ) : (
        <EmptyThread />
      )}

      {canReply && <QueryComposer thread={thread} />}
    </div>
  );
}

/**
 * Additional documents ops has asked for. Unlike compliance queries, the
 * composer is always available: this thread is the merchant's channel for
 * supplying documents, so they can add to it whenever they have something.
 */
function AdditionalDocumentsTab({ mid, gid }: { mid: string; gid: string }) {
  const {
    data,
    isPending,
    refetch,
  } = useGet<AdditionalDocConversationResponse>(
    ["mca-txn-additional-doc", mid, gid],
    mcaAdditionalDocConversationApi(mid, gid),
    { enabled: !!mid && !!gid }
  );

  const thread = useQueryThread({
    fileApi: mcaAdditionalDocFileApi(mid, gid),
    // sendNotification tells the backend to alert ops that the merchant has
    // replied — the compliance thread notifies on its own, this one doesn't.
    sendApi: `${mcaAdditionalDocConversationApi(mid, gid)}?sendNotification`,
    onSent: () => void refetch(),
  });

  const conversation = data?.data?.data ?? [];

  if (isPending) return <ThreadSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      {conversation.length > 0 ? (
        <ConversationThread entries={conversation} onDownload={thread.downloadAttachment} />
      ) : (
        <EmptyThread />
      )}

      <QueryComposer thread={thread} />
    </div>
  );
}

interface TransactionQueriesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mid: string;
  gid: string;
  /** Which thread to land on — the caller knows which one prompted the visit. */
  defaultTab?: TransactionQueriesTab;
}

export function TransactionQueriesDrawer({
  open,
  onOpenChange,
  mid,
  gid,
  defaultTab = "compliance",
}: TransactionQueriesDrawerProps) {
  // Seeded once on mount, which is also once per visit: the caller mounts
  // this drawer only while a thread is open (see SettlementTimelineSection),
  // so a fresh visit is a fresh mount and defaultTab is re-read then. No
  // effect syncing it is needed, or wanted.
  const [tab, setTab] = useState<TransactionQueriesTab>(defaultTab);
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={isBottomSheet ? "bottom" : "right"}>
      {/* Wider than the transaction details drawer this opens on top of, so
          the two are visually distinct when stacked and a thread with
          attachments has room to breathe. The built-in close button is
          hidden in favour of the one in the header row below. */}
      <DrawerContent
        className={cn(
          "[&>button:last-child]:hidden",
          !isBottomSheet && "w-full sm:w-[36rem] sm:max-w-[94vw]"
        )}
      >
        <DrawerHeader className="flex shrink-0 flex-row items-center justify-between gap-2 py-3">
          <DrawerTitle className="text-[15px]">Transaction queries</DrawerTitle>
          <IconButton
            aria-label="Close"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </DrawerHeader>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as TransactionQueriesTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* pt-4 as well as pb-3: without it the tab bar sat flush against
              the header's bottom border and read as stuck to it. */}
          <div className="shrink-0 border-b border-border px-6 pb-3 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="compliance" className="flex-1">
                Compliance Queries
              </TabsTrigger>
              <TabsTrigger value="additional" className="flex-1">
                Additional Documents
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Only this region scrolls, so the tab bar and close stay reachable
              however long a thread runs. Radix unmounts the inactive tab, so
              switching away discards a half-composed reply — acceptable here,
              since each tab is a separate conversation and a message written
              for one is not meaningful in the other. Both threads' fetches
              are already warm in the cache (see SettlementTimelineSection),
              so remounting costs no request. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <TabsContent value="compliance" className="mt-0">
              <ComplianceQueriesTab mid={mid} gid={gid} />
            </TabsContent>
            <TabsContent value="additional" className="mt-0">
              <AdditionalDocumentsTab mid={mid} gid={gid} />
            </TabsContent>
          </div>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}
