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
import { cn } from "@/lib/utils";
import { CopyableText } from "@/components/common/CopyableText";
import { SettlementDetailsContent } from "@/features/dashboard/settlement-reports/components/SettlementDetailsContent";
import type { SettlementRow } from "@/features/dashboard/settlement-reports/types";

/** The drawer's width on sm+, shared with the expand/collapse hand-off. */
export const SETTLEMENT_DRAWER_WIDTH_PX = 512;

/**
 * The collapsed view of a settlement: a right-side drawer over the list, the
 * same build as a transaction's (Close and Expand on the left, the settlement
 * ID on the right, only the body scrolls). Below md it is a bottom sheet with
 * no Expand.
 */
export function SettlementDetailsDrawer({
  settlement,
  open,
  onOpenChange,
  onExpand,
  onDownload,
  instant = false,
}: {
  settlement: SettlementRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpand: () => void;
  onDownload: () => void;
  /** Skip the slide in/out while DrawerExpandMorph covers the drawer. */
  instant?: boolean;
}) {
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={isBottomSheet ? "bottom" : "right"}>
      <DrawerContent
        className={cn(
          "[&>button:last-child]:hidden",
          !isBottomSheet && "w-full sm:w-[32rem] sm:max-w-[92vw]",
          instant && "data-[state=closed]:animate-none! data-[state=open]:animate-none!"
        )}
      >
        <DrawerTitle asChild>
          <VisuallyHidden>Settlement details</VisuallyHidden>
        </DrawerTitle>
        {settlement && (
          <SettlementDrawerBody
            settlement={settlement}
            onClose={() => onOpenChange(false)}
            onExpand={isBottomSheet ? undefined : onExpand}
            onDownload={onDownload}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** The drawer's inside, shared with the expand/collapse hand-off. */
export function SettlementDrawerBody({
  settlement,
  onClose,
  onExpand,
  onDownload,
}: {
  settlement: SettlementRow;
  onClose?: () => void;
  onExpand?: () => void;
  onDownload?: () => void;
}) {
  return (
    <>
      <DrawerHeader className="flex shrink-0 items-center gap-2 py-3">
        <div className="flex shrink-0 items-center gap-1">
          <IconButton aria-label="Close" variant="ghost" size="sm" onClick={onClose}>
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
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
        {settlement.settlementId && (
          <CopyableText
            value={settlement.settlementId}
            valueClassName="min-w-0 truncate text-muted-foreground"
            className="ml-auto min-w-0"
          />
        )}
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <SettlementDetailsContent
          settlement={settlement}
          layout="drawer"
          onDownload={onDownload}
          onViewAllPayments={onExpand}
        />
      </div>
    </>
  );
}
