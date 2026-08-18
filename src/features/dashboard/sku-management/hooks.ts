"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDelete, useGet, usePost, usePostQuery, usePut } from "@/lib/api/hooks";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  mcaCurrenciesApi,
  skuCreateApi,
  skuDeleteApi,
  skuDuplicateApi,
  skuExtractedRowsApi,
  skuImportFileApi,
  skuSearchApi,
  skuTemplateApi,
  skuUpdateApi,
  skuUploadInitiateApi,
} from "@/features/dashboard/sku-management/services";
import { SKU_PAGE_LIMIT } from "@/features/dashboard/sku-management/constants";
import { isSkuItemFormValid } from "@/features/dashboard/sku-management/schemas";
import type {
  ExtractedSkuRow,
  McaCurrency,
  McaCurrencyListResponse,
  SkuApiItem,
  SkuApiType,
  SkuExtractedRowsResponse,
  SkuImportCountResponse,
  SkuItemFormValues,
  SkuMutationPayload,
  SkuProduct,
  SkuProductType,
  SkuSearchResponse,
  SkuSkippedItem,
  SkuTemplateResponse,
  SkuUploadInitiateResponse,
} from "@/features/dashboard/sku-management/types";
import type { TableReqBody } from "@/types/transactions";

// ── Wire ↔ render mapping ───────────────────────────────────────────────────
// The one place that knows both shapes. Components keep consuming SkuProduct
// exactly as they did when it came from MOCK_SKU_PRODUCTS.

/** GOOD → GOODS, SERVICE → SERVICES, null → null (see SkuProduct.type). */
function toProductType(apiType: SkuApiType | null): SkuProductType | null {
  if (apiType === "GOOD") return "GOODS";
  if (apiType === "SERVICE") return "SERVICES";
  return null;
}

/** The inverse, for create/update. Only ever called with a validated form
 *  value, which is why it cannot return null. */
function toApiType(type: SkuProductType): SkuApiType {
  return type === "GOODS" ? "GOOD" : "SERVICE";
}

/**
 * Prices arrive as decimal strings and are rendered as numbers. Number("") is
 * 0, which would be a wrong price rather than a missing one, so a blank or null
 * cost is mapped through the same guard as an unparseable one: 0, matching what
 * the table drew for mock rows that had no cost.
 */
