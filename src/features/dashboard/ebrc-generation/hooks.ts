"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePost, usePostQuery, usePut } from "@/lib/api/hooks";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useNeedsMidSelection } from "@/features/dashboard/multi-currency/hooks";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { ebrcFetchApi, ebrcGenerationApi } from "@/features/dashboard/ebrc-generation/services";
import {
  buildBulkUploadS3Headers,
  buildS3Headers,
  downloadBase64File,
  toEbrcRequestRow,
  toIrmRepositoryRow,
  toIrmSelectionRow,
  type IrmRepositoryRow,
} from "@/features/dashboard/ebrc-generation/helpers";
import type {
  Base64FileResponse,
  BulkUploadExcelResponse,
  CustomerStatusResponse,
  EbrcRequestRow,
  EbrcSearchReqBody,
  EbrcSearchResponse,
  ExtractionStatusApiResponse,
  ExtractShippingDataResponse,
  IrmDetails,
  IrmSelectionRow,
  IRMRecordsApiResponse,
  IrmSearchResponse,
  PresignedUploadResponse,
  RefreshRecordsRequestBody,
  ShippingBillData,
} from "@/features/dashboard/ebrc-generation/types";

/**
 * The variables shape `usePut` destructures for a presigned upload: the signed
 * URL to PUT to, the file itself, and the headers it was signed with. Typed
 * rather than cast, so a typo in any of these three keys is a compile error —
 * they are the exact names `useApiMutation` pulls out of the body, and a
 * misspelled one would silently POST to the wrong place.
 */
interface S3UploadVariables {
  dynamicUrl: string;
  reqBody: File;
  customHeaders: Record<string, string>;
}

/** Default page size, matching pg-dashboard's own PAGE_SIZE. */
export const EBRC_PAGE_SIZE = 10;

/** Rows-per-page choices offered in each eBRC table's footer. flux's pager
 *  renders the picker itself once these are passed. */
export const EBRC_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** Feature name the eBRC screens are gated on — see useFeatureApplicable. */
export const EBRC_FEATURE = "EBRC";

// ── DGFT session expiry ──────────────────────────────────────────────────────

interface DgftErrorBody {
  errors?: { requiresPasswordUpdate?: string; detailedMessage?: string };
}

/**
 * Every eBRC call can come back with `errors.requiresPasswordUpdate === "true"`,
 * which means the merchant's stored DGFT credentials no longer work. Production
 * handles this centrally in `useEbrcFetch`: it surfaces the backend's own
 * message and sends the merchant back to the screen that can re-authenticate.
 *
 * It arrives on the *success* path as well as the error path — the HTTP call
 * itself succeeds — so both are checked, exactly as production does.
 */
function extractDgftMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as DgftErrorBody;
  if (body.errors?.requiresPasswordUpdate !== "true") return null;
  return (
    body.errors.detailedMessage ?? "Your DGFT credentials are invalid. Please update your password."
  );
}

/**
 * Where an expired DGFT session sends the merchant, resolved by route exactly
 * as production's `resolveRedirectRoute` does: anything under the eBRC screens
 * goes back to eBRC Status, which is where the connect gate lives; anything
 * else stays on the IRM Repository rather than being thrown onto an unrelated
 * page. v2's wizard lives under `/ebrc-generation/generate`, so the same
 * prefix test covers it.
 */
function resolveDgftRedirect(pathname: string): string {
  return pathname.startsWith("/ebrc") ? "/ebrc-generation" : "/irm-repository";
}

function useDgftErrorHandler(): (payload: unknown) => boolean {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (payload: unknown): boolean => {
      const message = extractDgftMessage(payload);
      if (!message) return false;
      toast.error(message);
      router.push(resolveDgftRedirect(pathname));
      return true;
    },
    [router, pathname]
  );
}

// ── Shared MID scope ─────────────────────────────────────────────────────────

/**
 * eBRC is a PACB feature, so the MID scope resolves the same way every other
 * MCA screen's does. `merchantIds` is the list the search body filters on;
 * `mid` is the single MID the path-scoped operations address — production
 * takes the selected MID, else the first PACB one.
 */
