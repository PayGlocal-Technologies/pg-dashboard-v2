"use client";

import { useEffect, useState } from "react";
import type { UseMutateFunction } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useGet, usePost, usePut } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { getPublicKey } from "@/features/auth/helpers";
import { useEncryptPayload, type EncryptedPayload } from "@/features/auth/hooks";
import { EMAIL_CHANGE_COMPLETED_STATUS } from "@/features/dashboard/settings/constants";
import {
  businessDetailsApi,
  contactDetailsApi,
  initiateEmailChangeApi,
  merchantLogoUploadApi,
  merchantProfileApi,
  purposeCodeOptionsApi,
  resendNewEmailOtpApi,
  resendOldEmailOtpApi,
  secureSettlementDetailsApi,
  sendNewEmailOtpApi,
  settlementDetailsApi,
  updateAccountDetailsApi,
  verifyNewEmailApi,
  verifyOldEmailApi,
} from "@/features/dashboard/settings/services";
import {
  allPurposeCodeOptions,
  getPurposeCodeDescription,
  type PurposeCodeOption,
} from "@/lib/purposeCodes";
import type {
  AccountDetailsUpdatePayload,
  BusinessData,
  BusinessDataResponse,
  BusinessUpdatePayload,
  ChangeEmailCommit,
  ChangeEmailResponse,
  ContactData,
  ContactDataResponse,
  MerchantBusinessSummary,
  MerchantLogoUploadResponse,
  MerchantProfileResponse,
  PurposeCodesResponse,
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

/**
 * The purpose codes this merchant may pick from, for the Business details
 * selector.
 *
 * `possiblePurposeCodes` off the banner endpoint is the merchant's own
 * narrowed list (code -> description), the same source pg-dashboard's
 * tid-management AddProduct builds its dropdown from. When the API returns
 * nothing the full static RBI table stands in, so the field is never empty.
 *
 * `extraCodes` are codes the merchant already has saved. They are folded in
 * even when the API does not offer them, so an account configured before this
 * list narrowed can still see and re-select what it is currently on rather
 * than facing a dropdown its own value is missing from.
 */
export function usePurposeCodeOptions(extraCodes: string[] = []): {
  options: PurposeCodeOption[];
  isLoading: boolean;
} {
  const onbId = useOnboardingId();
  const { data, isPending } = useGet<PurposeCodesResponse>(
    ["settings-purpose-codes", onbId],
    purposeCodeOptionsApi(onbId),
    { enabled: !!onbId }
  );

  // `known` is the running dedupe set across both sources. The API's own map
  // can still collide once codes are upper-cased (a "p0103"/"P0103" pair), and
  // extraCodes may repeat a code the API already offers or repeat itself, so
  // every candidate goes through the same gate. A duplicate in the option list
  // means a repeated row in the dropdown and a duplicate React key.
  const known = new Set<string>();
  const add = (list: PurposeCodeOption[], option: PurposeCodeOption): void => {
    if (!option.code || known.has(option.code)) return;
    known.add(option.code);
    list.push(option);
  };

  const possible = data?.data?.possiblePurposeCodes;
  const fromApi: PurposeCodeOption[] = [];
  if (possible) {
    for (const [code, description] of Object.entries(possible)) {
      add(fromApi, {
        code: code.trim().toUpperCase(),
        description: description || getPurposeCodeDescription(code),
      });
    }
  } else {
    for (const option of allPurposeCodeOptions()) add(fromApi, option);
  }

  // The merchant's saved codes go first so whatever the account is currently on
  // is the first thing in the list.
  const missing: PurposeCodeOption[] = [];
  for (const raw of extraCodes) {
    const code = raw.trim().toUpperCase();
    add(missing, { code, description: getPurposeCodeDescription(code) });
  }

  return { options: [...missing, ...fromApi], isLoading: !!onbId && isPending };
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

/** The six change-email steps, in order. Each resolves with the server's own
 *  message and rejects with the server envelope — see parseChangeEmailFailure.
 *  Step 4 also reports whether the change actually committed. */
export interface ChangeEmailSteps {
  initiate: () => Promise<string>;
  verifyOld: (otp: string) => Promise<string>;
  sendNewOtp: (newEmail: string) => Promise<string>;
  verifyNew: (otp: string, newEmail: string) => Promise<ChangeEmailCommit>;
  resendOld: () => Promise<string>;
  resendNew: (newEmail: string) => Promise<string>;
}

/**
 * Whether the payload-encryption key is available yet.
 *
 * It has to be asked for here, because nothing on the dashboard side fetches
 * it: getPublicKey runs in the (auth) layout only, and useApp is in-memory with
 * no persistence — so on any dashboard page reached by a refresh or a direct
 * link, publicKey is null. useEncryptPayload answers that by falling back to
 * `isEnc: "false"` with the fields in the clear, which is exactly what this
 * flow must not do with an OTP. So the dialog waits on "ready" before its first
 * call and refuses to start on "failed", rather than quietly sending plaintext.
 */
export function useEncryptionReady(): "pending" | "ready" | "failed" {
  const publicKey = useApp((s) => s.publicKey);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (publicKey) return;
    let cancelled = false;
    // getPublicKey swallows its own failures and leaves publicKey null, so the
    // only way to tell "still fetching" from "gave up" is to look afterwards.
    void getPublicKey().then(() => {
      if (!cancelled && !useApp.getState().publicKey) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  if (publicKey) return "ready";
  return failed ? "failed" : "pending";
}

/**
 * The change-email wizard's data layer: one mutation per endpoint, exposed as
 * plain async functions so the dialog stays a state machine and never touches
 * react-query or the encryption helper directly.
 *
 * Every call goes up inside the app-wide isEnc envelope, the same one the login
 * screens use — the plaintext fields are JWE-encrypted into `payload`. Callers
 * must gate the first call on useEncryptionReady; without the key,
 * useEncryptPayload silently sends the fields in the clear.
 *
 * Automatic invalidation is off on all six. These calls move server-side flow
 * state, not cached reads, and the default (invalidate everything) would fire a
 * refetch of every mounted query on each step of the wizard. The one read that
 * genuinely goes stale is the contact details, and step 4 invalidates that by
 * hand once the change has actually committed.
 */
export function useChangeEmail(): ChangeEmailSteps {
  const encryptPayload = useEncryptPayload();
  const queryClient = useQueryClient();
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const noInvalidation = { invalidateQueries: false as const };

  const initiate = usePost<ChangeEmailResponse, EncryptedPayload>(
    initiateEmailChangeApi,
    noInvalidation
  );
  const verifyOld = usePost<ChangeEmailResponse, EncryptedPayload>(
    verifyOldEmailApi,
    noInvalidation
  );
  const sendNewOtp = usePost<ChangeEmailResponse, EncryptedPayload>(
    sendNewEmailOtpApi,
    noInvalidation
  );
  const verifyNew = usePost<ChangeEmailResponse, EncryptedPayload>(
    verifyNewEmailApi,
    noInvalidation
  );
  const resendOld = usePost<ChangeEmailResponse, EncryptedPayload>(
    resendOldEmailOtpApi,
    noInvalidation
  );
  const resendNew = usePost<ChangeEmailResponse, EncryptedPayload>(
    resendNewEmailOtpApi,
    noInvalidation
  );

  /** The merchant now stays signed in, so anything already on screen that shows
   *  the old address has to be corrected: the Personal details row reads the
   *  /contact query, and useApp.profile.emailId is read elsewhere (the
   *  multi-currency share modal) and has no refetch of its own. */
  const adoptNewEmail = (newEmail: string): void => {
    void queryClient.invalidateQueries({ queryKey: ["settings-contact"] });
    if (profile) setProfile({ ...profile, emailId: newEmail });
  };

  return {
    initiate: async () => (await initiate.mutateAsync(await encryptPayload({}))).message ?? "",
    verifyOld: async (otp) =>
      (await verifyOld.mutateAsync(await encryptPayload({ otp }))).message ?? "",
    sendNewOtp: async (newEmail) =>
      (await sendNewOtp.mutateAsync(await encryptPayload({ newEmail }))).message ?? "",
    // newEmail goes up again alongside the code, carried forward from step 3.
    verifyNew: async (otp, newEmail) => {
      const res = await verifyNew.mutateAsync(await encryptPayload({ otp, newEmail }));
      // A 2xx is not the confirmation — this status is. Anything else means the
      // email did not change, so the dialog must not claim it did.
      const committed = res.status === EMAIL_CHANGE_COMPLETED_STATUS;
      if (committed) adoptNewEmail(newEmail);
      return { message: res.message ?? "", committed };
    },
    resendOld: async () => (await resendOld.mutateAsync(await encryptPayload({}))).message ?? "",
    resendNew: async (newEmail) =>
      (await resendNew.mutateAsync(await encryptPayload({ newEmail }))).message ?? "",
  };
}
