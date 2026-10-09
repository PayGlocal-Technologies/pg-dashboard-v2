"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { useGet, usePost, usePostQuery, usePut } from "@/lib/api/hooks";
import { downloadBlob } from "@/lib/utils/format";
import { api } from "@/lib/api/axios";
import { handleApiError } from "@/lib/api/handleApiError";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  cbDetailsApi,
  cbMerchantDocUploadApi,
  cbMessagesApi,
  cbStaticDataApi,
  cbTimelineApi,
  cbUploadedCdfApi,
  cbUploadedDocsApi,
  cbUploadStatusApi,
  disputeReportApi,
  disputeReportStatusApi,
  disputeReportV1Api,
  disputeSearchApi,
} from "@/features/dashboard/dispute-management/services";
import {
  CONTENT_TYPE_BY_EXTENSION,
  DISPUTE_FEATURE,
  PRODUCT_GUARD_BYPASS_ROLES,
  UNSCOPED_ROLES,
} from "@/features/dashboard/dispute-management/constants";
import { toDisputeCase } from "@/features/dashboard/dispute-management/helpers";
import type {
  CbDetailsResponse,
  CbDocsResponse,
  CbEnvelope,
  CbMessagesResponse,
  CbStaticDataResponse,
  CbTimelineResponse,
  DisputeSearchBody,
  DisputeSearchResponse,
} from "@/features/dashboard/dispute-management/types";

/** Query-key root for the list. Writes use the hooks' default (refresh every query), as pg-dashboard does. */
const DISPUTE_LIST_KEY = ["disputes"] as const;