function useEbrcScope(): {
  mid: string;
  merchantIds: string[] | undefined;
  midFilter: { key: string; value: string[] } | undefined;
  urlMid: string;
  isReady: boolean;
  guardState: "ready" | "not-applicable";
} {
  const { urlMid, midFilter, isReady, guardState } = useResolvedMids("PACB");
  const needsMidSelection = useNeedsMidSelection();
  const merchantIds = midFilter?.value;

  // Path-scoped calls address exactly one MID. For a partner user that is the
  // profile MID (urlMid); otherwise the first of the resolved PACB list, which
  // is what pg-dashboard's `selectedMid || paCbMids[0]` resolves to.
  //
  // Empty while a multi-MID merchant has picked nothing. Every path-scoped hook
  // guards on `!mid`, so this stops the DGFT session check, refresh, save and
  // push from quietly running against whichever MID happened to sort first —
  // the pages render SelectMidView in that state, and a request firing behind
  // it would be answering a question the merchant has not been asked yet.
  const mid = needsMidSelection ? "" : urlMid || merchantIds?.[0] || "";

  return { mid, merchantIds, midFilter, urlMid, isReady, guardState };
}

// ── 1/2. Search: irm/search and ebrc/search ──────────────────────────────────

interface SearchArgs {
  search: string;
  page: number;
  /** Rows per page. Defaults to EBRC_PAGE_SIZE when a caller offers no picker. */
  pageSize?: number;
  /** Server-side status filters, the same two keys pg-dashboard's own eBRC
   *  tables send. Both are optional: an empty array is omitted entirely rather
   *  than sent as a filter matching nothing. */
  mappingStatus?: string[];
  processStatus?: string[];
  /** Excludes IRMs already finished. The wizard's pick list sets this; the IRM
   *  Repository lists everything. */
  excludeCompleted?: boolean;
}

function useEbrcSearchBody(
  {
    search,
    page,
    pageSize = EBRC_PAGE_SIZE,
    mappingStatus,
    processStatus,
    excludeCompleted,
  }: SearchArgs,
  midFilter: { key: string; value: string[] } | undefined
): EbrcSearchReqBody {
  // Joined so a filter array rebuilt each render (the common case, since it
  // comes straight out of a chip's state) doesn't produce a new body — and
  // therefore a new query key — on every render.
  const mappingKey = (mappingStatus ?? []).join(",");
  const processKey = (processStatus ?? []).join(",");

  return useMemo(() => {
    const base = buildTxnRequestBody(
      {
        ...(mappingKey ? { irmMappingStatus: mappingKey.split(",") } : {}),
        ...(processKey ? { irmProcessStatus: processKey.split(",") } : {}),
      },
      {
        searchQuery: search,
        selectedMid: midFilter,
        pageLimit: pageSize,
        from: (page - 1) * pageSize,
      }
    );

    return {
      ...base,
      // Both eBRC searches sort on creationTime; the key name is `sortKey`
      // here, not the `sortBy` the transaction tables use.
      sortKey: "creationTime",
      ...(excludeCompleted ? { mustNotFilters: { irmProcessStatus: "COMPLETED" } } : {}),
    };
  }, [search, page, pageSize, mappingKey, processKey, excludeCompleted, midFilter]);
}

/** IRM search — the Select IRMs step and the IRM Repository read the same
 *  endpoint, differing only in whether completed IRMs are excluded. */
