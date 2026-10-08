"use client";

import {
  type Column,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import type { BadgeVariant } from "@payglocal_ui/flux-ui";
import { CopyableCell } from "@/components/common/CopyableCell";
import { Icon, type IconName } from "@/components/icon";
import { formatCurrency, formatTransactionTimestamp, truncateId } from "@/lib/utils/format";
import type { InvoiceLink } from "@/features/dashboard/invoice-links/types";
import { AmountHeader, AmountWithCode } from "@/components/common/AmountCell";

type StatusMeta = { label: string; variant: BadgeVariant };

/**
 * Status → badge meta, ported from INVOICE_LINKS_BADGE_MAPPING
 * (pg-dashboard/src/features/mca-payment-invoice-links/constants.ts:32-44).
 *
 * The source keys that map on the normalised lowercase label; this keys on the
 * raw status token instead, which is the same decision mca-links made. Its
 * TagType vocabulary translates as: info → info, positive → success,
 * negative → danger, warning → warning.
 */
const INVOICE_LINK_STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { label: "Active", variant: "info" },
  PAID: { label: "Paid", variant: "success" },
  DOCUMENT_PROCESSING: { label: "Document Processing", variant: "info" },
  DOCUMENT_REJECTED: { label: "Document Rejected", variant: "warning" },
  TRANSACTION_SUBMITTED: { label: "Transaction Submitted", variant: "success" },
  EXHAUSTED: { label: "Exhausted", variant: "danger" },
  EXPIRED: { label: "Expired", variant: "danger" },
  DISABLED: { label: "Disabled", variant: "danger" },
  TRANSACTED: { label: "Transacted", variant: "success" },
  OVERDUE: { label: "Overdue", variant: "danger" },
  DRAFT: { label: "Draft", variant: "warning" },
};

/**
 * Statuses the filter offers but the source badge map has no entry for
 * (PAUSED, ISSUER_DECLINED, RESUMED, VOID, PAYMENT_DUE) fall through to a
 * muted chip with a title-cased label. Upstream renders those with an
 * undefined tag type, which is the same "no strong colour" outcome.
 */
export function getInvoiceLinkStatusMeta(raw: string): StatusMeta {
  const key = (raw ?? "").toUpperCase();
  return (
    INVOICE_LINK_STATUS_META[key] ?? {
      label: key
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      variant: "muted",
    }
  );
}

export interface InvoiceLinkRowHandlers {
  onPreview: (row: InvoiceLink) => void;
  onEdit: (row: InvoiceLink) => void;
  /** `isOfflinePaid` decides whether the drawer uploads or just shows documents. */
  onUpdateStatus: (row: InvoiceLink, isOfflinePaid: boolean) => void;
  onDisable: (row: InvoiceLink) => void;
  onDelete: (row: InvoiceLink) => void;
}

interface RowAction {
  key: string;
  label: string;
  icon: IconName;
  disabled?: boolean;
  onSelect: () => void;
}

/**
 * Which actions a row offers, ported condition-for-condition from
 * pg-dashboard's INVOICE_LINKS_COLUMNS actions cell.
 *
 * Two quirks are preserved rather than tidied, because tidying either one
 * changes who sees what:
 *
 *  - The `hidden` checks compare `record.status` RAW, while the `disabled`
 *    checks compare `status.toUpperCase()`. So Disable hides on
 *    `status !== "ACTIVE"` case-sensitively but greys out case-insensitively.
 *    Harmless while the API returns upper-case, load-bearing if it ever stops.
 *  - The GLOCAL gate below defaults fail-closed: `profile.midType` missing
 *    means `midType === "GLOCAL"`, which hides Update Status on every
 *    non-PAID invoice.
 *
 * Edit Invoice is disabled rather than hidden on PAID / DISABLED / VOID, which
 * is upstream's choice: the merchant can see the capability exists and why it
 * is unavailable, instead of the row silently offering less.
 */
export function buildInvoiceLinkRowActions(
  row: InvoiceLink,
  midType: string,
  handlers: InvoiceLinkRowHandlers
): RowAction[] {
  const status = (row.status ?? "").toUpperCase();

  const isDisableAllowed = ["ACTIVE", "PAYMENT_DUE", "DRAFT"].includes(status);
  const isOfflinePaid = status === "PAID" && row.paidOffline === "true";
  const canTouchDocuments = ["ACTIVE", "PAYMENT_DUE", "OVERDUE"].includes(status) || isOfflinePaid;

  const actions: RowAction[] = [
    {
      key: "previewInvoice",
      label: "Preview Invoice",
      icon: "eye",
      onSelect: () => handlers.onPreview(row),
    },
  ];

  // Upstream: always shown, disabled once the invoice can no longer change.
  actions.push({
    key: "editInvoice",
    label: "Edit Invoice",
    icon: "pencil",
    disabled: ["PAID", "DISABLED", "VOID"].includes(status),
    onSelect: () => handlers.onEdit(row),
  });

  // Upstream: hidden unless DRAFT.
  if (status === "DRAFT") {
    actions.push({
      key: "deleteInvoice",
      label: "Delete Invoice",
      icon: "trash-2",
      onSelect: () => handlers.onDelete(row),
    });
  }

  // Upstream: hidden when midType is GLOCAL and the row is not PAID.
  if (!(midType === "GLOCAL" && row.status !== "PAID")) {
    actions.push({
      key: "updateStatus",
      label: isOfflinePaid ? "View Proof Documents" : "Update Status",
      // A check, not an upload arrow: the action marks the invoice paid, and
      // attaching proof is only how it does that.
      icon: isOfflinePaid ? "file-text" : "badge-check",
      disabled: !canTouchDocuments,
      onSelect: () => handlers.onUpdateStatus(row, isOfflinePaid),
    });
  }

  // Upstream: hidden unless the raw status is exactly "ACTIVE".
  if (row.status === "ACTIVE") {
    actions.push({
      key: "disableInvoice",
      label: "Disable Invoice",
      icon: "ban",
      disabled: !isDisableAllowed,
      onSelect: () => handlers.onDisable(row),
    });
  }

  return actions;
}

