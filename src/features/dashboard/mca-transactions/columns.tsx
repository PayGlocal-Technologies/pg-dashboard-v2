"use client";

import {
  type Column,
  StatusBadge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { Icon, type IconName } from "@/components/icon";
import { formatCurrency, formatTransactionTimestamp } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { COUNTRY_NAME_MAP } from "@/features/dashboard/mca-transactions/constants";
import type { McaTransaction } from "@/features/dashboard/mca-transactions/types";
import { useApp } from "@/stores/useApp";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { RowClick } from "@/components/common/table/RowClick";

// ── Status mapping: raw API value → display meta ──────────────────────────────
export type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

// Label and colour per raw status, matching pg-dashboard's
// STATUS_TEXT_BADGE_MAPPING exactly — including that both "sent for" states
// are positive (green) rather than pending-amber, and that both reversal
// statuses collapse to one label.
const MCA_STATUS_META: Record<string, StatusMeta> = {
  FUNDS_ON_HOLD: { label: "Funds on Hold", variant: "warning" },
  DOCUMENT_PENDING: { label: "Invoice Pending", variant: "warning" },
  SENT_FOR_REVIEW: { label: "Sent for Review", variant: "success", trailIcon: "clock" },
  SENT_FOR_SETTLEMENT: { label: "Sent for Settlement", variant: "success" },
  SETTLED: { label: "Settled", variant: "success", trailIcon: "check" },
  FIRC_SETTLED: { label: "FIRC Settled", variant: "success", trailIcon: "check" },
  REVERSAL_FOR_RISK_REJECTED: { label: "Funds reversed", variant: "danger", trailIcon: "x" },
  REVERSAL_FOR_NOT_SUPPORTED: { label: "Funds reversed", variant: "danger", trailIcon: "x" },
};

/**
 * A transaction awaiting merchant documents keeps its real settlement status
 * as the label and only turns amber — same as pg-dashboard. The status and
 * the outstanding request are two different facts, and replacing the label
 * with "Action Required" hid which stage the transaction was actually at.
 * The request itself is surfaced by the alert icon beside the amount (see
 * FrmPendingBadge) and by the timeline's own banner.
 */
export function getStatusMeta(raw: string, isFrmPending: boolean): StatusMeta {
  const meta = MCA_STATUS_META[raw] ?? {
    label: raw.replace(/_/g, " ").toLowerCase(),
    variant: "muted",
  };
  return isFrmPending ? { ...meta, variant: "warning" } : meta;
}

// A transaction is "Invoice Pending" exactly when its Settlement Status
// badge reads that label — i.e. not FRM-pending and externalStatus is
// DOCUMENT_PENDING. Deriving it from the same inputs as getStatusMeta keeps
// the Actions column's CTA choice in sync with what the Settlement Status
// column actually displays.
export function isWaitingForInvoice(row: McaTransaction): boolean {
  const isFrmPending = row.frmStatus === "PENDING_MERCHANT_UPLOAD";
  return !isFrmPending && row.externalStatus === "DOCUMENT_PENDING";
}

/**
 * The MDR-waiver badge, shown beside the amount when a referral or offer
 * discount was applied to this transaction. Mirrors pg-dashboard's Amount
 * column, which renders the same mark with the same tooltip copy.
 *
 * totalMdrDiscount is always an INR figure regardless of the transaction's
 * own currency (MDR is charged on the settled INR amount), so the ₹ here is
 * fixed rather than derived from row.currency.
 */
export function MdrOfferBadge({ totalMdrDiscount }: { totalMdrDiscount?: string | null }) {
  const discount = Number(totalMdrDiscount ?? 0);
  if (!discount) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex shrink-0 items-center" aria-label="Offer applied">
            <Icon name="mdr-offer" className="h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          MDR Waiver: ₹{discount.toLocaleString("en-IN", { maximumFractionDigits: 2 })} INR applied
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Shown beside the amount when compliance is waiting on documents from the
 * merchant. Ported from pg-dashboard's Amount column, which pairs this with
 * the MDR badge in the same slot.
 */
export function FrmPendingBadge({ frmStatus }: { frmStatus?: McaTransaction["frmStatus"] }) {
  if (frmStatus !== "PENDING_MERCHANT_UPLOAD") return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex shrink-0 items-center" aria-label="Documents required">
            <Icon name="alert-circle" className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          We need some documents from you to process this transaction. Please upload the required
          documents to avoid payment delays.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Country cell ──────────────────────────────────────────────────────────────
export function CountryCell({ iso2 }: { iso2?: string | null }) {
  const countryCurrencyMap = useApp((s) => s.countryCurrencyMap);

  // Normalise whatever the API sends (ISO2, ISO3, or full name) to a real ISO2 code
  // so the CDN flag URL is always correct (e.g. "France" or "FRA" → "FR" → fr.svg)
  if (!iso2) return <span className="text-[13px] text-muted-foreground">—</span>;

  // Normalise whatever the API sends (ISO2, ISO3, or full name) to a real ISO2 code
  // so the CDN flag URL is always correct (e.g. "France" or "FRA" → "FR" → fr.svg)
  const upper = iso2.toUpperCase();
  const entry =
    countryCurrencyMap.find((c) => c.iso2CountryCode.toUpperCase() === upper) ??
    countryCurrencyMap.find((c) => c.countryName.toUpperCase() === upper);

  const resolvedIso2 = entry?.iso2CountryCode ?? iso2;
  const name = entry?.countryName ?? COUNTRY_NAME_MAP[upper] ?? iso2;

  return (
    // min-w-max: the cell's own natural (max-content) width is never allowed
    // to shrink below the flag+name's combined width, so the column always
    // widens to fit the longest country name instead of clipping it.
    <div className="flex min-w-max items-center gap-1.5">
      <CountryFlag iso2={resolvedIso2} alt={name} />
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">{name}</span>
    </div>
  );
}

/** The per-status actions a row offers, beyond opening the details drawer.
 *  Mirrors pg-dashboard's statusActionMap: a status it doesn't name gets no
 *  menu at all. */
export interface RowActionHandlers {
  onOpenDetails: (row: McaTransaction) => void;
  onDownloadFirc: (row: McaTransaction) => void;
  onCreateInvoice: (row: McaTransaction) => void;
  onLinkInvoice: (row: McaTransaction) => void;
  /** getAllMerchantInvoice — gates the two invoice-management actions, same
   *  permission pg-dashboard checks. */
  canManageInvoices: boolean;
}

interface RowAction {
  key: string;
  label: string;
  icon: IconName;
  onSelect: () => void;
}

function buildRowActions(row: McaTransaction, handlers: RowActionHandlers): RowAction[] {
  switch (row.externalStatus) {
    case "DOCUMENT_PENDING":
      return [
        {
          key: "upload-invoice",
          label: "Upload Invoice",
          icon: "upload",
          onSelect: () => handlers.onOpenDetails(row),
        },
        ...(handlers.canManageInvoices
          ? ([
              {
                key: "create-invoice",
                label: "Create Invoice",
                icon: "file-text",
                onSelect: () => handlers.onCreateInvoice(row),
              },
              {
                key: "link-invoice",
                label: "Link Invoice",
                icon: "paperclip",
                onSelect: () => handlers.onLinkInvoice(row),
              },
            ] as RowAction[])
          : []),
      ];
    case "FIRC_SETTLED":
      return [
        {
          key: "firc-download",
          label: "FIRC Download",
          icon: "download",
          onSelect: () => handlers.onDownloadFirc(row),
        },
      ];
    default:
      return [];
  }
}

function RowActionsMenu({ actions }: { actions: RowAction[] }) {
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
            onSelect={(e) => {
              e.preventDefault();
              action.onSelect();
            }}
          >
            <Icon name={action.icon} className="mr-2 h-3.5 w-3.5" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────
// Upload Invoice now opens the Transaction Details Drawer (its inline upload
// flow) rather than the standalone modal, so the Actions column only needs
// onOpenDetails — see McaTransactionTable's commented-out modal wiring.
export function buildMcaColumns(
  isPartnerUser: boolean,
  handlers: RowActionHandlers,
  options: { showActions?: boolean } = {}
): Column<McaTransaction>[] {
  const { showActions = true } = options;
  const onOpenDetails = handlers.onOpenDetails;
  const cols: Column<McaTransaction>[] = [
    {
      key: "amount",
      header: "Amount",
      minWidth: 135,
      align: "left",
      render: (row) => {
        const amount = parseFloat(row.amount ?? "0");
        const currency = row.currency ?? "USD";
        return (
          <RowClick onClick={() => onOpenDetails(row)} align="left">
            {/* The offer badge leads the amount (items-center against the
                amount block's own baseline alignment) so a discounted
                transaction is identifiable while scanning the column, the
                same placement pg-dashboard uses. */}
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <MdrOfferBadge totalMdrDiscount={row.totalMdrDiscount} />
              <FrmPendingBadge frmStatus={row.frmStatus} />
              <span className="flex items-baseline gap-1.5">
                <span className="font-semibold text-foreground tabular-nums text-[13px]">
                  {formatCurrency(amount, currency, "en-US")}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">{currency}</span>
              </span>
            </div>
          </RowClick>
        );
      },
    },
    {
      key: "externalStatus",
      header: "Settlement Status",
      minWidth: 170,
      render: (row) => {
        const isFrmPending = row.frmStatus === "PENDING_MERCHANT_UPLOAD";
        const { label, variant, trailIcon } = getStatusMeta(row.externalStatus, isFrmPending);
        return (
          <RowClick onClick={() => onOpenDetails(row)}>
            <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />
          </RowClick>
        );
      },
    },
    {
      key: "formattedTransactionCreationDateTime",
      header: "Date & Time",
      minWidth: 150,
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">
            {formatTransactionTimestamp(row.formattedTransactionCreationDateTime)}
          </span>
        </RowClick>
      ),
    },
    {
      key: "partnerCustomerCountry",
      header: "Country",
      minWidth: 140,
      // DataTable's compact-density cells always add overflow-hidden; this
      // column's content must never clip, so it's cancelled here specifically
      // (min-w-max on CountryCell above is what actually grows the column).
      cellClassName: "overflow-visible",
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <CountryCell iso2={row.partnerCustomerCountry} />
        </RowClick>
      ),
    },
    {
      key: "partnerMaskedCustomerFullName",
      header: "Remitter Name",
      minWidth: 200,
      // DataTable's compact-density cells always add overflow-hidden (see
      // the Country column's own note above); cancelled here for the same
      // reason, so the table's own auto layout sizes this column to the
      // longest remitter name actually in it instead of clipping every name
      // to a fixed width regardless of length.
      cellClassName: "overflow-visible",
      render: (row) => {
        const name = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName;
        return (
          <RowClick onClick={() => onOpenDetails(row)}>
            {/* min-w-max: the same fix CountryCell above uses, so this
                span's rendered width is its full unwrapped text rather than
                whatever the column would otherwise collapse to. */}
            <span className="block min-w-max whitespace-nowrap text-[13px] text-foreground">
              {name ?? "—"}
            </span>
          </RowClick>
        );
      },
    },
    {
      key: "action",
      header: "Actions",
      minWidth: 170,
      align: "left",
      render: (row) => {
        const actions = buildRowActions(row, handlers);
        const isPendingInvoice = isWaitingForInvoice(row);
        const isFircSettled = row.externalStatus === "FIRC_SETTLED";
        // Both leave exactly one entry in buildRowActions' own switch (Upload
        // Invoice, FIRC Download) that becomes redundant once shown as its
        // own button below; sliced off the menu for the same reason in both
        // cases rather than duplicating the action in two places at once.
        const hasVisibleActionButton = isPendingInvoice || isFircSettled;

        return (
          <RowClick onClick={() => handlers.onOpenDetails(row)}>
            <div className="flex items-center gap-1">
              {/* Upload Invoice and Download FIRC both stay labelled buttons
                  rather than hiding in the menu: each is the one action a
                  merchant on that status is actually here to take, and
                  burying it behind "…" would cost a click on every
                  transaction that needs one. */}
              {isPendingInvoice ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon name="upload" className="w-3 h-3" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlers.onOpenDetails(row);
                  }}
                  className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap"
                >
                  Upload Invoice
                </Button>
              ) : isFircSettled ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon name="download" className="w-3 h-3" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlers.onDownloadFirc(row);
                  }}
                  className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap"
                >
                  Download FIRC
                </Button>
              ) : (
                /* Hidden until the row is hovered/focused, opacity-only (no
                   display/width change) so revealing it never shifts the
                   layout. Opens the same drawer a click anywhere else on the
                   row does. */
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Icon name="eye" className="w-3 h-3" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlers.onOpenDetails(row);
                  }}
                  className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  View details
                </Button>
              )}

              {/* The status-specific extras. On an invoice-pending or
                  FIRC-settled row the one available action is already the
                  button above, so the menu only appears when there is
                  something else alongside it. */}
              {actions.length > (hasVisibleActionButton ? 1 : 0) && (
                <RowActionsMenu actions={hasVisibleActionButton ? actions.slice(1) : actions} />
              )}
            </div>
          </RowClick>
        );
      },
    },
  ];

  if (isPartnerUser) {
    cols.splice(4, 0, {
      key: "merchantId",
      header: "Merchant ID",
      minWidth: 145,
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">
            {row.merchantId ?? "—"}
          </span>
        </RowClick>
      ),
    });
  }

  // Linked Transactions (on the Transaction Details page) reuses these same
  // columns without the Actions column — everything else (chips, formatting,
  // ordering) stays identical to the Transactions page's own table.
  return showActions ? cols : cols.filter((col) => col.key !== "action");
}
