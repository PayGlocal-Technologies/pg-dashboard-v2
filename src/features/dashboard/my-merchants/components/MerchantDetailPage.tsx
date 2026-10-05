"use client";

import { Button, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  ActivitySection,
  AttentionSection,
  MerchantDetailsSection,
  MerchantIdentity,
  OnboardingSection,
} from "@/features/dashboard/my-merchants/components/MerchantSections";
import type { PartnerMerchant } from "@/features/dashboard/my-merchants/types";

/**
 * The merchant workspace, in place of the list (the MCA details-page
 * pattern): identity and actions across the top, then what to do now, the
 * onboarding stages and the activity on the left, beside the merchant's
 * details in a column that stays put while the left scrolls. One column
 * below lg, in the same order.
 */
export function MerchantDetailPage({
  merchant,
  nowMs,
  onBack,
  onCollapse,
}: {
  merchant: PartnerMerchant;
  nowMs: number;
  onBack: () => void;
  /** Only when opened from the drawer; a direct link has none to return to. */
  onCollapse?: () => void;
}) {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-4 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
          onClick={onBack}
          className="pl-0 text-primary hover:text-primary-hover"
        >
          Back to Merchant Activation
        </Button>
        {onCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="shrink" className="h-4 w-4" />}
            onClick={onCollapse}
            className="text-muted-foreground hover:text-foreground"
          >
            Collapse
          </Button>
        )}
      </div>

      <div className="space-y-5">
        <MerchantIdentity merchant={merchant} layout="page" />
        <Separator />
        <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <AttentionSection merchant={merchant} nowMs={nowMs} />
            <OnboardingSection merchant={merchant} />
            <ActivitySection merchant={merchant} />
          </div>
          <div className="min-w-0 lg:sticky lg:top-4">
            <MerchantDetailsSection merchant={merchant} />
          </div>
        </div>
      </div>
    </div>
  );
}
