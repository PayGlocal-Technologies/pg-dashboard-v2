"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGet, usePost, usePostQuery, usePut, useDelete } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import type { TableReqBody } from "@/types/transactions";
import { downloadBlob } from "@/lib/utils/format";
import { isFeatureAvailableForMid } from "@/lib/hooks/useFeatureApplicable";
import type { PacbMidScope } from "@/lib/hooks/usePacbMidScope";
import {
  invoiceLinkDeleteFailedDocsApi,
  invoiceLinkDisableApi,
  invoiceLinkDraftApi,
  invoiceLinkPaymentProofApi,
  invoiceLinkRetrieveApi,
  invoiceLinksReportApi,
  invoiceLinkStatusApi,
  invoiceLinkVerifyUploadApi,
  invoiceLinksSearchApi,
} from "@/features/dashboard/invoice-links/services";
import {
  INVOICE_LINKS_FEATURE,
  INVOICE_LINKS_PAGE_LIMIT,
} from "@/features/dashboard/invoice-links/constants";
import type {
  DocumentPayload,
  InvoiceDocumentMapResponse,
  InvoiceLink,
  InvoiceLinksResponse,
  InvoicePreviewResponse,
  InvoiceVerifyUploadResponse,
} from "@/features/dashboard/invoice-links/types";

/** Query-key root for the list, which every row action invalidates. */
const INVOICE_LINKS_QUERY_KEY = ["invoice-links"] as const;

/**
 * Whether the merchant holds the invoice links product at all — the account
 * level gate pg-dashboard makes before rendering anything on this page
 * (mca-payment-invoice-links/index.tsx:230). Modelled on
 * usePaymentButtonsEnabled, which is the same check for PAYMENT_BUTTONS.
 */
export function useInvoiceLinksEnabled(): boolean {
  const paymentProducts = useApp((s) => s.merchantEnabledProducts?.paymentProducts);
  return !!paymentProducts?.includes(INVOICE_LINKS_FEATURE);
}

/**
 * The MID filter that goes into the search body's `fieldSearch`.
 *
 * Deliberately NOT useResolvedMids: that hook emits `{ key: "merchantId" }`,
 * and this endpoint keys on **`mid`**. pg-dashboard builds it as
 *
 *   selectedMid: { key: "mid", value: selectedMid ? [selectedMid] : midMap[page] }
 *
 * with `midMap.INVOICE = paMids` (index.tsx:67-71, useMcaPaymentInvoiceLinks.ts:151).
 * So: an explicitly selected MID narrows to just that one; with nothing
 * selected the search spans every PA MID the merchant has. Sending the wrong
 * key would silently drop the scope and search across merchants.
 */
function useInvoiceLinkMidFilter(): { filter: { key: string; value: string[] } | undefined; isReady: boolean } {
  const paMids = useApp((s) => s.paMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  return useMemo(() => {
    const value = selectedMid ? [selectedMid] : paMids;
    if (!value || value.length === 0) return { filter: undefined, isReady: false };
    return { filter: { key: "mid", value }, isReady: true };
  }, [selectedMid, paMids]);
}

/**
 * "Which account is this invoice link for?", the PA twin of usePacbMidScope.
 *
 * The list spans every PA MID when none is selected, but the editor puts one
 * MID in every request path. pg-dashboard never asks: its create resolves
 * `selectedMid || paMids[0]`, which raises the link under whichever account
 * happens to be first. So, as MCA Invoices does, a multi-MID merchant with
 * nothing selected picks first, and the pick is written to the same
 * selected-MID store the sidebar uses.
 *
 * The options are the PA MIDs that actually carry INVOICE_LINKS, so the picker
 * never offers an account that would only land on "not available for this
 * MID". If that narrows to nothing (tidsInfo and paMids come from different
 * responses and can disagree), every PA MID is offered and MidGuard decides.
 */
export function useInvoiceLinkMidScope(): PacbMidScope {
  const paMids = useApp((s) => s.paMids);
  const tidsInfo = useApp((s) => s.tidsInfo);
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);

  const midOptions = useMemo(() => {
    const eligible = paMids.filter((mid) =>
      isFeatureAvailableForMid(mid, INVOICE_LINKS_FEATURE, isMultiMidUser, tidsInfo)
    );
    return eligible.length > 0 ? eligible : paMids;
  }, [paMids, tidsInfo, isMultiMidUser]);

  return {
    needsMidChoice: midOptions.length > 1 && !selectedMid,
    midOptions,
    // Same tint usePacbMidScope uses, so the sidebar chip is never blank.
    selectMid: (mid: string) => setSelectedMidDetails({ mid, color: "#E5B5FF" }),
  };
}