/** A one-off GET from an event handler or a loop: the report poll and the upload check. */
async function getOnce<T>(url: string): Promise<T> {
  try {
    const res = await api.get<T>(url);
    return res.data;
  } catch (error) {
    return handleApiError(error as AxiosError);
  }
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * The clock, for countdowns. Render must not call `Date.now()`, so the value
 * lives in state and ticks once a minute (the countdowns are minute-grained).
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

// ── Access ───────────────────────────────────────────────────────────────────

/**
 * pg-dashboard's product gate (chargebacks/index.tsx:14-21): the merchant
 * holds DISPUTE, or the role is one that sees the page regardless.
 */
export function useDisputeEnabled(): boolean {
  const role = useApp((s) => s.profile?.role);
  const paymentProducts = useApp((s) => s.merchantEnabledProducts?.paymentProducts);
  const bypass = PRODUCT_GUARD_BYPASS_ROLES.some((r) => role?.includes(r));
  return bypass || !!paymentProducts?.includes(DISPUTE_FEATURE);
}

/**
 * Which merchants the list covers: pg-dashboard's `resolvedMerchantIds` (the
 * selected MID, else every PA MID, else the profile MID). Aggregator,
 * reseller, portfolio and custom users send no merchant scope at all
 * (`merchantMids: null`); the backend scopes them. `showMerchantId` is the
 * Merchant ID column: shown when the list spans more than one PA MID.
 */
export function useDisputeMidScope() {
  const role = useApp((s) => s.profile?.role);
  const profileMid = useApp((s) => s.profile?.mid) ?? "";
  const paMids = useApp((s) => s.paMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  return useMemo(() => {
    const unscoped = UNSCOPED_ROLES.some((r) => role?.includes(r));
    let mids: string[];
    if (selectedMid) mids = [selectedMid];
    else if (paMids.length > 0) mids = paMids;
    else mids = profileMid ? [profileMid] : [];
    return {
      merchantMids: unscoped ? null : mids,
      showMerchantId: paMids.length > 1 && !selectedMid,
      isReady: unscoped || mids.length > 0,
    };
  }, [role, profileMid, paMids, selectedMid]);
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** POST /v1/search/cb. pg-dashboard ran it as a mutation; it is a read, so a POST query. */
export function useDisputeSearch(body: DisputeSearchBody, enabled: boolean) {
  const query = usePostQuery<DisputeSearchResponse, DisputeSearchBody>(
    DISPUTE_LIST_KEY,
    disputeSearchApi,
    body,
    undefined,
    enabled
  );
  return {
    rows: query.data?.data?.data ?? [],
    total: query.data?.data?.totalCount ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/** GET /v2/cb/static/data: reason codes and the documents each needs. */
export function useCbStaticData(enabled = true) {
  const query = useGet<CbStaticDataResponse>(["cb-static-data"], cbStaticDataApi, {
    enabled,
    staleTime: 5 * 60_000,
  });
  return query.data?.data?.["static-data"];
}

/** GET /v2/cb/details/{mid}/{cbId}, as the detail views read it. */
export function useDisputeCase(mid: string, cbId: string) {
  const url = cbDetailsApi(mid, cbId);
  const query = useGet<CbDetailsResponse>(["cbDetails", mid, cbId], url, { enabled: !!url });
  const payload = query.data?.data?.["chargeback-details"];
  const dispute = useMemo(() => toDisputeCase(payload), [payload]);
  return { dispute, isLoading: query.isLoading, isError: query.isError };
}

export function useCbTimeline(mid: string, cbId: string) {
  const url = cbTimelineApi(mid, cbId);
  const query = useGet<CbTimelineResponse>(["cbTimeline", cbId], url, { enabled: !!url });
  return { items: query.data?.data?.chargebackTimeline ?? [], isLoading: query.isLoading };
}

/** The merchant's two document sets: their proof documents and the bank's CDF. */
export function useCbDocuments(cbId: string) {
  const proof = useGet<CbDocsResponse>(["uploadedDocs", cbId], cbUploadedDocsApi(cbId), {
    enabled: !!cbId,
  });
  const cdf = useGet<CbDocsResponse>(["uploadedCdf", cbId], cbUploadedCdfApi(cbId), {
    enabled: !!cbId,
  });
  return {
    proof: proof.data?.data?.cbDocs ?? [],
    cdf: cdf.data?.data?.cbDocs ?? [],
    isLoading: proof.isLoading,
    refetchProof: () => void proof.refetch(),
  };
}

export function useCbMessages(mid: string, cbId: string) {
  const url = cbMessagesApi(mid, cbId);
  const query = useGet<CbMessagesResponse>(["secureMessaging", mid, cbId], url, {
    enabled: !!url,
  });
  return { messages: query.data?.data?.conversation ?? [], isLoading: query.isLoading };
}

// ── Report download ──────────────────────────────────────────────────────────

type ReportSubmitResponse = CbEnvelope<{ reportId?: string }>;
type ReportStatusResponse = CbEnvelope<{
  reportStatus: "INITIATED" | "INPROGRESS" | "SUCCESS" | "FAILED";
  preSignedUrl?: string;
  fileName?: string;
}>;

const REPORT_POLL_MS = 2000;
const REPORT_TIMEOUT_MS = 60_000;

/** pg-dashboard's `download(fileName, url)` for a presigned link. */
function downloadFromUrl(url: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export type ReportSource = "v2" | "v1";

/**
 * The dispute report, both sources pg-dashboard's report drawer offers for
 * disputes ("Report Source"):
 *
 * - **V2** (the default), useAsyncReportDownload: submit, poll every 2s until
 *   SUCCESS or FAILED, give up after 60s, then download the presigned file.
 *   The poll is owned by the list, so closing the drawer does not stop it.
 * - **V1**: a direct CSV from `/v1/search/cb/download`, saved as
 *   `report_<ISO time>.csv`.
 */
export function useDisputeReport(onDone: () => void) {
  const submit = usePost<ReportSubmitResponse, DisputeSearchBody>(disputeReportApi, {
    invalidateQueries: false,
  });
  const downloadV1 = usePost<Blob, DisputeSearchBody>(disputeReportV1Api, {
    invalidateQueries: false,
    download: true,
  });
  const [isPolling, setIsPolling] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const start = async (body: DisputeSearchBody) => {
    let reportId: string | undefined;
    try {
      const res = await submit.mutateAsync(body);
      reportId = res?.data?.reportId;
      if (!reportId) {
        toast.error(res?.message || "Report job submission did not return a report ID.");
        return;
      }
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to submit report job.");
      return;
    }

    setIsPolling(true);
    const deadline = Date.now() + REPORT_TIMEOUT_MS;
    try {
      while (!cancelled.current) {
        let status: ReportStatusResponse | undefined;
        try {
          status = await getOnce<ReportStatusResponse>(disputeReportStatusApi(reportId));
        } catch {
          // A failed status read shows nothing; polling carries on until the timeout.
          status = undefined;
        }
        if (cancelled.current) return;
        if (Date.now() >= deadline) {
          toast.error("Report generation timed out. Please try again.");
          return;
        }
        const state = status?.data?.reportStatus;
        if (state === "FAILED") {
          toast.error("Report generation failed. Please try again.");
          return;
        }
        if (state && state !== "INITIATED" && state !== "INPROGRESS") {
          const { preSignedUrl, fileName } = status!.data;
          if (!preSignedUrl) {
            toast.error("Report generation succeeded but no file was returned.");
            return;
          }
          downloadFromUrl(preSignedUrl, fileName || `report_${new Date().toISOString()}.csv`);
          onDone();
          return;
        }
        await wait(Math.min(REPORT_POLL_MS, Math.max(deadline - Date.now(), 0)));
      }
    } finally {
      if (!cancelled.current) setIsPolling(false);
    }
  };

  const startV1 = (body: DisputeSearchBody) => {
    downloadV1.mutate(body, {
      onSuccess: (blob) => {
        downloadBlob(
          new Blob([blob], { type: "text/csv;charset=utf-8;" }),
          `report_${new Date().toISOString()}.csv`
        );
        onDone();
      },
      onError: (e) => toast.error((e as Error)?.message || "Failed to download report."),
    });
  };

  return {
    start: (source: ReportSource, body: DisputeSearchBody) =>
      source === "v2" ? void start(body) : startV1(body),
    isBusy: submit.isPending || isPolling || downloadV1.isPending,
  };
}

// ── Document upload ──────────────────────────────────────────────────────────

type MetaData = {
  gid?: string;
  fileExtension?: string;
  docType?: string;
  entityId?: string;
  maxSize?: string;
  shortDesc?: string;
};

type InitiateData = { presignedPutUrl?: string; metaData?: MetaData; fileId?: string };
type InitiateResponse = CbEnvelope<InitiateData | { data?: InitiateData }>;
type StatusResponse = CbEnvelope<{
  uploadStatus?: string;
  fileStatus?: { uploadStatus?: string };
}>;

export type UploadRow = {
  /** The name sent to the server (already de-duplicated). */
  fileName: string;
  docType: string;
  status: "active" | "success" | "error";
  message: string;
};

const MAX_ATTEMPTS = 5;
const POLL_MS = 2_000;
const POLL_WINDOW_MS = 30_000;

/** pg-dashboard reads the slot from either `res.data` or `res.data.data`. */
function unwrapSlot(res: InitiateResponse | undefined): InitiateData {
  const outer = (res?.data ?? res) as InitiateData & { data?: InitiateData };
  return outer?.data && "presignedPutUrl" in outer.data ? outer.data : outer;
}

function statusOf(res: StatusResponse | null): string | undefined {
  return res?.data?.uploadStatus ?? res?.data?.fileStatus?.uploadStatus;
}

/**
 * A merchant's proof-document upload: pg-dashboard's `isCbUpload` path of the
 * shared useS3FileUpload + fetchUploadStatus, reached through
 * CbUploadDocsDrawer. One attempt is three legs:
 *
 * 1. PUT `/v2/cb/{cbId}/doc/update/merchant` with `{ cbDocRequest: { fileName,
 *    docType, action, fileId?, cbDocType: "PROOF_DOCS", shortDesc? } }`, which
 *    returns a presigned URL, the `x-amz-meta-*` values it was signed with,
 *    and a fileId.
 * 2. PUT the bytes to S3 with exactly those headers.
 * 3. GET `/v2/cb/{cbId}/doc/verify-upload/{fileId}`: COMPLETED is done,
 *    IN_PROGRESS is re-checked every 2s for up to 30s, anything else fails.
 *
 * Up to 5 attempts; the first sends `action: "UPLOAD"`, the rest `"RETRY"`
 * with the last fileId.
 */
export function useCbDocumentUpload(cbId: string, onUploaded: () => void) {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const initiate = usePut<InitiateResponse, { reqBody: object }>(cbMerchantDocUploadApi(cbId), {
    invalidateQueries: false,
  });
  const s3 = usePut<
    unknown,
    { dynamicUrl: string; customHeaders: Record<string, string>; reqBody: File }
  >("", { invalidateQueries: false });

  const update = (fileName: string, patch: Partial<UploadRow>) =>
    setRows((prev) => prev.map((row) => (row.fileName === fileName ? { ...row, ...patch } : row)));

  const checkStatus = async (fileId: string): Promise<StatusResponse | null> => {
    try {
      return await getOnce<StatusResponse>(cbUploadStatusApi(cbId, fileId));
    } catch {
      return null;
    }
  };

  const attempt = async (
    file: File,
    fileName: string,
    docType: string,
    shortDesc: string | undefined,
    action: "UPLOAD" | "RETRY",
    previousFileId: string | undefined
  ): Promise<{ ok: boolean; fileId?: string }> => {
    let fileId = previousFileId;
    try {
      const slot = unwrapSlot(
        await initiate.mutateAsync({
          reqBody: {
            cbDocRequest: {
              fileName,
              docType,
              action,
              ...(fileId ? { fileId } : {}),
              cbDocType: "PROOF_DOCS",
              ...(shortDesc ? { shortDesc } : {}),
            },
          },
        })
      );
      if (!slot.presignedPutUrl?.trim() || !slot.fileId) return { ok: false, fileId };
      fileId = slot.fileId;

      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const md = slot.metaData;
      await s3.mutateAsync({
        dynamicUrl: slot.presignedPutUrl,
        reqBody: file,
        customHeaders: {
          "Content-Type": CONTENT_TYPE_BY_EXTENSION[extension] || "application/octet-stream",
          ...(md?.gid ? { "x-amz-meta-gid": md.gid } : {}),
          "x-amz-meta-fileextension": md?.fileExtension ?? "",
          "x-amz-meta-doctype": md?.docType ?? "",
          "x-amz-meta-entityid": md?.entityId ?? "",
          "x-amz-meta-maxsize": md?.maxSize ?? "",
          ...(md?.shortDesc ? { "x-amz-meta-shortdesc": md.shortDesc } : {}),
        },
      });

      let state = statusOf(await checkStatus(fileId));
      if (state === "COMPLETED") return { ok: true, fileId };
      if (state === "IN_PROGRESS") {
        const deadline = Date.now() + POLL_WINDOW_MS;
        while (Date.now() < deadline) {
          await wait(POLL_MS);
          state = statusOf(await checkStatus(fileId));
          if (state === "COMPLETED") return { ok: true, fileId };
          if (state === "FAILED") break;
          update(fileName, { message: "Processing..." });
        }
      }
      return { ok: false, fileId };
    } catch {
      return { ok: false, fileId };
    }
  };

  const upload = async (
    file: File,
    options: { fileName: string; docType: string; shortDesc?: string }
  ) => {
    const { fileName, shortDesc } = options;
    const docType = options.docType || "OTHER";
    setRows((prev) => [{ fileName, docType, status: "active", message: "Uploading..." }, ...prev]);

    let fileId: string | undefined;
    for (let attemptNo = 0; attemptNo < MAX_ATTEMPTS; attemptNo++) {
      if (attemptNo > 0) update(fileName, { message: `Retrying ${attemptNo}/${MAX_ATTEMPTS}` });
      const result = await attempt(
        file,
        fileName,
        docType,
        shortDesc,
        attemptNo === 0 ? "UPLOAD" : "RETRY",
        fileId
      );
      fileId = result.fileId;
      if (result.ok) {
        // Done: the documents list shows it from here, so the row goes.
        setRows((prev) => prev.filter((row) => row.fileName !== fileName));
        onUploaded();
        return true;
      }
    }
    update(fileName, { status: "error", message: `Failed after ${MAX_ATTEMPTS} attempts.` });
    return false;
  };

  return {
    rows,
    upload,
    dismissRow: (fileName: string) =>
      setRows((prev) => prev.filter((row) => row.fileName !== fileName)),
    isUploading: rows.some((row) => row.status === "active"),
  };
}