export function useIrmSearch(args: SearchArgs): {
  rows: IrmSelectionRow[];
  records: IrmDetails[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
} {
  const { midFilter, isReady } = useEbrcScope();
  const body = useEbrcSearchBody(args, midFilter);

  const { data, isPending, isError } = usePostQuery<IrmSearchResponse, EbrcSearchReqBody>(
    ["ebrc-irm-search"],
    ebrcFetchApi("irm/search"),
    body,
    { staleTime: 0 },
    isReady
  );

  const records = useMemo(() => data?.data?.data ?? [], [data]);

  return {
    rows: useMemo(() => records.map(toIrmSelectionRow), [records]),
    records,
    totalCount: data?.data?.totalCount ?? 0,
    isLoading: isReady && isPending,
    isError,
  };
}

/** The same endpoint, mapped to the IRM Repository's own row. */
export function useIrmRepository(args: SearchArgs): {
  rows: IrmRepositoryRow[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
} {
  const { midFilter, isReady } = useEbrcScope();
  const body = useEbrcSearchBody(args, midFilter);

  const { data, isPending, isError } = usePostQuery<IrmSearchResponse, EbrcSearchReqBody>(
    ["ebrc-irm-repository"],
    ebrcFetchApi("irm/search"),
    body,
    { staleTime: 0 },
    isReady
  );

  const records = useMemo(() => data?.data?.data ?? [], [data]);

  return {
    rows: useMemo(() => records.map(toIrmRepositoryRow), [records]),
    totalCount: data?.data?.totalCount ?? 0,
    isLoading: isReady && isPending,
    isError,
  };
}

/** eBRC request search — the eBRC Status table. */
export function useEbrcSearch(args: SearchArgs): {
  rows: EbrcRequestRow[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
} {
  const { midFilter, isReady } = useEbrcScope();
  const body = useEbrcSearchBody(args, midFilter);

  const { data, isPending, isError } = usePostQuery<EbrcSearchResponse, EbrcSearchReqBody>(
    ["ebrc-request-search"],
    ebrcFetchApi("ebrc/search"),
    body,
    { staleTime: 0 },
    isReady
  );

  const records = useMemo(() => data?.data?.data ?? [], [data]);

  return {
    rows: useMemo(() => records.map(toEbrcRequestRow), [records]),
    totalCount: data?.data?.totalCount ?? 0,
    isLoading: isReady && isPending,
    isError,
  };
}

// ── 3/4. refresh_irm and refresh_genebrc ─────────────────────────────────────

/**
 * Pulls fresh records from DGFT into the merchant's own store, then re-reads
 * the search.
 *
 * pg-dashboard fires this and calls the search 500ms later on a `setTimeout`.
 * Here the search is a react-query key, so the refresh invalidates it on
 * settle instead — same effect, no race with a fixed delay that a slow
 * DGFT round trip would lose.
 */
function useEbrcRefresh(
  operation: "refresh_irm" | "refresh_genebrc",
  invalidateKeys: string[]
): { refresh: () => void; isRefreshing: boolean } {
  const { mid, merchantIds } = useEbrcScope();
  const queryClient = useQueryClient();
  const handleDgftError = useDgftErrorHandler();

  const { mutate, isPending } = usePost<unknown, RefreshRecordsRequestBody>(
    ebrcGenerationApi(mid, operation),
    { invalidateQueries: false }
  );

  const refresh = useCallback(() => {
    if (!mid) return;
    mutate(
      {
        operationType: operation,
        limit: String(EBRC_PAGE_SIZE),
        nextToken: null,
        // DIVERGENCE FROM PRODUCTION, deliberate: pg-dashboard sends
        // `[mid]` — only the first PACB MID — while its table lists IRMs
        // across every one of them, so Refresh leaves the other MIDs' rows
        // stale. Sending the same MID list the search filters on makes the
        // button mean what it says. Same endpoint, same body shape; only the
        // array's length differs.
        merchantIds: merchantIds ?? (mid ? [mid] : undefined),
      },
      {
        onSuccess: (data) => {
          if (handleDgftError(data)) return;
        },
        onError: (error) => {
          if (handleDgftError(error)) return;
          toast.error(error?.message || "Couldn't refresh records.");
        },
        onSettled: () => {
          invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
        },
      }
    );
  }, [mid, merchantIds, mutate, operation, queryClient, invalidateKeys, handleDgftError]);

  return { refresh, isRefreshing: isPending };
}

export function useRefreshIrms(): { refresh: () => void; isRefreshing: boolean } {
  const keys = useMemo(() => ["ebrc-irm-search", "ebrc-irm-repository"], []);
  return useEbrcRefresh("refresh_irm", keys);
}

export function useRefreshEbrcRequests(): { refresh: () => void; isRefreshing: boolean } {
  const keys = useMemo(() => ["ebrc-request-search"], []);
  return useEbrcRefresh("refresh_genebrc", keys);
}

// ── 5. fetch_customer_status ─────────────────────────────────────────────────

/**
 * Whether the merchant's DGFT session is live.
 *
 * `customerValidated` is the string "True", capital T — compared exactly, as
 * production does. Anything else, including a failed call, means not connected,
 * which is the safe default: it shows the connect gate rather than letting the
 * merchant into a wizard whose every call would then fail.
 */
export function useDgftCustomerStatus(): {
  isConnected: boolean;
  isLoading: boolean;
  refetch: () => void;
} {
  const { mid, isReady } = useEbrcScope();
  const queryClient = useQueryClient();

  const { data, isPending } = usePostQuery<CustomerStatusResponse, { operationType: string }>(
    ["ebrc-customer-status", mid],
    ebrcGenerationApi(mid, "fetch_customer_status"),
    { operationType: "fetch_customer_status" },
    { staleTime: 0, retry: 0 },
    isReady && !!mid
  );

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["ebrc-customer-status", mid] });
  }, [queryClient, mid]);

  return {
    isConnected: data?.data?.customerValidated === "True",
    isLoading: isReady && !!mid && isPending,
    refetch,
  };
}

