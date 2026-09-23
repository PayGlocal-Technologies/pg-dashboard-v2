"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useGet, usePut } from "@/lib/api/hooks";
import { api } from "@/lib/api/axios";
import { handleApiError } from "@/lib/api/handleApiError";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  deactivatePaymentButtonApi,
  downloadPaymentButtonApi,
  merchantCurrencyApi,
  merchantProfileApi,
} from "@/features/dashboard/payment-button/services";
import {
  buildLiveEmbedLines,
  copyEmbedCode,
  embedLinesToText,
} from "@/features/dashboard/payment-button/helpers";
import { DEFAULT_BUTTON_CURRENCY } from "@/features/dashboard/payment-button/constants";
import type {
  CreatePaymentButtonResponse,
  CurrencyEnableResponse,
  MerchantProfileResponse,
  PaymentButton,
} from "@/features/dashboard/payment-button/types";

/**
 * The MID a new payment button is created under. Mirrors pg-dashboard's
 * `selectedMid || applicableMids[0] || paMids[0]`: an explicit header
 * selection wins when it is a PA MID, else the first PA MID, else the profile
 * MID.
 *
 * pg-dashboard asks a multi-MID merchant to pick one before Create opens
 * (ChooseMidSelect); that picker is not ported yet, so a multi-MID merchant
 * with nothing selected creates under their first PA MID.
 */
export function usePaymentButtonMid(): string {
  const paMids = useApp((s) => s.paMids);
  const profileMid = useApp((s) => s.profile?.mid ?? "");
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  if (selectedMid && paMids.includes(selectedMid)) return selectedMid;
  return paMids[0] ?? profileMid;
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
 * with its success copy. The list is mock-driven for now, so there is no list
 * query to invalidate yet.
 */
export function useDisablePaymentButton(onDone?: () => void): {
  disable: (row: Pick<PaymentButton, "mid" | "buttonId">) => void;
  isDisabling: boolean;
} {
  const { mutate, isPending } = usePut<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: false,
  });

  const disable = (row: Pick<PaymentButton, "mid" | "buttonId">) =>
    mutate(
      { dynamicUrl: deactivatePaymentButtonApi(row.mid, row.buttonId) },
      {
        onSuccess: () => {
          toast.success("Payment Button disabled successfully");
          onDone?.();
        },
        onError: (error) => toast.error(error.message || "Failed to disable button"),
      }
    );

  return { disable, isDisabling: isPending };
}
