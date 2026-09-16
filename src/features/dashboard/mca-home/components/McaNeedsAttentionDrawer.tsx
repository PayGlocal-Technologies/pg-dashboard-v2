"use client";

import {
  Button,
  Card,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  Shimmer,
  StatusBadge,
  useBreakpoint,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { useNeedsAttention } from "@/features/dashboard/mca-home/hooks";
import {
  attentionMeta,
  formatCurrencyCode,
  formatDueDate,
  TONE_TEXT_CLASS,
} from "@/features/dashboard/mca-home/needs-attention";
import type { NeedsAttentionInvoice } from "@/features/dashboard/mca-home/types";

interface McaNeedsAttentionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the invoice's id — the details route's own path segment. */
  onOpenInvoice: (id: string) => void;
}

function RowSkeleton() {
  return (
    <Card className="flex-row items-center justify-between gap-3 p-4 shadow-none">
      <div className="min-w-0 space-y-2">
        <Shimmer className="h-4 w-44" />
        <Shimmer className="h-3 w-32" />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-8 w-20" />
      </div>
    </Card>
  );
}

/**
 * One invoice, in the drawer's roomier density: everything the card shows plus
 * the due date and the client's registered business name, which the card has no
 * width for.
 */
function AttentionRow({ invoice, onOpen }: { invoice: NeedsAttentionInvoice; onOpen: () => void }) {
  const meta = attentionMeta(invoice);
  // The card's business name is the fuller "Nordic Solutions AB" against a
  // display name of "Nordic Solutions"; when the two match there is nothing to
  // add, so it is dropped rather than printed twice.
  const businessName =
    invoice.clientBusinessName && invoice.clientBusinessName !== invoice.clientName
      ? invoice.clientBusinessName
      : "";

  return (
    <Card className="gap-3 p-4 shadow-none sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[13.5px] font-semibold text-foreground">
            {invoice.clientName}
          </p>
          <StatusBadge variant={meta.tone} label={meta.label} size="sm" />
        </div>
        {businessName && (
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{businessName}</p>
        )}
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">
          {invoice.invoiceNumber} · Due {formatDueDate(invoice.dueDate)}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
        <p className={cn("text-[15px] font-bold tabular-nums", TONE_TEXT_CLASS[meta.tone])}>
          {formatCurrencyCode(invoice.totalAmount, invoice.currency)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpen}
          rightIcon={<Icon name="arrow-up-right" className="h-3 w-3" />}
        >
          {meta.actionLabel}
        </Button>
      </div>
    </Card>
  );
}

/**
 * Every invoice needing the merchant's attention, behind the Needs attention
 * card's "View all" — the rest of the list the card previews its first two of.
 *
 * One flat run, in the order the response gave (overdue first, then due soon,
 * each by due date). Nothing is regrouped here: the endpoint's order already
 * puts the most urgent first, and each row carries its own status badge.
 *
 * Reads the same unlimited query as the card, so opening this makes no request
 * of its own.
 */
export function McaNeedsAttentionDrawer({
  open,
  onOpenChange,
  onOpenInvoice,
}: McaNeedsAttentionDrawerProps) {
  const { invoices, totalCount, isLoading, isError } = useNeedsAttention();
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");

  // `totalCount` is what the endpoint reports for the whole list; with no limit
  // sent the rows are that list, so the fallback only matters mid-flight.
  const count = totalCount || invoices.length;

  const openAndClose = (id: string) => {
    onOpenChange(false);
    onOpenInvoice(id);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={isBottomSheet ? "bottom" : "right"}>
      {/* The built-in close button is hidden in favour of the one in the header
          row, matching the product's other drawers. */}
      <DrawerContent
        className={cn(
          "[&>button:last-child]:hidden",
          !isBottomSheet && "w-full sm:w-[32rem] sm:max-w-[94vw]"
        )}
      >
        <DrawerHeader className="flex shrink-0 flex-row items-center justify-between gap-2 py-3">
          <div className="min-w-0">
            <DrawerTitle className="text-[15px]">Needs attention</DrawerTitle>
            {!isLoading && !isError && count > 0 && (
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                {count} {count === 1 ? "invoice" : "invoices"} overdue or due soon
              </p>
            )}
          </div>
          <IconButton
            aria-label="Close"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </DrawerHeader>

        {/* Only this region scrolls, so the header and close stay reachable
            however long the list runs. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <RowSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <PlaceholderState
              variant="error"
              size="md"
              title="Couldn't load"
              description="Invoices needing attention didn't load. Please try again."
            />
          ) : invoices.length === 0 ? (
            <PlaceholderState
              variant="no-overdue-invoices"
              size="md"
              title="You're all caught up"
              description="No invoices need your attention right now."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {invoices.map((invoice) => (
                <AttentionRow
                  key={invoice.id}
                  invoice={invoice}
                  onOpen={() => openAndClose(invoice.id)}
                />
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
