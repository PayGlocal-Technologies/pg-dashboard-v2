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
import {
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
export function useInvoiceLinks(filters: InvoiceLinkFilters, page: number) {
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
      pageLimit: INVOICE_LINKS_PAGE_LIMIT,
      from: (page - 1) * INVOICE_LINKS_PAGE_LIMIT,
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

export interface UpdateInvoiceStatusArgs {
  mid: string;
  invoiceId: string;
  files: File[];
}

/**
 * Marks an invoice paid offline by attaching proof documents.
 *
 * Three legs, ported from pg-dashboard's UpdateInvoiceStatusDrawer:
 *
 *   1. PUT  …/status?id=       with `{ merchantDocument: [{ name, fileExtension }] }`
 *      → `{ [filename]: presignedPutUrl }`
 *   2. PUT  each presigned URL with the raw File and the x-amz-meta-* headers
 *      the bucket policy requires
 *   3. GET  …/verify-upload?id= to confirm the objects landed
 *
 * Leg 2 goes to S3, not our backend. `customHeaders` replaces the axios
 * instance's defaults outright, so only the meta headers are sent, and the
 * instance sets no `withCredentials`, so no session cookie crosses origins.
 */
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  const { mutateAsync: putManifest } = usePut<
    InvoiceDocumentMapResponse,
    { dynamicUrl: string; reqBody: { merchantDocument: DocumentPayload[] } }
  >("", { invalidateQueries: false });
  const { mutateAsync: uploadToS3 } = usePut<
    unknown,
    { dynamicUrl: string; customHeaders: Record<string, string>; reqBody: File }
  >("", { invalidateQueries: false });
  const { mutateAsync: verifyUpload } = usePut<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: false,
  });

  async function run({ mid, invoiceId, files }: UpdateInvoiceStatusArgs): Promise<void> {
    const merchantDocument: DocumentPayload[] = files.map((file) => ({
      name: file.name,
      // Derived from the MIME type exactly as upstream does. Note this yields
      // ".jpeg" for a .jpg file, which is what production already sends.
      fileExtension: `.${file.type.split("/")[1] ?? ""}`,
    }));

    const manifest = await putManifest({
      dynamicUrl: invoiceLinkStatusApi(mid, invoiceId),
      reqBody: { merchantDocument },
    });

    const urls = manifest?.data ?? {};
    await Promise.all(
      files.map(async (file) => {
        const target = urls[file.name];
        if (!target) return;
        await uploadToS3({
          dynamicUrl: target,
          customHeaders: {
            "Content-Type": file.type,
            "x-amz-meta-fileExtension": `.${file.type.split("/")[1] ?? ""}`,
            "x-amz-meta-invoiceId": invoiceId,
            "x-amz-meta-maxSize": "10",
            "x-amz-meta-mid": mid,
            "X-Content-Type-Options": "nosniff",
          },
          reqBody: file,
        });
      })
    );

    await verifyUpload({ dynamicUrl: invoiceLinkVerifyUploadApi(mid, invoiceId) });
    void queryClient.invalidateQueries({ queryKey: INVOICE_LINKS_QUERY_KEY });
  }

  return { run };
}

/**
 * Invoice links export.
 *
 * Mirrors the MCA Transactions report exactly: a POST whose body is the search
 * body, answered with a blob. Only the date window travels — upstream's report
 * drawer seeds itself from the table's date filter alone and carries no other
 * filter across, so neither does this.
 */
export function useInvoiceLinksReport() {
  const paMids = useApp((s) => s.paMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const reportMid = selectedMid || paMids?.[0] || "";

  return usePost<Blob, TableReqBody>(invoiceLinksReportApi(reportMid), {
    download: true,
    invalidateQueries: false,
    onSuccess: (blob: Blob) => {
      downloadBlob(blob, `invoice-links-${new Date().toISOString().slice(0, 10)}.xlsx`);
    },
    onError: (error: Error) =>
      toast.error(error?.message || "Couldn't generate the report. Please try again."),
  });
}

/** URL builders the table's action handlers need. Re-exported so components stay presentational. */
export { invoiceLinkDisableApi, invoiceLinkDraftApi, invoiceLinkRetrieveApi };
