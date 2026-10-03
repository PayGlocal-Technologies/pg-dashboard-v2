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
import { PartnerDealDetailContent } from "@/features/dashboard/partner-deals/components/detail/PartnerDealDetail";
import type { Deal } from "@/features/dashboard/partner-deals/types";

/**
 * A deal's details in a right-side drawer, the same build as Transaction
 * Details: Close and Expand together on the left, the deal ID on the right,
 * only the body scrolls. Below md it is a bottom sheet with no Expand, since
 * there is no full-page view in the mobile flow.
 */
export function PartnerDealDrawer({
  deal,
  open,
  onOpenChange,
  onExpand,
  instant = false,
}: {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpand: (deal: Deal) => void;
  /** Skip the slide in/out: set while DealMorphLayer covers the drawer for
   *  the expand/collapse hand-off, so the drawer can appear or vanish under
   *  it in one frame instead of sliding the wrong way. */
  instant?: boolean;
}) {
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={isBottomSheet ? "bottom" : "right"}>
      {/* Its own built-in top-right close is hidden: Close sits on the left
          with Expand, as on Transaction Details. Width overrides both of the
          default's classes, and only for the right-side drawer. */}
      <DrawerContent
        className={cn(
          "[&>button:last-child]:hidden",
          !isBottomSheet && "w-full sm:w-[32rem] sm:max-w-[92vw]",
          instant && "data-[state=closed]:animate-none! data-[state=open]:animate-none!"
        )}
      >
        <DrawerTitle asChild>
          <VisuallyHidden>Deal details</VisuallyHidden>
        </DrawerTitle>

        {deal && (
          <PartnerDealDrawerBody
            deal={deal}
            onClose={() => onOpenChange(false)}
            onExpand={isBottomSheet ? undefined : () => onExpand(deal)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * The drawer's inside: Close and Expand on the left, the deal ID on the
 * right, then the scrolling body. Shared with DealMorphLayer, which draws
 * this same block inside the expanding/collapsing panel so the hand-off
 * shows the real content in the real place rather than an empty surface.
 */
export function PartnerDealDrawerBody({
  deal,
  onClose,
  onExpand,
}: {
  deal: Deal;
  onClose?: () => void;
  /** Omitted as a bottom sheet, where there is no full-page view. */
  onExpand?: () => void;
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
        <CopyableText
          value={deal.dealId}
          valueClassName="min-w-0 truncate font-mono text-muted-foreground"
          className="ml-auto min-w-0"
        />
      </DrawerHeader>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <PartnerDealDetailContent deal={deal} layout="drawer" />
      </div>
    </>
  );
}
