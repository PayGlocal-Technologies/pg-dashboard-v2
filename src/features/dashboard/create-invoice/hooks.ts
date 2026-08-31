"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGet, usePost, usePut } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { useInvoiceTemplatesStore, type DraftMemory } from "@/stores/useInvoiceTemplates";
import { describeSnapshot, themeFor } from "@/features/dashboard/create-invoice/helpers";
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

      return Object.keys(stateCodes)
        .filter((name) => name !== "OTHER COUNTRY")
        .map((name) => ({ label: titleCase(name), value: name }))
        // The API returns its map unordered. Sorted on the *label*, which is
        // what the user reads and what Select's type-ahead matches against.
        .sort((a, b) => a.label.localeCompare(b.label));
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
 */
export function useInvoiceAsset(type: "LOGO" | "SIGNATURE"): InvoiceAsset {
  const merchantId = useInvoiceMerchantId();
  const [isUploading, setIsUploading] = useState(false);

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
                  void refetch();
                },
                onError: () => setIsUploading(false),
              }
            );
          },
          onError: () => setIsUploading(false),
        }
      );
    },
    [merchantId, requestUploadUrl, putToS3, refetch]
  );

  return { url: data?.data?.fileUrl, isUploading, upload };
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
  /** False until the persisted list has been read in; see the store's note. */
  isReady: boolean;
  /** Returns the new template's id, so the caller can select it. */
  save: (name: string, snapshot: InvoiceTemplateSnapshot) => string;
  update: (templateId: string, snapshot: InvoiceTemplateSnapshot) => void;
  rename: (templateId: string, name: string) => void;
  remove: (templateId: string) => void;
  /** Call when a template is applied. Goes away once the server stamps it. */
  markUsed: (templateId: string) => void;
}

/**
 * THE SEAM.
 *
 * Every template-aware component in this feature — the picker card, the save
 * dialog, the manage dialog, the header's split button — talks to templates
 * only through this hook. Nothing above it knows where they are stored.
 *
 * Today: a per-merchant slice of a persisted zustand store (localStorage).
 * Tomorrow: `useGet(invoiceTemplatesApi(mid))` for the list and three
 * `usePost`/`useDelete` calls for the mutators, once the contract is known.
 *
 * Replacing the body is the entire migration. Keep the interface identical and
 * no consumer changes:
 *
 *   - `templates` becomes `data?.data?.templates ?? []`
 *   - `isReady` becomes `!isLoading`
 *   - `save` posts and returns the server's id instead of minting one
 *   - `update` / `rename` / `remove` post and let react-query invalidate
 *
 * The one thing that will change shape is id minting: the server will own ids,
 * so `save` becomes async and callers that select the new template will need to
 * do it in an onSuccess. Both current callers already handle the id as a return
 * value rather than assuming it, which is why that is a small change.
 */
