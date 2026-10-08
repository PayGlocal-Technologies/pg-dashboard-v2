"use client";

import { Button, type Column, StatusBadge, formatTimestamp } from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableCell } from "@/components/common/CopyableCell";
import { getKeyStatusMeta } from "@/features/dashboard/key-management-system/helpers";
import type { KeyKind, MerchantKey } from "@/features/dashboard/key-management-system/types";

const TEXT = "text-[13px] text-foreground whitespace-nowrap";
/** Dates and times are muted, as in every table (see pa-transactions). */
const DATE_TEXT = "text-[13px] text-muted-foreground whitespace-nowrap";

export function KeyStatusBadge({ status }: { status: string | null | undefined }) {
  const { label, variant, trailIcon } = getKeyStatusMeta(status);
  return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
}

/**
 * The row's one action, as pg-dashboard offers it: Download for PayGlocal's
 * certificate, Revoke for a key (greyed once revoked: it can't be undone).
 */
export function KeyAction({
  row,
  kind,
  isDownloading,
  onDownloadCertificate,
  onRevoke,
}: {
  row: MerchantKey;
  kind: KeyKind;
  isDownloading: boolean;
  onDownloadCertificate: () => void;
  onRevoke: (row: MerchantKey) => void;
}) {
  if (kind === "certificate") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        isLoading={isDownloading}
        leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
        onClick={onDownloadCertificate}
        className="h-auto min-h-0 rounded-md px-2.5 py-1 text-[12px] whitespace-nowrap"
      >
        Download
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={row.keyStatus === "REVOKED"}
      leftIcon={<Icon name="ban" className="h-3.5 w-3.5" />}
      onClick={() => onRevoke(row)}
      className="h-auto min-h-0 rounded-md border-destructive/40 px-2.5 py-1 text-[12px] whitespace-nowrap text-destructive hover:bg-destructive/5 hover:text-destructive"
    >
      Revoke
    </Button>
  );
}

/** pg-dashboard's KMS columns, in its order, then the row's action. */
export function buildKeyColumns(
  kind: KeyKind,
  renderAction: (row: MerchantKey) => React.ReactNode
): Column<MerchantKey>[] {
  return [
    {
      key: "kid",
      header: "Key ID",
      minWidth: 220,
      // The certificate row's "id" is a description, not something to copy.
      render: (row) =>
        kind === "certificate" ? (
          <span className={TEXT}>{row.kid}</span>
        ) : row.kid ? (
          <CopyableCell value={row.kid} label="Key ID" />
        ) : (
          <span className="text-[13px] text-muted-foreground">—</span>
        ),
    },
    {
      key: "keyStatus",
      header: "Status",
      minWidth: 120,
      render: (row) => <KeyStatusBadge status={row.keyStatus} />,
    },
    {
      key: "keyType",
      header: "Type",
      minWidth: 100,
      render: (row) => <span className={TEXT}>{row.keyType?.trim() || "—"}</span>,
    },
    {
      key: "creationDate",
      header: "Date of generation",
      minWidth: 170,
      render: (row) => <span className={DATE_TEXT}>{formatTimestamp(row.creationDate)}</span>,
    },
    {
      key: "expiryDate",
      header: "Date of expiry",
      minWidth: 170,
      render: (row) => <span className={DATE_TEXT}>{formatTimestamp(row.expiryDate)}</span>,
    },
    {
      key: "action",
      header: "Actions",
      // No width: in the fixed-layout table (see KeysTable) every other
      // column keeps its set width and this one takes all the leftover
      // space, right-aligned, so the actions sit at the table's far edge
      // without spreading the data columns apart.
      align: "right",
      render: renderAction,
    },
  ];
}