export interface InvoiceLinkFilters {
  /** Free-text Invoice Id. Upstream puts this in `queryString`, not fieldSearch. */
  linkId?: string;
  status?: string[];
  startTime?: number;
  endTime?: number;
}

/**
 * The invoice links list. A POST that reads, so usePostQuery — `enabled` is
 * its positional fifth argument, and the body is appended to the query key by
 * the hook itself, so the key here carries only what the hook does not.
 */
export function useInvoiceLinks(
  filters: InvoiceLinkFilters,
  page: number,
  pageSize: number = INVOICE_LINKS_PAGE_LIMIT
) {
  const isGuestUser = useApp((s) => s.isGuestUser);
  const { filter: midFilter, isReady } = useInvoiceLinkMidFilter();

  const body: TableReqBody = buildTxnRequestBody(
    {
      status: filters.status?.length ? filters.status : undefined,
      startTime: filters.startTime,
      endTime: filters.endTime,
    },
    {
      // Upstream assigns the Invoice Id filter to `queryString`
      // (tableRequestbodyBuilder: `if (newFilters.linkId) queryString = ...`),
      // which is exactly what searchQuery does here for a non-email value.
      searchQuery: filters.linkId || undefined,
      selectedMid: midFilter,
      pageLimit: pageSize,
      from: (page - 1) * pageSize,
    }
  );

  const query = usePostQuery<InvoiceLinksResponse, TableReqBody>(
    INVOICE_LINKS_QUERY_KEY,
    invoiceLinksSearchApi(),
    body,
    undefined,
    isReady && !isGuestUser
  );

  const rows: InvoiceLink[] = query.data?.data?.data ?? [];
  const totalCount = query.data?.data?.totalCount ?? 0;

  return {
    rows,
    totalCount,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    /** False when there is no MID to scope to — the table shows its empty state rather than an unscoped list. */
    isReady,
  };
}

// ── Row actions ──────────────────────────────────────────────────────────────

/**
 * Disable an active invoice link.
 *
 * The refetch is deliberately delayed. pg-dashboard wraps its refetch in
 * `setTimeout(..., 1000)` after a successful disable, which is a wait for the
 * status to settle backend-side — refetching immediately returns the row still
 * ACTIVE and the table appears not to have done anything. Carried over rather
 * than "cleaned up", because removing it reintroduces that.
 */
export function useDisableInvoiceLink() {
  const queryClient = useQueryClient();

  return usePut<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: false,
    onSuccess: () => {
      toast.success("Invoice link disabled successfully");
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: INVOICE_LINKS_QUERY_KEY });
      }, 1000);
    },
    onError: (error: Error) => toast.error(error?.message || "Failed to disable link"),
  });
}

/** Delete a DRAFT invoice link. Refetches immediately — upstream does too. */
export function useDeleteInvoiceDraft() {
  const queryClient = useQueryClient();

  return useDelete<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: false,
    onSuccess: () => {
      toast.success("Invoice link deleted successfully");
      void queryClient.invalidateQueries({ queryKey: INVOICE_LINKS_QUERY_KEY });
    },
    onError: (error: Error) => toast.error(error?.message || "Failed to delete invoice link"),
  });
}

/** Fetches the presigned PDF URL behind the Preview action. A POST that reads. */
export function useInvoicePreview() {
  return usePost<
    InvoicePreviewResponse,
    { dynamicUrl: string; reqBody: { invoiceRequestData: { invoiceId: string } } }
  >("", { invalidateQueries: false });
}

