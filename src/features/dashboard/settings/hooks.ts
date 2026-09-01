"use client";

import type { UseMutateFunction } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useGet, usePut } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import {
  businessDetailsApi,
  contactDetailsApi,
  merchantLogoUploadApi,
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
  MerchantBusinessSummary,
  MerchantLogoUploadResponse,
  MerchantProfileResponse,
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

/** The merchant business summary (GST, address, website, line of business,
 *  support contact) from GET /merchants/{merchantId}/profile. Keyed by
 *  profile.mid. Envelope-tolerant — reads `data` or the flat body. */
export function useMerchantBusinessProfile(): {
  businessProfile: MerchantBusinessSummary | undefined;
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
    businessProfile: body?.merchantBusinessSummary ?? undefined,
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

/** Upload the merchant's checkout logo via
 *  PUT /gcc/v1/merchants/{merchantId}/profile/logo (multipart/form-data, single
 *  `merchantLogo` file). The mutation body IS a FormData — the shared mutation
 *  hook detects that and sets the multipart Content-Type itself. Returns the
 *  stored public URL in the response for the caller to display. `canUpload` is
 *  false until the merchant id resolves.
 *
 *  On success it writes a cache-busted logo URL straight into the merchant
 *  profile query cache. The S3 public URL is deterministic (same path every
 *  upload), so without a changing `?v=` the browser would keep serving the old
 *  cached image; pushing the busted URL into the shared cache updates every
 *  consumer at once (this page's avatar and the sidebar footer). */
export function useUpdateMerchantLogo(): {
  uploadLogo: UseMutateFunction<MerchantLogoUploadResponse, Error, FormData>;
  isUploading: boolean;
  canUpload: boolean;
} {
  const merchantId = useMerchantId();
  const queryClient = useQueryClient();
  const { mutate, isPending } = usePut<MerchantLogoUploadResponse, FormData>(
    merchantLogoUploadApi(merchantId),
    {
      invalidateQueries: false,
      onSuccess: (res) => {
        const url = res?.data?.merchantLogoPublicUrl;
        if (!url) return;
        // Date.now() lives in this async success callback, not in render.
        const busted = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
        // setQueriesData (prefix match), NOT setQueryData: useGet stores under
        // an extended key — [...queryKey, finalUrl, headers] — so the exact key
        // here would miss the real cache entry and write a dead one. A prefix
        // filter matches whatever full key the reader actually registered.
        queryClient.setQueriesData<MerchantProfileResponse>(
          { queryKey: ["settings-merchant-profile", merchantId] },
          (old) => {
            if (!old) return old;
            // Envelope-tolerant, matching useMerchantBusinessProfile's read: the
            // summary may sit under `data` or on the flat body.
            const existing = old.data?.merchantBusinessSummary ?? old.merchantBusinessSummary;
            const nextSummary = { ...(existing ?? {}), merchantLogoPublicUrl: busted };
            return old.data
              ? { ...old, data: { ...old.data, merchantBusinessSummary: nextSummary } }
              : { ...old, merchantBusinessSummary: nextSummary };
          }
        );
      },
    }
  );
  return { uploadLogo: mutate, isUploading: isPending, canUpload: !!merchantId };
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
