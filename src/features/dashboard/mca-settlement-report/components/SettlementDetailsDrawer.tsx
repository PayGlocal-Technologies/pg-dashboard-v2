"use client";

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
import { cn, formatDate } from "@/lib/utils";
import { SettlementDetailsContent } from "@/features/dashboard/mca-settlement-report/components/SettlementDetailFeature";
import type { SettlementRow } from "@/features/dashboard/mca-settlement-report/types";

interface SettlementDetailsDrawerProps {
  row: SettlementRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the full page for the same settlement. */
  onExpand: (row: SettlementRow) => void;
  /** The merchant to fall back to when a row does not name its own — the
   *  page's resolved scope. */
  fallbackMerchantId: string;
}

/**
 * A settlement in a right-side drawer, the first stop from the table's "View
 * details". Mirrors the transactions flow: the table stays mounted underneath,
 * so filters, paging and scroll survive opening and closing it, and Expand
 * hands the same settlement off to the full page.
 */
export function SettlementDetailsDrawer({
  row,
  open,
  onOpenChange,
  onExpand,
  fallbackMerchantId,
}: SettlementDetailsDrawerProps) {
  // Below md this becomes a bottom sheet rather than a right-side drawer, via
  // flux-ui's own side="bottom", exactly as the transactions drawer does.
  //
  // A breakpoint read here cannot cause a hydration mismatch: with open=false
  // Radix renders no portal at all, so `side` has no effect on the DOM until a
  // row is clicked, which is client-only by definition.
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={isBottomSheet ? "bottom" : "right"}>
      {/* Two overrides on the shared DrawerContent, both matching the
          transactions drawer:
          - Width. The content renders single-column here, so it only needs a
            comfortable reading column, capped against the viewport. Both
            defaults (w-80 sm:w-96) have to be overridden, since sm:w-96 would
            otherwise still apply from sm up.
          - [&>button:last-child]:hidden. DrawerContent appends its own close
            button top-right; this header puts close on the left beside Expand,
            so the built-in one is hidden rather than reimplementing Drawer.
          No "relative" here: DrawerContent's base class is already `fixed`, and
          twMerge would treat "relative" as a conflicting position utility and
          silently drop it. */}
      <DrawerContent
        className={cn(
          "[&>button:last-child]:hidden",
          !isBottomSheet && "w-full sm:w-[36rem] sm:max-w-[92vw]"
        )}
      >
        <DrawerTitle asChild>
          <VisuallyHidden>Settlement details</VisuallyHidden>
        </DrawerTitle>

        {/* Close and Expand grouped on the left, the settlement's own date on
            the far right: it is this settlement's identity, so it reads as the
            drawer's subject rather than as a field. */}
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
            {/* Not rendered as a bottom sheet: there is no expanded view in the
                mobile flow, so the action would point at nothing. */}
            {!isBottomSheet && (
              <IconButton
                aria-label="Expand to full page"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (row) onExpand(row);
                }}
              >
                <Icon name="expand" className="h-4 w-4" />
              </IconButton>
            )}
          </div>
          {row && (
            <span className="ml-auto min-w-0 truncate text-[13px] text-muted-foreground">
              {formatDate(row.date, { month: "short", day: "2-digit", year: "numeric" })}
            </span>
          )}
        </DrawerHeader>

        {/* Only this region scrolls, so close and expand stay reachable however
            long the payments table runs. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {row && (
            <SettlementDetailsContent
              merchantId={row.merchantId || fallbackMerchantId}
              settlementDate={row.id}
              layout="drawer"
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