function toPrice(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * One catalogue row, wire → render. `images` is absent by design: the API has no
 * media field (see the migration report), and ProductThumbnail already falls
 * back to a type glyph when a row has none.
 */
export function toSkuProduct(item: SkuApiItem): SkuProduct {
  return {
    id: item.id,
    mid: item.mid,
    name: item.name,
    type: toProductType(item.type),
    hsnSac: item.hsnSac ?? "",
    sellingPrice: toPrice(item.unitPrice),
    productCost: toPrice(item.costPrice),
    currency: item.currency ?? "",
    description: item.description ?? "",
  };
}

/**
 * Form values → create/update body, field-for-field from pg-dashboard's
 * buildPayload (AddEditSkuModal). The three conditional spreads are the
 * contract: a blank optional field is omitted from the body, not sent empty.
 *
 * Returns null unless the whole form passes — the same gate the mock-era
 * toSkuProductFields applied, so a half-valid item can no more reach the
 * endpoint than it could reach the local catalogue. The form gates submission
 * on this too, making it a guard rather than a reachable path.
 */
export function toSkuMutationPayload(values: SkuItemFormValues): SkuMutationPayload | null {
  if (!isSkuItemFormValid(values)) return null;
  if (values.type !== "GOODS" && values.type !== "SERVICES") return null;

  const hsnSac = values.hsnSac.trim();
  const costPrice = values.productCost.trim();
  const description = values.description.trim();

  return {
    type: toApiType(values.type),
    name: values.name.trim(),
    unitPrice: values.sellingPrice.trim(),
    currency: values.currency,
    ...(hsnSac ? { hsnSac } : {}),
    ...(costPrice ? { costPrice } : {}),
    ...(description ? { description } : {}),
  };
}

/**
 * Row → update body, for the two inline price cells, which edit a saved row
 * without going through the form. The endpoint replaces the row rather than
 * patching it, so every field has to be resent; `overrides` carries just the one
 * the merchant changed.
 *
 * Returns null for a row with no type (see SkuProduct.type): the body requires
 * one, and picking a type on the merchant's behalf would write a guess into
 * their catalogue. The caller says so rather than sending it.
 */
export function toSkuPayloadFromProduct(
  product: SkuProduct,
  overrides: Partial<Pick<SkuProduct, "sellingPrice" | "productCost">> = {}
): SkuMutationPayload | null {
  if (!product.type) return null;

  const sellingPrice = overrides.sellingPrice ?? product.sellingPrice;
  const productCost = overrides.productCost ?? product.productCost;
  const hsnSac = product.hsnSac.trim();
  const description = product.description.trim();

  return {
    type: toApiType(product.type),
    name: product.name.trim(),
    unitPrice: String(sellingPrice),
    currency: product.currency,
    ...(hsnSac ? { hsnSac } : {}),
    // 0 is a real cost the merchant may have set deliberately, so it is sent;
    // only a genuinely absent one is omitted, matching how the row was mapped in.
    ...(productCost || productCost === 0 ? { costPrice: String(productCost) } : {}),
    ...(description ? { description } : {}),
  };
}

// ── MID resolution ──────────────────────────────────────────────────────────

/**
 * The catalogue's merchant id, which every one of its endpoints takes as a path
 * segment for every user — not just partners. `urlMid || midFilter[0]` resolves
 * to the same id pg-dashboard computes as
 * `selectedMid || pacbMids[0] || profile.mid`, because midFilter carries
 * [selectedMid] when a MID is picked and the full paCbMids list when none is,
 * falling back to the profile MID. Same pattern the settlement report uses.
 *
 * `midFilter` is returned alongside it for the search body's own filter, whose
 * key is **`mid`**, not `merchantId` — see useSkuCatalogue.
 */
export function useSkuPathMid() {
  const { urlMid, midFilter, isReady, guardState } = useResolvedMids("PACB");
  const mid = urlMid || midFilter?.value?.[0] || "";
  return { mid, midFilter, isReady: isReady && !!mid, guardState };
}

/**
 * The catalogue search's `fieldSearch`, or undefined when there is nothing to
 * filter on. Built here rather than inline so the "omit the key entirely rather
 * than send an empty array" rule holds for both entries: an empty `type` would
 * narrow the search to no product type at all rather than to every one.
 */
function buildCatalogueFieldSearch(
  mids: string[] | undefined,
  type: SkuProductType | undefined
): Record<string, string | string[]> | undefined {
  const fieldSearch: Record<string, string | string[]> = {};
  if (mids?.length) fieldSearch.mid = mids;
  if (type) fieldSearch.type = [toApiType(type)];
  return Object.keys(fieldSearch).length > 0 ? fieldSearch : undefined;
}

// ── Reads ───────────────────────────────────────────────────────────────────

interface SkuCatalogueArgs {
  /** The search box's current query, already trimmed by the caller. */
  search: string;
  /** Which product type the selected tab narrows to, or undefined for All. */
  type?: SkuProductType;
  /** 1-based page, as the table holds it. */
  page: number;
}

interface SkuCatalogue {
  products: SkuProduct[];
  totalCount: number;
  /** First load only — no cached page yet. Drives the table's skeleton. */
  isLoading: boolean;
  /** True for refetches over existing rows too, e.g. after a mutation. */
  isFetching: boolean;
  isError: boolean;
  guardState: "ready" | "not-applicable";
  refetch: () => void;
}

/**
 * The catalogue list. Search, paging and the type tabs are all server-side, so
 * the rows that arrive are the rows to draw and `totalCount` always describes
 * the same set they came from.
 *
 * One caveat on the type filter, because it is the one part of this body with no
 * production precedent: pg-dashboard's SKU search only ever sends
 * `fieldSearch.mid`, so the `type` key is inferred rather than copied. It follows
 * the convention every other fieldSearch key in both apps follows — the key is
 * the record's own field name, and the value is the record's own enum, so `type`
 * takes the API's singular `GOOD`/`SERVICE` and not v2's plural display form. If
 * the backend happens to name it something else, a type tab returns no rows,
 * which is visible immediately rather than quietly wrong.
 */
export function useSkuCatalogue({ search, type, page }: SkuCatalogueArgs): SkuCatalogue {
  const { mid, midFilter, isReady, guardState } = useSkuPathMid();

  // Stable across renders as long as its inputs are — usePostQuery folds the
  // body into the query key, so an object rebuilt every render would refetch
  // forever. `midFilter` is memoised by useResolvedMids, so it is safe here.
  const body = useMemo<TableReqBody>(
    () => ({
      queryString: search || undefined,
      // Verbatim from pg-dashboard: a query switches the filter type, an empty
      // box is DEFAULT.
      searchFilterType: search ? "QUERY_FILTER_TYPE" : "DEFAULT",
      // Two possible keys. `mid` is not `merchantId`: midFilter names itself
      // "merchantId" because that is what the OpenSearch txn endpoints want,
      // while the catalogue search wants `mid`, so only the values carry over.
      // `type` carries the API's own enum — see the note above.
      fieldSearch: buildCatalogueFieldSearch(midFilter?.value, type),
      from: (page - 1) * SKU_PAGE_LIMIT,
      pageLimit: SKU_PAGE_LIMIT,
    }),
    [search, midFilter, type, page]
  );

  const { data, isPending, isFetching, isError, refetch } = usePostQuery<
    SkuSearchResponse,
    TableReqBody
  >(["sku-catalogue", mid], skuSearchApi(mid), body, { staleTime: 0 }, isReady);

  const products = useMemo(() => (data?.data?.data ?? []).map(toSkuProduct), [data]);

  return {
    products,
    totalCount: data?.data?.totalCount ?? 0,
    isLoading: isReady && isPending,
    isFetching,
    isError,
    guardState,
    refetch: () => void refetch(),
  };
}

// ── Writes ──────────────────────────────────────────────────────────────────
// Every mutation invalidates the catalogue query rather than calling refetch
// with a remembered body, which is how pg-dashboard does it (`refetch(reqBody)`
// threaded through every modal). Invalidation is equivalent and cannot go stale
// against a body the table has since changed.

const CATALOGUE_KEY = ["sku-catalogue"];

interface SkuMutation {
  isPending: boolean;
}

/** POST /sku/{mid}. `onDone` fires only on success, so the form can decide
 *  between closing and staying open for the next item. */
export function useCreateSku(onDone?: () => void): {
  createSku: (payload: SkuMutationPayload) => void;
} & SkuMutation {
  const { mid } = useSkuPathMid();

  const { mutate, isPending } = usePost<unknown, SkuMutationPayload>(skuCreateApi(mid), {
    invalidateQueries: [CATALOGUE_KEY],
    onSuccess: () => {
      toast.success("Item added to your catalog.");
      onDone?.();
    },
    onError: (error: Error) => toast.error(error.message || "Failed to add item."),
  });

  return { createSku: (payload) => mutate(payload), isPending };
}

/**
 * PUT /sku/{mid}/{id}. Serves both the item form and the two inline price
 * cells, so it takes a whole payload: the endpoint replaces the row rather than
 * patching it, and sending only the edited price would blank every other field.
 * `rowMid` is the row's own MID, which matters for a multi-MID merchant.
 */
export function useUpdateSku(onDone?: () => void): {
  updateSku: (args: { id: string; rowMid?: string; payload: SkuMutationPayload }) => void;
} & SkuMutation {
  const { mid } = useSkuPathMid();

  const { mutate, isPending } = usePut<unknown, SkuMutationPayload & { dynamicUrl: string }>("", {
    invalidateQueries: [CATALOGUE_KEY],
    onSuccess: () => {
      toast.success("Item updated successfully.");
      onDone?.();
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update item."),
  });

  return {
    updateSku: ({ id, rowMid, payload }) =>
      mutate({ dynamicUrl: skuUpdateApi(rowMid || mid, id), ...payload }),
    isPending,
  };
}

/** DELETE /sku/{mid}/{id}. Confirmed by DeleteSkuDialog before it ever runs. */
export function useDeleteSku(): {
  deleteSku: (product: SkuProduct) => void;
} & SkuMutation {
  const { mid } = useSkuPathMid();

  const { mutate, isPending } = useDelete<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: [CATALOGUE_KEY],
    onError: (error: Error) => toast.error(error.message || "Failed to delete item."),
  });

  return {
    deleteSku: (product) =>
      mutate(
        { dynamicUrl: skuDeleteApi(product.mid || mid, product.id) },
        { onSuccess: () => toast.success(`"${product.name}" deleted.`) }
      ),
    isPending,
  };
}

