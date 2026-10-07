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
import { ClientDetailsContent } from "@/features/dashboard/client-management/components/ClientDetailsContent";
import { ClientInvoicesSection } from "@/features/dashboard/client-management/components/ClientInvoicesSection";
import { useClientContractView } from "@/features/dashboard/client-management/hooks";
import type { Client } from "@/features/dashboard/client-management/types";

/** The drawer's width on sm+, shared with the expand/collapse hand-off. */
export const CLIENT_DRAWER_WIDTH_PX = 512;

interface ClientDetailsDrawerProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the full-page view for the same client. */
  onExpand: (client: Client) => void;
  /** Skip the slide in/out while DrawerExpandMorph covers the drawer, so it
   *  can appear or vanish under the hand-off in one frame. */
  instant?: boolean;
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
  instant = false,
}: ClientDetailsDrawerProps) {
  // A breakpoint read here can't cause a hydration mismatch: with open=false
  // Radix renders no portal and no content at all, so `side` has no effect on
  // the DOM until a row is clicked, which is client-only by definition.
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");

  // Which invoice statuses the ledger below is narrowed to. Held here rather
  // than inside the ledger so the drawer keeps the merchant's choice across a
  // re-render of the section, and so both detail views own it the same way.
  const [invoiceStatuses, setInvoiceStatuses] = useState<string[]>([]);

  return (
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
          !isBottomSheet && "w-full sm:w-[32rem] sm:max-w-[92vw]",
          instant && "data-[state=closed]:animate-none! data-[state=open]:animate-none!"
        )}
      >
        <DrawerTitle asChild>
          <VisuallyHidden>Client details</VisuallyHidden>
        </DrawerTitle>

        {client && (
          <ClientDrawerBody
            client={client}
            onClose={() => onOpenChange(false)}
            onExpand={isBottomSheet ? undefined : () => onExpand(client)}
            invoiceStatuses={invoiceStatuses}
            onInvoiceStatusesChange={setInvoiceStatuses}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * The drawer's insides: Close and Expand on the left, then the scrolling
 * details, metrics and invoice ledger. Also what the expand/collapse hand-off
 * shows in the drawer's place (see DrawerExpandMorph). No Expand when
 * `onExpand` is omitted (the mobile bottom sheet has no full page).
 */
export function ClientDrawerBody({
  client,
  onClose,
  onExpand,
  invoiceStatuses,
  onInvoiceStatusesChange,
}: {
  client: Client;
  onClose: () => void;
  onExpand?: () => void;
  invoiceStatuses: string[];
  onInvoiceStatusesChange: (next: string[]) => void;
}) {
  const { viewContract } = useClientContractView();

  return (
    <>
      {/* Close and Expand grouped together on the left, adjacent to one
        another — the same header composition, components, and sizes as the
        transaction drawer's. Nothing sits opposite them: the client id the
        transaction drawer's header counterpart shows is deliberately not
        surfaced anywhere in Client Management. */}
      <DrawerHeader className="flex shrink-0 items-center gap-2 py-3">
        <div className="flex shrink-0 items-center gap-1">
          <IconButton aria-label="Close" variant="ghost" size="sm" onClick={onClose}>
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
          {/* Not rendered at all as a bottom sheet (rather than hidden with a
            class): there is no expanded view in the mobile flow, which is
            card to sheet and back, so the action has nothing to point at
            there — same rule the transaction drawer follows. */}
          {onExpand && (
            <IconButton
              aria-label="Expand to full page"
              variant="ghost"
              size="sm"
              onClick={onExpand}
            >
              <Icon name="expand" className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      </DrawerHeader>

      {/* Only this region scrolls, so the header's close/expand stay
        reachable however long the content runs — which it does, since the
        drawer carries the metrics and the invoice ledger as well as the
        detail sections. Sections scroll rather than being dropped. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <ClientDetailsContent
          client={client}
          layout="drawer"
          onViewContract={
            client.contract?.fileId
              ? () => viewContract({ clientId: client.id, rowMid: client.mid })
              : undefined
          }
          // The invoice ledger, which is the one table this view carries —
          // production shows a client's invoices here and the invoice search
          // filters by clientId outright, so these really are this client's
          // invoices. Its own overflow-x-auto is what lets a five-column
          // table live in a 32rem column.
          ledgerSlot={
            <ClientInvoicesSection
              clientId={client.id}
              statuses={invoiceStatuses}
              onStatusesChange={onInvoiceStatusesChange}
            />
          }
        />
      </div>
    </>
  );
}
