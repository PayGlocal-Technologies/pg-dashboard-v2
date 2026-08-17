"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGet } from "@/lib/api/hooks";
import {
  mcaFircDownloadApi,
  mcaOverviewByMidApi,
  mcaOverviewByUcicApi,
  mcaTxnDocumentPresignApi,
  merchantProfileApi,
  merchantPurposeCodesApi,
} from "@/features/dashboard/mca-transactions/services";
import {
  allPurposeCodeOptions,
  toPurposeCodeOptions,
  type PurposeCodeOption,
} from "@/features/dashboard/mca-transactions/purposeCodes";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import type {
  FircDownloadResponse,
  McaOverviewData,
  McaOverviewResponse,
  MerchantProfileResponse,
  PresignedUrlResponse,
  SuggestedPurposeCodesResponse,
} from "@/features/dashboard/mca-transactions/types";

// Both downloads below follow the same shape: the file itself is never served
// by the API, only a short-lived presigned URL, so "download" is a GET whose
// response we then hand to the browser. React Query is a cache, not a command
// bus, so each is modelled as a disabled query plus an explicit trigger that
// stores the target in state; the effect that follows performs the fetch and
// opens the result. `nonce` makes every trigger a distinct query key, so
// asking for the same file twice actually refetches instead of replaying a
// cached (by then expired) URL.

interface DownloadTarget {
  merchantId: string;
  gid: string;
  nonce: number;
}

/** Opens the transaction's FIRC/FIRA documents, one tab per presigned URL. */
export function useFircDownload(): {
  downloadFirc: (merchantId: string, gid: string) => void;
  isDownloading: boolean;
} {
  const [target, setTarget] = useState<DownloadTarget | null>(null);

  const { refetch, isFetching } = useGet<FircDownloadResponse>(
    ["mca-firc-download", target?.merchantId, target?.gid, target?.nonce],
    mcaFircDownloadApi(target?.merchantId ?? "", target?.gid ?? ""),
    { enabled: false }
  );

  useEffect(() => {
    if (!target) return;

    const run = async (): Promise<void> => {
      const { data, error } = await refetch();
      const urls = data?.data?.preSignedUrls ?? [];

      if (urls.length) {
        // Staggered: browsers block a burst of window.open calls from one
        // gesture as a popup flood, so they are spaced a second apart.
        urls.forEach((url, index) => {
          setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), index * 1000);
        });
      } else if (error) {
        toast.error(error.message || "Couldn't fetch the FIRC download link.");
      }

      setTarget(null);
    };

    void run();
  }, [target, refetch]);

  return {
    downloadFirc: (merchantId: string, gid: string) => {
      if (!merchantId || !gid) return;
      setTarget({ merchantId, gid, nonce: performance.now() });
    },
    isDownloading: isFetching,
  };
}

/** Opens a single uploaded document (an invoice, typically) by its path. */
export function useDocumentDownload(): {
  downloadDocument: (documentPath: string) => void;
  isDownloading: boolean;
} {
  const [target, setTarget] = useState<{ path: string; nonce: number } | null>(null);

  const { refetch, isFetching } = useGet<PresignedUrlResponse>(
    ["mca-txn-document-presign", target?.path, target?.nonce],
    mcaTxnDocumentPresignApi(target?.path ?? ""),
    { enabled: false }
  );

  useEffect(() => {
    if (!target) return;

    const run = async (): Promise<void> => {
      const { data, error } = await refetch();
      const url = data?.data?.presignedUrl;

      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else if (error) toast.error(error.message || "Couldn't fetch the document download link.");

      setTarget(null);
    };

    void run();
  }, [target, refetch]);

  return {
    downloadDocument: (documentPath: string) => {
      if (!documentPath) return;
      setTarget({ path: documentPath, nonce: performance.now() });
    },
    isDownloading: isFetching,
  };
}

/**
 * The purpose codes a merchant may pick from, and which one to preselect.
 *
 * Mirrors pg-dashboard's precedence exactly (TransactionInvoiceUploadFlow):
 *
 *   1. the codes suggested for this merchant, if the API narrows them;
 *   2. otherwise the single code already on the merchant's profile;
 *   3. otherwise the full RBI table, so the field is never empty.
 *
 * Only the codes are fetched — their descriptions come from the static RBI
 * table, which is the same for every merchant. The profile call is deferred
 * until the suggestions have resolved, since it is only needed for the
 * fallback and for the preselected value.
 */
export function usePurposeCodes(merchantId: string): {
  options: PurposeCodeOption[];
  /** The merchant's current purpose code, for preselecting the field. */
  defaultPurposeCode: string;
  isLoading: boolean;
} {
  const { data: suggested, isFetched: hasCheckedSuggestions } =
    useGet<SuggestedPurposeCodesResponse>(
      ["merchant-purpose-codes", merchantId],
      merchantPurposeCodesApi(merchantId),
      { enabled: !!merchantId }
    );

  const { data: profile, isPending: isProfilePending } = useGet<MerchantProfileResponse>(
    ["merchant-profile", merchantId],
    merchantProfileApi(merchantId),
    { enabled: hasCheckedSuggestions && !!merchantId }
  );

  const suggestedCodes = suggested?.data?.suggestedPurposeCodes ?? [];
  const profilePurposeCode = profile?.purposeCode ?? "";

  let options: PurposeCodeOption[];
  if (suggestedCodes.length) options = toPurposeCodeOptions(suggestedCodes);
  else if (profilePurposeCode) options = toPurposeCodeOptions([profilePurposeCode]);
  else options = allPurposeCodeOptions();

  return {
    options,
    defaultPurposeCode: profilePurposeCode.toUpperCase(),
    isLoading: !hasCheckedSuggestions || isProfilePending,
  };
}

/**
 * The MCA business overview behind the Transactions page's analytics cards:
 * amount settled, amount still due, funds on hold, and fees saved.
 *
 * Which endpoint answers depends on scope, the same split pg-dashboard makes
 * (BusinessOverview/hooks.tsx): with a MID selected, the per-merchant
 * variant; without one, the UCIC-level roll-up across every merchant the user
 * can see.
 */
export function useMcaOverview(): {
  overview: McaOverviewData | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { urlMid, isReady } = useResolvedMids("PACB");
  const profile = useApp((s) => s.profile);
  const ucicId = profile?.ucicId ?? "";

  const scopeId = urlMid || ucicId;
  const url = urlMid ? mcaOverviewByMidApi(urlMid) : mcaOverviewByUcicApi(ucicId);

  const { data, isPending, isError } = useGet<McaOverviewResponse>(["mca-overview", scopeId], url, {
    enabled: isReady && !!scopeId,
  });

  return {
    overview: data?.data,
    isLoading: isPending,
    isError,
  };
}

/** Metric values arrive as either a number or a numeric string. */
export function toMetricNumber(value: number | string | undefined): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
