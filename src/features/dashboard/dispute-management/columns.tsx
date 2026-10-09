import {
  Badge,
  type Column,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import { formatTimestamp } from "@/lib/utils/format";
import { CopyableCell } from "@/components/common/CopyableCell";
import { PaymentMethodLogo } from "@/features/dashboard/pa-transactions/components/TransactionPaymentMethod";
import { truncateId } from "@/features/dashboard/pa-transactions/components/TransactionId";
import { StatusBadgeWithTooltip } from "@/components/common/StatusBadgeWithTooltip";
import { AmountHeader, AmountWithCode } from "@/components/common/AmountCell";
import {
  CB_LEVEL_META,
  DISPLAY_STATUS_META,
  RESPOND_BY_TABS,
  SINGLE_STATUS_TABS,
} from "@/features/dashboard/dispute-management/constants";
import {
  amountHistory,
  isAmountUpdated,
  levelAmount,
  paymentRow,
  respondBy,
  showsRespondBy,
} from "@/features/dashboard/dispute-management/helpers";
import type { DisputeBucket, DisputeRecord } from "@/features/dashboard/dispute-management/types";

// Same type treatment as the Transactions table: the amount in bold, every
// supporting value in regular-weight muted 13px.
const MUTED_CELL = "whitespace-nowrap text-[13px] text-muted-foreground";

/** pg-dashboard writes every list amount in rupees (`₹ … INR`); search rows carry no currency. */
const LIST_CURRENCY = "INR";

function DateTimeCell({ value }: { value?: string | null }) {
  return <span className={cn(MUTED_CELL, "tabular-nums")}>{formatTimestamp(value, "N/A")}</span>;
}

/**
 * The current level's amount and, when a later level changed it, an info
 * mark whose tooltip lists each level's amount (pg-dashboard's "Amount
 * Updated" note, ChargeBackTooltip).
 */
function AmountCell({ row }: { row: DisputeRecord }) {
  const amount = (
    <AmountWithCode
      amount={formatCurrency(Number(levelAmount(row) ?? 0), LIST_CURRENCY)}
      code={LIST_CURRENCY}
    />
  );
  if (!isAmountUpdated(row)) return amount;
  const history = amountHistory(row);
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          {/* ChargeBackTooltip: the words "Amount Updated" with an info mark. */}
          <span
            tabIndex={0}
            className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-amber-600 dark:text-amber-400"
          >
            Amount Updated
            <Icon name="info" size={12} aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="mb-1.5 font-medium">Disputed amount has been updated</p>
          <dl className="flex flex-col gap-1">
            {history.map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  "flex justify-between gap-4",
                  index === history.length - 1 && "font-semibold"
                )}
              >
                <dt>{item.label}</dt>
                <dd className="tabular-nums">
                  {formatCurrency(Number(item.value), LIST_CURRENCY)} {LIST_CURRENCY}
                </dd>
              </div>
            ))}
          </dl>
        </TooltipContent>
      </Tooltip>
      {amount}
    </span>
  );
}

/**
 * The response deadline and, while it has not passed, how long is left (red
 * inside two days, amber inside five). Only for rows still awaiting the
 * merchant (showsRespondBy); the list never says "Past due", as
 * pg-dashboard's doesn't.
 */
function DeadlineCell({ row, now }: { row: DisputeRecord; now: number }) {
  if (!showsRespondBy(row)) return <span className={MUTED_CELL}>-</span>;
  const due = respondBy(row.dueDate, now);
  return (
    <span className="flex flex-col">
      <span className={cn(MUTED_CELL, "tabular-nums")}>{formatTimestamp(row.dueDate, "-")}</span>
      {!due.isOverdue && (
        <span
          className={cn(
            "whitespace-nowrap text-[12px]",
            due.tone === "danger"
              ? "text-red-600 dark:text-red-400"
              : due.tone === "warning"
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
          )}
        >
          {due.text}
        </span>
      )}
    </span>
  );
}

/** Payment method as the Transactions table shows it: the logo, then the card's last four. */
function PaymentMethodCellView({ row }: { row: DisputeRecord }) {
  const tx = paymentRow(row.paymentMethod, row.subPaymentMethod, row.maskedCardNo);
  const last4 = row.maskedCardNo?.replace(/x/gi, "").trim();
  const text = last4
    ? `••• ${last4}`
    : row.paymentMethod === "UPI"
      ? "UPI"
      : row.paymentMethod === "INB"
        ? "Net Banking"
        : row.paymentMethod === "PAYMENT_ACCOUNT"
          ? "Apple Pay"
          : "•••••••";
  return (
    <div className="flex items-center gap-1.5">
      <PaymentMethodLogo row={tx} />
      <span className="whitespace-nowrap font-mono text-[13px] text-muted-foreground">{text}</span>
    </div>
  );
}

/**
 * The level as a chip, so how far a dispute has gone reads at a glance:
 * Dispute plain, Pre-Compliance and Pre-Arbitration amber with one
 * up-chevron, Arbitration red with two. Colour always comes with the label.
 */
function StageCell({ row }: { row: DisputeRecord }) {
  const meta = CB_LEVEL_META[row.cbLevel];
  if (!meta) return <span className={MUTED_CELL}>{row.cbLevel || "–"}</span>;
  return (
    <Badge
      variant={meta.variant}
      size="sm"
      className="gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium"
    >
      {meta.label}
      {meta.chevrons === 1 && <Icon name="chevron-up" size={12} aria-hidden />}
      {meta.chevrons === 2 && <Icon name="chevrons-up" size={12} aria-hidden />}
    </Badge>
  );
}