/** POST /sku/{mid}/{id}/duplicate. Takes no body — the server copies the row. */
export function useDuplicateSku(): {
  duplicateSku: (product: SkuProduct) => void;
} & SkuMutation {
  const { mid } = useSkuPathMid();

  const { mutate, isPending } = usePost<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: [CATALOGUE_KEY],
    onError: (error: Error) => toast.error(error.message || "Failed to duplicate item."),
  });

  return {
    duplicateSku: (product) =>
      mutate(
        { dynamicUrl: skuDuplicateApi(product.mid || mid, product.id) },
        { onSuccess: () => toast.success(`"${product.name}" duplicated.`) }
      ),
    isPending,
  };
}

// ── MID scope ───────────────────────────────────────────────────────────────

interface SkuMidScope {
  /** True when the merchant holds more than one PACB MID and has selected
   *  none — the state in which "which account is this row on?" is a real
   *  question, so the table shows a MID column and the page's actions ask which
   *  MID they apply to. Mirrors pg-dashboard's `isMultiPacbMid && !selectedMid`. */
  needsMidChoice: boolean;
  /** Every PACB MID available to pick from, for those action pickers. */
  midOptions: string[];
  /** Commits a pick, so "Add item" opens the form already scoped to that MID —
   *  the same store the header's merchant selector writes. */
  selectMid: (mid: string) => void;
}

