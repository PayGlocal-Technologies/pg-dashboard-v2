"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDelete, useGet, usePost, usePostQuery, usePut } from "@/lib/api/hooks";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import type { TableReqBody } from "@/types/transactions";
// The client book's own wire → render mapping and country reference data, so a
// client reads the same here as on the Clients page and in the MCA editor.
import { toClient, useClientCountryMap } from "@/features/dashboard/client-management/hooks";
import type {
  Client,
  ClientByIdResponse,
  ClientSearchResponse,
} from "@/features/dashboard/client-management/types";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { useInvoiceLinkMidScope } from "@/features/dashboard/invoice-links/hooks";
import {
  getLineItemsApi,
  skuImportPreviousItemsApi,
} from "@/features/dashboard/create-invoice/services";
import type {
  LineItemSuggestion,
  LineItemsResponse,
} from "@/features/dashboard/create-invoice/types";
import {
  clientByIdApi,
  clientSearchApi,
  countryCurrencyMapApi,
  countryStatesApi,
  createInvoiceApi,
  currencyMapApi,
  editInvoiceApi,
  invoiceDraftApi,
  invoiceLogoApi,
  invoiceTemplateApi,
  invoiceTemplatesApi,
  merchantAdditionalInfoApi,
  merchantProfileApi,
} from "@/features/dashboard/invoice-links/create/services";
import {
  CLIENT_PICKER_LIMIT,
  FALLBACK_CURRENCIES,
  LOGO_EXTENSION_BY_MIME,
  LOGO_MAX_MB,
} from "@/features/dashboard/invoice-links/create/constants";
import { fromApiTemplate } from "@/features/dashboard/invoice-links/create/helpers";
import type {
  ApiInvoiceTemplate,
  CountryCurrencyMapResponse,
  CountryStatesResponse,
  CurrencyMapResponse,
  InvoiceBulkCreateRequest,
  InvoiceBulkCreateResponse,
  InvoiceCreateRequest,
  InvoiceCreateResponse,
  InvoiceDraftResponse,
  InvoiceLinkTemplate,
  InvoiceLogoResponse,
  MerchantAdditionalInfoResponse,
  TemplateListResponse,
  TemplateResponse,
  TemplateWriteBody,
  TemplateWriteResponse,
  SkuImportRequest,
  InvoiceLineItem,
} from "@/features/dashboard/invoice-links/create/types";

/**
 * The MID the editor writes against.
 *
 * Upstream resolves `selectedMid || paMids[0]` (create-mca-payment-invoice
 * index.tsx:54-63) and puts it in the URL path. Note this is the single-MID
 * form of the rule — the list's `useInvoiceLinkMidFilter` sends the whole array
 * when nothing is selected, but a create can only target one MID.
 *
 * The fallback is only ever reached with a single eligible MID: with several
 * and none selected, the editor's gate (InvoiceLinkEditorFeature) asks first,
 * so this never silently picks the first of many the way upstream does.
 */
