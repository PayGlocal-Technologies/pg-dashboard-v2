"use client";

import { toast } from "sonner";
import { MOCK_PARTNER_MERCHANTS } from "@/features/dashboard/my-merchants/mock-data";
import type { MerchantActionKind, PartnerMerchant } from "@/features/dashboard/my-merchants/types";

/** MOCK data hook, in the shape a real query would return.
 *  TODO(integration): the My Merchants list endpoint (see types.ts). */
export function usePartnerMerchants(): {
  data: PartnerMerchant[];
  isLoading: boolean;
  isError: boolean;
} {
  return { data: MOCK_PARTNER_MERCHANTS, isLoading: false, isError: false };
}

/** One merchant by onboarding ID, for the direct full-page route.
 *  TODO(integration): the My Merchants detail endpoint. */
export function usePartnerMerchant(onboardingId: string): {
  data: PartnerMerchant | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const data = MOCK_PARTNER_MERCHANTS.find((m) => m.onboardingId === onboardingId);
  return { data, isLoading: false, isError: false };
}

/**
 * The partner's actions on a merchant. MOCK: each only confirms with a toast.
 * TODO(integration): send-reminder / resend-invite endpoints and the
 * assisted-onboarding verification flow, confirmed against pg-dashboard.
 */
export function useMerchantActions() {
  return (kind: MerchantActionKind, merchant: PartnerMerchant) => {
    switch (kind) {
      case "send-reminder":
        toast.success(`Reminder sent to ${merchant.name}`, {
          description: "They'll get an email and SMS with a link to continue.",
        });
        return;
      case "resend-invite":
        toast.success(`Invite sent again to ${merchant.name}`);
        return;
      case "complete-verification":
        toast.info("Verification opens in assisted onboarding", {
          description: "Not connected in this preview yet.",
        });
        return;
    }
  };
}
