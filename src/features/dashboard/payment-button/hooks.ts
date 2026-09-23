"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useGet, usePostQuery, usePut } from "@/lib/api/hooks";
import { api } from "@/lib/api/axios";
import { handleApiError } from "@/lib/api/handleApiError";
import { isFeatureAvailableForMid } from "@/lib/hooks/useFeatureApplicable";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  deactivatePaymentButtonApi,
  downloadPaymentButtonApi,
  paymentButtonSearchApi,
  merchantCurrencyApi,
  merchantProfileApi,
} from "@/features/dashboard/payment-button/services";
import {
  buildLiveEmbedLines,
  copyEmbedCode,
  embedLinesToText,
  mapWqrEntry,
} from "@/features/dashboard/payment-button/helpers";
import {
  DEFAULT_BUTTON_CURRENCY,
  PAYMENT_BUTTONS_FEATURE,
} from "@/features/dashboard/payment-button/constants";
import type {
  CreatePaymentButtonResponse,
  CurrencyEnableResponse,
  MerchantProfileResponse,
  PaymentButton,
  PaymentButtonListRequest,
  PaymentButtonListResponse,
} from "@/features/dashboard/payment-button/types";

/**
 * Whether the merchant has the payment buttons product at all:
 * `merchantEnabledProducts.paymentProducts` includes PAYMENT_BUTTONS, the check
 * pg-dashboard makes before rendering anything on this page.
 */
export function usePaymentButtonsEnabled(): boolean {
  const paymentProducts = useApp((s) => s.merchantEnabledProducts?.paymentProducts);
  return !!paymentProducts?.includes(PAYMENT_BUTTONS_FEATURE);
}

/** Query-key root for the list, which create and disable invalidate. */
export const PAYMENT_BUTTONS_QUERY_KEY = ["payment-buttons"] as const;

/**
 * The MIDs the list is fetched across. pg-dashboard's resolvedMerchantIds,
 * verbatim: the header's selected MID if there is one, else every PA MID. A
 * guest (onboarding) user has none, so nothing is fetched for them.
 */
export function usePaymentButtonListMids(): string[] {
  const paMids = useApp((s) => s.paMids);
  const isGuestUser = useApp((s) => s.isGuestUser);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  if (isGuestUser) return [];
  if (selectedMid) return [selectedMid];
  return paMids;
}

/**
 * One page of payment buttons, from `POST /v1/search/wqr`. `body` is null when
 * there is nothing to ask for (see buildPaymentButtonListBody), which leaves
 * the query idle and the page empty.
 */
export function usePaymentButtons(body: PaymentButtonListRequest | null): {
  rows: PaymentButton[];
  totalCount: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const { data, isPending, isFetching, isError, refetch } = usePostQuery<
    PaymentButtonListResponse,
    PaymentButtonListRequest | null
  >([...PAYMENT_BUTTONS_QUERY_KEY], paymentButtonSearchApi, body, { staleTime: 0 }, !!body);

  return {
    rows: (data?.data?.data ?? []).map(mapWqrEntry),
    totalCount: data?.data?.totalCount ?? 0,
    // An idle (disabled) query is "pending" forever; only a live one loads.
    isLoading: !!body && isPending,
    isFetching,
    isError,
    refetch: () => void refetch(),
  };
}

export interface PaymentButtonCreateScope {
  /** The MID the button is created under, once known. */
  mid: string | null;
  /** More than one eligible MID and nothing chose between them: ask first. */
  needsMidChoice: boolean;
  /** The MIDs a merchant may create a button under. */
  midOptions: string[];
}

/**
 * Which MID a new payment button is created under. pg-dashboard's rule,
 * ported exactly (PaymentButtonTable + useApplicableMids):
 *
 *  - The eligible MIDs are every `tidsInfo` MID that is ACTIVE and carries
 *    PAYMENT_BUTTONS in any of its feature lists. Taken from `tidsInfo` itself,
 *    not intersected with `paMids`: the two come from different responses and
 *    can disagree, and intersecting silently dropped eligible accounts. Only
 *    multi-MID merchants have `tidsInfo`, so single-MID merchants have none.
 *  - More than one eligible: always ask (pg-dashboard's ChooseMidSelect), even
 *    with a MID selected in the header. The answer travels as `?mid=`.
 *  - Otherwise: `selectedMid || eligible[0] || paMids[0]`, as pg-dashboard
 *    resolves `currentMid`, then the profile MID for a single-MID merchant.
 */