export function useInvoiceEditorMid(): string {
  const paMids = useApp((s) => s.paMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const { midOptions } = useInvoiceLinkMidScope();
  return selectedMid || midOptions[0] || paMids?.[0] || "";
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

/**
 * Imports the lines ticked "Save to SKU catalogue" into SKU management. Same
 * endpoint, body and fire-and-forget handling as pg-dashboard's create-invoice,
 * which imports when the merchant leaves its Items step — before, and
 * regardless of, the invoice being created. A failure is reported with the
 * server's reason; `onImported` lets the caller un-tick what was saved. SKU management accepts
 * PA MIDs as well as PACB ones, so the invoice link's own MID is used.
 */
export function useImportItemsToSku(mid: string) {
  const { mutate } = usePost<unknown, SkuImportRequest>(skuImportPreviousItemsApi(mid), {
    invalidateQueries: false,
  });

  return (items: InvoiceLineItem[], currency: string, onImported?: () => void) => {
    const skuItems = items
      .filter((item) => item.saveAsSku && item.description.trim())
      .map((item) => ({
        name: item.description.trim(),
        type: item.itemType || null,
        hsnSac: item.itemCode.trim(),
        unitPrice: item.ppu,
        currency: currency || null,
        description: null,
      }));
    if (skuItems.length === 0) return;

    mutate(
      { items: skuItems },
      {
        onSuccess: () => {
          toast.success(
            `${skuItems.length} item${skuItems.length === 1 ? "" : "s"} saved to your SKU catalogue.`
          );
          onImported?.();
        },
        onError: (error: Error) =>
          toast.error("Couldn't save items to the SKU catalogue", { description: error.message }),
      }
    );
  };
}

/**
 * The item picker's suggestions: the same `get-line-items` endpoint
 * create-invoice uses (GET /v3/mca-invoice/{mid}/get-line-items?currency=),
 * addressed to the invoice link's own MID and currency.
 */
export function useLineItemSuggestions(mid: string, currency: string): LineItemSuggestion[] {
  const url = getLineItemsApi(mid, currency || undefined);
  const { data } = useGet<LineItemsResponse>(
    ["invoice-link-line-items", mid, currency],
    url,
    undefined,
    { enabled: !!url }
  );
  return data?.data?.lineItems ?? [];
}

/** POST create. */
export function useCreateInvoice(mid: string) {
  return usePost<InvoiceCreateResponse, InvoiceCreateRequest>(createInvoiceApi(mid), {
    invalidateQueries: ["invoice-links"],
  });
}

/**
 * POST create with `clients[]`: one link per client from one invoice. Same
 * URL as useCreateInvoice; typed apart because the body and the answer differ.
 */
export function useCreateInvoiceBatch(mid: string) {
  return usePost<InvoiceBulkCreateResponse, InvoiceBulkCreateRequest>(createInvoiceApi(mid), {
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

// ── Templates ────────────────────────────────────────────────────────────────

export interface InvoiceLinkTemplates {
  templates: InvoiceLinkTemplate[];
  /** False while the list is loading. A failed list counts as ready and empty. */
  isReady: boolean;
  /** True while a create, update, rename or delete is in flight. */
  isMutating: boolean;
  /** True while a template is being fetched to apply. */
  isApplying: boolean;
  /** Creates one; the server-minted id arrives in `onSaved`. */
  save: (body: TemplateWriteBody, onSaved: (id: string) => void) => void;
  /** Full replace. The API has no partial update. */
  replace: (templateId: string, body: TemplateWriteBody, onDone?: () => void) => void;
  /** A full replace too, built from the stored template so nothing else changes. */
  rename: (templateId: string, name: string) => void;
  remove: (templateId: string) => void;
  /**
   * Reads one template fresh and hands it over. The read is the point: it is
   * where the backend hydrates SKU-backed lines with the catalogue's current
   * name and price, and it bumps `lastUsedAt` as a side effect, so applying a
   * template also records the use.
   */
  load: (templateId: string, onLoaded: (template: ApiInvoiceTemplate) => void) => void;
}

/**
 * The merchant's saved invoice templates, the same store the MCA invoice editor
 * reads and writes. The query key matches that editor's so the two share one
 * cache entry per MID.
 */
export function useInvoiceLinkTemplates(mid: string): InvoiceLinkTemplates {
  const queryClient = useQueryClient();
  const listKey = useMemo(() => ["invoice-templates", mid], [mid]);
  const listUrl = invoiceTemplatesApi(mid);

  const { data, isLoading } = useGet<TemplateListResponse>(listKey, listUrl, undefined, {
    enabled: !!listUrl,
    staleTime: 0,
  });

  const invalidateList = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: listKey }),
    [queryClient, listKey]
  );

  /** Most recently used first, then most recently saved, the MCA picker's order. */
  const templates = useMemo(() => {
    const mapped = (data?.data?.templates ?? []).map(fromApiTemplate);
    return mapped.sort((a, b) => {
      const used = Number(b.lastUsedAt ?? 0) - Number(a.lastUsedAt ?? 0);
      return used !== 0 ? used : Number(b.savedAt ?? 0) - Number(a.savedAt ?? 0);
    });
  }, [data]);

  const { mutate: create, isPending: isCreating } = usePost<
    TemplateWriteResponse,
    TemplateWriteBody
  >(listUrl, { invalidateQueries: false });

  // Addressed per call through `dynamicUrl`: the id is only known at click time.
  const { mutate: put, isPending: isReplacing } = usePut<
    TemplateWriteResponse,
    { dynamicUrl: string; reqBody: TemplateWriteBody }
  >("", { invalidateQueries: false });

  const { mutate: destroy, isPending: isDeleting } = useDelete<unknown, { dynamicUrl: string }>(
    "",
    { invalidateQueries: false }
  );

  const save = useCallback(
    (body: TemplateWriteBody, onSaved: (id: string) => void) => {
      create(body, {
        onSuccess: (response) => {
          invalidateList();
          const templateId = response?.data?.templateId;
          if (templateId) onSaved(templateId);
        },
        onError: (error) =>
          toast.error("Couldn't save the template", { description: error.message }),
      });
    },
    [create, invalidateList]
  );

  const replace = useCallback(
    (templateId: string, body: TemplateWriteBody, onDone?: () => void) => {
      put(
        { dynamicUrl: invoiceTemplateApi(mid, templateId), reqBody: body },
        {
          onSuccess: () => {
            invalidateList();
            onDone?.();
          },
          onError: (error) =>
            toast.error("Couldn't update the template", { description: error.message }),
        }
      );
    },
    [put, mid, invalidateList]
  );

  const rename = useCallback(
    (templateId: string, name: string) => {
      const existing = templates.find((template) => template.id === templateId);
      if (!existing) return;
      const body: TemplateWriteBody = { ...existing.raw, name };
      delete body.templateId;
      delete body.savedAt;
      delete body.lastUsedAt;
      replace(templateId, body);
    },
    [templates, replace]
  );

  const remove = useCallback(
    (templateId: string) => {
      destroy(
        { dynamicUrl: invoiceTemplateApi(mid, templateId) },
        {
          onSuccess: invalidateList,
          onError: (error) =>
            toast.error("Couldn't delete the template", { description: error.message }),
        }
      );
    },
    [destroy, mid, invalidateList]
  );

  // The fresh read. A disabled query plus an explicit refetch from the effect's
  // async callback, the idiom create-invoice's markUsed uses: the id is only
  // known at click time, so it goes into state first and the read follows.
  const [pending, setPending] = useState<{
    id: string;
    onLoaded: (template: ApiInvoiceTemplate) => void;
  } | null>(null);

  const { refetch: readTemplate } = useGet<TemplateResponse>(
    ["invoice-template", mid, pending?.id ?? ""],
    pending ? invoiceTemplateApi(mid, pending.id) : "",
    undefined,
    { enabled: false, staleTime: 0 }
  );

  useEffect(() => {
    if (!pending) return;

    const run = async (): Promise<void> => {
      const result = await readTemplate();
      const template = result.data?.data?.template;
      if (template) pending.onLoaded(template);
      else {
        toast.error("Couldn't load the template", {
          description: result.error?.message ?? "Try again in a moment.",
        });
      }
      setPending(null);
      // The lastUsedAt bump only shows in the list.
      invalidateList();
    };

    void run();
  }, [pending, readTemplate, invalidateList]);

  const load = useCallback(
    (templateId: string, onLoaded: (template: ApiInvoiceTemplate) => void) =>
      setPending({ id: templateId, onLoaded }),
    []
  );

  return {
    templates,
    isReady: !isLoading,
    isMutating: isCreating || isReplacing || isDeleting,
    isApplying: !!pending,
    save,
    replace,
    rename,
    remove,
    load,
  };
}

// ── Clients ──────────────────────────────────────────────────────────────────

/**
 * The client book, searched for the recipient picker.
 *
 * The body mirrors the Clients page's own search (client-management's
 * useClients): `queryString` from the typed text, the MID under `mid` (not
 * `merchantId`), and `searchFilterType: "DEFAULT"` when nothing is typed. The
 * query key sits under ["clients"], so adding a client anywhere refreshes it.
 */
export function useInvoiceLinkClients(
  mid: string,
  search: string
): {
  clients: Client[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  /** Reads one client by id and hands it over, for a client just created. */
  fetchClient: (clientId: string, onLoaded: (client: Client) => void) => void;
} {
  const countryMap = useClientCountryMap();

  const body = useMemo<TableReqBody>(() => {
    const built = buildTxnRequestBody(
      {},
      {
        searchQuery: search || undefined,
        selectedMid: mid ? { key: "mid", value: [mid] } : undefined,
        pageLimit: CLIENT_PICKER_LIMIT,
        from: 0,
      }
    );
    return search ? built : { ...built, searchFilterType: "DEFAULT" };
  }, [search, mid]);

  const { data, isPending, isError, refetch } = usePostQuery<ClientSearchResponse, TableReqBody>(
    ["clients", mid, "invoice-link-picker"],
    clientSearchApi(mid),
    body,
    { staleTime: 30_000 },
    !!mid
  );

  const clients = useMemo(
    () => (data?.data?.data ?? []).map((record) => toClient(record, countryMap)),
    [data, countryMap]
  );

  const [pending, setPending] = useState<{
    id: string;
    onLoaded: (client: Client) => void;
  } | null>(null);

  const { refetch: readClient } = useGet<ClientByIdResponse>(
    ["client", mid, pending?.id ?? ""],
    pending ? clientByIdApi(mid, pending.id) : "",
    undefined,
    { enabled: false, staleTime: 0 }
  );

  useEffect(() => {
    if (!pending) return;

    const run = async (): Promise<void> => {
      const result = await readClient();
      const record = result.data?.data?.client;
      if (record) pending.onLoaded(toClient(record, countryMap));
      setPending(null);
    };

    void run();
  }, [pending, readClient, countryMap]);

  const fetchClient = useCallback(
    (clientId: string, onLoaded: (client: Client) => void) =>
      setPending({ id: clientId, onLoaded }),
    []
  );

  return {
    clients,
    isLoading: !!mid && isPending,
    isError,
    refetch: () => void refetch(),
    fetchClient,
  };
}
