"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDelete, useGet, usePost, usePut } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  fromApiTemplate,
  themeFor,
  toTemplateWriteBody,
} from "@/features/dashboard/create-invoice/helpers";
// toDateKey is local-timezone YYYY-MM-DD. Imported from the chips module for the
// same reason mca-invoices and mca-invoice-details do: it is the one
// implementation, and `toISOString().slice(0, 10)` rolls the date back a day for
// any IST time before 05:30.
import { toDateKey } from "@/features/dashboard/create-invoice/components/InvoiceHeaderChips";
import {
  addedAccountsApi,
  clientCountryCodesApi,
  clientListApi,
  clientStateCodesApi,
  getAssetApi,
  getLineItemsApi,
  invoiceTemplateApi,
  invoiceTemplatesApi,
  invoiceThemesApi,
  mcaCurrenciesApi,
  suggestedAccountsApi,
  uploadAssetApi,
  ffmsTxnSearchApi,
} from "@/features/dashboard/create-invoice/services";
import {
  FALLBACK_THEME_ACCENTS,
  FALLBACK_THEME_COLORS,
  FALLBACK_THEME_NAMES,
  UNKNOWN_COLOR_HEX,
} from "@/features/dashboard/create-invoice/constants";
import type {
  AccountData,
  AccountListResponse,
  AddedAccountDetails,
  AddedAccountsResponse,
  AssetResponse,
  ClientData,
  ClientListResponse,
  CountryCodesResponse,
  CurrencyData,
  InvoiceTemplate,
  InvoiceTemplateSnapshot,
  InvoiceTheme,
  InvoiceThemesResponse,
  LineItemSuggestion,
  LineItemsResponse,
  McaCurrencyListResponse,
  StateCodesResponse,
  TemplateListResponse,
  TemplateResponse,
  TemplateWriteBody,
  TemplateWriteResponse,
  ThemePaletteOption,
} from "@/features/dashboard/create-invoice/types";
import type { BaseResponse } from "@/types/common";

/**
 * The MID every mca-invoice endpoint puts in its path.
 *
 * Mirrors pg-dashboard's create-invoice exactly: the explicitly selected MID
 * wins, falling back to the first PACB MID. `useResolvedMids("PACB")` is the
 * wrong tool here — it builds an OpenSearch `merchantId` filter across many
 * MIDs, and none of these endpoints take a filter.
 */
export function useInvoiceMerchantId(): string {
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const fallbackMid = useApp((s) => s.paCbMids?.[0]) ?? "";
  return selectedMid || fallbackMid;
}

// ─── Currencies ───────────────────────────────────────────────────────────────

export interface McaCurrencies {
  currencies: CurrencyData[];
  symbolFor: (code: string) => string;
  /** True once the request has failed, so callers can stop waiting on it. */
  isError: boolean;
}

/**
 * The currencies this merchant may invoice in. The response splits local from
 * global; production concatenates and de-dupes by code, keeping the first
 * occurrence, so local wins where a code appears in both.
 */
export function useMcaCurrencies(): McaCurrencies {
  const merchantId = useInvoiceMerchantId();
  const url = mcaCurrenciesApi(merchantId);

  const { data, isError } = useGet<McaCurrencyListResponse>(
    ["mca-currencies", merchantId],
    url,
    undefined,
    { enabled: !!url }
  );

  return useMemo(() => {
    const local = data?.data?.local_currency ?? [];
    const global = data?.data?.global_currency ?? [];

    const byCode = new Map<string, CurrencyData>();
    for (const currency of [...local, ...global]) {
      if (!byCode.has(currency.currencyCode)) byCode.set(currency.currencyCode, currency);
    }
    const currencies = Array.from(byCode.values());

    return {
      currencies,
      symbolFor: (code: string) => byCode.get(code)?.currencySymbol ?? code,
      isError,
    };
  }, [data, isError]);
}

// ─── Themes ───────────────────────────────────────────────────────────────────

export interface InvoiceThemePalette {
  /** Every theme the renderer can produce, in the order the server lists them. */
  themes: InvoiceTheme[];
  colors: ThemePaletteOption[];
  accents: ThemePaletteOption[];
  /** Hex for a stored colour name, for the preview only. Never sent back. */
  colorHexFor: (name: string) => string;
  accentHexFor: (name: string) => string;
  /**
   * True only while the first request is in flight. Callers gate their first
   * paint on this so the document is not drawn in the fallback palette and then
   * repainted in the server's. It goes false on failure too, which is what keeps
   * a themes outage from blocking the editor.
   */
  isLoading: boolean;
}

