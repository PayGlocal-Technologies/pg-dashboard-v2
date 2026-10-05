"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useGet, usePost, usePut } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  countryCurrencyMapApi,
  countryStatesApi,
  createInvoiceApi,
  currencyMapApi,
  editInvoiceApi,
  invoiceDraftApi,
  invoiceLogoApi,
  merchantAdditionalInfoApi,
  merchantProfileApi,
} from "@/features/dashboard/invoice-links/create/services";
import {
  FALLBACK_CURRENCIES,
  LOGO_EXTENSION_BY_MIME,
  LOGO_MAX_MB,
} from "@/features/dashboard/invoice-links/create/constants";
import type {
  CountryCurrencyMapResponse,
  CountryStatesResponse,
  CurrencyMapResponse,
  InvoiceCreateRequest,
  InvoiceCreateResponse,
  InvoiceDraftResponse,
  InvoiceLogoResponse,
  MerchantAdditionalInfoResponse,
} from "@/features/dashboard/invoice-links/create/types";

/**
 * The MID the editor writes against.
 *
 * Upstream resolves `selectedMid || paMids[0]` (create-mca-payment-invoice
 * index.tsx:54-63) and puts it in the URL path. Note this is the single-MID
 * form of the rule — the list's `useInvoiceLinkMidFilter` sends the whole array
 * when nothing is selected, but a create can only target one MID.
 */