export function useInvoiceTemplates(): InvoiceTemplates {
  const merchantId = useInvoiceMerchantId();

  const templatesByMid = useInvoiceTemplatesStore((state) => state.templatesByMid);
  const saveTemplate = useInvoiceTemplatesStore((state) => state.saveTemplate);
  const updateSnapshot = useInvoiceTemplatesStore((state) => state.updateSnapshot);
  const renameTemplate = useInvoiceTemplatesStore((state) => state.renameTemplate);
  const deleteTemplate = useInvoiceTemplatesStore((state) => state.deleteTemplate);
  const markUsedInStore = useInvoiceTemplatesStore((state) => state.markUsed);

  const [isReady, setIsReady] = useState(false);

  // The store sets skipHydration, so the persisted list is read in here, on the
  // client, after the first paint. setState lives in the promise continuation
  // rather than the effect body, per CLAUDE.md's purity rule.
  useEffect(() => {
    let cancelled = false;
    void useInvoiceTemplatesStore.persist.rehydrate()?.then(() => {
      if (!cancelled) setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Most recently used first, then most recently saved.
   *
   * The picker used to list templates in the order they were created, so the
   * one a merchant reaches for weekly sank as they added others. Ordering by
   * recency is also what the API's `lastUsedAt` is for, so this survives the
   * swap unchanged.
   */
  const templates = useMemo(() => {
    const mine = templatesByMid[merchantId] ?? [];
    return [...mine].sort((a, b) => {
      const used = Number(b.lastUsedAt ?? 0) - Number(a.lastUsedAt ?? 0);
      return used !== 0 ? used : Number(b.savedAt ?? 0) - Number(a.savedAt ?? 0);
    });
  }, [templatesByMid, merchantId]);

  const save = useCallback(
    (name: string, snapshot: InvoiceTemplateSnapshot): string => {
      // Date.now() in an event handler, never during render. The server will own
      // this once the endpoint exists.
      const id = `tpl_${Date.now().toString(36)}`;
      saveTemplate(merchantId, {
        id,
        name,
        description: describeSnapshot(snapshot),
        savedAt: String(Date.now()),
        snapshot,
      });
      return id;
    },
    [merchantId, saveTemplate]
  );

  const update = useCallback(
    (templateId: string, snapshot: InvoiceTemplateSnapshot) =>
      // The description is derived from the snapshot, so it is recomputed here
      // rather than left behind describing the previous contents.
      updateSnapshot(merchantId, templateId, snapshot, describeSnapshot(snapshot)),
    [merchantId, updateSnapshot]
  );

  const rename = useCallback(
    (templateId: string, name: string) => renameTemplate(merchantId, templateId, name),
    [merchantId, renameTemplate]
  );

  const remove = useCallback(
    (templateId: string) => deleteTemplate(merchantId, templateId),
    [merchantId, deleteTemplate]
  );

  const markUsed = useCallback(
    // Date.now() in a handler, never during render.
    (templateId: string) => markUsedInStore(merchantId, templateId, String(Date.now())),
    [merchantId, markUsedInStore]
  );

  return { templates, isReady, save, update, rename, remove, markUsed };
}

/**
 * Per-draft memory for the one thing the invoice cannot hold: which template it
 * came from.
 *
 * Restoration is pushed through `onRestore` rather than returned as state on
 * purpose. The persisted record is only readable after `rehydrate()` resolves,
 * and calling setState from an effect *body* to apply it is exactly what
 * CLAUDE.md's purity rule forbids. Handing it back from the promise continuation
 * keeps the update in an async callback, where it is allowed.
 *
 * `onRestore` fires at most once per invoice, and only when there is something
 * stored. A fresh draft never triggers it, so nothing overwrites the defaults
 * the form was seeded with.
 */
export function useDraftMemory(
  invoiceId: string,
  onRestore: (memory: DraftMemory) => void
): { isReady: boolean; remember: (memory: DraftMemory) => void } {
  const [isReady, setIsReady] = useState(false);

  // The continuation below outlives this render, so the callback is read through
  // a ref rather than captured. Written in an effect, never during render.
  const onRestoreRef = useRef(onRestore);
  useEffect(() => {
    onRestoreRef.current = onRestore;
  });

  useEffect(() => {
    if (!invoiceId) return;

    let cancelled = false;
    void useInvoiceTemplatesStore.persist.rehydrate()?.then(() => {
      if (cancelled) return;
      const stored = useInvoiceTemplatesStore.getState().draftMemory[invoiceId];
      if (stored) onRestoreRef.current(stored);
      setIsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  /**
   * Writes straight through `getState()` rather than subscribing.
   *
   * The editor calls this from an effect on every branding change. Subscribing
   * to `draftMemory` as well would re-render the editor on its own write, which
   * would fire the effect again — a loop. Nothing reads this slice reactively;
   * it is written here and read once, above.
   */
  const remember = useCallback(
    (memory: DraftMemory) => {
      if (!invoiceId) return;
      useInvoiceTemplatesStore.getState().rememberDraft(invoiceId, memory);
    },
    [invoiceId]
  );

  return { isReady, remember };
}