/**
 * The renderer's palette: which themes exist, and what its named colours look
 * like.
 *
 * Two things make this different from every other query in this feature. It is
 * not merchant-scoped, because the vocabulary belongs to the renderer and is the
 * same for everyone, so it is cached indefinitely under a single key and shared
 * by the picker, the thumbnails and the document preview. And it never blocks:
 * only NAMES go on the wire, so an invoice saves and renders correctly whether
 * or not this call succeeded. A failure therefore falls back to the local table
 * rather than being surfaced — the merchant may see a hex that is a release
 * behind, which is a far better outcome than a colourless editor or a bootstrap
 * error on a document that would have generated perfectly.
 */
export function useInvoiceThemes(): InvoiceThemePalette {
  const { data, isLoading } = useGet<InvoiceThemesResponse>(
    ["invoice-themes"],
    invoiceThemesApi,
    undefined,
    { staleTime: Infinity }
  );

  return useMemo(() => {
    const names = data?.data?.themes?.length ? data.data.themes : FALLBACK_THEME_NAMES;
    const colors = data?.data?.colors?.length ? data.data.colors : FALLBACK_THEME_COLORS;
    const accents = data?.data?.accents?.length ? data.data.accents : FALLBACK_THEME_ACCENTS;

    // Both maps are consulted for a name the *invoice* holds, which may be one
    // the endpoint has since dropped, so the local table backs up the response
    // rather than the other way round.
    const hexes = new Map<string, string>();
    for (const option of [...FALLBACK_THEME_COLORS, ...FALLBACK_THEME_ACCENTS]) {
      hexes.set(option.name, option.hex);
    }
    for (const option of [...colors, ...accents]) hexes.set(option.name, option.hex);

    const hexFor = (name: string) => hexes.get(name) ?? UNKNOWN_COLOR_HEX;

    return {
      themes: names.map(themeFor),
      colors,
      accents,
      colorHexFor: hexFor,
      accentHexFor: hexFor,
      isLoading,
    };
  }, [data, isLoading]);
}

// ─── Linked transaction (?gid=) ───────────────────────────────────────────────

export interface LinkedTxnRecord {
  gid: string;
  amount: string;
  currency: string;
  creationTime: string;
  externalStatus: string;
  partnerCustomerFullName?: string | null;
}

interface FfmsSearchResponse {
  data: { data: LinkedTxnRecord[] };
}

interface FfmsSearchBody {
  searchFilterType: string;
  pageLimit: number;
  from: number;
  fieldSearch: { gid: string[] };
}

/**
 * The transaction an invoice is being raised against. Production fetches this
 * to show the linked-transaction chip and to validate the client's name
 * against the remitter's, so both checks need the same record.
 */
export function useLinkedTransaction(gid: string): LinkedTxnRecord | undefined {
  const merchantId = useInvoiceMerchantId();
  const url = ffmsTxnSearchApi(merchantId);

  const { mutate, data } = usePost<FfmsSearchResponse, FfmsSearchBody>(url, {
    invalidateQueries: false,
  });

  useEffect(() => {
    if (!gid || !url) return;
    mutate({
      searchFilterType: "FILTER_TYPE",
      pageLimit: 10,
      from: 0,
      fieldSearch: { gid: [gid] },
    });
  }, [gid, url, mutate]);

  return data?.data?.data?.[0];
}

// ─── Clients ──────────────────────────────────────────────────────────────────

/**
 * The client picker's options.
 *
 * Scoped to the draft, which is why it stays disabled until the invoice exists.
 * Shared by the Bill-to card and the generate-time validation so both judge the
 * same list — react-query dedupes the request between them.
 */
export function useInvoiceClients(invoiceId: string): {
  clients: ClientData[];
  refetch: () => void;
} {
  const merchantId = useInvoiceMerchantId();
  const url = clientListApi(merchantId, invoiceId);

  const { data, refetch } = useGet<ClientListResponse>(
    ["client-list", merchantId, invoiceId],
    url,
    undefined,
    { enabled: !!url }
  );

  return { clients: data?.data?.clientList ?? [], refetch: () => void refetch() };
}

// ─── Client geography ─────────────────────────────────────────────────────────

export interface GeoOption {
  label: string;
  value: string;
}