export function useInvoiceEditorMid(): string {
  const paMids = useApp((s) => s.paMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  return selectedMid || paMids?.[0] || "";
}

export interface CurrencyOption {
  /** `"INR ₹"` — upstream's label is the code and the symbol, not the code alone. */
  label: string;
  value: string;
  symbol: string;
}

/**
 * Currencies for the Payment Details select, and the symbol the preview and
 * the line-item amounts render with.
 *
 * Upstream builds each option as `` `${code} ${currencySymbol}` `` and defaults
 * the field to the first one, falling back to a hardcoded USD/INR/EUR trio
 * when the map has not loaded (constants.tsx:77-85).
 */
export function useInvoiceCurrencies(): CurrencyOption[] {
  const mid = useInvoiceEditorMid();
  const { data } = useGet<CurrencyMapResponse>(["invoice-currency-map", mid], currencyMapApi, {
    enabled: !!mid,
    staleTime: Infinity,
  });

  return useMemo(() => {
    const map = data?.data?.currencyMap;
    const codes = map ? Object.keys(map) : [];
    if (codes.length === 0) {
      return FALLBACK_CURRENCIES.map((code) => ({ label: code, value: code, symbol: code }));
    }
    return codes.map((code) => {
      const symbol = map?.[code]?.currencySymbol ?? code;
      return { label: `${code} ${symbol}`, value: code, symbol };
    });
  }, [data]);
}

/** Merchant short name for the preview letterhead. */
export function useMerchantShortName(mid: string): string {
  const { data } = useGet<{ data?: { merchantShortName?: string } }>(
    ["invoice-merchant-profile", mid],
    merchantProfileApi(mid),
    { enabled: !!mid, staleTime: Infinity }
  );
  return data?.data?.merchantShortName ?? "";
}

/**
 * The invoice letterhead logo: what to show, and how to replace it.
 *
 * Two legs, from pg-dashboard's MerchantLogo + InvoiceHeader:
 *
 *   1. POST …/invoice/{mid}/logo  `{ fileExtension, merchantDocType, name }`
 *      — fileExtension derived from the file, NOT hardcoded ".png" as upstream
 *      does, because this accepts JPG too
 *      → `{ gid, data: { logo: { [mid]: presignedPutUrl } } }`
 *   2. PUT  that URL with the raw File and the x-amz-meta-* headers the bucket
 *      policy requires, `gid` among them.
 *
 * TWO DELIBERATE DEPARTURES FROM THE SOURCE:
 *
 * a) SOURCE DEFECT, NOT PORTED. Upstream keeps the presigned PUT URL and the
 *    stored public URL in ONE `logoData.uploadLink` field, written by two
 *    different effects. Whichever resolves last wins, so when
 *    /additionalinfo lands after the logo POST, `uploadLink` becomes the
 *    public display URL and `gid` is dropped — at which point MerchantLogo's
 *    `if (uploadLink && imgFile && gid && currentMid)` guard fails and the
 *    upload silently does nothing. Here the two are separate values: the
 *    presigned URL is only ever used to upload, the public URL only ever to
 *    display. Porting that verbatim would have shipped a button that no-ops.
 *
 * b) Leg 1 fires when the merchant actually picks a file, not on mount.
 *    Upstream POSTs for a presigned slot every time the editor opens, whether
 *    or not a logo is ever chosen. Same result, one fewer request.
 */
export function useInvoiceLogo(mid: string) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: additionalInfo } = useGet<MerchantAdditionalInfoResponse>(
    ["invoice-merchant-logo", mid],
    merchantAdditionalInfoApi(mid),
    { enabled: !!mid, staleTime: Infinity }
  );

  const { mutateAsync: requestUploadSlot } = usePost<
    InvoiceLogoResponse,
    { fileExtension: string; merchantDocType: string; name: string }
  >(invoiceLogoApi(mid), { invalidateQueries: false });

  const { mutateAsync: putToS3 } = usePut<
    unknown,
    { dynamicUrl: string; customHeaders: Record<string, string>; reqBody: File }
  >("", { invalidateQueries: false });

  const storedUrl = additionalInfo?.data?.merchantLogoPublicUrl ?? null;
  /** The local preview wins once a file is picked, so the swap is immediate. */
  const displayUrl = localPreview ?? storedUrl;

  async function upload(file: File): Promise<void> {
    // PNG and JPG. Upstream is PNG-only and its message says so; widening the
    // formats means the copy has to widen with it, so this one string is not
    // verbatim.
    const fileExtension = LOGO_EXTENSION_BY_MIME[file.type];
    if (!fileExtension) {
      toast.error("You can only upload PNG or JPG files!");
      return;
    }
    // Upstream's limit and its exact message.
    if (file.size / 1024 / 1024 >= LOGO_MAX_MB) {
      toast.error(`Image must be smaller than ${LOGO_MAX_MB}MB!`);
      return;
    }

    setIsUploading(true);
    try {
      const slot = await requestUploadSlot({
        // Same derived value as the header below — see LOGO_EXTENSION_BY_MIME
        // for why the two legs must not drift.
        fileExtension,
        merchantDocType: "INVOICE",
        name: mid,
      });

      const uploadUrl = slot?.data?.logo?.[mid];
      const gid = slot?.gid;
      if (!uploadUrl || !gid) {
        toast.error("Failed to upload logo");
        return;
      }

      await putToS3({
        dynamicUrl: uploadUrl,
        // Header names and values verbatim from upstream, mixed casing and
        // all — HTTP header names are case-insensitive, so the inconsistency
        // is cosmetic, but the bucket policy reads these exact keys.
        customHeaders: {
          "Content-Type": file.type,
          "x-amz-meta-fileextension": fileExtension,
          "X-Amz-Meta-gid": gid,
          "X-Amz-Meta-maxsize": String(LOGO_MAX_MB),
          "X-Amz-Meta-mid": mid,
        },
        reqBody: file,
      });

      // Only swap the preview once the object is actually up, so a failed
      // upload cannot leave the merchant looking at a logo that is not stored.
      setLocalPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(file);
      });
      toast.success("Logo uploaded successfully");
    } catch (error) {
      toast.error((error as Error)?.message || "Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  }

  return { displayUrl, upload, isUploading };
}

/** Country options for both address sections. */
export function useInvoiceCountries(): { label: string; value: string; iso2: string }[] {
  const { data } = useGet<CountryCurrencyMapResponse>(
    ["invoice-country-currency-map"],
    countryCurrencyMapApi,
    { staleTime: Infinity }
  );

  return useMemo(
    () =>
      (data?.data?.countryCurrencyMap ?? []).map((c) => ({
        label: c.countryName,
        value: c.countryName,
        iso2: c.iso2CountryCode,
      })),
    [data]
  );
}

/** States for one country. Disabled until a country is picked, as upstream does. */
export function useInvoiceStates(iso2Code: string): string[] {
  const { data } = useGet<CountryStatesResponse>(
    ["invoice-country-states", iso2Code],
    countryStatesApi(iso2Code),
    { enabled: !!iso2Code, staleTime: Infinity }
  );
  return data?.data?.countryCodeModel?.statesList ?? [];
}

/** The existing invoice, for edit/draft prefill. Only fetched when an id is present. */
export function useInvoiceDraft(mid: string, invoiceId: string | undefined) {
  return useGet<InvoiceDraftResponse>(
    ["invoice-link-draft", mid, invoiceId ?? ""],
    invoiceDraftApi(mid, invoiceId),
    { enabled: !!mid && !!invoiceId }
  );
}

/** POST create. */
export function useCreateInvoice(mid: string) {
  return usePost<InvoiceCreateResponse, InvoiceCreateRequest>(createInvoiceApi(mid), {
    invalidateQueries: ["invoice-links"],
  });
}

/** PUT edit — only for an already-issued invoice, never a draft. */
export function useEditInvoice(mid: string) {
  return usePut<InvoiceCreateResponse, InvoiceCreateRequest>(editInvoiceApi(mid), {
    invalidateQueries: ["invoice-links"],
  });
}

/**
 * Draft save. POST when there is no invoice yet, PUT when updating one —
 * upstream branches on the presence of `invoiceId` exactly this way.
 */
export function useSaveInvoiceDraft(mid: string, invoiceId: string | undefined) {
  const create = usePost<InvoiceCreateResponse, InvoiceCreateRequest>(invoiceDraftApi(mid), {
    invalidateQueries: ["invoice-links"],
  });
  const update = usePut<InvoiceCreateResponse, InvoiceCreateRequest>(
    invoiceDraftApi(mid, invoiceId),
    { invalidateQueries: ["invoice-links"] }
  );

  return invoiceId ? update : create;
}
