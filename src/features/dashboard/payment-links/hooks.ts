"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { usePost, usePostQuery, usePut } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { isFeatureAvailableForMid } from "@/lib/hooks/useFeatureApplicable";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { downloadBlob } from "@/lib/utils/format";
import type { TableReqBody } from "@/types/transactions";
import { PAYMENT_LINKS_PAGE_LIMIT } from "@/features/dashboard/payment-links/constants";
import {
  paymentLinkDisableApi,
  paymentLinksReportApi,
  paymentLinksSearchApi,
} from "@/features/dashboard/payment-links/services";
import type {
  PaymentLinkApiRow,
  PaymentLinkRow,
  PaymentLinksResponse,
} from "@/features/dashboard/payment-links/types";

const PAYMENT_LINKS_QUERY_KEY = ["payment-links"] as const;

/** The per-MID entitlement pg-dashboard checks (FEATURE_MAP.PAYMENT). */
export const PAYMENT_LINKS_FEATURE = "PAYMENT_LINKS";

/**
 * "Which account is this link for?" for Create, as pg-dashboard asks it
 * (ChooseMidSelect, over useApplicableMids("PAYMENT_LINKS")): a merchant with
 * several eligible PA MIDs and none selected picks one first, and the pick is
 * written to the selected-MID store the sidebar uses, so the list and the
 * create form both follow it. One eligible MID, or one already selected,
 * needs no choice.
 *
 * The options are the PA MIDs that carry PAYMENT_LINKS; if that narrows to
 * nothing (tidsInfo and paMids come from different responses and can
 * disagree), every PA MID is offered.
 */
export function usePaymentLinkMidScope(): {
  needsMidChoice: boolean;
  midOptions: string[];
  selectMid: (mid: string) => void;
} {
  const paMids = useApp((s) => s.paMids);
  const tidsInfo = useApp((s) => s.tidsInfo);
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);

  const midOptions = useMemo(() => {
    const eligible = paMids.filter((mid) =>
      isFeatureAvailableForMid(mid, PAYMENT_LINKS_FEATURE, isMultiMidUser, tidsInfo)
    );
    return eligible.length > 0 ? eligible : paMids;
  }, [paMids, tidsInfo, isMultiMidUser]);

  return {
    needsMidChoice: midOptions.length > 1 && !selectedMid,
    midOptions,
    // pg-dashboard's own tint for this pick (color "#E5B5FF").
    selectMid: (mid: string) => setSelectedMidDetails({ mid, color: "#E5B5FF" }),
  };
}

/**
 * The list's MID scope, keyed on **`mid`** as pg-dashboard builds it
 * (useMcaPaymentInvoiceLinks: `selectedMid ? [selectedMid] : midMap.PAYMENT`,
 * with `midMap.PAYMENT = paMids`): the selected MID alone, or every PA MID
 * the merchant has. Not useResolvedMids, which keys on `merchantId`.
 */