export function useSkuMidScope(): SkuMidScope {
  const paCbMids = useApp((s) => s.paCbMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);

  return {
    needsMidChoice: paCbMids.length > 1 && !selectedMid,
    midOptions: paCbMids,
    // Colour is what the header's merchant chip is tinted with; pg-dashboard
    // sets one here too when the SKU page selects a MID on the merchant's
    // behalf, so the chip doesn't appear blank afterwards.
    selectMid: (mid: string) => setSelectedMidDetails({ mid, color: "#E5B5FF" }),
  };
}

// ── Merchant currencies ─────────────────────────────────────────────────────

/**
 * The currencies this merchant may price a SKU in. Fetched, not hardcoded:
 * which rails a merchant holds is their configuration, and the seven in
 * SKU_CURRENCIES were a stand-in for this call.
 *
 * pg-dashboard concatenates local then global and keeps the first occurrence of
 * each code; it then caches the result in a zustand store via an effect. The
 * dedupe is reproduced exactly, the caching is not — react-query already holds
 * the response, and the effect-into-store would be the setState-in-effect the
 * React Compiler lint plugin rejects (see CLAUDE.md).
 *
 * Falls back to SKU_CURRENCIES while the call is in flight or if it fails, so
 * the form is never left with an empty currency select.
 */
export function useMcaCurrencies(): { currencies: McaCurrency[]; isLoading: boolean } {
  const { mid, isReady } = useSkuPathMid();

  const { data, isPending } = useGet<McaCurrencyListResponse>(
    ["mca-currencies", mid],
    mcaCurrenciesApi(mid),
    { enabled: isReady }
  );

  const currencies = useMemo(() => {
    const local = data?.data?.local_currency ?? [];
    const global = data?.data?.global_currency ?? [];
    const byCode = new Map<string, McaCurrency>();
    for (const currency of [...local, ...global]) {
      if (!byCode.has(currency.currencyCode)) byCode.set(currency.currencyCode, currency);
    }
    return [...byCode.values()];
  }, [data]);

  return { currencies, isLoading: isReady && isPending };
}

// ── Bulk import from a file ─────────────────────────────────────────────────

/**
 * The template download. A disabled query plus an explicit trigger, because the
 * response is a presigned URL with a lifetime rather than a file: fetching it on
 * mount would mean handing the merchant an expired link by the time they click.
 */