/** Already-uploaded proof documents, for the read-only "View Proof Documents" mode. */
export function useInvoicePaymentProof(mid: string, invoiceId: string, enabled: boolean) {
  return useGet<InvoiceDocumentMapResponse>(
    ["invoice-link-payment-proof", mid, invoiceId],
    invoiceLinkPaymentProofApi(mid, invoiceId),
    { enabled: enabled && !!mid && !!invoiceId }
  );
}

/** How many times a failed upload is retried before its files are deleted. gcc-ui-temp's `flag < 6`. */
const PROOF_UPLOAD_RETRIES = 6;

/** `.pdf` from `receipt.pdf`, the way gcc-ui-temp derives it: from the name, not the MIME type. */
function extensionOf(name: string): string {
  return `.${name.substring(name.lastIndexOf(".") + 1)}`;
}

/**
 * Marks an invoice paid offline by attaching proof documents.
 *
 * gcc-ui-temp is the source of truth here (StatusModal + useUploadDocsToS3):
 *
 *   1. PUT  …/status?id=   `{ merchantDocument: [{ name, fileExtension }] }`
 *      → `{ [filename]: presignedPutUrl }`
 *   2. PUT  each presigned URL with the raw File and the x-amz-meta-* headers
 *      the bucket policy requires, all in parallel
 *   3. GET  …/verify-upload?id=
 *        - everything landed: one GET to confirm, done.
 *        - something failed: GET it; if it is not COMPLETED its `fileData`
 *          carries fresh URLs (and `metaData` the headers) for what is
 *          missing, and those files are uploaded again. Up to six times.
 *   4. POST …/delete?id=  `{ fileNames }` for whatever still failed, so the
 *      invoice is not left with half its proofs, then the caller is told.
 *
 * Two deliberate departures from gcc, both bugs there: Content-Type is the
 * file's own MIME type (gcc sends `application/${file.type}`, i.e.
 * `application/application/pdf`), and the retry count is per run rather than
 * a module-level counter shared by every upload on the page.
 *
 * Leg 2 goes to S3, not our backend. `customHeaders` replaces the axios
 * instance's defaults outright, so only these headers are sent, and the
 * instance sets no `withCredentials`, so no session cookie crosses origins.
 *
 * Scoped to one invoice because leg 3 is a read, and so a query: its URL has
 * to be known when the hook is called, not when it runs.
 */
