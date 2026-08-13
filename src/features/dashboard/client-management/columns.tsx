"use client";

import type { Column } from "@/components/ui";
import { RowClick } from "@/components/common/table/RowClick";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { clientAmountLocale } from "@/features/dashboard/client-management/constants";
import { formatCurrency, formatPhoneNumber, formatTransactionDateOnly } from "@/lib/utils/format";
import type { Client } from "@/features/dashboard/client-management/types";

// Column widths, typography (text-[13px] body, muted secondary text), and
// alignment conventions mirror buildMcaColumns so the two tables read as one
// system. Every cell is wrapped in RowClick, exactly as the Transactions
// table's are, so the whole row — cell padding and whitespace included — opens
// the client's details rather than just the text inside it. Any interactive
// control added to a cell later must stop propagation in its own onClick to
// stay independent of that row-level click.
export function buildClientColumns(onOpenDetails: (row: Client) => void): Column<Client>[] {
  return [
    {
      key: "businessName",
      header: "Business name",
      minWidth: 240,
      // Compact density puts overflow-hidden on every cell, which would clip
      // the un-wrapped name back to the column's current width and defeat the
      // min-w-max measurement below — cancelled here, same as mcaColumns does
      // for its Country cell.
      cellClassName: "overflow-visible",
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          {/* The row's primary piece of information: the only cell in
              foreground weight, and min-w-max so the column widens to the
              longest business name rather than truncating it. */}
          <span className="block min-w-max text-[13px] font-medium whitespace-nowrap text-foreground">
            {row.businessName}
          </span>
        </RowClick>
      ),
    },
    {
      key: "primaryContactName",
      header: "Primary contact name",
      minWidth: 200,
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <span className="block w-[170px] truncate text-[13px] text-foreground">
            {row.primaryContactName}
          </span>
        </RowClick>
      ),
    },
    {
      key: "email",
      header: "Email",
      minWidth: 240,
      // Addresses run long and vary wildly in length: a fixed width that
      // truncates (with the full address in `title`) keeps the money columns
      // on screen, where widening to the longest address would push them off.
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <span className="block w-[220px] truncate text-[13px] text-muted-foreground" title={row.email}>
            {row.email}
          </span>
        </RowClick>
      ),
    },
    {
      key: "phone",
      header: "Phone number",
      minWidth: 165,
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <span className="text-[13px] tabular-nums whitespace-nowrap text-muted-foreground">
            {formatPhoneNumber(row.phoneDialCode, row.phoneNumber)}
          </span>
        </RowClick>
      ),
    },
    {
      key: "country",
      header: "Country",
      minWidth: 170,
      // Same as the Transactions table's Country column: the flag and name
      // must never clip, so compact density's overflow-hidden is cancelled and
      // min-w-max below is what actually grows the column.
      cellClassName: "overflow-visible",
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <div className="flex min-w-max items-center gap-1.5">
            <CountryFlag iso2={row.countryIso2} alt={row.countryName} />
            <span className="text-[13px] whitespace-nowrap text-muted-foreground">{row.countryName}</span>
          </div>
        </RowClick>
      ),
    },
    {
      key: "outstanding",
      header: "Outstanding",
      minWidth: 150,
      align: "right",
      render: (row) => {
        // A settled-up client is the one row a merchant scanning this column
        // can stop reading, so zero drops to muted, regular weight instead of
        // carrying the same emphasis as a balance that's actually owed.
        const isSettled = row.outstandingAmount === 0;
        return (
          <RowClick onClick={() => onOpenDetails(row)} align="right">
            <div className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
              <span
                className={
                  isSettled
                    ? "text-[13px] tabular-nums text-muted-foreground"
                    : "text-[13px] font-semibold tabular-nums text-foreground"
                }
              >
                {formatCurrency(
                  row.outstandingAmount,
                  row.outstandingCurrency,
                  clientAmountLocale(row.outstandingCurrency)
                )}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {row.outstandingCurrency}
              </span>
            </div>
          </RowClick>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      minWidth: 130,
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          {/* Date only — a client record's creation time of day is noise next
              to a transaction's, which is why this is the date-only formatter
              rather than formatTransactionTimestamp. */}
          <span className="text-[13px] whitespace-nowrap text-muted-foreground">
            {formatTransactionDateOnly(row.createdAt)}
          </span>
        </RowClick>
      ),
    },
  ];
}
