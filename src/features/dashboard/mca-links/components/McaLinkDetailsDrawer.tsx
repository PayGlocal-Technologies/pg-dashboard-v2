"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  EmptyState,
  IconButton,
  StatusBadge,
  VisuallyHidden,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { ICONS } from "@/components/icon/registry";
import { formatCurrency, formatTransactionTimestamp } from "@/lib/utils/format";
import { getLinkStatusMeta } from "@/features/dashboard/mca-links/columns";
import type { McaLink } from "@/features/dashboard/mca-links/types";

/**
 * Placeholder for the MCA Link Details experience.
 *
 * Row click has to land somewhere, and it lands here: the same drawer shell
 * the Transaction Details drawer uses, showing the fields the table already
 * has for the row plus an explicit "not built yet" state. There is no link
 * detail endpoint yet, so nothing is fetched — swap the body for the real
 * content once the contract exists (see CLAUDE.md: confirm the endpoint and
 * payload against pg-dashboard rather than inferring them).
 */
export function McaLinkDetailsDrawer({
  row,
  open,
  onOpenChange,
}: {
  row: McaLink | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const status = row ? getLinkStatusMeta(row.status) : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* Same width and same suppression of DrawerContent's built-in
          top-right close button as TransactionDetailsDrawer, so the two
          detail surfaces open identically. */}
      <DrawerContent className="w-full sm:w-[32rem] sm:max-w-[92vw] [&>button:last-child]:hidden">
        <DrawerTitle asChild>
          <VisuallyHidden>Payment link details</VisuallyHidden>
        </DrawerTitle>

        <DrawerHeader className="flex shrink-0 items-center gap-1 py-3">
          <IconButton aria-label="Close" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {row && (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums text-foreground">
                    {formatCurrency(parseFloat(row.amount ?? "0"), row.currency ?? "USD", "en-US")}
                  </span>
                  <span className="text-[13px] font-medium text-muted-foreground">{row.currency}</span>
                </div>
                {status && (
                  <StatusBadge
                    variant={status.variant}
                    label={status.label}
                    trailIcon={status.trailIcon}
                    size="sm"
                  />
                )}
              </div>

              <dl className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-4 gap-y-2.5 text-[13px]">
                <dt className="text-muted-foreground">Invoice Number</dt>
                <dd className="text-foreground">{row.invoiceNumber || "—"}</dd>
                <dt className="text-muted-foreground">Description</dt>
                <dd className="text-foreground">{row.description || "—"}</dd>
                <dt className="text-muted-foreground">Created On</dt>
                <dd className="text-foreground">{formatTransactionTimestamp(row.createdOn)}</dd>
                <dt className="text-muted-foreground">Expires At</dt>
                <dd className="text-foreground">{formatTransactionTimestamp(row.expiresAt)}</dd>
              </dl>

              <EmptyState
                icon={ICONS.link}
                title="Link details coming soon"
                description="The full MCA Link Details view isn't available yet. Everything known about this link today is shown above."
              />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
