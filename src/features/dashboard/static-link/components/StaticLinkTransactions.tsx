"use client";

import { useMemo } from "react";
import { Card, DataTable } from "@/components/ui";
import { buildPaColumns } from "@/features/dashboard/pa-transactions/paColumns";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";
import { useApp } from "@/stores/useApp";

const NO_ROWS: PaTransaction[] = [];

/** This page's own header wording, over the Transactions page's columns. */
const HEADER_LABELS: Record<string, string> = {
  paymentMethod: "Payment method",
  customerName: "Customer name",
  customerEmail: "Email",
  dateTime: "Date and time",
};

/**
 * Payments made through the static link, in the Transactions page's columns
 * (Amount, Status, Payment method, Customer, Email, ID, Date and time), set
 * inside the card's padding as designed rather than edge to edge.
 *
 * TODO(api): no way to find a static link's payments yet; rows join once the
 * PA transaction search can filter by it (as it does by payment button ID).
 */
export function StaticLinkTransactions() {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const columns = useMemo(
    () =>
      buildPaColumns({ isPartnerUser }).map((column) => ({
        ...column,
        header: HEADER_LABELS[column.key] ?? column.header,
      })),
    [isPartnerUser]
  );

  return (
    <Card className="gap-4 p-5">
      <h2 className="text-[15px] font-semibold text-foreground">Linked transactions</h2>
      <DataTable<PaTransaction>
        columns={columns}
        data={NO_ROWS}
        rowKey={(row) =>
          row.gid ?? `${row.merchantId ?? ""}-${row.formattedCreationDateTime ?? ""}`
        }
        emptyTitle="No transactions yet"
        emptyDescription="Payments made through your static link will show up here."
        headerStyle="surface"
        // No frame of its own: the card is the frame, and the header band
        // carries the table's edge, as designed.
        className="rounded-none border-0"
        theadClassName="[&_th]:bg-muted/80"
        pagination={{ mode: "none" }}
      />
    </Card>
  );
}
