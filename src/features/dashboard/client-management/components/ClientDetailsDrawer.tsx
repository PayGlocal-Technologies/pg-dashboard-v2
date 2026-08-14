"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  VisuallyHidden,
  useBreakpoint,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useApp } from "@/stores/useApp";
import { ClientDetailsContent } from "@/features/dashboard/client-management/components/ClientDetailsContent";
import { ClientTransactionsSection } from "@/features/dashboard/client-management/components/ClientTransactionsSection";
import { TransactionDetailsDrawer } from "@/features/dashboard/transactions/components/TransactionDetailsDrawer";
import { clientTransactions } from "@/features/dashboard/client-management/mock-data";
import type { Client } from "@/features/dashboard/client-management/types";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

interface ClientDetailsDrawerProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the full-page view for the same client. */
  onExpand: (client: Client) => void;
  /**
   * Expand, pressed on a transaction opened from this drawer's own
   * transactions table. There is no way to show a full-page transaction from
   * inside a drawer, so this hands off upwards: the client expands to its full
   * page and that transaction opens expanded there. Keeps the existing
   * Transaction Details drawer untouched — it always offers Expand, and this
   * gives that action a real destination.
   */
  onExpandTransaction: (client: Client, transaction: McaTransaction) => void;
}

/**
 * The client details view a row click opens — the same drawer the Transactions
 * page uses, down to the component, header arrangement, and breakpoint
 * behaviour, with client sections in place of transaction ones. Nothing about
 * the interaction is new here: flux-ui's Drawer supplies the overlay, the blur,
 * the slide-in, and the square outer corners, and side="bottom" below md turns
 * it into the same bottom sheet transactions already use.
 */
export function ClientDetailsDrawer({
  client,
  open,
  onOpenChange,
  onExpand,
  onExpandTransaction,
}: ClientDetailsDrawerProps) {
  const isPartnerUser = useApp((s) => s.isPartnerUser);

  // A breakpoint read here can't cause a hydration mismatch: with open=false
  // Radix renders no portal and no content at all, so `side` has no effect on
  // the DOM until a row is clicked, which is client-only by definition.
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");

  // The transaction opened from this drawer's own transactions table. The
  // existing Transaction Details drawer is rendered as a sibling below, so it
  // stacks above this one (both portal; the later mount paints on top) and
  // closing it leaves this drawer exactly as it was.
  const [txnId, setTxnId] = useState<string | null>(null);
  const [txnDrawerOpen, setTxnDrawerOpen] = useState(false);
  const [resolvedFeedbackIds, setResolvedFeedbackIds] = useState<Set<string>>(() => new Set());

  const txnRow = client
    ? (clientTransactions(client.businessName).find((t) => t.gid === txnId) ?? null)
    : null;

  const openTransaction = (row: McaTransaction) => {
    setTxnId(row.gid);
    setTxnDrawerOpen(true);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} side={isBottomSheet ? "bottom" : "right"}>
        {/* Two overrides, both matching TransactionDetailsDrawer's own:
          - Width. The content renders single-column here (see the "drawer"
            layout passed to ClientDetailsContent below), so it needs only a
            comfortable single reading column. Both of the default's classes
            (w-80 sm:w-96) have to be overridden, since sm:w-96 would otherwise
            still apply from sm up; capped against the viewport so it never
            exceeds it on narrow screens. Applied to the right-side drawer
            only: as a bottom sheet the content already spans the full width
            via side="bottom"'s own inset-x-0/w-full.
          - [&>button:last-child]:hidden. DrawerContent always appends its own
            close button pinned to the top-right corner; this header puts close
            on the far left (with Expand beside it), so the built-in one is
            hidden rather than the drawer reimplemented to omit it.
          No "relative" here: DrawerContent's base class is already `fixed`,
          and cn()/twMerge treats "relative" as a conflicting position utility,
          silently dropping it. */}
        <DrawerContent
          className={cn(
            "[&>button:last-child]:hidden",
            !isBottomSheet && "w-full sm:w-[32rem] sm:max-w-[92vw]"
          )}
        >
          <DrawerTitle asChild>
            <VisuallyHidden>Client details</VisuallyHidden>
          </DrawerTitle>

          {/* Close and Expand grouped together on the left, adjacent to one
            another — the same header composition, components, and sizes as the
            transaction drawer's. Nothing sits opposite them: the client id the
            transaction drawer's header counterpart shows is deliberately not
            surfaced anywhere in Client Management. */}
          <DrawerHeader className="flex shrink-0 items-center gap-2 py-3">
            <div className="flex shrink-0 items-center gap-1">
              <IconButton
                aria-label="Close"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <Icon name="x" className="h-4 w-4" />
              </IconButton>
              {/* Not rendered at all as a bottom sheet (rather than hidden with a
                class): there is no expanded view in the mobile flow, which is
                card to sheet and back, so the action has nothing to point at
                there — same rule the transaction drawer follows. */}
              {!isBottomSheet && (
                <IconButton
                  aria-label="Expand to full page"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (client) onExpand(client);
                  }}
                >
                  <Icon name="expand" className="h-4 w-4" />
                </IconButton>
              )}
            </div>
          </DrawerHeader>

          {/* Only this region scrolls, so the header's close/expand stay
            reachable however long the content runs — which it now does, since
            the drawer carries the metrics and the transactions table as well
            as the two detail sections. Sections scroll rather than being
            dropped. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {client && (
              <ClientDetailsContent
                client={client}
                layout="drawer"
                transactionsSlot={
                  <ClientTransactionsSection
                    businessName={client.businessName}
                    isPartnerUser={isPartnerUser}
                    onOpenTransaction={openTransaction}
                  />
                }
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* The existing Transaction Details drawer, unchanged and rendered as a
        sibling of this one rather than inside it, so it overlays this drawer
        instead of being clipped by its scroll container. */}
      <TransactionDetailsDrawer
        row={txnRow}
        open={txnDrawerOpen}
        onOpenChange={setTxnDrawerOpen}
        onExpand={(row) => {
          setTxnDrawerOpen(false);
          if (client) onExpandTransaction(client, row);
        }}
        onOpenTransaction={openTransaction}
        isPartnerUser={isPartnerUser}
        resolvedFeedbackIds={resolvedFeedbackIds}
        onFeedbackResolved={(gid) => setResolvedFeedbackIds((prev) => new Set(prev).add(gid))}
      />
    </>
  );
}