export function useSkuTemplate(): { downloadTemplate: () => void; isLoading: boolean } {
  const { refetch, isFetching } = useGet<SkuTemplateResponse>(["sku-template"], skuTemplateApi(), {
    enabled: false,
  });

  return {
    downloadTemplate: () => {
      void refetch().then((result) => {
        const url = result.data?.data?.template_url;
        if (!url) {
          toast.error("Failed to get template.");
          return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
      });
    },
    isLoading: isFetching,
  };
}

/** Where the import modal is. Derived from what has resolved, not stepped
 *  through by hand, so a failed leg can't leave the modal on a later step. */
export type SkuImportStep = "upload" | "review" | "done";

interface SkuFileImport {
  step: SkuImportStep;
  /** The chosen file, for its name and size while it uploads. */
  file: File | null;
  /** True from the moment a file is picked until its rows come back. */
  isProcessing: boolean;
  rows: ExtractedSkuRow[];
  importedCount: number;
  skipped: SkuSkippedItem[];
  isImporting: boolean;
  selectFile: (file: File) => void;
  commit: () => void;
  reset: () => void;
}

/**
 * The whole four-leg import: initiate → PUT to S3 → read extracted rows →
 * commit. Mirrors pg-dashboard's ImportFromFileModal, with one deliberate
 * difference: pg-dashboard copies the extracted rows into state from inside an
 * effect and advances a step counter there. Here the rows are read straight off
 * the query and the step is derived from them, which is the same behaviour
 * without the setState-in-effect v2's lint plugin rejects.
 */
export function useSkuFileImport(onImported?: () => void, midOverride?: string): SkuFileImport {
  const { mid: pathMid } = useSkuPathMid();
  // A multi-MID merchant picks which account to import into without re-scoping
  // the whole page, so the override wins when one was chosen. pg-dashboard
  // threads the same `importMid` through its modal.
  const mid = midOverride || pathMid;

  const [file, setFile] = useState<File | null>(null);
  const [fileRef, setFileRef] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  // Set once the commit returns, which is the one thing that cannot be derived
  // from a query: it is a mutation result.
  const [result, setResult] = useState<{ importedCount: number; skipped: SkuSkippedItem[] } | null>(
    null
  );

  const { data: rowsData, isFetching: isFetchingRows } = useGet<SkuExtractedRowsResponse>(
    ["sku-extracted-rows", mid, fileRef],
    skuExtractedRowsApi(mid, fileRef),
    { enabled: !!fileRef }
  );

  const { mutate: initiateUpload } = usePost<SkuUploadInitiateResponse, object>(
    skuUploadInitiateApi(mid)
  );

  // Straight to S3, so no invalidation and no JSON content type — the presigned
  // URL carries its own auth and the body is the file itself.
  const { mutateAsync: uploadToS3 } = usePut<
    void,
    { dynamicUrl: string; customHeaders: Record<string, string>; reqBody: File }
  >("", { invalidateQueries: false });

  const { mutate: importFile, isPending: isImporting } = usePost<
    SkuImportCountResponse,
    { fileRef: string }
  >(skuImportFileApi(mid), {
    invalidateQueries: [CATALOGUE_KEY],
    onSuccess: (res) => {
      setResult({
        importedCount: res?.data?.importedCount ?? 0,
        skipped: res?.data?.skipped ?? [],
      });
      onImported?.();
    },
    onError: (error: Error) => toast.error(error.message || "Import failed."),
  });

  const reset = () => {
    setFile(null);
    setFileRef("");
    setIsUploading(false);
    setResult(null);
  };

  const selectFile = (next: File) => {
    setFile(next);
    setIsUploading(true);
    setFileRef("");
    setResult(null);

    initiateUpload(
      {},
      {
        onSuccess: async (res) => {
          const uploadUrl = res?.data?.upload_url;
          const ref = res?.data?.fileRef;
          if (!uploadUrl || !ref) {
            setIsUploading(false);
            toast.error("Failed to initiate upload.");
            return;
          }

          try {
            await uploadToS3({
              dynamicUrl: uploadUrl,
              // Both headers are echoed from the initiate response, with
              // pg-dashboard's own fallbacks kept: S3 rejects the PUT if the
              // metadata it was presigned with is missing.
              customHeaders: {
                "x-amz-meta-filetype": res.data.metaData?.fileType ?? "xlsx",
                "x-amz-meta-maxsize": res.data.metaData?.maxSize ?? "10",
              },
              reqBody: next,
            });
          } catch {
            setIsUploading(false);
            toast.error("Failed to upload file.");
            return;
          }

          // Setting the ref is what enables the extracted-rows query above.
          setIsUploading(false);
          setFileRef(ref);
        },
        onError: () => {
          setIsUploading(false);
          toast.error("Failed to initiate upload.");
        },
      }
    );
  };

  const rows = rowsData?.data?.rows ?? [];
  const step: SkuImportStep = result ? "done" : rows.length > 0 ? "review" : "upload";

  return {
    step,
    file,
    isProcessing: isUploading || isFetchingRows,
    rows,
    importedCount: result?.importedCount ?? 0,
    skipped: result?.skipped ?? [],
    isImporting,
    selectFile,
    commit: () => fileRef && importFile({ fileRef }),
    reset,
  };
}