// ── 6. validate_customer (DGFT login) ────────────────────────────────────────

interface DgftLoginBody {
  operationType: string;
  dgftUsername: string;
  dgftPassword: string;
}

/**
 * Signs the merchant into DGFT. The credentials go straight to the backend and
 * are never stored client-side — no local state beyond the form, nothing in
 * browser storage, nothing logged.
 */
export function useDgftLogin(): {
  login: (username: string, password: string, onDone: () => void) => void;
  isPending: boolean;
} {
  const { mid } = useEbrcScope();
  const queryClient = useQueryClient();
  const handleDgftError = useDgftErrorHandler();

  const { mutate, isPending } = usePost<unknown, DgftLoginBody>(
    ebrcGenerationApi(mid, "validate_customer"),
    { invalidateQueries: false }
  );

  const login = useCallback(
    (dgftUsername: string, dgftPassword: string, onDone: () => void) => {
      if (!mid) return;
      mutate(
        { operationType: "validate_customer", dgftUsername, dgftPassword },
        {
          onSuccess: (data) => {
            if (handleDgftError(data)) return;
            toast.success("DGFT login successful", {
              description: "You have successfully logged into your DGFT account.",
            });
            void queryClient.invalidateQueries({ queryKey: ["ebrc-customer-status", mid] });
            onDone();
          },
          onError: (error) => {
            if (handleDgftError(error)) return;
            toast.error("DGFT login failed", {
              description: error?.message || "An error occurred during DGFT login.",
            });
          },
        }
      );
    },
    [mid, mutate, queryClient, handleDgftError]
  );

  return { login, isPending };
}

// ── 7. fetch_irm_by_number ───────────────────────────────────────────────────

interface FetchIrmsByNumberBody {
  operationType: string;
  irmNumbersList: string[];
}

/**
 * The full records for the IRMs the merchant selected, including each one's
 * saved `shippingBillData` and its extraction status — the mapping and review
 * steps both run off this rather than the search rows, which carry neither.
 *
 * `presignedUrls` is keyed by IRM number and only populated once extraction has
 * COMPLETED; it is the GET for the uploaded shipping-bill PDF.
 */
export function useIrmsByNumber(irmNumbers: string[]): {
  records: IrmDetails[];
  presignedUrls: Record<string, string>;
  isLoading: boolean;
  isError: boolean;
  /** Re-reads the records and resolves with them, so a caller that has to act
   *  on the *fresh* state (the last-IRM gate in step 2) can await it rather
   *  than reading the render it was called from. */
  refetch: () => Promise<IrmDetails[] | undefined>;
} {
  const { mid, isReady } = useEbrcScope();
  const queryClient = useQueryClient();

  // Sorted so the same selection in a different click order is one cache entry,
  // not two. The body is memoized because usePostQuery folds it into the key.
  const sorted = useMemo(() => [...irmNumbers].sort(), [irmNumbers]);
  const body = useMemo<FetchIrmsByNumberBody>(
    () => ({ operationType: "fetch_irm_by_number", irmNumbersList: sorted }),
    [sorted]
  );

  const { data, isPending, isError } = usePostQuery<IRMRecordsApiResponse, FetchIrmsByNumberBody>(
    ["ebrc-irms-by-number", mid],
    ebrcGenerationApi(mid, "fetch_irm_by_number"),
    body,
    { staleTime: 0 },
    isReady && !!mid && sorted.length > 0
  );

  const refetch = useCallback(async (): Promise<IrmDetails[] | undefined> => {
    await queryClient.refetchQueries({
      queryKey: ["ebrc-irms-by-number", mid],
      type: "active",
    });
    const fresh = queryClient.getQueryData<IRMRecordsApiResponse>([
      "ebrc-irms-by-number",
      mid,
      ebrcGenerationApi(mid, "fetch_irm_by_number"),
      body,
    ]);
    return (fresh?.data?.records ?? []).filter((r): r is IrmDetails => !!r);
  }, [queryClient, mid, body]);

  return {
    records: useMemo(() => (data?.data?.records ?? []).filter((r): r is IrmDetails => !!r), [data]),
    presignedUrls: data?.data?.presignedUrls ?? {},
    isLoading: isReady && !!mid && sorted.length > 0 && isPending,
    isError,
    refetch,
  };
}

