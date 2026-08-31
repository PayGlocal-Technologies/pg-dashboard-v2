"use client";

import type { UseMutateFunction } from "@tanstack/react-query";
import { useGet, usePut } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import {
  businessDetailsApi,
  contactDetailsApi,
  merchantProfileApi,
  secureSettlementDetailsApi,
  settlementDetailsApi,
  updateAccountDetailsApi,
} from "@/features/dashboard/settings/services";
import type {
  AccountDetailsUpdatePayload,
  BusinessData,
  BusinessDataResponse,
  BusinessUpdatePayload,
  ContactData,
  ContactDataResponse,
  MerchantProfileResponse,
  OnboardingBusinessProfile,
  SettlementData,
  SettlementDataResponse,
} from "@/features/dashboard/settings/types";

/** The onboarding id every merchant-profile settings endpoint is scoped by.
 *  pg-dashboard reads the same `profile.onboardingId`; empty string gates the
 *  queries off until it resolves. */
function useOnboardingId(): string {
  return useApp((s) => s.profile?.onboardingId) ?? "";
}

/** Business trade name + purpose codes (read). */
export function useBusinessDetails(): {
  business: BusinessData | null;
  isLoading: boolean;
  isError: boolean;
} {
  const onbId = useOnboardingId();
  const { data, isPending, isError } = useGet<BusinessDataResponse>(
    ["settings-business", onbId],
    businessDetailsApi(onbId),
    { enabled: !!onbId }
  );
  return { business: data?.data ?? null, isLoading: !!onbId && isPending, isError };
}

/** The onboarding business profile (GST, address, website, nature of business,
 *  support email/phone) from GET /merchants/{merchantId}/profile. Keyed by
 *  profile.mid. Envelope-tolerant — reads `data` or the flat body. */
export function useMerchantBusinessProfile(): {
  businessProfile: OnboardingBusinessProfile | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const merchantId = useApp((s) => s.profile?.mid) ?? "";
  const { data, isPending, isError } = useGet<MerchantProfileResponse>(
    ["settings-merchant-profile", merchantId],
    merchantProfileApi(merchantId),
    { enabled: !!merchantId }
  );
  const body = data?.data ?? data;
  return {
    businessProfile: body?.onboardingBusinessProfile ?? undefined,
    isLoading: !!merchantId && isPending,
    isError,
  };
}

/** Update the merchant's purpose codes. pg-dashboard sends `{ purposeCodes }`
 *  (plural) as plain JSON and invalidates the business read on success. */
export function useUpdateBusinessDetails(): {
  updateBusiness: UseMutateFunction<unknown, Error, BusinessUpdatePayload>;
  isSaving: boolean;
} {
  const onbId = useOnboardingId();
  const { mutate, isPending } = usePut<unknown, BusinessUpdatePayload>(businessDetailsApi(onbId), {
    invalidateQueries: [["settings-business", onbId]],
  });
  return { updateBusiness: mutate, isSaving: isPending };
}

/** Settlement account (IFSC + account number). `masked` picks which endpoint
 *  answers — the masked default, or the secure one that returns the full
 *  number, exactly as pg-dashboard's eye toggle does. Keyed on `masked` so the
 *  toggle refetches. */
export function useSettlementDetails(masked: boolean): {
  settlement: SettlementData | null;
  isLoading: boolean;
  isError: boolean;
} {
  const onbId = useOnboardingId();
  const { data, isPending, isError } = useGet<SettlementDataResponse>(
    ["settings-settlement", onbId, masked],
    masked ? settlementDetailsApi(onbId) : secureSettlementDetailsApi(onbId),
    { enabled: !!onbId }
  );
  return { settlement: data?.data ?? null, isLoading: !!onbId && isPending, isError };
}

/** The merchant id (profile.mid) the account-details update endpoint is scoped
 *  by. Distinct from the onboarding id the read endpoints use. Empty string
 *  until the profile resolves — callers gate the Save action on it. */
function useMerchantId(): string {
  return useApp((s) => s.profile?.mid) ?? "";
}

/** Update the settlement bank account (number + IFSC) via
 *  PUT /gcc/v2/merchants/{merchantId}/account-details. Plain JSON body, no JWE.
 *  Invalidates both masked/unmasked settlement reads on success so the card
 *  reflects the new account. `canEdit` is false until the merchant id resolves. */
export function useUpdateAccountDetails(): {
  updateAccount: UseMutateFunction<unknown, Error, AccountDetailsUpdatePayload>;
  isSaving: boolean;
  canEdit: boolean;
} {
  const merchantId = useMerchantId();
  const onbId = useOnboardingId();
  const { mutate, isPending } = usePut<unknown, AccountDetailsUpdatePayload>(
    updateAccountDetailsApi(merchantId),
    { invalidateQueries: [["settings-settlement", onbId]] }
  );
  return { updateAccount: mutate, isSaving: isPending, canEdit: !!merchantId };
}

/** Contact phone + email (read-only, as in pg-dashboard). */
export function useContactDetails(): {
  contact: ContactData | null;
  isLoading: boolean;
  isError: boolean;
} {
  const onbId = useOnboardingId();
  const { data, isPending, isError } = useGet<ContactDataResponse>(
    ["settings-contact", onbId],
    contactDetailsApi(onbId),
    { enabled: !!onbId }
  );
  return { contact: data?.data ?? null, isLoading: !!onbId && isPending, isError };
}