function usePaymentLinkMidFilter(): {
  filter: { key: string; value: string[] } | undefined;
  isReady: boolean;
} {
  const paMids = useApp((s) => s.paMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  return useMemo(() => {
    const value = selectedMid ? [selectedMid] : paMids;
    if (!value || value.length === 0) return { filter: undefined, isReady: false };
    return { filter: { key: "mid", value }, isReady: true };
  }, [selectedMid, paMids]);
}

export interface PaymentLinkFilters {
  /** The search box: pg-dashboard sends it as the search query. */
  search?: string;
  status?: string[];
  startTime?: number;
  endTime?: number;
}

/** One API row, flattened for the table and the details modal. */
export function toPaymentLinkRow(api: PaymentLinkApiRow): PaymentLinkRow {
  const phone = api.phoneNumber?.trim();
  return {
    id: api.id,
    mid: api.mid,
    amount: Number(api.totalAmount) || 0,
    currency: api.txnCurrency || "INR",
    status: api.status ?? "",
    customerName: api.fullName ?? "",
    customerDetails: api.emailId ?? "",
    customerPhone: phone ? `${api.callingCode ?? ""} ${phone}`.trim() : "",
    // pg-dashboard's details fall back to the shipping address (PlDetails.tsx).
    billingAddress: api.billingAddress || api.shippingAddress || "",
    paymentLinkUrl: (api.paymentLink ?? "").replace(/^https?:\/\//i, ""),
    paymentFor: api.productDescription ?? "",
    createdAt: api.formattedCreationTime ?? "",
    expiresAt: api.formattedExpiryTime ?? "",
    notifyVia: api.callingCode === "+91" ? ["SMS", "Email"] : ["Email"],
  };
}

/**
 * The payment links list, every filter on the server as pg-dashboard sends
 * it: status as `fieldSearch.status`, the Created at window as
 * `startTime`/`endTime`, the search box as the search query, and paging as
 * `from`/`pageLimit`.
 */
export function usePaymentLinks(filters: PaymentLinkFilters, page: number) {
  const isGuestUser = useApp((s) => s.isGuestUser);
  const { filter: midFilter, isReady } = usePaymentLinkMidFilter();

  const body: TableReqBody = buildTxnRequestBody(
    {
      status: filters.status?.length ? filters.status : undefined,
      startTime: filters.startTime,
      endTime: filters.endTime,
    },
    {
      searchQuery: filters.search || undefined,
      // pg-dashboard sends this box's text as a plain QUERY, email or not
      // (index.tsx onSearch → `newFilters.searchQuery`), never exact-match.
      emailExactMatch: false,
      selectedMid: midFilter,
      pageLimit: PAYMENT_LINKS_PAGE_LIMIT,
      from: (page - 1) * PAYMENT_LINKS_PAGE_LIMIT,
    }
  );

  const query = usePostQuery<PaymentLinksResponse, TableReqBody>(
    PAYMENT_LINKS_QUERY_KEY,
    paymentLinksSearchApi,
    body,
    undefined,
    isReady && !isGuestUser
  );

  const rows = useMemo(() => (query.data?.data?.data ?? []).map(toPaymentLinkRow), [query.data]);

  return {
    rows,
    totalCount: query.data?.data?.totalCount ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    /** False when there is no MID to scope to: the table shows its empty state, not an unscoped list. */
    isReady,
  };
}

/**
 * The list export, fed by the shared ReportDownloadDrawer. The path MID is
 * pg-dashboard's `currentMid` (`selectedMid || paMids[0]`), and the file a CSV.
 */
export function usePaymentLinksReport() {
  const paMids = useApp((s) => s.paMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const reportMid = selectedMid || paMids?.[0] || "";

  const mutation = usePost<Blob, TableReqBody>(paymentLinksReportApi(reportMid), {
    download: true,
    invalidateQueries: false,
    onSuccess: (blob: Blob) => {
      downloadBlob(blob, `payment-links-${new Date().toISOString().slice(0, 10)}.csv`);
    },
    onError: (error: Error) =>
      toast.error(error?.message || "Couldn't generate the report. Please try again."),
  });

  return { ...mutation, reportMid };
}

/** The export body for a drawer window, the same one Invoice Links sends. */
export function buildPaymentLinksReportBody(window: { startTime: number; endTime: number }) {
  return {
    pageLimit: PAYMENT_LINKS_PAGE_LIMIT,
    from: 0,
    fieldOrSearch: {},
    startTime: window.startTime,
    endTime: window.endTime,
    searchFilterType: "DEFAULT_TIME_RANGE",
  } as TableReqBody;
}

/**
 * Deactivate an Active link, as pg-dashboard's "Disable Link" does: a PUT with
 * no body. The table then refreshes in two steps:
 *  1. straight away, the row is marked DISABLED in every cached page, so its
 *     badge changes without waiting on the server;
 *  2. the list is refetched, a second later (upstream's delay, which gives
 *     the search index time to see the new status) and again after three,
 *     in case the first refetch still read the old status.
 */
const REFETCH_DELAYS_MS = [1000, 3000];

export function useDisablePaymentLink(onDone?: () => void) {
  const queryClient = useQueryClient();

  const markDisabled = (id: string) => {
    queryClient.setQueriesData<PaymentLinksResponse>(
      { queryKey: PAYMENT_LINKS_QUERY_KEY },
      (old) => {
        const page = old?.data;
        if (!page?.data) return old;
        const rows = page.data.map((row) => (row.id === id ? { ...row, status: "DISABLED" } : row));
        return { ...old, data: { ...page, data: rows } };
      }
    );
  };

  const mutation = usePut<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: false,
    onSuccess: () => {
      toast.success("Payment link deactivated");
      onDone?.();
      for (const delay of REFETCH_DELAYS_MS) {
        setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: PAYMENT_LINKS_QUERY_KEY });
        }, delay);
      }
    },
    onError: (error: Error) => toast.error(error?.message || "Failed to deactivate link"),
  });

  return {
    ...mutation,
    // The id rides on the call's own onSuccess, not in the variables: usePut
    // sends every variable but dynamicUrl as the body, and this PUT has none.
    disable: (mid: string, id: string) =>
      mutation.mutate(
        { dynamicUrl: paymentLinkDisableApi(mid, id) },
        { onSuccess: () => markDisabled(id) }
      ),
  };
}
