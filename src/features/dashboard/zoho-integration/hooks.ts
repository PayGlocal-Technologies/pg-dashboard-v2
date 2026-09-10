"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useGet, useMultipleGet, usePost, useDelete } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import useNewPermissions from "@/hooks/useNewPermissions";
import {
  zohoStatusApi,
  zohoConnectApi,
  zohoCallbackApi,
  zohoDisconnectApi,
  zohoPullSyncApi,
} from "@/features/dashboard/zoho-integration/services";
import type {
  ZohoConnectResponse,
  ZohoConnectResult,
  ZohoPullSyncData,
  ZohoPullSyncPayload,
  ZohoStatusResponse,
} from "@/features/dashboard/zoho-integration/types";
import type { BaseResponse } from "@/types/common";

/** Where Zoho returns the merchant after consent: this exact page, minus any
 * query string. Sent on both /connect and /callback, and Zoho rejects the
 * exchange if the two disagree, so it is derived the same way for both. */
function getRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return encodeURIComponent(window.location.origin + window.location.pathname);
}

/** Where the MID being linked is parked for the length of the OAuth round
 *  trip. Session-scoped, because it is meaningless once the tab is gone. */
const CONNECT_MID_KEY = "zohoConnectMid";

function readStoredConnectMid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(CONNECT_MID_KEY) || "";
}

/** The status query's key prefix — one entry per PACB MID underneath it. */
const ZOHO_STATUS_KEY = ["zoho-status"];

/**
 * Which PACB MID this merchant's Zoho account is linked to, if any.
 *
 * A merchant has at most one Zoho account and it hangs off exactly one PACB
 * MID. There is no account-level "is Zoho connected" endpoint, only the
 * per-MID /status one, so this asks every PACB MID and treats whichever one
 * answers CONNECTED as the account's link.
 *
 * That single fact replaces the MID plumbing this feature used to carry: sync
 * and disconnect act on the connected MID, never on the selected one, so no
 * screen has to ask which account the action applies to. Only connecting still
 * takes a MID, because that is the one moment where the link does not exist yet.
 */
function useZohoConnection(enabled = true): {
  connectedMid: string | null;
  isConnected: boolean;
  isFirstSync: boolean;
  lastSyncedTime: number | null;
  isStatusLoading: boolean;
  pacbMids: string[];
  hasMultipleMids: boolean;
  refetchStatuses: () => void;
} {
  const pacbMids = useApp((s) => s.paCbMids);

  const { results, isLoading, refetchAll } = useMultipleGet<ZohoStatusResponse>(
    pacbMids.map((mid) => ({
      queryKey: [...ZOHO_STATUS_KEY, mid],
      url: zohoStatusApi(mid),
      options: { enabled },
    }))
  );

  // `results`, not the aggregated `data`: that one collapses to undefined until
  // every MID has answered, so one failing status lookup would hide a
  // connection another MID had already reported.
  const connectedIndex = results.findIndex((r) => r.data?.data?.status === "CONNECTED");
  const status = connectedIndex >= 0 ? results[connectedIndex]?.data?.data : undefined;

  return {
    connectedMid: connectedIndex >= 0 ? (pacbMids[connectedIndex] ?? null) : null,
    isConnected: connectedIndex >= 0,
    isFirstSync: status?.isFirstSync ?? true,
    lastSyncedTime: status?.lastSyncedTime ?? null,
    isStatusLoading: isLoading,
    pacbMids,
    hasMultipleMids: pacbMids.length > 1,
    refetchStatuses: refetchAll,
  };
}

/**
 * "Sync from Zoho", naming the account it lands in when the merchant holds
 * more than one MID and the answer is therefore not self-evident.
 *
 * One definition, because the client list and the invoice list both draw this
 * button and a label that drifts between the two reads as two different actions.
 */
export function zohoSyncLabel(connectedMid: string | null, hasMultipleMids: boolean): string {
  return hasMultipleMids && connectedMid
    ? `Sync from Zoho (MID: ${connectedMid})`
    : "Sync from Zoho";
}

/**
 * Whether Zoho is connected, plus a pull-sync scoped to the record types the
 * caller cares about.
 *
 * Split out from useZohoIntegration below so the client and invoice lists can
 * show their "Sync from Zoho" action without also mounting the connect,
 * callback and disconnect machinery, none of which those screens use.
 */
