"use client";

import type { Column } from "@/components/ui";
import { RowClick } from "@/components/common/table/RowClick";
import { CopyableText } from "@/components/common/CopyableText";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatPhoneNumber,
  formatTransactionDateOnly,
  truncateMiddle,
} from "@/lib/utils/format";
import {
  clientAmountLocale,
  clientTotalReceived,
} from "@/features/dashboard/client-management/constants";
import { clientTransactions } from "@/features/dashboard/client-management/mock-data";
import type { Client } from "@/features/dashboard/client-management/types";

/**
 * How much of an email survives its middle elision in the table: the first four
 * characters, then the last six, which lands on the domain's tail
 * ("amelia.hartley@northwindtrading.co.uk" → "amel….co.uk"). The head is now
 * long enough to read as the start of a name rather than a single initial,
 * which is what tells two rows apart at a glance, and the column still never
 * widens to fit an address nobody reads in full from a table.
 *
 * Computed from the address itself on every row, never a stored display string.
 * The whole address is still what the title attribute, the tooltip, the
 * accessible name, and the clipboard carry — this only changes what is drawn.
 * An address too short to be worth eliding is drawn whole: truncateMiddle
 * returns it untouched unless the ellipsis actually hides more characters than
 * it costs.
 */
const EMAIL_HEAD_CHARS = 4;
const EMAIL_TAIL_CHARS = 6;

/** Shared by the two copyable cells so their text matches every other cell in
 *  the row: the table's own 13px muted body, not CopyableText's default mono. */
const COPY_CELL_VALUE_CLASS = "font-sans text-[13px] text-muted-foreground";

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
      minWidth: 150,
      // Compact density clips every cell; the copy button's hover state sits
      // slightly proud of the text and would otherwise be cut at the boundary.
      cellClassName: "overflow-visible",
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          {/* Elided for display only — CopyableText keeps the full address in
              the title, the tooltip, the accessible name, and the clipboard,
              and the record itself is untouched. Its copy button stops the
              click from also opening the row. */}
          <CopyableText
            value={row.email}
            displayValue={truncateMiddle(row.email, EMAIL_HEAD_CHARS, EMAIL_TAIL_CHARS)}
            valueClassName={COPY_CELL_VALUE_CLASS}
            revealOnHover
          />
        </RowClick>
      ),
    },
    {
      key: "phone",
      header: "Phone number",
      minWidth: 165,
      cellClassName: "overflow-visible",
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          {/* Shown in full — a formatted number is short enough to read from a
              table — but copyable on the same hover affordance as the email
              beside it. */}
          <CopyableText
            value={formatPhoneNumber(row.phoneDialCode, row.phoneNumber)}
            valueClassName={cn(COPY_CELL_VALUE_CLASS, "tabular-nums")}
            revealOnHover
          />
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
            <span className="text-[13px] whitespace-nowrap text-muted-foreground">
              {row.countryName}
            </span>
          </div>
        </RowClick>
      ),
    },
    {
      key: "totalReceived",
      header: "Total received",
      minWidth: 165,
      // Right-aligned, exactly as the Transactions table aligns its own Amount
      // column: figures line up on their last digit down the column, which is
      // what makes two rows comparable at a glance.
      align: "right",
      render: (row) => {
        // Summed from the client's settled transactions on every render rather
        // than read off the row: there is no received total on the client
        // record, precisely so this figure and the transactions the details
        // view lists can't disagree. Once a real endpoint exists it either
        // sends the total or sends the transactions — either way this call is
        // the only thing that changes.
        const totals = clientTotalReceived(clientTransactions(row.businessName));

        return (
          <RowClick onClick={() => onOpenDetails(row)} align="right">
            {totals.length === 0 ? (
              // Nothing settled yet — an em-dash, not a formatted zero, since
              // "no invoices have settled" and "settled for nothing" are
              // different facts and only the first one is true here.
              <span className="text-[13px] text-muted-foreground">—</span>
            ) : (
              // Amount then its ISO code in muted 11px, the same pairing the
              // Transactions table's Amount cell uses. One line per currency:
              // with a client billed in a single currency (all of them today)
              // that is exactly one line.
              <div className="flex flex-col items-end gap-0.5">
                {totals.map((total) => (
                  <div
                    key={total.currency}
                    className="flex items-baseline justify-end gap-1.5 whitespace-nowrap"
                  >
                    <span className="text-[13px] font-semibold tabular-nums text-foreground">
                      {formatCurrency(
                        total.amount,
                        total.currency,
                        clientAmountLocale(total.currency)
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {total.currency}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