/**
 * Every data column, in default order, each keyed so the column manager can
 * reorder and hide it. Which appear depends on the tab (Status, and Respond
 * by vs Completed on) and on whether the list spans several merchant IDs.
 */
export function disputeColumnDefs({
  tab,
  showMerchantId,
}: {
  tab: DisputeBucket;
  showMerchantId: boolean;
}): { key: string; label: string }[] {
  return [
    { key: "cbId", label: "Dispute ID" },
    ...(showMerchantId ? [{ key: "merchantId", label: "Merchant ID" }] : []),
    { key: "amount", label: "Amount" },
    ...(SINGLE_STATUS_TABS.includes(tab) ? [] : [{ key: "status", label: "Status" }]),
    { key: "stage", label: "Stage" },
    { key: "reason", label: "Reason" },
    { key: "paymentMethod", label: "Payment method" },
    // BACKEND GAP - see the Customer email column below.
    // { key: "customerEmail", label: "Customer email" },
    { key: "disputedOn", label: "Disputed on" },
    RESPOND_BY_TABS.includes(tab)
      ? { key: "respondBy", label: "Respond by" }
      : { key: "completedOn", label: "Completed on" },
  ];
}

function buildColumn(key: string, now: number): Column<DisputeRecord> | null {
  switch (key) {
    case "cbId":
      return {
        key: "cbId",
        header: "Dispute ID",
        minWidth: 150,
        render: (row) => (
          <span className="group">
            <CopyableCell
              value={truncateId(row.cbId)}
              copyValue={row.cbId}
              label="Dispute ID"
              className="text-[13px] font-medium text-foreground"
            />
          </span>
        ),
      };
    case "merchantId":
      return {
        key: "merchantId",
        header: "Merchant ID",
        minWidth: 140,
        render: (row) => <span className={MUTED_CELL}>{row.merchantId || "-"}</span>,
      };
    case "amount":
      return {
        key: "amount",
        header: <AmountHeader />,
        align: "right",
        minWidth: 150,
        render: (row) => <AmountCell row={row} />,
      };
    case "status":
      return {
        key: "status",
        header: "Status",
        minWidth: 170,
        render: (row) => {
          const meta = DISPLAY_STATUS_META[row.displayStatus];
          if (!meta) return <span className={MUTED_CELL}>{row.displayStatus || "-"}</span>;
          return (
            <StatusBadgeWithTooltip
              variant={meta.variant}
              label={meta.label}
              trailIcon={meta.trailIcon}
              tooltip={meta.tooltip}
              size="sm"
            />
          );
        },
      };
    case "stage":
      return {
        key: "stage",
        header: "Stage",
        minWidth: 140,
        render: (row) => <StageCell row={row} />,
      };
    case "reason":
      return {
        key: "reason",
        header: "Reason",
        minWidth: 170,
        render: (row) => (
          <span className={MUTED_CELL}>{row.cbReasonShortDescription || "Other reason"}</span>
        ),
      };
    case "paymentMethod":
      return {
        key: "paymentMethod",
        header: "Payment method",
        minWidth: 145,
        render: (row) => <PaymentMethodCellView row={row} />,
      };
    /*
      BACKEND GAP - Customer email column (kept from v2's design). Search
      rows carry no customer email (pg-dashboard's ChargebackRecord has
      none), so it could only ever show "-". Restore with the def above
      once /v1/search/cb returns it:

    case "customerEmail":
      return {
        key: "customerEmail",
        header: "Customer email",
        minWidth: 190,
        render: (row) => <span className={MUTED_CELL}>{row.customerEmail || "-"}</span>,
      };
    */
    case "disputedOn":
      return {
        key: "disputedOn",
        header: "Disputed on",
        minWidth: 140,
        sorter: true,
        render: (row) => <DateTimeCell value={row.formattedCreationTime} />,
      };
    case "respondBy":
      return {
        key: "respondBy",
        header: "Respond by",
        minWidth: 150,
        sorter: true,
        render: (row) => <DeadlineCell row={row} now={now} />,
      };
    case "completedOn":
      return {
        key: "completedOn",
        header: "Completed on",
        minWidth: 140,
        sorter: true,
        render: (row) => <DateTimeCell value={row.formattedCbCompletionTime} />,
      };
    default:
      return null;
  }
}

/** The tab's columns in the managed order, less any the merchant hid. */
export function buildDisputeColumns({
  tab,
  showMerchantId,
  now,
  columnOrder,
  hiddenColumns,
}: {
  tab: DisputeBucket;
  showMerchantId: boolean;
  now: number;
  columnOrder: string[] | null;
  hiddenColumns: string[];
}): Column<DisputeRecord>[] {
  const available = disputeColumnDefs({ tab, showMerchantId }).map((d) => d.key);
  // A saved order may miss this tab's own columns (Respond by vs Completed
  // on): those keep their default slot at the end.
  const ordered = columnOrder
    ? [
        ...columnOrder.filter((key) => available.includes(key)),
        ...available.filter((key) => !columnOrder.includes(key)),
      ]
    : available;
  return ordered
    .filter((key) => !hiddenColumns.includes(key))
    .map((key) => buildColumn(key, now))
    .filter((c): c is Column<DisputeRecord> => c !== null);
}
