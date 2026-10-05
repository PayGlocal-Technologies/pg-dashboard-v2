"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePost, usePostQuery } from "@/lib/api/hooks";
import { downloadBlob } from "@/lib/utils/format";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  schedulerDownloadApi,
  schedulerListApi,
  schedulerRetryApi,
} from "@/features/dashboard/scheduler/services";
import type {
  SchedulerListRequest,
  SchedulerListResponse,
  SchedulerRetryRequest,
  SchedulerRetryResponse,
  SchedulerTxn,
  SchedulerView,
} from "@/features/dashboard/scheduler/types";

/** Query-key root for both views, which a retry refreshes. */
export const SCHEDULER_QUERY_KEY = ["scheduler"] as const;

/**
 * The MID the scheduler is read for. pg-dashboard's resolvedMerchantId: the
 * header's selected MID, else the first PA MID, else the profile's.
 */
export function useSchedulerMid(): string {
  const paMids = useApp((s) => s.paMids);
  const profileMid = useApp((s) => s.profile?.mid);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  return selectedMid || paMids[0] || profileMid || "";
}

/** One page of a view. `hasNext` is whether the server returned a cursor. */
export function useSchedulerList(mid: string, view: SchedulerView, body: SchedulerListRequest) {
  const { data, isPending, isFetching, isError, refetch } = usePostQuery<
    SchedulerListResponse,
    SchedulerListRequest
  >(
    [...SCHEDULER_QUERY_KEY, mid, view],
    schedulerListApi(mid, view),
    body,
    { staleTime: 0 },
    !!mid
  );

  return {
    rows: data?.data?.schedulerData ?? [],
    nextKey: data?.data?.lastEvaluatedKey ?? null,
    isLoading: !!mid && isPending,
    isFetching,
    isError,
    refetch,
  };
}

/**
 * Retry a failed debit. pg-dashboard counts it as started only when the
 * response's `status` is SENT_FOR_CAPTURE, and reloads the list either way.
 * `retryingIds` holds the schedulerIds in flight, for each row's spinner.
 */
export function useSchedulerRetry(mid: string, onSettled: () => void) {
  const [retryingIds, setRetryingIds] = useState<string[]>([]);
  const { mutate } = usePost<SchedulerRetryResponse, SchedulerRetryRequest>(
    schedulerRetryApi(mid),
    { invalidateQueries: false }
  );

  const retry = (row: SchedulerTxn) => {
    setRetryingIds((ids) => [...ids, row.schedulerId]);
    mutate(
      { hashOfMandateId: row.hashOfMandateId, schedulerId: row.schedulerId },
      {
        onSuccess: (res) =>
          res?.status === "SENT_FOR_CAPTURE"
            ? toast.success("Retry initiated successfully.")
            : toast.error("Retry failed. Please try again."),
        onError: (error) => toast.error(error.message || "Retry failed. Please try again."),
        onSettled: () => {
          setRetryingIds((ids) => ids.filter((id) => id !== row.schedulerId));
          onSettled();
        },
      }
    );
  };

  return { retry, retryingIds };
}

/** The executed-view CSV, saved straight to disk. */
export function useSchedulerReport(mid: string) {
  const { mutate, isPending } = usePost<Blob, SchedulerListRequest>(
    mid ? schedulerDownloadApi(mid) : "",
    {
      download: true,
      invalidateQueries: false,
      onSuccess: (blob) => downloadBlob(blob, "scheduled-report.csv"),
      onError: (error) => toast.error(error.message || "Download failed."),
    }
  );
  return { download: mutate, isDownloading: isPending };
}
