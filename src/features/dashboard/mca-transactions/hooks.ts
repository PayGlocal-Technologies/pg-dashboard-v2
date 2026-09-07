"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGet } from "@/lib/api/hooks";
import {
  mcaCurrencySplitApi,
  mcaDocumentPendingApi,
  mcaDocumentPendingByCurrencyApi,
  mcaFircDownloadApi,
  mcaInvoiceOriginsApi,
  mcaOverviewByMidApi,
  mcaOverviewByUcicApi,
  mcaSavedAmountApi,
  mcaSettledByAccountApi,
  mcaSettledCurrencyTrendApi,
  mcaTxnDocumentPresignApi,
  merchantProfileApi,
  merchantPurposeCodesApi,
} from "@/features/dashboard/mca-transactions/services";
import {
  allPurposeCodeOptions,
  toPurposeCodeOptions,
  type PurposeCodeOption,
} from "@/lib/purposeCodes";
import { useScopeId } from "@/lib/hooks/useScopeId";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useApp } from "@/stores/useApp";
import type {
  CurrencySplitData,
  CurrencySplitResponse,
  DocumentPendingByCurrencyData,
  DocumentPendingByCurrencyResponse,
  DocumentPendingData,
  DocumentPendingResponse,
  FircDownloadResponse,
  InvoiceOriginsData,
  InvoiceOriginsResponse,
  McaOverviewData,
  McaOverviewResponse,
  MerchantProfileResponse,
  PresignedUrlResponse,
  SavedAmountData,
  SavedAmountResponse,
  SettledByAccountData,
  SettledByAccountResponse,
  SettledCurrencyTrendResponse,
  SettledCurrencyTrendRow,
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
  const { scopeId, scope, isReady } = useScopeId("PACB");
  const url = scope === "mid" ? mcaOverviewByMidApi(scopeId) : mcaOverviewByUcicApi(scopeId);

  const { data, isPending, isError } = useGet<McaOverviewResponse>(["mca-overview", scopeId], url, {
    enabled: isReady,
  });

  return {
    overview: data?.data,
    isLoading: isPending,
    isError,
  };
}

/**
 * Per-account settled amount + count for a timeframe, scoped like useMcaOverview.
 * Backs SettlementAnalyticsCard's KPI + per-account bars.
 */
export function useSettledByAccount(timeframe: string): {
  settled: SettledByAccountData | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { scopeId: merchantId, isReady } = useScopeId("PACB");

  const { data, isPending, isError } = useGet<SettledByAccountResponse>(
    ["mca-settled-by-account", merchantId, timeframe],
    mcaSettledByAccountApi(merchantId, timeframe),
    { enabled: isReady }
  );

  return { settled: data?.data, isLoading: isReady && isPending, isError };
}

/**
 * Per-account (currency) settled totals + monthly series, scoped like
 * useSettledByAccount. Backs the Multi-Currency "Settled amount" region
 * breakdown. Each row carries a native-currency total and an INR total; ₹ views
 * read the INR figure since a mix of currencies only sums in one.
 */
export function useSettledCurrencyTrend(): {
  currencies: SettledCurrencyTrendRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { scopeId: merchantId, isReady } = useScopeId("PACB");

  const { data, isPending, isError } = useGet<SettledCurrencyTrendResponse>(
    ["mca-settled-currency-trend", merchantId],
    mcaSettledCurrencyTrendApi(merchantId),
    { enabled: isReady }
  );

  return { currencies: data?.data?.currencies, isLoading: isReady && isPending, isError };
}

/**
 * Documents pending amount + count for a timeframe (today | week | month |
 * ytd). Backs OutstandingAmountCard's headline. Scoped like useSettledByAccount:
 * a selected MID, else the UCIC roll-up.
 */
export function useDocumentPending(timeframe: string): {
  documentPending: DocumentPendingData | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { urlMid, isReady } = useResolvedMids("PACB");
  const profile = useApp((s) => s.profile);
  const ucicId = profile?.ucicId ?? "";
  const merchantId = urlMid || ucicId;

  const { data, isPending, isError } = useGet<DocumentPendingResponse>(
    ["mca-document-pending", merchantId, timeframe],
    mcaDocumentPendingApi(merchantId, timeframe),
    { enabled: isReady && !!merchantId }
  );

  return { documentPending: data?.data, isLoading: isReady && !!merchantId && isPending, isError };
}

/**
 * Documents pending broken down by currency — a live snapshot of everything
 * currently DOCUMENT_PENDING (no timeframe). Scoped like useDocumentPending.
 */
export function useDocumentPendingByCurrency(): {
  breakdown: DocumentPendingByCurrencyData | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { urlMid, isReady } = useResolvedMids("PACB");
  const profile = useApp((s) => s.profile);
  const ucicId = profile?.ucicId ?? "";
  const merchantId = urlMid || ucicId;

  const { data, isPending, isError } = useGet<DocumentPendingByCurrencyResponse>(
    ["mca-document-pending-by-currency", merchantId],
    mcaDocumentPendingByCurrencyApi(merchantId),
    { enabled: isReady && !!merchantId }
  );

  return { breakdown: data?.data, isLoading: isReady && !!merchantId && isPending, isError };
}

/**
 * Saved amount vs banks — overall + per-timeframe breakdown. Scoped like
 * useMcaOverview. Backs SavedAmountCard.
 */
export function useSavedAmount(): {
  saved: SavedAmountData | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { scopeId: merchantId, isReady } = useScopeId("PACB");

  const { data, isPending, isError } = useGet<SavedAmountResponse>(
    ["mca-saved-amount", merchantId],
    mcaSavedAmountApi(merchantId),
    { enabled: isReady }
  );

  return { saved: data?.data, isLoading: isReady && isPending, isError };
}

/**
 * Per-country invoice origins over a date range, scoped like useMcaOverview
 * (selected MID, else the UCIC roll-up). Empty dates let the backend default
 * the window. Backs McaInvoiceOriginsCard.
 */
export function useInvoiceOrigins(
  startDate: string,
  endDate: string
): { origins: InvoiceOriginsData | undefined; isLoading: boolean; isError: boolean } {
  const { scopeId: merchantId, isReady } = useScopeId("PACB");

  const { data, isPending, isError } = useGet<InvoiceOriginsResponse>(
    ["mca-invoice-origins", merchantId, startDate, endDate],
    mcaInvoiceOriginsApi(merchantId, startDate, endDate),
    { enabled: isReady }
  );

  return { origins: data?.data, isLoading: isReady && isPending, isError };
}

/**
 * Per-currency amount/count split over a date range, scoped like useMcaOverview.
 * Envelope-tolerant: reads `data` if present, else the flat body. Backs
 * McaCurrencySplitCard.
 */
export function useCurrencySplit(
  startDate: string,
  endDate: string
): { split: CurrencySplitData | undefined; isLoading: boolean; isError: boolean } {
  const { scopeId: merchantId, isReady } = useScopeId("PACB");

  const { data, isPending, isError } = useGet<CurrencySplitResponse>(
    ["mca-currency-split", merchantId, startDate, endDate],
    mcaCurrencySplitApi(merchantId, startDate, endDate),
    { enabled: isReady }
  );

  const body = data?.data ?? data;
  const split = body?.slices ? (body as CurrencySplitData) : undefined;

  return { split, isLoading: isReady && isPending, isError };
}

/** Metric values arrive as either a number or a numeric string. */
export function toMetricNumber(value: number | string | undefined): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
