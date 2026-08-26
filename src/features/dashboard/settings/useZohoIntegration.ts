"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useDelete, useGet, usePost } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  zohoCallbackApi,
  zohoConnectApi,
  zohoDisconnectApi,
  zohoPullSyncApi,
  zohoStatusApi,
} from "@/features/dashboard/settings/services";
import type {
  ZohoConnectResponse,
  ZohoPullSyncBody,
  ZohoStatusResponse,
} from "@/features/dashboard/settings/types";

/** origin + pathname, url-encoded — the page Zoho redirects back to, matching
 *  pg-dashboard's getRedirectUri. Empty on the server (no window). */
function getRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return encodeURIComponent(window.location.origin + window.location.pathname);
}

export interface ZohoIntegration {
  /** Merchant id the endpoints are scoped by, or "" when none is resolvable. */
  identifier: string;
  isConnected: boolean;
  isFirstSync: boolean;
  lastSyncedTime: number | null;
  isStatusLoading: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isSyncing: boolean;
  /** True while the OAuth redirect's callback exchange is in flight. */
  isCallbackLoading: boolean;
  connect: () => void;
  disconnect: () => void;
  sync: () => void;
}

/**
 * The whole Zoho Books flow, ported from pg-dashboard's useZohoIntegration:
 * status, the OAuth connect redirect, the callback exchange when Zoho redirects
 * back, disconnect and manual pull-sync. Like pg-dashboard, mutations don't
 * invalidate — they refetch status by hand.
 *
 * The identifier is the merchant id (selectedMid, else the first PACB MID), and
 * the redirect returns to this same page, where the `code` query param triggers
 * the callback exchange client-side (no dedicated route).
 */
export function useZohoIntegration(): ZohoIntegration {
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const paCbMids = useApp((s) => s.paCbMids);
  const identifier = selectedMid || paCbMids[0] || "";

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const location = searchParams.get("location") ?? "";
  const accountsServer = searchParams.get("accounts-server") ?? "";

  // Strip the OAuth params once handled, so a reload can't replay the exchange.
  const clearZohoParams = useCallback((): void => {
    router.replace(pathname);
  }, [router, pathname]);

  // Status.
  const {
    data: statusRes,
    isPending: isStatusPending,
    refetch: refetchStatus,
  } = useGet<ZohoStatusResponse>(["zoho-status", identifier], zohoStatusApi(identifier), {
    enabled: !!identifier,
  });
  const status = statusRes?.data;
  const isConnected = status?.status === "CONNECTED";
  const isFirstSync = status?.isFirstSync ?? true;
  const lastSyncedTime = status?.lastSyncedTime ?? null;

  // Connect URL — manual trigger, then a full-page redirect to Zoho's consent.
  const { refetch: fetchConnectUrl, isFetching: isConnecting } = useGet<ZohoConnectResponse>(
    ["zoho-connect", identifier],
    zohoConnectApi(identifier, getRedirectUri()),
    { enabled: false }
  );

  const connect = useCallback((): void => {
    if (!identifier) return;
    void fetchConnectUrl()
      .then((result) => {
        const connectUrl = result.data?.data?.connectUrl;
        if (connectUrl) window.location.href = connectUrl;
        else toast.error("Failed to start Zoho connection. Please try again.");
      })
      .catch(() => toast.error("Failed to start Zoho connection. Please try again."));
  }, [identifier, fetchConnectUrl]);

  // Callback exchange — fires once when Zoho redirects back with a code. Keyed
  // by code and never stale, so it runs exactly once per redirect.
  const callbackUrl =
    identifier && code
      ? zohoCallbackApi(identifier, code, location, accountsServer, getRedirectUri())
      : "";
  const { isSuccess: isCallbackSuccess, isError: isCallbackError } = useGet(
    ["zoho-callback", identifier, code],
    callbackUrl,
    { enabled: !!identifier && !!code, staleTime: Infinity, refetchOnWindowFocus: false }
  );
  const isCallbackLoading = !!code && !isCallbackSuccess && !isCallbackError;

  useEffect(() => {
    if (isCallbackSuccess) {
      toast.success("Zoho connected successfully.");
      void refetchStatus();
      clearZohoParams();
    } else if (isCallbackError) {
      toast.error("Zoho connection failed. Please try again.");
      clearZohoParams();
    }
  }, [isCallbackSuccess, isCallbackError, refetchStatus, clearZohoParams]);

  useEffect(() => {
    if (errorParam) {
      toast.error("Zoho connection was cancelled.");
      clearZohoParams();
    }
  }, [errorParam, clearZohoParams]);

  // Disconnect (DELETE, empty body). Refetch status by hand, as pg-dashboard does.
  const { mutate: disconnectMutate, isPending: isDisconnecting } = useDelete<
    unknown,
    Record<string, never>
  >(zohoDisconnectApi(identifier), { invalidateQueries: false });

  const disconnect = useCallback((): void => {
    disconnectMutate(
      {},
      {
        onSuccess: () => {
          toast.success("Zoho disconnected successfully.");
          void refetchStatus();
        },
        onError: (err: Error) => toast.error(err.message || "Failed to disconnect Zoho."),
      }
    );
  }, [disconnectMutate, refetchStatus]);

  // Manual pull-sync (clients + invoices), matching pg-dashboard's default.
  const { mutate: syncMutate, isPending: isSyncing } = usePost<unknown, ZohoPullSyncBody>(
    zohoPullSyncApi(identifier),
    { invalidateQueries: false }
  );

  const sync = useCallback((): void => {
    syncMutate(
      { isClientSync: true, isInvoiceSync: true },
      {
        onSuccess: () => {
          toast.success("Sync completed successfully.");
          void refetchStatus();
        },
        onError: (err: Error) => toast.error(err.message || "Sync failed. Please try again."),
      }
    );
  }, [syncMutate, refetchStatus]);

  return {
    identifier,
    isConnected,
    isFirstSync,
    lastSyncedTime,
    isStatusLoading: !!identifier && isStatusPending,
    isConnecting,
    isDisconnecting,
    isSyncing,
    isCallbackLoading,
    connect,
    disconnect,
    sync,
  };
}