export interface ClientGeo {
  countryOptions: GeoOption[];
  /** Indian states when the country is India, "Not Applicable" otherwise. */
  stateOptionsFor: (country: string) => GeoOption[];
  isLoading: boolean;
}

/** Title-cases the SCREAMING_CASE state names the API returns. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Country and state options for a client address.
 *
 * Both endpoints return name→code maps and the address stores the NAME, so the
 * option value is the map key, not the code. Production special-cases non-India
 * countries to a single "OTHER COUNTRY" state; that behaviour is preserved
 * because the server validates against the same vocabulary.
 */
export function useClientGeo(enabled: boolean): ClientGeo {
  const { data: countryData, isLoading: countriesLoading } = useGet<CountryCodesResponse>(
    ["mca-client-countries"],
    clientCountryCodesApi,
    undefined,
    { enabled }
  );

  const { data: stateData, isLoading: statesLoading } = useGet<StateCodesResponse>(
    ["mca-client-states"],
    clientStateCodesApi,
    undefined,
    { enabled }
  );

  const countryOptions = useMemo(
    () =>
      Object.keys(countryData?.data?.countryCodes ?? {}).map((name) => ({
        label: titleCase(name),
        value: name,
      })),
    [countryData]
  );

  const stateOptionsFor = useCallback(
    (country: string): GeoOption[] => {
      const stateCodes = stateData?.data?.stateCodes;
      if (!stateCodes) return [];
      if (country !== "India") return [{ label: "Not Applicable", value: "OTHER COUNTRY" }];

      return (
        Object.keys(stateCodes)
          .filter((name) => name !== "OTHER COUNTRY")
          .map((name) => ({ label: titleCase(name), value: name }))
          // The API returns its map unordered. Sorted on the *label*, which is
          // what the user reads and what Select's type-ahead matches against.
          .sort((a, b) => a.label.localeCompare(b.label))
      );
    },
    [stateData]
  );

  return { countryOptions, stateOptionsFor, isLoading: countriesLoading || statesLoading };
}

// ─── Line-item suggestions ────────────────────────────────────────────────────

/** Autocomplete for the line-item name field, scoped to the chosen currency. */
export function useLineItemSuggestions(currency: string): LineItemSuggestion[] {
  const merchantId = useInvoiceMerchantId();
  const url = getLineItemsApi(merchantId, currency || undefined);

  const { data } = useGet<LineItemsResponse>(
    ["invoice-line-items", merchantId, currency],
    url,
    undefined,
    { enabled: !!url }
  );

  return data?.data?.lineItems ?? [];
}

// ─── Bank accounts ────────────────────────────────────────────────────────────

export interface BankAccountRow {
  title: string;
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  /** IFSC for added accounts, routing code for PayGlocal-provisioned ones. */
  routing: string;
  isRecommended: boolean;
  /** Present only for manually added accounts, which can be deleted. */
  uniqueId?: string;
}

const suggestedToRow = (
  title: string,
  account: AccountData,
  isRecommended: boolean
): BankAccountRow => ({
  title,
  accountNumber: account.accountNumber,
  accountHolderName: account.accountHolderName,
  bankName: account.bankName,
  routing: account.routingCode,
  isRecommended,
});

const addedToRow = (account: AddedAccountDetails): BankAccountRow => ({
  title: "Added account",
  accountNumber: account.accountNumber,
  accountHolderName: account.accountHolderName,
  bankName: account.bankName,
  routing: account.ifscCode,
  isRecommended: false,
  uniqueId: account.uniqueId,
});

/**
 * Every account this invoice may be paid into, as one flat list.
 *
 * Two endpoints feed it: the PayGlocal-provisioned accounts (local, global,
 * settlement) and any the merchant added by hand. Shared by the payment card
 * and the document preview so the bank block on the preview always shows the
 * account that is actually selected — react-query dedupes the fetches.
 *
 * Recommendation follows production: only meaningful when there is a choice,
 * and the local account wins when one exists.
 *
 * `currency` is not sent — the endpoint reads the currency off the stored
 * invoice — but it IS part of the cache key, because which account is suggested
 * depends on it: a USD invoice gets the USD local account, a EUR one the EUR
 * account. Pass the currency the *server's* copy of the draft is known to
 * carry, not the one in the form. Keying on the form's value would fire this
 * the instant the merchant picks a new currency, ahead of the debounced
 * autosave that tells the server about it, and the answer would come back for
 * the currency the invoice still had.
 */
