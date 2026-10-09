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
  DisputeDetailPlaceholder,
  DisputeDetailView,
  type DisputeFlow,
} from "@/features/dashboard/dispute-management/components/detail/DisputeDetailView";
import type { DisputeCase } from "@/features/dashboard/dispute-management/types";

/**
 * The collapsed view of a dispute: a right-side drawer over the list, built
 * like the Transactions drawer (Close and Expand on the left, the dispute ID
 * on the right, only the body scrolls). Below md it is a bottom sheet with
 * no Expand, as there is no full-page view in the mobile flow.
 */
export function DisputeDetailsDrawer({
  cbId,
  dispute,
  isLoading,
  flow,
  open,
  onOpenChange,
  onExpand,
  instant = false,
  onOpenTransaction,
}: {
  /** The selected dispute's ID, for the header while its details load. */
  cbId: string;
  dispute: DisputeCase | null;
  isLoading: boolean;
  flow: DisputeFlow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpand: () => void;
  /** Skip the slide in/out while DrawerExpandMorph covers the drawer. */
  instant?: boolean;
  /** Opens the dispute's transaction (gid, mid). */
  onOpenTransaction?: (gid: string, mid: string) => void;
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
        {cbId && (
          <DisputeDrawerBody
            cbId={cbId}
            dispute={dispute}
            isLoading={isLoading}
            flow={flow}
            onClose={() => onOpenChange(false)}
            onOpenTransaction={onOpenTransaction}
            // Nothing to expand until the case has loaded.
            onExpand={isBottomSheet || !dispute ? undefined : onExpand}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** The drawer's inside, shared with the expand/collapse hand-off so the
 *  moving panel shows the real content in the real place. */
export function DisputeDrawerBody({
  cbId,
  dispute,
  isLoading = false,
  flow,
  onClose,
  onExpand,
  onOpenTransaction,
}: {
  cbId: string;
  dispute: DisputeCase | null;
  isLoading?: boolean;
  flow: DisputeFlow;
  onClose?: () => void;
  onExpand?: () => void;
  onOpenTransaction?: (gid: string, mid: string) => void;
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
          value={cbId}
          displayValue={truncateMiddle(cbId, 10, 6)}
          valueClassName="min-w-0 truncate text-muted-foreground"
          className="ml-auto min-w-0"
        />
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-6 [&_.shadow-sm]:shadow-none">
        {dispute ? (
          <DisputeDetailView
            dispute={dispute}
            flow={flow}
            layout="drawer"
            onOpenTransaction={onOpenTransaction}
          />
        ) : (
          <DisputeDetailPlaceholder isLoading={isLoading} layout="drawer" />
        )}
      </div>
    </>
  );
}
