"use client";

import { toast } from "sonner";
import { useGet, usePost, usePostQuery, usePut } from "@/lib/api/hooks";
import { downloadBlob } from "@/lib/utils/format";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  activateMandateApi,
  disableMandateApi,
  mandateHistoryApi,
  mandateReportDownloadApi,
  mandateSearchApi,
  pauseMandateApi,
  siConfigApi,
} from "@/features/dashboard/manage-mandates/services";
import type {
  Mandate,
  MandateActionResponse,
  MandateHistoryEntry,
  MandateHistoryResponse,
  MandateListRequest,
  MandateListResponse,
  SiConfigResponse,
} from "@/features/dashboard/manage-mandates/types";

/** Query-key root for the list, which every action refreshes. */
export const MANDATES_QUERY_KEY = ["manage-mandates"] as const;

/**
 * The MIDs the list covers. pg-dashboard's resolvedMerchantIds: the header's
 * selected MID, else every PA MID. A guest (onboarding) user has none, so
 * nothing is fetched for them, as there.
 */
export function useMandateListMids(): string[] {
  const paMids = useApp((s) => s.paMids);
  const isGuestUser = useApp((s) => s.isGuestUser);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  if (isGuestUser) return [];
  if (selectedMid) return [selectedMid];
  return paMids;
}

/** The MID that addresses per-MID calls (si/config, the export): selected, else the first PA MID. */
export function useMandateScopeMid(): string {
  const paMids = useApp((s) => s.paMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  return selectedMid || paMids[0] || "";
}

export function useMandates(body: MandateListRequest | null) {
  const { data, isPending, isFetching, isError, refetch } = usePostQuery<
    MandateListResponse,
    MandateListRequest | null
  >([...MANDATES_QUERY_KEY], mandateSearchApi, body, { staleTime: 0 }, !!body);

  return {
    rows: data?.data?.data ?? [],
    totalCount: data?.data?.totalCount ?? 0,
    // An idle (disabled) query is "pending" forever; only a live one loads.
    isLoading: !!body && isPending,
    isFetching,
    isError,
    refetch,
  };
}

/**
 * Whether the PayGlocal scheduler runs this merchant's SIs, which is what makes
 * Pause and Activate possible. Asked only for a transacting MID, as
 * pg-dashboard does; anything else reads as off.
 */
export function useSchedulerEnabled(mid: string, hasMids: boolean): boolean {
  const midType = useApp((s) => s.profile?.midType);
  const { data } = useGet<SiConfigResponse>(
    ["mandate-si-config", mid],
    mid ? siConfigApi(mid) : "",
    undefined,
    { enabled: !!mid && hasMids && midType === "TRANSACTING" }
  );
  return !!data?.payGlocalScheduler;
}

/** One mandate's change log, newest first (the API returns it oldest first). */
export function useMandateHistory(row: Mandate | null): {
  entries: MandateHistoryEntry[];
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isPending, isError } = usePostQuery<
    MandateHistoryResponse,
    { hashOfMandateId: string }
  >(
    ["mandate-history", row?.mid ?? "", row?.id ?? ""],
    mandateHistoryApi(row?.mid ?? ""),
    { hashOfMandateId: row?.id ?? "" },
    { staleTime: 0 },
    !!row
  );
  return {
    entries: (data?.data?.mandateHistory ?? []).slice().reverse(),
    isLoading: !!row && isPending,
    isError,
  };
}

type MandateAction = "disable" | "pause" | "activate";

const ACTION_URL: Record<MandateAction, (mid: string) => string> = {
  disable: disableMandateApi,
  pause: pauseMandateApi,
  activate: activateMandateApi,
};

const ACTION_SUCCESS: Record<MandateAction, string> = {
  disable: "Mandate disabled successfully",
  pause: "Mandate paused successfully",
  activate: "Mandate activated successfully",
};

/** The URL an action is sent to, which is also the `resource` its OTP is for. */
export function mandateActionUrl(action: MandateAction, mid: string): string {
  return ACTION_URL[action](mid);
}

/**
 * Disable, Pause or Activate: PUT `{ hashOfMandateId, ...extra }` to the
 * action's URL, then refresh the list, with the server's own message on
 * success as pg-dashboard shows it.
 */
export function useMandateAction(action: MandateAction) {
  const { mutate, isPending } = usePut<
    MandateActionResponse,
    { dynamicUrl: string; reqBody: Record<string, string> }
  >("", { invalidateQueries: [[...MANDATES_QUERY_KEY]] });

  const run = (row: Mandate, extra: Record<string, string> = {}, onDone?: () => void) =>
    mutate(
      {
        dynamicUrl: mandateActionUrl(action, row.mid),
        reqBody: { hashOfMandateId: row.id, ...extra },
      },
      {
        onSuccess: (res) => {
          toast.success(res?.data?.message || ACTION_SUCCESS[action]);
          onDone?.();
        },
        onError: (error) => toast.error(error.message),
      }
    );

  return { run, isPending };
}

/** The CSV export for a MID, saved straight to disk. */
export function useMandateReport(mid: string) {
  const { mutate, isPending } = usePost<Blob, MandateListRequest>(
    mid ? mandateReportDownloadApi(mid) : "",
    {
      download: true,
      invalidateQueries: false,
      onSuccess: (blob) =>
        downloadBlob(blob, `mandates-${new Date().toISOString().slice(0, 10)}.csv`),
      onError: (error) => toast.error(error.message || "Couldn't generate the report."),
    }
  );
  return { download: mutate, isDownloading: isPending };
}