export function useZohoPullSync(
  syncOptions: ZohoPullSyncPayload,
  /** Query keys to invalidate once a sync lands. A pull can add or update any
   *  number of records, so whichever list called this has to be told to
   *  refetch; this hook is shared and deliberately does not know which one that
   *  is. Each entry is a key prefix, e.g. `[["mca-invoices"]]`. */
  invalidateKeys: QueryKey[] = []
): {
  isConnected: boolean;
  isSyncing: boolean;
  connectedMid: string | null;
  hasMultipleMids: boolean;
  sync: () => void;
} {
  const { isConnected, connectedMid, hasMultipleMids, refetchStatuses } = useZohoConnection();
  const queryClient = useQueryClient();

  const { mutate, isPending } = usePost<
    BaseResponse<ZohoPullSyncData>,
    ZohoPullSyncPayload & { dynamicUrl: string }
  >("", {
    invalidateQueries: false,
    onError: (error: Error) => toast.error(error.message || "Sync failed. Please try again."),
  });

  return {
    isConnected,
    isSyncing: isPending,
    connectedMid,
    hasMultipleMids,
    // No MID argument: the sync goes to the account Zoho is actually linked to,
    // which is the only one the endpoint has anything to pull for.
    sync: () => {
      if (!connectedMid) return;
      mutate(
        { dynamicUrl: zohoPullSyncApi(connectedMid), ...syncOptions },
        {
          onSuccess: () => {
            refetchStatuses();
            for (const key of invalidateKeys) {
              void queryClient.invalidateQueries({ queryKey: key });
            }
            toast.success("Sync completed successfully");
          },
        }
      );
    },
  };
}

/**
 * The whole Zoho account-linking flow, backing the integration card.
 *
 * The connect step is a full-page OAuth round trip, not a popup: /connect
 * returns a Zoho-hosted consent URL, the browser navigates there, and Zoho
 * returns the merchant to this same page with `?code=…` (or `?error=…`) in
 * the query string. That is why the callback fires straight off the URL on
 * mount rather than from a click — by the time this hook runs again, the
 * click that started it happened in a previous page load.
 *
 * Ported from pg-dashboard's useZohoIntegration.
 */
