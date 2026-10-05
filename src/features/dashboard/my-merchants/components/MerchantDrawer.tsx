"use client";

import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  VisuallyHidden,
  useBreakpoint,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { cn } from "@/lib/utils";
import {
  AttentionSection,
  MerchantIdentity,
  OnboardingSection,
} from "@/features/dashboard/my-merchants/components/MerchantSections";
import type { PartnerMerchant } from "@/features/dashboard/my-merchants/types";

/** The drawer's width on sm+, shared with the expand/collapse hand-off. */
export const MERCHANT_DRAWER_WIDTH_PX = 512;

/**
 * Quick inspection of one merchant: who they are, what needs attention and
 * how far onboarding has got. Deliberately not the whole journey; "View full
 * details" opens the full page for that. Same build as the MCA and PA
 * transaction drawers (Close and Expand on the left, the ID on the right).
 */
export function MerchantDrawer({
  merchant,
  open,
  onOpenChange,
  onExpand,
  nowMs,
  instant = false,
}: {
  merchant: PartnerMerchant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpand: () => void;
  nowMs: number;
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
          <VisuallyHidden>
            {merchant ? `${merchant.name} details` : "Merchant details"}
          </VisuallyHidden>
        </DrawerTitle>
        {merchant && (
          <MerchantDrawerBody
            merchant={merchant}
            nowMs={nowMs}
            onClose={() => onOpenChange(false)}
            onExpand={onExpand}
            canExpand={!isBottomSheet}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** The drawer's inside, shared with the expand/collapse hand-off. */
export function MerchantDrawerBody({
  merchant,
  nowMs,
  onClose,
  onExpand,
  canExpand = true,
}: {
  merchant: PartnerMerchant;
  nowMs: number;
  onClose?: () => void;
  onExpand?: () => void;
  canExpand?: boolean;
}) {
  return (
    <>
      <DrawerHeader className="flex shrink-0 items-center gap-2 py-3">
        <div className="flex shrink-0 items-center gap-1">
          <IconButton aria-label="Close" variant="ghost" size="sm" onClick={onClose}>
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
          {canExpand && (
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
          value={merchant.onboardingId}
          valueClassName="min-w-0 truncate text-muted-foreground"
          className="ml-auto min-w-0"
        />
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-5">
          <MerchantIdentity merchant={merchant} layout="drawer" />
          <AttentionSection merchant={merchant} nowMs={nowMs} />
          <OnboardingSection merchant={merchant} />
          {canExpand && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              rightIcon={<Icon name="chevron-right" className="h-3.5 w-3.5" />}
              onClick={onExpand}
              className="self-start shadow-none"
            >
              View full details
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
