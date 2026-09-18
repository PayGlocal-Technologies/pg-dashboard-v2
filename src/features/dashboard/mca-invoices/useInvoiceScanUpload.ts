"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGet, usePut } from "@/lib/api/hooks";
import { buildS3Headers } from "@/features/dashboard/mca-transactions/useInvoiceUpload";
import { scannedInvoiceApi, uploadInvoiceApi } from "@/features/dashboard/mca-invoices/services";
import type {
  ScannedInvoiceExtract,
  ScannedInvoiceResponse,
  UploadInvoicePresignResponse,
} from "@/features/dashboard/mca-invoices/types";

/**
 * The upload half of Invoice Management's "Upload Invoice", ported from
 * pg-dashboard's useUploadInvoiceDrawer.
 *
 * Two legs. `startUpload` asks for a presigned URL, PUTs the PDF to it, and
 * then polls `get-invoice` until the server has finished reading the document;
 * what comes back seeds the confirm form the dialog shows next. Creating the
 * invoice from those confirmed fields is the dialog's own POST, not this hook's
 * — this ends the moment there is something to confirm.
 *
 * Deliberately shaped like mca-transactions' useInvoiceUpload, which does the
 * same thing against the transaction-side endpoint (`disableInvoice=true`, plus
 * a comparison against the transaction). `phase` and `error` are derived on
 * every render rather than stored, so no state is written from an effect body
 * (see CLAUDE.md); the only stored pieces are the ones no query owns.
 */

const SCAN_POLL_INTERVAL_MS = 2000;
/** Extraction runs asynchronously on the server with no completion callback,
 *  so the poll needs its own deadline. 60s, matching pg-dashboard. */
const SCAN_TIMEOUT_MS = 60_000;

const SCAN_FAILED_MESSAGE = "Couldn't read this invoice. Please try uploading it again.";
const SCAN_TIMED_OUT_MESSAGE = "Data extraction timed out. Please try uploading again.";

export type InvoiceScanPhase = "idle" | "scanning" | "ready" | "error";

export interface ClientOption {
  value: string;
  label: string;
  /** True for the entry extraction proposed that is not on file yet — its id
   *  carries production's `NEW_` prefix, and picking it creates the client
   *  alongside the invoice. */
  isNew: boolean;
}

export interface UseInvoiceScanUploadResult {
  phase: InvoiceScanPhase;
  file: File | null;
  /** The record extraction created, which the confirm POST is addressed to.
   *  Empty until leg 1 has landed. */
  invoiceId: string;
  /** What the server read off the document. Null until `phase` is "ready". */
  extract: ScannedInvoiceExtract | null;
  /** The clients this invoice may be raised against, from the same response. */
  clientOptions: ClientOption[];
  error: string | null;
  startUpload: (file: File) => Promise<void>;
  reset: () => void;
}

function fileExtensionOf(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() || "pdf";
}

export function useInvoiceScanUpload(merchantId: string): UseInvoiceScanUploadResult {
  const [file, setFile] = useState<File | null>(null);
  const [invoiceId, setInvoiceId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Invalidates in-flight work when the merchant swaps the file: a scan that
  // resolves after its file was replaced must not write over the newer one.
  const uploadTokenRef = useRef(0);

  const { mutateAsync: requestUploadUrl } = usePut<
    UploadInvoicePresignResponse,
    { dynamicUrl: string }
  >("", { invalidateQueries: false });

  const { mutateAsync: putToS3 } = usePut<
    unknown,
    { dynamicUrl: string; customHeaders: Record<string, string>; reqBody: File }
  >("", { invalidateQueries: false });

  // Runs only once an invoiceId exists, and stops itself the moment the
  // payload lands or the request errors — that is what refetchInterval
  // returning false does.
  const { data: scanPoll, isError: isScanError } = useGet<ScannedInvoiceResponse>(
    ["mca-invoice-scan", merchantId, invoiceId],
    scannedInvoiceApi(merchantId, invoiceId),
    undefined,
    {
      enabled: !!invoiceId,
      refetchInterval: (query) => {
        const result = query.state.data as ScannedInvoiceResponse | undefined;
        if (result?.data != null) return false;
        if (query.state.status === "error") return false;
        return SCAN_POLL_INTERVAL_MS;
      },
    }
  );

  const scanned = scanPoll?.data ?? null;
  const hasFailed = !!uploadError || isScanError || hasTimedOut;

  let phase: InvoiceScanPhase = "idle";
  if (hasFailed) phase = "error";
  else if (scanned) phase = "ready";
  else if (isUploading || invoiceId) phase = "scanning";

  let error: string | null = null;
  if (uploadError) error = uploadError;
  else if (isScanError) error = SCAN_FAILED_MESSAGE;
  else if (hasTimedOut) error = SCAN_TIMED_OUT_MESSAGE;

  const clientOptions: ClientOption[] = (scanned?.mcaClientList ?? []).map((client) => ({
    value: client.id,
    label: client.name,
    isNew: client.id.startsWith("NEW_"),
  }));

  // Extraction deadline. setState happens in the timer callback, never in the
  // effect body, and the timer is torn down as soon as the poll resolves,
  // errors, or the invoiceId changes under a re-upload.
  useEffect(() => {
    if (!invoiceId || scanned || isScanError) return;
    const timer = setTimeout(() => setHasTimedOut(true), SCAN_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [invoiceId, scanned, isScanError]);

  const reset = useCallback(() => {
    uploadTokenRef.current += 1;
    setFile(null);
    setInvoiceId("");
    setIsUploading(false);
    setUploadError(null);
    setHasTimedOut(false);
  }, []);

  const startUpload = useCallback(
    async (nextFile: File) => {
      if (!merchantId) {
        setUploadError("No merchant account selected. Cannot upload an invoice.");
        return;
      }

      const token = ++uploadTokenRef.current;
      setFile(nextFile);
      setInvoiceId("");
      setUploadError(null);
      setHasTimedOut(false);
      setIsUploading(true);

      try {
        const presign = await requestUploadUrl({ dynamicUrl: uploadInvoiceApi(merchantId) });
        if (uploadTokenRef.current !== token) return;

        const uploadUrl = presign?.data?.upload_url;
        const metaData = presign?.data?.metaData;
        if (!uploadUrl || !metaData?.invoiceId) {
          throw new Error("Couldn't start the upload. Please try again.");
        }

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
        if (uploadTokenRef.current !== token) return;

        // Setting invoiceId is what starts the polling query above.
        setInvoiceId(metaData.invoiceId);
      } catch (err) {
        if (uploadTokenRef.current !== token) return;
        setUploadError(err instanceof Error ? err.message : "Couldn't upload the invoice.");
      } finally {
        if (uploadTokenRef.current === token) setIsUploading(false);
      }
    },
    [merchantId, requestUploadUrl, putToS3]
  );

  return {
    phase,
    file,
    invoiceId,
    extract: scanned?.extractedData ?? null,
    clientOptions,
    error,
    startUpload,
    reset,
  };
}
