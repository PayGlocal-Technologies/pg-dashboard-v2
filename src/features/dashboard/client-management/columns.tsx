"use client";

import { Avatar, AvatarFallback, type Column } from "@/components/ui";
import { RowClick } from "@/components/common/table/RowClick";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { businessInitials } from "@/features/dashboard/client-management/constants";
import { formatPhoneNumber, formatTransactionDateOnly } from "@/lib/utils/format";
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
          {/* min-w-max so the column widens to the longest business name
              rather than truncating it. */}
          <div className="flex min-w-max items-center gap-2.5">
            {/* Supporting identifier, not a second piece of information:
                Flux's own Avatar at h-7 (down from its h-9 default) so it
                stays compact against a 13px row, with the initials in the
                fallback's muted weight so the name beside it keeps the
                emphasis. No AvatarImage — clients have no artwork to load,
                so the fallback is the whole avatar. */}
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px]">
                {businessInitials(row.businessName)}
              </AvatarFallback>
            </Avatar>
            {/* The row's primary piece of information: the only cell in
                foreground weight. */}
            <span className="text-[13px] font-medium whitespace-nowrap text-foreground">
              {row.businessName}
            </span>
          </div>
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