export function useInvoiceBankAccounts(
  invoiceId: string,
  currency: string
): {
  rows: BankAccountRow[];
  isLoading: boolean;
  refetchAdded: () => void;
} {
  const merchantId = useInvoiceMerchantId();

  const suggestedUrl = suggestedAccountsApi(merchantId, invoiceId);
  const { data: suggested, isLoading } = useGet<AccountListResponse>(
    ["suggested-accounts", merchantId, invoiceId, currency],
    suggestedUrl,
    undefined,
    // Without a currency the server rejects the request outright, so there is
    // nothing to gain from asking.
    { enabled: !!suggestedUrl && !!currency }
  );

  const addedUrl = addedAccountsApi(merchantId);
  const { data: added, refetch } = useGet<AddedAccountsResponse>(
    ["added-accounts", merchantId],
    addedUrl,
    undefined,
    { enabled: !!addedUrl }
  );

  const rows = useMemo(() => {
    const accounts = suggested?.data?.suggestedAccounts ?? [];
    const local = accounts.find((a) => a.accountNumberType === "LOCAL");
    const settlement = accounts.find((a) => a.accountNumberType === "Settlement");
    const global = accounts.find((a) => !["LOCAL", "Settlement"].includes(a.accountNumberType));
    const hasChoice = accounts.length > 1;

    return [
      ...(local ? [suggestedToRow("Local account", local, hasChoice)] : []),
      ...(global ? [suggestedToRow("Global account", global, hasChoice && !local)] : []),
      ...(settlement ? [suggestedToRow("Settlement account", settlement, false)] : []),
      ...(added?.data?.bankDetails ?? []).map(addedToRow),
    ];
  }, [suggested, added]);

  return { rows, isLoading, refetchAdded: () => void refetch() };
}

// ─── Branding assets ──────────────────────────────────────────────────────────

export interface InvoiceAsset {
  url: string | undefined;
  isUploading: boolean;
  upload: (file: File) => void;
}

/**
 * Merchant-level logo or signature.
 *
 * Two legs, copied from pg-dashboard's OtherDetails step: POST { extension }
 * returns a presigned S3 URL, then the file is PUT straight at S3 with an
 * x-amz-meta-merchantId header. Only after that second leg does a refetch
 * surface the stored asset.
 *
 * ── Why the URL carries a `?t=` ──────────────────────────────────────────────
 *
 * The asset endpoint returns the SAME url for a merchant every time, because it
 * addresses a fixed object rather than a version of one. So a re-upload changed
 * the bytes at that address and nothing on screen: the refetch below returned a
 * string identical to the one already rendered, the browser served the image out
 * of its own cache, and the merchant watched their new logo not appear. That is
 * the "logos are not getting updated" bug, and it is not fixable by refetching
 * harder.
 *
 * pg-dashboard appends `?t=${Date.now()}` in its render, which busts the cache
 * but also re-downloads the image on every render and is impure besides (see
 * CLAUDE.md). The stamp here moves only when it should: once per mount, from a
 * lazy initializer, and again in the upload's success callback. Both are places
 * Date.now() is allowed, and between them they cover a stale cache from an
 * earlier session and a replacement made in this one.
 */
