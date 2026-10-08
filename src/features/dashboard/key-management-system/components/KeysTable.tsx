"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, ColumnManager, DataCardList, DataTableCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { cn } from "@/lib/utils";
import { reorderColumns } from "@/lib/utils/columns";
import { KeyAction, buildKeyColumns } from "@/features/dashboard/key-management-system/columns";
import {
  KEY_KIND_TABS,
  KMS_FIXED_COLUMNS,
  PAYGLOCAL_CERTIFICATE_ROW,
} from "@/features/dashboard/key-management-system/constants";
import {
  useCertificateDownload,
  useKeys,
  useRevokeKey,
  type KmsScope,
} from "@/features/dashboard/key-management-system/hooks";
import {
  KeyCard,
  KeyCardSkeleton,
} from "@/features/dashboard/key-management-system/components/KeyCard";
import { RevokeKeyDialog } from "@/features/dashboard/key-management-system/components/RevokeKeyDialog";
import type { KeyKind, MerchantKey } from "@/features/dashboard/key-management-system/types";

/**
 * The keys of one kind, pg-dashboard's KMSTable on this app's table layout:
 * the kinds as tabs on the card (pg-dashboard's Key Type dropdown), Refresh
 * and Columns on the right, cards below `lg`. API keys are a tab only when the
 * MID has them on. The certificate tab is PayGlocal's one public certificate,
 * which needs no request until it is downloaded.
 */
export function KeysTable({
  scope,
  kind,
  onKindChange,
}: {
  scope: KmsScope;
  kind: KeyKind;
  onKindChange: (kind: KeyKind) => void;
}) {
  const { keys, isLoading, isFetching, isError, refetch } = useKeys(scope, kind);
  const listKind = kind === "certificate" ? "rsa" : kind;
  const { revoke, isRevoking } = useRevokeKey(scope, listKind);
  const certificate = useCertificateDownload();
  const [pendingRevoke, setPendingRevoke] = useState<MerchantKey | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  const tabs = KEY_KIND_TABS.filter((tab) => tab.value !== "apiKey" || scope.apiKeysEnabled);
  // A guest has no keys, and pg-dashboard shows them none, the certificate included.
  const rows: MerchantKey[] = scope.isGuestUser
    ? []
    : kind === "certificate"
      ? [PAYGLOCAL_CERTIFICATE_ROW]
      : keys;

  const renderAction = (row: MerchantKey) => (
    <KeyAction
      row={row}
      kind={kind}
      isDownloading={certificate.isDownloading}
      onDownloadCertificate={certificate.download}
      onRevoke={setPendingRevoke}
    />
  );

  const baseColumns = buildKeyColumns(kind, renderAction);
  const columns = reorderColumns(baseColumns, columnOrder).filter(
    (col) => !hiddenColumns.includes(col.key)
  );
  // Actions holds the row's control, not data: never offered to reorder or hide.
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "action")
    .map((c) => ({ key: c.key, label: typeof c.header === "string" ? c.header : c.key }));

  // The certificate tab has no list to fetch (PAYGLOCAL_CERTIFICATE_ROW is
  // fixed), so its Refresh re-checks the MID's key status instead, which is
  // what decides whether the API keys tab shows.
  const refreshing = kind === "certificate" ? scope.isStatusFetching : isFetching;
  const handleRefresh = async () => {
    const { isError: failed } =
      kind === "certificate" ? await scope.refetchStatus() : await refetch();
    if (failed) toast.error("Couldn't refresh keys. Please try again.");
    else toast.success("Keys updated");
  };

  const emptyCopy =
    kind === "apiKey"
      ? {
          title: "No API keys yet",
          description: "Generate an API key to authenticate your API requests.",
        }
      : {
          title: "No RSA keys yet",
          description: "Generate an RSA key to sign and encrypt your API requests.",
        };

  // The table's controls ride the tab row: the page has no filters, so a
  // toolbar row of its own would hold nothing but these.
  const controls = (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        leftIcon={
          <Icon name="refresh" className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        }
        onClick={() => void handleRefresh()}
        disabled={refreshing || !scope.mid || scope.isGuestUser}
        className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
      >
        Refresh
      </Button>
      <ColumnManager
        columns={reorderableColumns}
        order={columnOrder ?? reorderableColumns.map((c) => c.key)}
        onOrderChange={setColumnOrder}
        onReset={() => {
          setColumnOrder(null);
          setHiddenColumns([]);
        }}
        hiddenKeys={hiddenColumns}
        onHiddenKeysChange={setHiddenColumns}
        fixedKeys={KMS_FIXED_COLUMNS}
        fixedReason="Always shown. A key is identified by its ID."
      />
    </div>
  );

  const tabBar = (
    <UnderlineTabs
      tabs={tabs}
      value={kind}
      onValueChange={(v) => onKindChange(v as KeyKind)}
      actions={controls}
    />
  );

  const errorState = isError ? (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
        <Icon name="alert-circle" size={22} />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load keys</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Something went wrong while fetching data.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => void refetch()}>
        Retry
      </Button>
    </div>
  ) : undefined;

  const rowKey = (row: MerchantKey) => row.kid ?? "";

  return (
    <>
      <DataTableCard<MerchantKey>
        className="hidden lg:block"
        tabs={tabBar}
        columns={columns}
        data={rows}
        rowKey={rowKey}
        isLoading={isLoading}
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        emptyState={
          <PlaceholderState
            variant="empty-table"
            title={emptyCopy.title}
            description={emptyCopy.description}
            className="py-16"
          />
        }
        errorState={errorState}
        pagination={{ mode: "none" }}
        tableLayout="content"
        maxBodyHeight="none"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
        {/* No Columns here: the cards have none to arrange. */}
        <div className="border-b border-border px-4 pt-3">
          <UnderlineTabs
            tabs={tabs}
            value={kind}
            onValueChange={(v) => onKindChange(v as KeyKind)}
          />
        </div>
        <DataCardList<MerchantKey>
          bordered={false}
          rows={rows}
          rowKey={rowKey}
          isLoading={isLoading}
          renderCard={(row) => <KeyCard row={row} action={renderAction(row)} />}
          renderSkeleton={() => <KeyCardSkeleton />}
          emptyState={
            <PlaceholderState
              variant="empty-table"
              size="sm"
              title={emptyCopy.title}
              description={emptyCopy.description}
            />
          }
          errorState={errorState}
          pagination={{ mode: "none" }}
        />
      </div>

      <RevokeKeyDialog
        row={pendingRevoke}
        isRevoking={isRevoking}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
        onConfirm={(row) => revoke(row.kid ?? "", () => setPendingRevoke(null))}
      />
    </>
  );
}
