"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGet, usePost, usePut } from "@/lib/api/hooks";
import {
  ffmsInvoiceUploadApi,
  mcaInvoiceMatchingApi,
  mcaInvoiceNameMismatchEmailApi,
  mcaInvoiceScanUploadApi,
} from "@/features/dashboard/mca-transactions/services";
import type {
  FfmsInvoicePresignResponse,
  InvoiceMatchingPayload,
  InvoiceMatchingResponse,
  McaInvoiceScanUploadResponse,
} from "@/features/dashboard/mca-transactions/types";

// The real invoice upload chain, ported from pg-dashboard's
// TransactionInvoiceUploadFlow. Two legs, split by the merchant's decision:
//
//   scan   — on file select. Get an S3 URL + invoiceId, PUT the file, then
//            poll invoice-matching until the extracted invoice has been
//            compared against the transaction. The result is what the
//            dropzone shows as matched or mismatched.
//   submit — on Submit. Attach the invoice to the transaction for real: PUT
//            to ffms with the purpose code, then PUT the file to the S3 URL
//            that comes back.
//
// The file is uploaded twice on purpose: the scan copy exists only to be
// read, and is thrown away if the merchant uploads a corrected invoice.
//
// `phase` and `error` below are derived on every render rather than stored.
// Mirroring the query's state into useState would mean writing state from an
// effect body on every poll tick, which cascades renders and is a lint error
// in this codebase (see CLAUDE.md). The only stored pieces are the ones no
// query owns: the chosen file, the invoiceId the poll is keyed by, a failure
// from the two imperative upload legs, and whether extraction ran out of time.

const MATCHING_POLL_INTERVAL_MS = 2000;
/** Extraction is asynchronous on the server with no completion callback, so
 *  the poll needs its own deadline rather than running until the drawer
 *  closes. Matches pg-dashboard's timeout. */
const MATCHING_TIMEOUT_MS = 60_000;

const MATCHING_FAILED_MESSAGE =
  "Couldn't verify the invoice against this transaction. Please try again.";
const MATCHING_TIMED_OUT_MESSAGE = "Invoice verification timed out. Please try again.";

/**
 * How long to wait after the invoice lands in S3 before telling callers the
 * submit succeeded.
 *
 * The S3 PUT completing is not the same as the transaction having changed:
 * the backend picks the object up asynchronously, so refetching the timeline
 * immediately returns the *pre-upload* state and the drawer shows a stale
 * "Upload invoice" step as though nothing happened. Waiting first means the
 * refetch that follows actually reflects the upload.
 *
 * 2500ms, matching pg-dashboard's own post-upload delay. It is a heuristic on
 * both sides — there is no completion signal to wait on — so a slower-than-
 * usual backend can still return stale data; the drawer's Refresh is the
 * fallback for that.
 */
const POST_UPLOAD_SETTLE_MS = 2500;

export type InvoiceScanPhase = "idle" | "scanning" | "ready" | "error";

/** The S3 metadata headers the presigned PUT is signed against — the upload
 *  is rejected outright if any of these is missing or altered. Mirrors
 *  pg-dashboard's getUploadHeaders. */
function buildS3Headers(fields: {
  fileExtension: string;
  merchantId: string;
  gid?: string;
  invoiceId?: string;
  maxSize?: string;
}): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "x-amz-meta-fileExtension": `.${fields.fileExtension}`,
    "x-amz-meta-maxSize": fields.maxSize ?? "10",
    ...(fields.gid ? { "x-amz-meta-gid": fields.gid } : {}),
    ...(fields.invoiceId ? { "x-amz-meta-invoiceId": fields.invoiceId } : {}),
    ...(fields.merchantId ? { "x-amz-meta-merchantId": fields.merchantId } : {}),
  };
}

function fileExtensionOf(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() || "pdf";
}

export interface UseInvoiceUploadArgs {
  merchantId: string;
  gid: string;
}

export interface SubmitInvoiceArgs {
  purposeCode: string;
  /** Set when the merchant accepted the invoice's remitter name over the
   *  transaction's after a name mismatch — triggers the ops email. */
  useInvoiceRemitterName?: boolean;
}

export interface UseInvoiceUploadResult {
  phase: InvoiceScanPhase;
  file: File | null;
  matching: InvoiceMatchingPayload | null;
  error: string | null;
  startScan: (file: File) => Promise<void>;
  submit: (args: SubmitInvoiceArgs) => Promise<void>;
  reset: () => void;
}