// ── 8. save_shipping_data ────────────────────────────────────────────────────

interface SaveShippingBody {
  operationType: string;
  shippingBillData: ShippingBillData;
}

export function useSaveShippingData(): {
  save: (data: ShippingBillData, onDone: () => void) => void;
  isSaving: boolean;
} {
  const { mid } = useEbrcScope();
  const handleDgftError = useDgftErrorHandler();

  const { mutate, isPending } = usePost<unknown, SaveShippingBody>(
    ebrcGenerationApi(mid, "save_shipping_data"),
    { invalidateQueries: false }
  );

  const save = useCallback(
    (shippingBillData: ShippingBillData, onDone: () => void) => {
      if (!mid) return;
      mutate(
        { operationType: "save_shipping_data", shippingBillData },
        {
          onSuccess: (data) => {
            if (handleDgftError(data)) return;
            onDone();
          },
          onError: (error) => {
            if (handleDgftError(error)) return;
            toast.error(error?.message || "Couldn't save the shipping bill details.");
          },
        }
      );
    },
    [mid, mutate, handleDgftError]
  );

  return { save, isSaving: isPending };
}

// ── 9. fetch_extraction_status ───────────────────────────────────────────────

/**
 * One poll of a single IRM's PDF extraction. Exposed as an async call rather
 * than a query because the caller drives the 5s loop over whichever IRMs are
 * still extracting — see MapShippingBillStep.
 */
export function useExtractionStatus(): {
  fetchStatus: (irmNumber: string) => Promise<string | null | undefined>;
} {
  const { mid } = useEbrcScope();

  const { mutateAsync } = usePost<
    ExtractionStatusApiResponse,
    { operationType: string; irmNumber: string }
  >(ebrcGenerationApi(mid, "fetch_extraction_status"), { invalidateQueries: false });

  const fetchStatus = useCallback(
    async (irmNumber: string) => {
      if (!mid) return null;
      const res = await mutateAsync({ operationType: "fetch_extraction_status", irmNumber });
      return res?.data?.shippingBillExtractionStatus;
    },
    [mid, mutateAsync]
  );

  return { fetchStatus };
}

// ── 10/11. upload_pdf → S3 PUT → extract_shipping_data ───────────────────────

/** Largest shipping-bill PDF the upload accepts, matching production. */
export const MAX_SHIPPING_BILL_MB = 10;

/**
 * The shipping-bill upload, all three legs.
 *
 * 1. `upload_pdf` returns a presigned S3 PUT plus the metadata it was signed
 *    with. 2. The file goes straight to S3 with those values as `x-amz-meta-*`
 *    headers — S3 rejects the PUT if they do not match the signature. 3.
 *    `extract_shipping_data` then asks the backend to read the PDF, which runs
 *    asynchronously and is what the extraction-status poll waits on.
 */