export function usePaymentButtonCreateScope(midParam?: string | null): PaymentButtonCreateScope {
  const paMids = useApp((s) => s.paMids);
  const profileMid = useApp((s) => s.profile?.mid ?? "");
  const tidsInfo = useApp((s) => s.tidsInfo);
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  const midOptions = isMultiMidUser
    ? (tidsInfo ?? [])
        .filter((config) =>
          isFeatureAvailableForMid(config.mid, PAYMENT_BUTTONS_FEATURE, true, tidsInfo)
        )
        .map((config) => config.mid)
        .filter(Boolean)
    : [];

  const fallbackMid =
    selectedMid || midOptions[0] || paMids[0] || (isMultiMidUser ? "" : profileMid);

  // A pick from the picker, honoured only if it is one this merchant may use.
  if (midParam && (midOptions.includes(midParam) || midParam === fallbackMid)) {
    return { mid: midParam, needsMidChoice: false, midOptions };
  }
  if (midOptions.length > 1) return { mid: null, needsMidChoice: true, midOptions };
  return { mid: fallbackMid || null, needsMidChoice: false, midOptions };
}

/** The currencies enabled on a MID, as ISO3 codes, for the Value field's picker. */
export function useMerchantCurrencies(mid: string): { currencies: string[]; isLoading: boolean } {
  const { data, isLoading } = useGet<CurrencyEnableResponse>(
    ["payment-button-currencies", mid],
    mid ? merchantCurrencyApi(mid) : "",
    undefined,
    { enabled: !!mid }
  );
  const codes = Object.keys(data?.data?.currencyEnable ?? {});
  return { currencies: codes.length > 0 ? codes : [DEFAULT_BUTTON_CURRENCY], isLoading };
}

/**
 * The merchant's website on file, which pg-dashboard sends as the button's
 * `webDomain` and which the preview draws in its address bar.
 */
export function useMerchantWebsite(mid: string): string {
  const { data } = useGet<MerchantProfileResponse>(
    ["payment-button-profile", mid],
    mid ? merchantProfileApi(mid) : "",
    undefined,
    { enabled: !!mid }
  );
  return data?.merchantUrl ?? "";
}

/**
 * Copy a saved button's embed code: fetch its script (the download endpoint,
 * pg-dashboard's "Preview Button Code") and copy the live snippet.
 *
 * Fetched on demand through the query cache rather than held in a mounted
 * query per row: a table of buttons would otherwise fire one download per row
 * on load. Cached per button, so a second copy is instant, as pg-dashboard's
 * `lastRetrievedProductId` shortcut is.
 */
export function useCopyPaymentButtonCode(): {
  copyCode: (row: Pick<PaymentButton, "mid" | "buttonId">) => void;
  copyingId: string | null;
} {
  const queryClient = useQueryClient();
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const copyCode = (row: Pick<PaymentButton, "mid" | "buttonId">) => {
    const url = downloadPaymentButtonApi(row.mid, row.buttonId);
    setCopyingId(row.buttonId);
    void queryClient
      .fetchQuery({
        queryKey: ["payment-button-script", row.mid, row.buttonId],
        queryFn: async () => {
          try {
            const res = await api.get<CreatePaymentButtonResponse>(url);
            return res.data;
          } catch (error) {
            return handleApiError(error as AxiosError);
          }
        },
        staleTime: 5 * 60_000,
      })
      .then((res) => {
        if (res?.data) void copyEmbedCode(embedLinesToText(buildLiveEmbedLines(res.data)));
        else toast.error("Failed to retrieve button code");
      })
      .catch((error: Error) => toast.error(error.message || "Failed to retrieve button code"))
      .finally(() => setCopyingId(null));
  };

  return { copyCode, copyingId };
}

/**
 * Disable a button. PUT, empty body, pg-dashboard's `disableLink` verbatim,
 * with its success copy. The list is refreshed 2s later, as pg-dashboard does:
 * the search index lags the write, so an immediate refetch would still show
 * the button as active.
 */
export function useDisablePaymentButton(onDone?: () => void): {
  disable: (row: Pick<PaymentButton, "mid" | "buttonId">) => void;
  isDisabling: boolean;
} {
  const queryClient = useQueryClient();
  const { mutate, isPending } = usePut<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: false,
  });

  const disable = (row: Pick<PaymentButton, "mid" | "buttonId">) =>
    mutate(
      { dynamicUrl: deactivatePaymentButtonApi(row.mid, row.buttonId) },
      {
        onSuccess: () => {
          toast.success("Payment Button disabled successfully");
          window.setTimeout(
            () => void queryClient.invalidateQueries({ queryKey: [...PAYMENT_BUTTONS_QUERY_KEY] }),
            2000
          );
          onDone?.();
        },
        onError: (error) => toast.error(error.message || "Failed to disable button"),
      }
    );

  return { disable, isDisabling: isPending };
}
