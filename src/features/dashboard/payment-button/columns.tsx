"use client";

import { type Column, StatusBadge, formatTimestamp } from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableCell } from "@/components/common/CopyableCell";
import { CopyCodeButton } from "@/features/dashboard/payment-button/components/PaymentButtonRowActions";
import {
  formatButtonAmount,
  getPaymentButtonStatusMeta,
} from "@/features/dashboard/payment-button/helpers";
import { CUSTOMER_DECIDES_LABEL } from "@/features/dashboard/payment-button/constants";
import type { PaymentButton } from "@/features/dashboard/payment-button/types";

/** Amount + its currency code, the pair every amount cell in the app renders. */
export function PaymentButtonAmount({
  row,
  size = "table",
}: {
  row: PaymentButton;
  size?: "table" | "card";
}) {
  // Not in the list API yet (see PaymentButton): a bare dash, no stray code.
  if (row.amountType === null || (row.amountType === "FIXED" && !row.currency)) {
    return <span className="text-[13px] text-muted-foreground">—</span>;
  }
  if (row.amountType === "CUSTOMER_DECIDES") {
    return (
      <span className="text-[13px] whitespace-nowrap text-muted-foreground">
        {CUSTOMER_DECIDES_LABEL}
      </span>
    );
  }
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span
        className={
          size === "card"
            ? "text-[15px] font-semibold tabular-nums text-foreground"
            : "text-[13px] font-semibold tabular-nums text-foreground"
        }
      >
        {formatButtonAmount(row.amount, row.currency)}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">{row.currency}</span>
    </div>
  );
}

/**
 * A button's status chip, the one place every surface draws it (table, cards,
 * details header).
 *
 * The glyph goes in through `label`: flux types that prop as a string but
 * renders it as the chip's content, so a label-plus-icon fragment sits inside
 * the chip's own flex row (items-center), in its colour and gap. No nudge on
 * the icon: measured against a screenshot, flex centring already lands it
 * within ~0.25px of the text's optical centre; a 1px lift overshot by ~0.7px.
 * DESIGN-SYSTEM GAP: drop the cast once flux's trailIcon covers these glyphs.
 */
export function PaymentButtonStatusBadge({ status }: { status: PaymentButton["status"] }) {
  const { label, variant, icon } = getPaymentButtonStatusMeta(status);
  const content = (
    <>
      {label}
      <Icon name={icon} size={11} strokeWidth={2.5} className="shrink-0" aria-hidden />
    </>
  );
  return <StatusBadge variant={variant} label={content as unknown as string} size="sm" />;
}

/**
 * The table's columns: the data columns, then Copy code. The overflow menu is
 * not among them; it rides `rowAction`, pinned to the right edge (see
 * PaymentButtonTable). Typography (text-[13px] body, muted
 * secondary text) follows buildMcaLinkColumns so the two link-like products
 * read as one system; widths run wider than that table's, which read cramped
 * at this column count.
 */
/** 14px either side of every cell (header included), except Button ID's
 *  leading edge, which keeps its wider inset. Overrides flux's own cell padding. */
const CELL_PADDING = "px-[14px]";

export function buildPaymentButtonColumns({
  onCopyCode,
  copyingId,
}: {
  onCopyCode: (row: PaymentButton) => void;
  /** The button whose code is being fetched, so its Copy code shows loading. */
  copyingId: string | null;
}): Column<PaymentButton>[] {
  return [
    ...DATA_COLUMNS,
    {
      // Right after the last data column, not pinned to the edge with the ⋯
      // menu, which stays always visible while this one waits for hover.
      key: "copyCode",
      header: "",
      minWidth: 140,
      cellClassName: "overflow-visible px-[14px]",
      // Revealed on row hover, with the same classes flux uses for its own
      // row-action reveal (the <tr> is the `group`): also on keyboard focus
      // within the row, and always on touch screens, which have no hover.
      render: (row) => (
        <span className="inline-flex opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
          <CopyCodeButton
            row={row}
            isCopying={copyingId === row.buttonId}
            onCopyCode={onCopyCode}
          />
        </span>
      ),
    },
  ];
}

const DATA_COLUMNS: Column<PaymentButton>[] = [
  {
    key: "buttonId",
    header: "Button ID",
    minWidth: 210,
    // overflow-visible: compact density clips the hover-revealed copy button
    // without it. pl-8 insets the leading column from the card's edge, and
    // its right side takes the 14px every other cell has; flux applies
    // cellClassName to the header cell too, so both move together.
    cellClassName: "overflow-visible pl-8 pr-[14px]",
    render: (row) => <CopyableCell value={row.buttonId} label="Button ID" monospace />,
  },
  {
    key: "amount",
    header: "Amount",
    minWidth: 210,
    cellClassName: CELL_PADDING,
    render: (row) => <PaymentButtonAmount row={row} />,
  },
  {
    key: "status",
    header: "Status",
    minWidth: 150,
    cellClassName: CELL_PADDING,
    render: (row) => <PaymentButtonStatusBadge status={row.status} />,
  },
  {
    key: "successfulPayments",
    header: "Successful payments",
    minWidth: 200,
    cellClassName: CELL_PADDING,
    render: (row) => (
      <span className="text-[13px] tabular-nums text-foreground">
        {row.successfulPayments ?? "—"}
      </span>
    ),
  },
  {
    key: "revenue",
    header: "Revenue",
    minWidth: 170,
    cellClassName: CELL_PADDING,
    render: (row) => (
      <span className="text-[13px] tabular-nums whitespace-nowrap text-foreground">
        {row.revenue == null ? "—" : formatButtonAmount(row.revenue, row.currency)}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Created at",
    minWidth: 200,
    cellClassName: CELL_PADDING,
    render: (row) => (
      <span className="text-[13px] whitespace-nowrap text-foreground">
        {formatTimestamp(row.createdAt)}
      </span>
    ),
  },
];