export function useInvoiceAsset(type: "LOGO" | "SIGNATURE"): InvoiceAsset {
  const merchantId = useInvoiceMerchantId();
  const [isUploading, setIsUploading] = useState(false);
  const [cacheStamp, setCacheStamp] = useState(() => Date.now());

  const readUrl = getAssetApi(merchantId, type);
  const { data, refetch } = useGet<AssetResponse>(
    [merchantId, "invoice-asset", type],
    readUrl,
    undefined,
    { enabled: !!readUrl }
  );

  const { mutate: requestUploadUrl } = usePost<AssetResponse, { extension: string }>(
    uploadAssetApi(merchantId, type),
    { invalidateQueries: false }
  );

  const { mutate: putToS3 } = usePut<unknown, unknown>("", { invalidateQueries: false });

  const upload = useCallback(
    (file: File) => {
      if (!merchantId) return;
      setIsUploading(true);

      requestUploadUrl(
        { extension: file.name.split(".").pop() || "png" },
        {
          onSuccess: (response) => {
            const uploadUrl = response?.data?.fileUrl;
            if (!uploadUrl) {
              setIsUploading(false);
              return;
            }

            putToS3(
              {
                dynamicUrl: uploadUrl,
                reqBody: file,
                customHeaders: {
                  "x-amz-meta-merchantId": merchantId,
                  "Content-Type": file.type,
                },
              },
              {
                onSuccess: () => {
                  setIsUploading(false);
                  // New stamp first: the refetch returns the same url, so this
                  // is the only thing that makes the <img> load the new bytes.
                  setCacheStamp(Date.now());
                  void refetch();
                },
                onError: (error) => {
                  setIsUploading(false);
                  toast.error(`Couldn't upload the ${type.toLowerCase()}`, {
                    description: error.message,
                  });
                },
              }
            );
          },
          onError: (error) => {
            setIsUploading(false);
            toast.error(`Couldn't upload the ${type.toLowerCase()}`, {
              description: error.message,
            });
          },
        }
      );
    },
    [merchantId, type, requestUploadUrl, putToS3, refetch]
  );

  const storedUrl = data?.data?.fileUrl;

  return {
    // Only stamped when there is something to stamp, and with the separator the
    // url does not already carry: a presigned link arrives with a query string.
    url: storedUrl
      ? `${storedUrl}${storedUrl.includes("?") ? "&" : "?"}t=${cacheStamp}`
      : undefined,
    isUploading,
    upload,
  };
}

// ─── Autosave ─────────────────────────────────────────────────────────────────

/**
 * Debounced draft persistence.
 *
 * Nova's header promises "auto-saved as you type" and never saves anything.
 * Here it is real: every edit schedules a full-document POST to the same
 * create endpoint the wizard uses. Deliberately fire-and-forget — a failed
 * autosave must not interrupt typing, and the explicit Generate action saves
 * again before it finalises, so nothing is lost if the last write missed.
 */
export function useDebouncedAutosave(
  save: () => void,
  dependency: unknown,
  { enabled, delayMs }: { enabled: boolean; delayMs: number }
): void {
  // Latest-ref pattern, updated in an effect rather than during render: the
  // timer must call the newest `save` (which closes over current form state)
  // without the callback's identity restarting the debounce on every keystroke.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  // The first pass is the state the editor mounted with, not an edit.
  const isFirstPass = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (isFirstPass.current) {
      isFirstPass.current = false;
      return;
    }

    const timer = setTimeout(() => saveRef.current(), delayMs);
    return () => clearTimeout(timer);
  }, [dependency, enabled, delayMs]);
}

/** Convenience wrapper so callers can type the envelope without repeating it. */
export type SimpleResponse = BaseResponse<Record<string, unknown>>;
// ─── Templates ────────────────────────────────────────────────────────────────

export interface InvoiceTemplates {
  templates: InvoiceTemplate[];
  /** False while the list is loading, so the picker can shimmer. */
  isReady: boolean;
  /** True while any create, update, rename or delete is in flight. */
  isMutating: boolean;
  /**
   * Creates one. The server mints the id, so it arrives in `onSaved` rather than
   * being returned — the caller needs it to link the invoice to the new template.
   */
  save: (name: string, snapshot: InvoiceTemplateSnapshot, onSaved: (id: string) => void) => void;
  /** Full replace, keeping the name. */
  update: (templateId: string, snapshot: InvoiceTemplateSnapshot) => void;
  /** Also a full replace: the API has no rename endpoint. */
  rename: (templateId: string, name: string) => void;
  remove: (templateId: string) => void;
  /**
   * Records that a template was used.
   *
   * Implemented as a read of `/templates/{id}`, because bumping `lastUsedAt` is
   * that endpoint's documented side effect and there is no other way to signal
   * it. The response is discarded: the list already carries full templates, so
   * the merchant's invoice is filled in from the row they clicked and this only
   * moves the template up the list next time.
   */
  markUsed: (templateId: string) => void;
}

/**
 * Saved invoice templates, from the API.
 *
 * This hook is the whole of the feature's template storage: the picker card, the
 * save dialog, the manage dialog and the header's split button all go through
 * it and none of them knows where a template lives. It used to be backed by a
 * persisted zustand store, because the endpoints did not exist; that store is
 * deleted, and nothing about templates touches localStorage any more.
 *
 * Every mutation invalidates the list rather than patching a local copy, so what
 * the picker shows is always what the server holds — including `savedAt` and
 * `lastUsedAt`, which only it can supply.
 */