export function useUpdateInvoiceStatus(mid: string, invoiceId: string) {
  const queryClient = useQueryClient();
  const { mutateAsync: putManifest } = usePut<
    InvoiceDocumentMapResponse,
    { dynamicUrl: string; reqBody: { merchantDocument: DocumentPayload[] } }
  >("", { invalidateQueries: false });
  const { mutateAsync: uploadToS3 } = usePut<
    unknown,
    { dynamicUrl: string; customHeaders: Record<string, string>; reqBody: File }
  >("", { invalidateQueries: false });
  const { mutateAsync: deleteFailed } = usePost<
    unknown,
    { dynamicUrl: string; reqBody: { fileNames: string[] } }
  >("", { invalidateQueries: false });
  // Never fetched on its own, only on demand from `run`.
  const { refetch: verifyUpload } = useGet<InvoiceVerifyUploadResponse>(
    ["invoice-link-verify-upload", mid, invoiceId],
    invoiceLinkVerifyUploadApi(mid, invoiceId),
    { enabled: false, staleTime: 0 }
  );

  /** Uploads each file to its URL; returns the ones that did not make it. */
  async function uploadAll(
    files: File[],
    urlFor: (file: File) => string | undefined,
    metaFor: (file: File) => Record<string, string>
  ): Promise<File[]> {
    const results = await Promise.allSettled(
      files.map(async (file) => {
        const target = urlFor(file);
        if (!target) throw new Error(`No upload URL for ${file.name}`);
        const meta = metaFor(file);
        await uploadToS3({
          dynamicUrl: target,
          customHeaders: {
            "Content-Type": file.type,
            ...Object.fromEntries(Object.entries(meta).map(([k, v]) => [`x-amz-meta-${k}`, v])),
            "X-Content-Type-Options": "nosniff",
          },
          reqBody: file,
        });
      })
    );
    return files.filter((_, i) => results[i].status === "rejected");
  }

  async function run(files: File[]): Promise<void> {
    const manifest = await putManifest({
      dynamicUrl: invoiceLinkStatusApi(mid, invoiceId),
      reqBody: {
        merchantDocument: files.map((file) => ({
          name: file.name,
          fileExtension: extensionOf(file.name),
        })),
      },
    });

    const urls = manifest?.data ?? {};
    let failed = await uploadAll(
      files,
      (file) => urls[file.name],
      (file) => ({
        fileExtension: extensionOf(file.name),
        invoiceId,
        maxSize: "10",
        mid,
      })
    );

    try {
      if (failed.length === 0) {
        await verifyUpload();
        return;
      }

      for (let attempt = 0; attempt < PROOF_UPLOAD_RETRIES && failed.length > 0; attempt++) {
        const { data, isError } = await verifyUpload();
        if (isError) throw new Error("Unable to upload documents. Please try again.");
        if (data?.data?.Status === "COMPLETED") return;

        const fileData = data?.data?.fileData ?? {};
        failed = await uploadAll(
          failed,
          (file) => {
            const url = fileData[file.name];
            return typeof url === "string" ? url : undefined;
          },
          (file) => fileData.metaData?.[file.name] ?? {}
        );
        if (failed.length === 0) {
          await verifyUpload();
          return;
        }
      }

      const fileNames = failed.map((file) => file.name);
      try {
        await deleteFailed({
          dynamicUrl: invoiceLinkDeleteFailedDocsApi(mid, invoiceId),
          reqBody: { fileNames },
        });
      } catch {
        throw new Error("Unable to delete failed documents.");
      }
      throw new Error(
        `Unable to upload ${fileNames.join(", ")}. Please try again after some time.`
      );
    } finally {
      void queryClient.invalidateQueries({ queryKey: INVOICE_LINKS_QUERY_KEY });
    }
  }

  return { run };
}

/**
 * Invoice links export, fed by the shared ReportDownloadDrawer.
 *
 * Mirrors pg-dashboard's Common/ReportDownload as this page uses it: the path
 * MID is upstream's `currentMid` (`selectedMid || paMids[0]`), the body is
 * `buildRequestBody({ date }, "")` with the drawer's window and nothing else,
 * and the file is a CSV, since this page never overrides the drawer's default
 * `fileExtension`.
 */
export function useInvoiceLinksReport() {
  const paMids = useApp((s) => s.paMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const reportMid = selectedMid || paMids?.[0] || "";

  const mutation = usePost<Blob, TableReqBody>(invoiceLinksReportApi(reportMid), {
    download: true,
    invalidateQueries: false,
    onSuccess: (blob: Blob) => {
      downloadBlob(blob, `invoice-links-${new Date().toISOString().slice(0, 10)}.csv`);
    },
    onError: (error: Error) =>
      toast.error(error?.message || "Couldn't generate the report. Please try again."),
  });

  return { ...mutation, reportMid };
}

/**
 * The export body for a drawer window: upstream's
 * `{ pageLimit: 15, from: 0, fieldOrSearch: {}, startTime, endTime,
 * searchFilterType: "DEFAULT_TIME_RANGE" }`, the same body MCA Transactions
 * sends. None of the table's other filters travel.
 */
export function buildInvoiceLinksReportBody(window: { startTime: number; endTime: number }) {
  return {
    pageLimit: INVOICE_LINKS_PAGE_LIMIT,
    from: 0,
    fieldOrSearch: {},
    startTime: window.startTime,
    endTime: window.endTime,
    searchFilterType: "DEFAULT_TIME_RANGE",
  } as TableReqBody;
}

/** URL builders the table's action handlers need. Re-exported so components stay presentational. */
export { invoiceLinkDisableApi, invoiceLinkDraftApi, invoiceLinkRetrieveApi };