export function useZohoIntegration() {
  const checkPermissions = useNewPermissions();
  const isEnabled = checkPermissions(["getZohoConnectionStatus"]);
  const {
    connectedMid,
    isConnected,
    isFirstSync,
    lastSyncedTime,
    isStatusLoading,
    pacbMids,
    hasMultipleMids,
    refetchStatuses,
  } = useZohoConnection(isEnabled);
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code");
  const errorParam = searchParams.get("error");

  const callbackParams = codeParam
    ? {
        code: codeParam,
        location: searchParams.get("location") ?? "",
        accountsServer: searchParams.get("accounts-server") ?? "",
      }
    : null;

  // Which MID the round trip was started for. Read once on mount, because the
  // consent redirect is a full page load: the click that chose the MID happened
  // in a document that no longer exists, and the URL Zoho sends back does not
  // carry it.
  const [callbackMid] = useState(readStoredConnectMid);

  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  // The outcome dialog is derived from the callback query rather than stored,
  // so the only state here is whether the merchant has dismissed it. Mirroring
  // it into state would mean a setState inside an effect, which the React
  // Compiler rule in CLAUDE.md disallows (and which pg-dashboard does).
  const [resultDismissed, setResultDismissed] = useState(false);

  // One on-demand consent URL per MID: which one is fetched is decided by the
  // merchant in the connect dialog, and each URL is single-use, so none of them
  // may be fetched on mount.
  const { results: connectUrlQueries } = useMultipleGet<BaseResponse<ZohoConnectResponse>>(
    pacbMids.map((mid) => ({
      queryKey: ["zoho-connect-url", mid],
      url: zohoConnectApi(mid, getRedirectUri()),
      options: { enabled: false },
    }))
  );

  const isConnecting = connectUrlQueries.some((q) => q.isFetching);

  // The exchange is keyed by the MID the merchant picked before leaving, not by
  // whichever MID happens to be selected now.
  const callbackUrl =
    callbackParams && callbackMid
      ? zohoCallbackApi(
          callbackMid,
          callbackParams.code,
          callbackParams.location,
          callbackParams.accountsServer,
          getRedirectUri()
        )
      : "";

  const { isSuccess: isCallbackSuccess, isError: isCallbackError } = useGet(
    ["zoho-callback", callbackMid, callbackParams?.code ?? ""],
    callbackUrl,
    {
      enabled: isEnabled && !!callbackMid && !!callbackParams,
      refetchOnWindowFocus: false,
      // The code is single-use: a refetch would exchange an already-spent one
      // and fail, turning a successful link into a reported failure.
      staleTime: Infinity,
    }
  );

  /** Zoho came back with a code but the MID it belongs to is gone — the stash
   *  is session-scoped, so this is the merchant finishing consent somewhere
   *  other than the tab that started it. There is nothing to exchange the code
   *  against, and reporting it as a failure is what lets them start over
   *  instead of watching a spinner that never resolves. */
  const isOrphanedCallback = !!callbackParams && !callbackMid;

  const isCallbackLoading =
    !!callbackParams && !isOrphanedCallback && !isCallbackSuccess && !isCallbackError;

  /** Zoho appends ?error= when the merchant declines or the exchange fails on
   * its side, in which case there was never a code to exchange, only a failure
   * to report. */
  const result: ZohoConnectResult | null = resultDismissed
    ? null
    : errorParam || isCallbackError || isOrphanedCallback
      ? "failure"
      : isCallbackSuccess
        ? "success"
        : null;

  // Refetching status is an external-system update, not a state mirror, so it
  // belongs in an effect. It fires once the exchange lands, to pick up the
  // connection the callback just created — on every MID, since which one is
  // connected is exactly what just changed.
  useEffect(() => {
    if (!isCallbackSuccess && !isCallbackError) return;
    // The stash has done its job the moment the exchange resolves either way;
    // leaving it behind would aim a later retry at a stale MID.
    sessionStorage.removeItem(CONNECT_MID_KEY);
    if (isCallbackSuccess) void queryClient.invalidateQueries({ queryKey: ZOHO_STATUS_KEY });
  }, [isCallbackSuccess, isCallbackError, queryClient]);

  const { mutate: disconnectMutate, isPending: isDisconnecting } = useDelete<
    BaseResponse<unknown>,
    { dynamicUrl: string }
  >("", { invalidateQueries: false });

  const { mutate: pullSyncMutate, isPending: isSyncing } = usePost<
    BaseResponse<ZohoPullSyncData>,
    ZohoPullSyncPayload & { dynamicUrl: string }
  >("", { invalidateQueries: false });

  // Plain functions, not useCallback: the React Compiler memoizes these for us,
  // and hand-written dependency arrays here only fight its inference.

  /** The one action that still takes a MID, because it is the one that decides
   *  which MID the account's single Zoho link will hang off. */
  async function handleConnect(mid: string): Promise<void> {
    const index = pacbMids.indexOf(mid);
    if (index === -1) return;
    setConnectOpen(false);
    try {
      sessionStorage.setItem(CONNECT_MID_KEY, mid);
      const response = await connectUrlQueries[index]?.refetch();
      const connectUrl = response?.data?.data?.connectUrl;
      if (!connectUrl) throw new Error("No connect URL received");
      // Full navigation, not router.push: this leaves the app for Zoho.
      window.location.href = connectUrl;
    } catch {
      sessionStorage.removeItem(CONNECT_MID_KEY);
      toast.error("Failed to initiate Zoho connection. Please try again.");
    }
  }

  function handleDisconnect(): void {
    if (!connectedMid) return;
    disconnectMutate(
      { dynamicUrl: zohoDisconnectApi(connectedMid) },
      {
        onSuccess: () => {
          setDisconnectOpen(false);
          refetchStatuses();
          toast.success("Zoho disconnected successfully");
        },
        onError: () => toast.error("Failed to disconnect Zoho. Please try again."),
      }
    );
  }

  function handleSync(): void {
    if (!connectedMid) return;
    setSyncOpen(false);
    pullSyncMutate(
      { dynamicUrl: zohoPullSyncApi(connectedMid), isClientSync: true, isInvoiceSync: true },
      {
        onSuccess: () => {
          refetchStatuses();
          toast.success("Sync completed successfully");
        },
        onError: () => toast.error("Sync failed. Please try again."),
      }
    );
  }

  function dismissResult(): void {
    setResultDismissed(true);
  }

  function handleRetryConnect(): void {
    setResultDismissed(true);
    // Straight back to Zoho for the MID the failed attempt was for; when that
    // MID is what went missing, the merchant is asked to pick one again.
    if (callbackMid) void handleConnect(callbackMid);
    else setConnectOpen(true);
  }

  return {
    isEnabled,
    isConnected,
    connectedMid,
    isFirstSync,
    lastSyncedTime,
    isStatusLoading,
    isCallbackLoading,
    isConnecting,
    isDisconnecting,
    isSyncing,
    connectOpen,
    setConnectOpen,
    disconnectOpen,
    setDisconnectOpen,
    syncOpen,
    setSyncOpen,
    result,
    dismissResult,
    pacbMids,
    hasMultipleMids,
    handleConnect,
    handleDisconnect,
    handleRetryConnect,
    handleSync,
  };
}