function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          aria-label="More actions"
          variant="ghost"
          size="sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="more-horizontal" className="h-4 w-4" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.key}
            disabled={action.disabled}
            onSelect={() => action.onSelect()}
          >
            <Icon name={action.icon} className="h-3.5 w-3.5" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The eight data columns, in pg-dashboard's order (INVOICE_LINKS_COLUMNS)
 * except that Amount and Status lead, as they do in every other table here,
 * plus the
 * row-action menu when handlers are supplied.
 */
export function buildInvoiceLinkColumns(opts?: {
  midType: string;
  handlers: InvoiceLinkRowHandlers;
}): Column<InvoiceLink>[] {
  const columns: Column<InvoiceLink>[] = [
    {
      key: "totalAmount",
      header: <AmountHeader />,
      minWidth: 140,
      align: "right",
      render: (row) => {
        const currency = row.txnCurrency || "INR";
        return (
          <AmountWithCode
            amount={formatCurrency(parseFloat(row.totalAmount ?? "0"), currency)}
            code={currency}
          />
        );
      },
    },
    {
      key: "status",
      header: "Status",
      minWidth: 150,
      render: (row) => {
        const { label, variant } = getInvoiceLinkStatusMeta(row.status);
        return <StatusBadge variant={variant} label={label} size="sm" />;
      },
    },
    {
      key: "id",
      header: "Invoice ID",
      minWidth: 170,
      render: (row) => <CopyableCell value={row.id} label="Invoice ID" />,
    },
    {
      key: "plId",
      header: "PL ID",
      minWidth: 170,
      render: (row) =>
        row.plId ? (
          <CopyableCell
            // Shortened in the middle so the column stays narrow; the full
            // PL ID is what's copied (and in the tooltip).
            value={truncateId(row.plId)}
            copyValue={row.plId}
            label="PL ID"
          />
        ) : (
          <span>-</span>
        ),
    },
    {
      key: "merchantReferenceId",
      header: "Merchant Reference No",
      minWidth: 190,
      render: (row) =>
        row.merchantReferenceId ? (
          <CopyableCell
            value={row.merchantReferenceId}
            label="Merchant reference no"
            valueClassName="text-foreground"
          />
        ) : (
          <span className="text-foreground">-</span>
        ),
    },
    {
      // Source renders the email as the cell and hangs a tooltip carrying
      // Name / Email / Phone / Business Name off it. Same here.
      key: "customerDetails",
      header: "Customer Details",
      minWidth: 220,
      render: (row) => {
        const details = [
          { label: "Name", value: row.fullName },
          { label: "Email", value: row.emailId },
          { label: "Phone", value: row.phoneNumber },
          { label: "Business Name", value: row.businessName },
        ];
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[220px] truncate text-foreground">
                {row.emailId || "-"}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-0.5">
                {details.map(({ label, value }) => (
                  <div key={label} className="flex gap-1.5 text-xs">
                    <span className="font-medium">{label}:</span>
                    <span>{value || "N/A"}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: "formattedDueDate",
      header: "Invoice Due Date",
      minWidth: 170,
      // A draft has no due date yet, and the source blanks it explicitly
      // rather than rendering whatever the field happens to hold.
      render: (row) =>
        row.status?.toUpperCase() === "DRAFT" ? (
          <span className="text-[13px] text-muted-foreground">-</span>
        ) : (
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">
            {row.formattedDueDate ? formatTransactionTimestamp(row.formattedDueDate) : "-"}
          </span>
        ),
    },
    {
      key: "formattedCreationTime",
      header: "Created On",
      minWidth: 170,
      // NOTE: pg-dashboard renders `{...}record</span>` here — a stray string
      // literal that prints "record" after every timestamp (columns.tsx, the
      // Created On column). That is a source defect and is not carried over.
      render: (row) => (
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">
          {row.formattedCreationTime ? formatTransactionTimestamp(row.formattedCreationTime) : "-"}
        </span>
      ),
    },
  ];

  if (opts) {
    columns.push({
      key: "actions",
      header: "",
      minWidth: 72,
      align: "right",
      render: (row) => (
        <RowActionsMenu actions={buildInvoiceLinkRowActions(row, opts.midType, opts.handlers)} />
      ),
    });
  }

  return columns;
}
