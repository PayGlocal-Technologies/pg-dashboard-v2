"use client";

import { useMemo } from "react";
import { useGet, usePost } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  countryCallingCodesApi,
  countryCurrencyMapApi,
  countryStatesApi,
  createPaymentLinkApi,
  currencyMapApi,
  paymentLinkConfigApi,
} from "@/features/dashboard/payment-links/services";
import type {
  CallingCodesResponse,
  CountryCurrencyMapResponse,
  CountryStatesResponse,
  CreatePaymentLinkResponse,
  CurrencyMapResponse,
  PaymentLinkConfig,
} from "@/features/dashboard/payment-links/create/types";

/**
 * The MID a payment link is created under: the header's selection, else the
 * first PA MID (pg-dashboard's midMap, page PAYMENT).
 */
export function usePaymentLinkMid(): string {
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const paMids = useApp((s) => s.paMids);
  return selectedMid || paMids[0] || "";
}

/**
 * The merchant's payment link settings. Upstream reads them unwrapped
 * (`config.merchantSIEnabled`), so a `data` envelope is unwrapped if present.
 */
export function usePaymentLinkConfig(mid: string): {
  config: PaymentLinkConfig;
  isLoading: boolean;
} {
  const { data, isLoading } = useGet<unknown>(
    ["payment-link-config", mid],
    paymentLinkConfigApi(mid),
    undefined,
    { enabled: !!mid, staleTime: Infinity }
  );
  const config = useMemo(() => {
    const root = data as { data?: PaymentLinkConfig } | PaymentLinkConfig | undefined;
    const inner = (root as { data?: PaymentLinkConfig } | undefined)?.data;
    return (inner ?? root ?? {}) as PaymentLinkConfig;
  }, [data]);
  return { config, isLoading };
}

/** Every currency a link can be raised in, `"USD $"` as upstream labels it. */
export function usePaymentLinkCurrencies(mid: string): { value: string; label: string }[] {
  const { data } = useGet<CurrencyMapResponse>(
    ["payment-link-currency-map"],
    currencyMapApi,
    undefined,
    { enabled: !!mid, staleTime: Infinity }
  );
  return useMemo(
    () =>
      Object.entries(data?.data?.currencyMap ?? {}).map(([code, entry]) => ({
        value: code,
        label: `${code} ${entry?.currencySymbol ?? ""}`.trim(),
      })),
    [data]
  );
}

/** Country options for the address sections; the value is the ISO2 code. */
export function usePaymentLinkCountries(): { value: string; label: string }[] {
  const { data } = useGet<CountryCurrencyMapResponse>(
    ["payment-link-countries"],
    countryCurrencyMapApi,
    undefined,
    { staleTime: Infinity }
  );
  return useMemo(
    () =>
      (data?.data?.countryCurrencyMap ?? []).map((c) => ({
        value: c.iso2CountryCode,
        label: c.countryName,
      })),
    [data]
  );
}

/** One country's states, fetched once a country is picked. */
export function usePaymentLinkStates(iso2: string): { value: string; label: string }[] {
  const { data } = useGet<CountryStatesResponse>(
    ["payment-link-states", iso2],
    countryStatesApi(iso2),
    undefined,
    { enabled: !!iso2, staleTime: Infinity }
  );
  return useMemo(
    () => (data?.data?.countryCodeModel?.statesList ?? []).map((s) => ({ value: s, label: s })),
    [data]
  );
}

export interface CallingCodeOption {
  /** ISO2: unique, unlike the dial code (+1 is shared). */
  value: string;
  /** `+91`. */
  callingCode: string;
  /** Matched by the field's search; not shown (see the label). */
  countryName: string;
  label: string;
}

/** Dial codes for the phone field, stored as `+91` (upstream's `+${code}`). */
export function usePaymentLinkCallingCodes(): CallingCodeOption[] {
  const { data } = useGet<CallingCodesResponse>(
    ["payment-link-calling-codes"],
    countryCallingCodesApi,
    undefined,
    { staleTime: Infinity }
  );
  return useMemo(
    () =>
      (data?.data?.countryCallingCodes ?? [])
        // The API repeats some countries (LA comes back twice); the ISO2 is
        // the option's value and key, so only its first entry is kept.
        .filter(
          (c, i, all) =>
            c.callingCode && all.findIndex((o) => o.iso2CountryCode === c.iso2CountryCode) === i
        )
        .map((c) => ({
          value: c.iso2CountryCode,
          callingCode: `+${c.callingCode}`,
          countryName: c.countryName,
          // Just the code: the narrow field beside the phone number has no
          // room for the country name (the flag says which country it is,
          // and search still matches the name; see the modal's filterOption).
          label: `+${c.callingCode}`,
        })),
    [data]
  );
}

export function useCreatePaymentLink(mid: string) {
  return usePost<CreatePaymentLinkResponse, unknown>(createPaymentLinkApi(mid));
}
