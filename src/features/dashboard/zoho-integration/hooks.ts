"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useGet, usePost, useDelete } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { useScopeId } from "@/lib/hooks/useScopeId";
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

/** The merchant id every Zoho endpoint is keyed by: the selected MID, falling
 * back to the account's first PACB one, exactly as production resolves it. */
function useZohoIdentifier(): { identifier: string; pacbMids: string[]; selectedMid: string } {
  const pacbMids = useApp((s) => s.paCbMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails?.mid) ?? "";
  // pacbMids and selectedMid are still returned raw: callers use them to decide
  // whether to show a MID picker, which is a different question from which id
  // the endpoints take.
  return { identifier: useScopeId("PACB").scopeId, pacbMids, selectedMid };
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
  pacbMids: string[];
  selectedMid: string;
  sync: (mid?: string) => void;
} {
  const { identifier, pacbMids, selectedMid } = useZohoIdentifier();
  const queryClient = useQueryClient();

  const { data, refetch: refetchStatus } = useGet<ZohoStatusResponse>(
    ["zoho-status", identifier],
    zohoStatusApi(identifier),
    { enabled: !!identifier }
  );

  const { mutate, isPending } = usePost<
    BaseResponse<ZohoPullSyncData>,
    ZohoPullSyncPayload & { dynamicUrl: string }
  >("", {
    invalidateQueries: false,
    onError: (error: Error) => toast.error(error.message || "Sync failed. Please try again."),
  });

  return {
    isConnected: data?.data?.status === "CONNECTED",
    isSyncing: isPending,
    pacbMids,
    selectedMid,
    sync: (mid) =>
      mutate(
        { dynamicUrl: zohoPullSyncApi(mid || identifier), ...syncOptions },
        {
          onSuccess: () => {
            void refetchStatus();
            for (const key of invalidateKeys) {
              void queryClient.invalidateQueries({ queryKey: key });
            }
            toast.success("Sync completed successfully");
          },
        }
      ),
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
  const { identifier, pacbMids, selectedMid } = useZohoIdentifier();

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

  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  // The outcome dialog is derived from the callback query rather than stored,
  // so the only state here is whether the merchant has dismissed it. Mirroring
  // it into state would mean a setState inside an effect, which the React
  // Compiler rule in CLAUDE.md disallows (and which pg-dashboard does).
  const [resultDismissed, setResultDismissed] = useState(false);

  const {
    data: statusResponse,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useGet<ZohoStatusResponse>(["zoho-status", identifier], zohoStatusApi(identifier), {
    enabled: isEnabled && !!identifier,
  });

  const status = statusResponse?.data;
  const isConnected = status?.status === "CONNECTED";
  const isFirstSync = status?.isFirstSync ?? true;
  const lastSyncedTime = status?.lastSyncedTime ?? null;

  // Fetched on demand, not on mount: this returns a single-use consent URL.
  const { refetch: fetchConnectUrl, isFetching: isConnecting } = useGet<
    BaseResponse<ZohoConnectResponse>
  >(["zoho-connect-url", identifier], zohoConnectApi(identifier, getRedirectUri()), {
    enabled: false,
  });

  const callbackUrl = callbackParams
    ? zohoCallbackApi(
        identifier,
        callbackParams.code,
        callbackParams.location,
        callbackParams.accountsServer,
        getRedirectUri()
      )
    : "";

  const { isSuccess: isCallbackSuccess, isError: isCallbackError } = useGet(
    ["zoho-callback", identifier, callbackParams?.code ?? ""],
    callbackUrl,
    {
      enabled: isEnabled && !!identifier && !!callbackParams,
      refetchOnWindowFocus: false,
      // The code is single-use: a refetch would exchange an already-spent one
      // and fail, turning a successful link into a reported failure.
      staleTime: Infinity,
    }
  );

  const isCallbackLoading = !!callbackParams && !isCallbackSuccess && !isCallbackError;

  /** Zoho appends ?error= when the merchant declines or the exchange fails on
   * its side, in which case there was never a code to exchange, only a failure
   * to report. */
  const result: ZohoConnectResult | null = resultDismissed
    ? null
    : errorParam || isCallbackError
      ? "failure"
      : isCallbackSuccess
        ? "success"
        : null;

  // Refetching status is an external-system update, not a state mirror, so it
  // belongs in an effect. It fires once the exchange lands, to pick up the
  // connection the callback just created.
  useEffect(() => {
    if (isCallbackSuccess) void refetchStatus();
  }, [isCallbackSuccess, refetchStatus]);

  const { mutate: disconnectMutate, isPending: isDisconnecting } = useDelete<BaseResponse<unknown>>(
    zohoDisconnectApi(identifier),
    { invalidateQueries: false }
  );

  const { mutate: pullSyncMutate, isPending: isSyncing } = usePost<
    BaseResponse<ZohoPullSyncData>,
    ZohoPullSyncPayload & { dynamicUrl: string }
  >("", { invalidateQueries: false });

  // Plain functions, not useCallback: the React Compiler memoizes these for us,
  // and hand-written dependency arrays here only fight its inference.
  async function handleConnect(): Promise<void> {
    if (!identifier) return;
    setConnectOpen(false);
    try {
      const response = await fetchConnectUrl();
      const connectUrl = response.data?.data?.connectUrl;
      if (!connectUrl) throw new Error("No connect URL received");
      // Full navigation, not router.push: this leaves the app for Zoho.
      window.location.href = connectUrl;
    } catch {
      toast.error("Failed to initiate Zoho connection. Please try again.");
    }
  }

  function handleDisconnect(): void {
    disconnectMutate({} as never, {
      onSuccess: () => {
        setDisconnectOpen(false);
        void refetchStatus();
        toast.success("Zoho disconnected successfully");
      },
      onError: () => toast.error("Failed to disconnect Zoho. Please try again."),
    });
  }

  function handleSync(mid: string): void {
    setSyncOpen(false);
    pullSyncMutate(
      { dynamicUrl: zohoPullSyncApi(mid || identifier), isClientSync: true, isInvoiceSync: true },
      {
        onSuccess: () => {
          void refetchStatus();
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
    void handleConnect();
  }

  return {
    isEnabled,
    isConnected,
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
    selectedMid,
    handleConnect,
    handleDisconnect,
    handleRetryConnect,
    handleSync,
  };
}