export function useInvoiceTemplates(): InvoiceTemplates {
  const merchantId = useInvoiceMerchantId();
  const queryClient = useQueryClient();

  const listKey = useMemo(() => ["invoice-templates", merchantId], [merchantId]);
  const listUrl = invoiceTemplatesApi(merchantId);

  const { data, isLoading } = useGet<TemplateListResponse>(listKey, listUrl, undefined, {
    enabled: !!listUrl,
  });

  const invalidateList = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: listKey }),
    [queryClient, listKey]
  );

  /**
   * Most recently used first, then most recently saved.
   *
   * Sorted here because the list endpoint promises no order, and because recency
   * is what a picker wants: the template a merchant reaches for weekly would
   * otherwise sink as they add others.
   */
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

  // One hook each for PUT and DELETE, addressed per call through `dynamicUrl`:
  // the template id is only known at click time, and useApiMutation resolves
  // `dynamicUrl` over the hook's own url for exactly this case.
  const { mutate: replace, isPending: isReplacing } = usePut<
    TemplateWriteResponse,
    { dynamicUrl: string; reqBody: TemplateWriteBody }
  >("", { invalidateQueries: false });

  const { mutate: destroy, isPending: isDeleting } = useDelete<
    SimpleResponse,
    { dynamicUrl: string }
  >("", { invalidateQueries: false });

  const save = useCallback(
    (name: string, snapshot: InvoiceTemplateSnapshot, onSaved: (id: string) => void) => {
      create(toTemplateWriteBody(name, snapshot), {
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

  /** PUT takes the same body as POST, so both write paths share one builder. */
  const put = useCallback(
    (templateId: string, name: string, snapshot: InvoiceTemplateSnapshot, failure: string) => {
      replace(
        {
          dynamicUrl: invoiceTemplateApi(merchantId, templateId),
          reqBody: toTemplateWriteBody(name, snapshot),
        },
        {
          onSuccess: invalidateList,
          onError: (error) => toast.error(failure, { description: error.message }),
        }
      );
    },
    [replace, merchantId, invalidateList]
  );

  const update = useCallback(
    (templateId: string, snapshot: InvoiceTemplateSnapshot) => {
      const existing = templates.find((template) => template.id === templateId);
      if (!existing) return;
      put(templateId, existing.name, snapshot, "Couldn't update the template");
    },
    [templates, put]
  );

  /**
   * Renaming is a full replace of the template's contents with a new name, since
   * the API exposes no rename. The snapshot therefore has to come from the list,
   * which is why this cannot be issued for a template that is not in it.
   */
  const rename = useCallback(
    (templateId: string, name: string) => {
      const existing = templates.find((template) => template.id === templateId);
      if (!existing) return;
      put(templateId, name, existing.snapshot, "Couldn't rename the template");
    },
    [templates, put]
  );

  const remove = useCallback(
    (templateId: string) => {
      destroy(
        { dynamicUrl: invoiceTemplateApi(merchantId, templateId) },
        {
          onSuccess: invalidateList,
          onError: (error) =>
            toast.error("Couldn't delete the template", { description: error.message }),
        }
      );
    },
    [destroy, merchantId, invalidateList]
  );

  /**
   * The read that records a use.
   *
   * A disabled query plus an explicit refetch, the same idiom mca-transactions
   * uses for its presigned-URL downloads: the id is only known at click time, so
   * it goes into state, and the fetch runs from the effect's async callback
   * rather than the effect body. Failure is silent by design — the invoice has
   * already been filled in, and "couldn't record that you used this template" is
   * not something to interrupt a merchant with.
   */
  const [pendingUseId, setPendingUseId] = useState<string | null>(null);

  const { refetch: readTemplate } = useGet<TemplateResponse>(
    ["invoice-template", merchantId, pendingUseId],
    pendingUseId ? invoiceTemplateApi(merchantId, pendingUseId) : "",
    undefined,
    { enabled: false, staleTime: 0 }
  );

  useEffect(() => {
    if (!pendingUseId) return;

    const run = async (): Promise<void> => {
      await readTemplate();
      setPendingUseId(null);
      // The bump only shows up in the list, which this hook holds.
      void queryClient.invalidateQueries({ queryKey: listKey });
    };

    void run();
  }, [pendingUseId, readTemplate, queryClient, listKey]);

  return {
    templates,
    isReady: !isLoading,
    isMutating: isCreating || isReplacing || isDeleting,
    save,
    update,
    rename,
    remove,
    markUsed: setPendingUseId,
  };
}