export function useShippingBillUpload(): {
  upload: (irmNumber: string, file: File, onSettled: () => void) => void;
} {
  const { mid } = useEbrcScope();
  const handleDgftError = useDgftErrorHandler();

  const { mutate: getUploadUrl } = usePost<
    PresignedUploadResponse,
    { operationType: string; irmNumber: string }
  >(ebrcGenerationApi(mid, "upload_pdf"), { invalidateQueries: false });

  const { mutate: uploadToS3 } = usePut<void, S3UploadVariables>("", {
    invalidateQueries: false,
  });

  const { mutate: extractShippingData } = usePost<
    ExtractShippingDataResponse,
    { operationType: string; fileName: string; irmNumber: string }
  >(ebrcGenerationApi(mid, "extract_shipping_data"), { invalidateQueries: false });

  const upload = useCallback(
    (irmNumber: string, file: File, onSettled: () => void) => {
      if (!mid || !irmNumber) return;

      if (file.size > MAX_SHIPPING_BILL_MB * 1024 * 1024) {
        toast.error(`File size exceeds the maximum limit of ${MAX_SHIPPING_BILL_MB} MB.`);
        onSettled();
        return;
      }

      getUploadUrl(
        { operationType: "upload_pdf", irmNumber },
        {
          onSuccess: (res) => {
            if (handleDgftError(res)) {
              onSettled();
              return;
            }
            const uploadUrl = res?.data?.upload_url;
            if (!uploadUrl) {
              toast.error("Couldn't get an upload URL.");
              onSettled();
              return;
            }

            uploadToS3(
              {
                dynamicUrl: uploadUrl,
                reqBody: file,
                customHeaders: buildS3Headers({ ...res.data?.metadata, irmNumber }),
              },
              {
                onSuccess: () => {
                  extractShippingData(
                    {
                      operationType: "extract_shipping_data",
                      fileName: `ebrc_${irmNumber}.pdf`,
                      irmNumber,
                    },
                    {
                      onError: (error) => {
                        if (handleDgftError(error)) return;
                        toast.error(
                          error?.message ||
                            "Couldn't extract shipping bill data from the uploaded file."
                        );
                      },
                      onSettled,
                    }
                  );
                },
                onError: (error) => {
                  toast.error(error?.message || "Couldn't upload the file.");
                  onSettled();
                },
              }
            );
          },
          onError: (error) => {
            if (!handleDgftError(error)) {
              toast.error(error?.message || "Couldn't get an upload URL.");
            }
            onSettled();
          },
        }
      );
    },
    [mid, getUploadUrl, uploadToS3, extractShippingData, handleDgftError]
  );

  return { upload };
}

// ── 12. push_irm ─────────────────────────────────────────────────────────────

interface PushIrmBody {
  operationType: string;
  ebrcBulkGenDtos: (ShippingBillData | null | undefined)[];
}

/** Submits the mapped IRMs to DGFT — the wizard's final, irreversible step. */
export function usePushIrms(): {
  push: (dtos: (ShippingBillData | null | undefined)[], onDone: () => void) => void;
  isPending: boolean;
} {
  const { mid } = useEbrcScope();
  const queryClient = useQueryClient();
  const handleDgftError = useDgftErrorHandler();

  const { mutate, isPending } = usePost<unknown, PushIrmBody>(ebrcGenerationApi(mid, "push_irm"), {
    invalidateQueries: false,
  });

  const push = useCallback(
    (ebrcBulkGenDtos: (ShippingBillData | null | undefined)[], onDone: () => void) => {
      if (!mid) return;
      mutate(
        { operationType: "push_irm", ebrcBulkGenDtos },
        {
          onSuccess: (data) => {
            if (handleDgftError(data)) return;
            toast.success("eBRC generation initiated successfully.");
            void queryClient.invalidateQueries({ queryKey: ["ebrc-request-search"] });
            void queryClient.invalidateQueries({ queryKey: ["ebrc-irm-search"] });
            onDone();
          },
          onError: (error) => {
            if (handleDgftError(error)) return;
            toast.error("Failed to initiate eBRC generation.", {
              description: error?.message,
            });
          },
        }
      );
    },
    [mid, mutate, queryClient, handleDgftError]
  );

  return { push, isPending };
}

// ── 13. download_ebrc_pdf ────────────────────────────────────────────────────

/**
 * The generated eBRC certificate. Comes back as base64 `fileContent` rather
 * than a blob, so it is assembled client-side. Addressed to the MID that owns
 * the request, not the currently selected one.
 */
export function useEbrcPdfDownload(recordMerchantId: string): {
  download: (ebrcNumber: string, onSettled?: () => void) => void;
} {
  const { mutate } = usePost<Base64FileResponse, { operationType: string; ebrcNumber: string }>(
    ebrcGenerationApi(recordMerchantId, "download_ebrc_pdf"),
    { invalidateQueries: false }
  );

  const download = useCallback(
    (ebrcNumber: string, onSettled?: () => void) => {
      if (!recordMerchantId) return;
      mutate(
        { operationType: "download_ebrc_pdf", ebrcNumber },
        {
          onSuccess: (res) => {
            const fileContent = res?.data?.fileContent;
            if (!fileContent) {
              toast.error("Couldn't download the eBRC PDF.");
              return;
            }
            downloadBase64File(
              fileContent,
              res?.data?.fileName || "ebrc.pdf",
              res?.data?.contentType || "application/pdf"
            );
          },
          onError: (error) => toast.error(error?.message || "Couldn't download the eBRC PDF."),
          onSettled,
        }
      );
    },
    [recordMerchantId, mutate]
  );

  return { download };
}

