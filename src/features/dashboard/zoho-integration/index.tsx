"use client";

import { Badge, Button, Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatEpochDateTime } from "@/lib/utils/format";
import { useZohoIntegration } from "@/features/dashboard/zoho-integration/hooks";
import { ZohoConnectDialog } from "@/features/dashboard/zoho-integration/components/ZohoConnectDialog";
import { ZohoDisconnectDialog } from "@/features/dashboard/zoho-integration/components/ZohoDisconnectDialog";
import { ZohoSyncDialog } from "@/features/dashboard/zoho-integration/components/ZohoSyncDialog";
import { ZohoResultDialog } from "@/features/dashboard/zoho-integration/components/ZohoResultDialog";

/**
 * The Zoho Books/Invoices integration card, and the whole account-linking
 * flow behind it. Ported from pg-dashboard's ZohoIntegration.
 *
 * Renders nothing without the getZohoConnectionStatus permission, matching
 * production: a merchant who cannot read the connection status has no
 * business being offered the connect action either.
 */
export function ZohoIntegrationCard() {
  const {
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
  } = useZohoIntegration();

  if (!isEnabled) return null;

  // isCallbackLoading covers the moment straight after Zoho returns the
  // merchant here, while the code is still being exchanged.
  if (isStatusLoading || isCallbackLoading) {
    return (
      <Card className="gap-3 p-4">
        <Shimmer className="h-10 w-10 rounded-xl" />
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-3 w-56" />
        <Shimmer className="h-9 w-full rounded-lg" />
      </Card>
    );
  }

  const syncNowButton = (
    <Button
      variant="link"
      size="sm"
      className="h-auto p-0 text-[13px] font-semibold"
      isLoading={isSyncing}
      onClick={() => setSyncOpen(true)}
    >
      Sync now
    </Button>
  );

  return (
    <>
      <Card
        className={cn(
          "flex flex-col gap-3 p-4 transition-colors",
          isConnected && "border-primary/30"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
            <Icon name="zoho-logo" className="h-6 w-6" aria-hidden />
          </span>
          {isConnected ? (
            <Badge variant="success" className="gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">Not connected</Badge>
          )}
        </div>

        <div className="space-y-0.5">
          <h3 className="text-[15px] font-bold tracking-tight text-foreground">
            Zoho Books &amp; Invoices
          </h3>
          {!isConnected ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Auto-sync invoices and reconcile payments both ways.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] text-muted-foreground">
                {isFirstSync
                  ? "Ready to sync"
                  : `Last synced ${lastSyncedTime ? formatEpochDateTime(lastSyncedTime, "") : "unknown"}`}
              </p>
              {syncNowButton}
            </div>
          )}
        </div>

        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-auto w-full text-red-600 hover:text-red-600"
            onClick={() => setDisconnectOpen(true)}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="mt-auto w-full"
            onClick={() => setConnectOpen(true)}
          >
            Connect
          </Button>
        )}
      </Card>

      <ZohoConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnect={handleConnect}
        isConnecting={isConnecting}
      />
      <ZohoDisconnectDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        onDisconnect={handleDisconnect}
        isDisconnecting={isDisconnecting}
      />
      <ZohoSyncDialog
        open={syncOpen}
        onOpenChange={setSyncOpen}
        onSync={handleSync}
        isSyncing={isSyncing}
        pacbMids={pacbMids}
        selectedMid={selectedMid}
      />
      <ZohoResultDialog result={result} onClose={dismissResult} onRetry={handleRetryConnect} />
    </>
  );
}
