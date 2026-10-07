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
import { truncateMiddle } from "@/lib/utils/format";
import {
  DisputeDetailView,
  type DisputeFlow,
} from "@/features/dashboard/pa-transactions/components/DisputeDetailFeature";
import type { DisputeEvent } from "@/features/dashboard/pa-transactions/financial/types";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

/**
 * The collapsed view of a dispute: a right-side drawer over the list, built
 * like the Transactions drawer (Close and Expand on the left, the dispute ID
 * on the right, only the body scrolls). Below md it is a bottom sheet with
 * no Expand, as there is no full-page view in the mobile flow.
 */
export function DisputeDetailsDrawer({
  transaction,
  dispute,
  flow,
  open,
  onOpenChange,
  onExpand,
  instant = false,
}: {
  transaction: PaTransaction | undefined;
  dispute: DisputeEvent | undefined;
  flow: DisputeFlow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpand: () => void;
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
          <VisuallyHidden>Dispute details</VisuallyHidden>
        </DrawerTitle>
        {transaction && dispute && (
          <DisputeDrawerBody
            transaction={transaction}
            dispute={dispute}
            flow={flow}
            onClose={() => onOpenChange(false)}
            onExpand={isBottomSheet ? undefined : onExpand}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** The drawer's inside, shared with the expand/collapse hand-off so the
 *  moving panel shows the real content in the real place. */
export function DisputeDrawerBody({
  transaction,
  dispute,
  flow,
  onClose,
  onExpand,
}: {
  transaction: PaTransaction;
  dispute: DisputeEvent;
  flow: DisputeFlow;
  onClose?: () => void;
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
          value={dispute.id}
          displayValue={truncateMiddle(dispute.id, 10, 6)}
          valueClassName="min-w-0 truncate text-muted-foreground"
          className="ml-auto min-w-0"
        />
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-6 [&_.shadow-sm]:shadow-none">
        <DisputeDetailView
          transaction={transaction}
          dispute={dispute}
          flow={flow}
          layout="drawer"
        />
      </div>
    </>
  );
}