export function useInvoiceUpload({
  merchantId,
  gid,
}: UseInvoiceUploadArgs): UseInvoiceUploadResult {
  const [file, setFile] = useState<File | null>(null);
  const [invoiceId, setInvoiceId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Invalidates in-flight work when the merchant re-uploads or removes the
  // file: a scan that resolves after its file was replaced must not write
  // its result over the newer one.
  const scanTokenRef = useRef(0);

  const { mutateAsync: requestScanUrl } = usePut<
    McaInvoiceScanUploadResponse,
    { dynamicUrl: string }
  >("", { invalidateQueries: false });

  const { mutateAsync: putToS3 } = usePut<
    unknown,
    { dynamicUrl: string; customHeaders: Record<string, string>; reqBody: File }
  >("", { invalidateQueries: false });

  const { mutateAsync: requestFfmsUploadUrl } = usePut<FfmsInvoicePresignResponse, FormData>(
    ffmsInvoiceUploadApi(gid),
    { invalidateQueries: false }
  );

  const { mutateAsync: sendNameMismatchEmail } = usePost<
    unknown,
    { gid: string; invoiceId: string; extractedValue: string; ffmsValue: string }
  >(mcaInvoiceNameMismatchEmailApi(merchantId), { invalidateQueries: false });

  // Runs only once an invoiceId exists, and stops itself the moment the
  // payload lands or the request errors — that is what refetchInterval
  // returning false does.
  const { data: matchingPoll, isError: isMatchingError } = useGet<InvoiceMatchingResponse>(
    ["mca-invoice-matching", merchantId, gid, invoiceId],
    mcaInvoiceMatchingApi(merchantId, gid, invoiceId),
    {
      enabled: !!invoiceId,
      refetchInterval: (query) => {
        const result = query.state.data as InvoiceMatchingResponse | undefined;
        if (result?.status === "SUCCESS" && result.data != null) return false;
        if (query.state.status === "error") return false;
        return MATCHING_POLL_INTERVAL_MS;
      },
    }
  );

  const matching =
    matchingPoll?.status === "SUCCESS" && matchingPoll.data != null ? matchingPoll.data : null;

  const hasFailed = !!uploadError || isMatchingError || hasTimedOut;

  let phase: InvoiceScanPhase = "idle";
  if (hasFailed) phase = "error";
  else if (matching) phase = "ready";
  else if (isUploading || invoiceId) phase = "scanning";

  let error: string | null = null;
  if (uploadError) error = uploadError;
  else if (isMatchingError) error = MATCHING_FAILED_MESSAGE;
  else if (hasTimedOut) error = MATCHING_TIMED_OUT_MESSAGE;

  // Extraction deadline. setState happens in the timer callback, never in the
  // effect body, and the timer is torn down as soon as the poll resolves,
  // errors, or the invoiceId changes under a re-upload.
  useEffect(() => {
    if (!invoiceId || matching || isMatchingError) return;
    const timer = setTimeout(() => setHasTimedOut(true), MATCHING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [invoiceId, matching, isMatchingError]);

  const reset = useCallback(() => {
    scanTokenRef.current += 1;
    setFile(null);
    setInvoiceId("");
    setIsUploading(false);
    setUploadError(null);
    setHasTimedOut(false);
  }, []);

  /** Leg 1. Uploads the file for extraction and starts the matching poll. */
  const startScan = useCallback(
    async (nextFile: File) => {
      if (!merchantId || !gid) {
        setUploadError("Missing merchant or transaction. Cannot upload invoice.");
        return;
      }

      const token = ++scanTokenRef.current;
      setFile(nextFile);
      setInvoiceId("");
      setUploadError(null);
      setHasTimedOut(false);
      setIsUploading(true);

      try {
        const scan = await requestScanUrl({ dynamicUrl: mcaInvoiceScanUploadApi(merchantId) });
        if (scanTokenRef.current !== token) return;

        const { upload_url: uploadUrl, metaData } = scan.data;
        await putToS3({
          dynamicUrl: uploadUrl,
          customHeaders: buildS3Headers({
            fileExtension: fileExtensionOf(nextFile),
            merchantId,
            invoiceId: metaData.invoiceId,
            maxSize: metaData.maxSize,
          }),
          reqBody: nextFile,
        });
        if (scanTokenRef.current !== token) return;

        // Setting invoiceId is what starts the polling query above.
        setInvoiceId(metaData.invoiceId);
      } catch (err) {
        if (scanTokenRef.current !== token) return;
        setUploadError(err instanceof Error ? err.message : "Couldn't upload the invoice.");
      } finally {
        if (scanTokenRef.current === token) setIsUploading(false);
      }
    },
    [merchantId, gid, requestScanUrl, putToS3]
  );

  /** Leg 2. Attaches the invoice to the transaction. Throws on failure so the
   *  form can surface it and keep the merchant on the page. */
  const submit = useCallback(
    async ({ purposeCode, useInvoiceRemitterName }: SubmitInvoiceArgs) => {
      if (!file) throw new Error("Upload an invoice before submitting.");

      const extension = fileExtensionOf(file);
      const body = new FormData();
      body.append("invoiceFileExtension", `.${extension}`);
      body.append("purposeCode", purposeCode);

      const presign = await requestFfmsUploadUrl(body);
      const uploadUrl = presign?.data?.presignedUrlsMap?.INVOICE;
      if (!uploadUrl) throw new Error("Couldn't start the invoice upload. Please try again.");

      await putToS3({
        dynamicUrl: uploadUrl,
        customHeaders: buildS3Headers({ fileExtension: extension, gid, merchantId }),
        reqBody: file,
      });

      // Best-effort: this only asks ops to redo the FIRC name. Failing it must
      // not fail an invoice that has already been attached.
      if (useInvoiceRemitterName) {
        const remitter = matching?.validationStatus?.remitterName;
        await sendNameMismatchEmail({
          gid,
          invoiceId,
          extractedValue: remitter?.extractedValue ?? "",
          ffmsValue: remitter?.ffmsValue ?? "",
        }).catch(() => undefined);
      }

      // Deliberately the last thing submit does, so callers stay in their
      // submitting state throughout and whatever they refetch on success sees
      // the updated transaction rather than the pre-upload one.
      await new Promise((resolve) => setTimeout(resolve, POST_UPLOAD_SETTLE_MS));
    },
    [
      file,
      gid,
      merchantId,
      invoiceId,
      matching,
      requestFfmsUploadUrl,
      putToS3,
      sendNameMismatchEmail,
    ]
  );

  return { phase, file, matching, error, startScan, submit, reset };
}
