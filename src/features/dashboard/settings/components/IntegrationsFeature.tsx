"use client";

import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useZohoIntegration } from "@/features/dashboard/settings/useZohoIntegration";

/** Epoch millis → readable local timestamp. Deterministic given the input, so
 *  it's safe to compute in render (no argless Date/now). */
function formatSyncedTime(millis: number): string {
  return new Date(millis).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function IntegrationsFeature() {
  const {
    identifier,
    isConnected,
    isFirstSync,
    lastSyncedTime,
    isStatusLoading,
    isConnecting,
    isDisconnecting,
    isSyncing,
    isCallbackLoading,
    connect,
    disconnect,
    sync,
  } = useZohoIntegration();

  // Three states, exactly as pg-dashboard: not connected → pitch; connected but
  // never synced → ready; connected and synced → last-synced timestamp.
  const statusLine = !isConnected
    ? "Sync settlements and invoices with your Zoho Books account."
    : isFirstSync
      ? "Connected. Ready to sync."
      : `Last synced ${lastSyncedTime ? formatSyncedTime(lastSyncedTime) : "unknown"}.`;

  // The connect button covers both the URL fetch and the round-trip callback.
  const isConnectBusy = isConnecting || isCallbackLoading;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations"
        subtitle="Connect PayGlocal with the tools you already use."
      />

      <Card className="flex-row items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="puzzle" size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Zoho Books</h2>
              {isConnected ? (
                <Badge variant="success" size="sm">
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" size="sm">
                  Not connected
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isStatusLoading ? "Checking connection…" : statusLine}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={sync}
                isLoading={isSyncing}
                disabled={!identifier || isSyncing}
              >
                Sync now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnect}
                isLoading={isDisconnecting}
                disabled={!identifier || isDisconnecting}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={connect}
              isLoading={isConnectBusy}
              disabled={!identifier || isConnectBusy}
            >
              Integrate
            </Button>
          )}
        </div>
      </Card>

      {!identifier && (
        <p className="text-xs text-muted-foreground">
          Select a merchant account to manage integrations.
        </p>
      )}
    </div>
  );
}