// ── 14/15/16. Bulk upload ────────────────────────────────────────────────────

/** The blank workbook merchants fill in for a bulk request. Base64, like the
 *  eBRC PDF. */
export function useBulkTemplateDownload(): {
  downloadTemplate: () => void;
  isDownloading: boolean;
} {
  const { mid } = useEbrcScope();

  const { mutate, isPending } = usePost<Base64FileResponse, { operationType: string }>(
    ebrcGenerationApi(mid, "fetch_irm_bulk_template"),
    { invalidateQueries: false }
  );

  const downloadTemplate = useCallback(() => {
    if (!mid) return;
    mutate(
      { operationType: "fetch_irm_bulk_template" },
      {
        onSuccess: (res) => {
          const fileContent = res?.data?.fileContent;
          if (!fileContent) {
            toast.error("Couldn't get the template.");
            return;
          }
          downloadBase64File(
            fileContent,
            res?.data?.fileName || "ebrc-bulk-base.xlsx",
            res?.data?.contentType ||
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
        },
        onError: () => toast.error("Couldn't get the template."),
      }
    );
  }, [mid, mutate]);

  return { downloadTemplate, isDownloading: isPending };
}

export type BulkUploadResult = NonNullable<NonNullable<BulkUploadExcelResponse["data"]>["result"]>;

/**
 * The filled workbook: presigned PUT, then `bulk_upload_excel` to parse and
 * validate it. The result carries either the parsed IRMs or `errorDetails`,
 * both of which the dialog renders.
 */
export function useBulkUpload(): {
  uploadWorkbook: (file: File, onResult: (result: BulkUploadResult | undefined) => void) => void;
} {
  const { mid } = useEbrcScope();
  const queryClient = useQueryClient();
  const handleDgftError = useDgftErrorHandler();

  const { mutate: getPresignedUrl } = usePost<PresignedUploadResponse, { operationType: string }>(
    ebrcGenerationApi(mid, "bulk_upload_excel_presigned_url"),
    { invalidateQueries: false }
  );

  const { mutateAsync: uploadToS3 } = usePut<void, S3UploadVariables>("", {
    invalidateQueries: false,
  });

  const { mutate: triggerBulkUpload } = usePost<
    BulkUploadExcelResponse,
    { operationType: string; fileName: string }
  >(ebrcGenerationApi(mid, "bulk_upload_excel"), { invalidateQueries: false });

  const uploadWorkbook = useCallback(
    (file: File, onResult: (result: BulkUploadResult | undefined) => void) => {
      if (!mid) return;

      getPresignedUrl(
        { operationType: "bulk_upload_excel_presigned_url" },
        {
          onSuccess: async (presignedRes) => {
            if (handleDgftError(presignedRes)) {
              onResult(undefined);
              return;
            }
            const uploadUrl = presignedRes?.data?.upload_url;
            const metadata = presignedRes?.data?.metadata;
            const fileName = metadata?.fileName;

            if (!uploadUrl || !fileName || !metadata) {
              toast.error("Couldn't initiate the upload.");
              onResult(undefined);
              return;
            }

            try {
              await uploadToS3({
                dynamicUrl: uploadUrl,
                reqBody: file,
                customHeaders: buildBulkUploadS3Headers(metadata),
              });
            } catch {
              toast.error("Couldn't upload the file.");
              onResult(undefined);
              return;
            }

            triggerBulkUpload(
              { operationType: "bulk_upload_excel", fileName: String(fileName) },
              {
                onSuccess: (res) => {
                  if (handleDgftError(res)) {
                    onResult(undefined);
                    return;
                  }
                  void queryClient.invalidateQueries({ queryKey: ["ebrc-irm-search"] });
                  onResult(res?.data?.result);
                },
                onError: (error) => {
                  if (!handleDgftError(error)) {
                    toast.error(error?.message || "Couldn't process the workbook.");
                  }
                  onResult(undefined);
                },
              }
            );
          },
          onError: (error) => {
            if (!handleDgftError(error)) {
              toast.error(error?.message || "Couldn't initiate the upload.");
            }
            onResult(undefined);
          },
        }
      );
    },
    [mid, getPresignedUrl, uploadToS3, triggerBulkUpload, queryClient, handleDgftError]
  );

  return { uploadWorkbook };
}
