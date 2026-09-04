"use client";

import { useState } from "react";
import {
  DateFilterChip,
  StatusFilterChip,
  type DateRangeValue,
  type FilterChipOption,
} from "@/components/common/filters/FilterChips";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { EmptyState, StatusBadge } from "@/components/ui";
import {
  TICKET_STATUSES,
  TICKET_TOPICS,
  ticketStatusMeta,
  ticketTopicLabel,
} from "@/features/dashboard/support-tickets/constants";
import type { SupportTicket } from "@/features/dashboard/support-tickets/types";

const TOPIC_OPTIONS: FilterChipOption[] = TICKET_TOPICS.map((topic) => ({
  value: topic.value,
  label: topic.label,
}));
const STATUS_OPTIONS: FilterChipOption[] = TICKET_STATUSES.map((status) => ({
  value: status.value,
  label: status.label,
}));

/** Which chip's popover is open, if any — lifted here (not local to each
 *  chip) so opening one closes another, matching the transaction tables'
 *  own toolbar. */
type ChipKey = "date" | "topic" | "status";

function formatTicketDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TicketRow({ ticket }: { ticket: SupportTicket }) {
  const meta = ticketStatusMeta(ticket.status);
  return (
    <div className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-foreground">
          {ticketTopicLabel(ticket.topic)}
          {ticket.customSubject && (
            <span className="font-normal text-muted-foreground"> · {ticket.customSubject}</span>
          )}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{ticket.details}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Raised {formatTicketDate(ticket.createdAt)}
        </p>
      </div>
      <StatusBadge
        variant={meta.badgeVariant}
        label={meta.label}
        trailIcon={meta.trailIcon}
        size="sm"
        className="shrink-0"
      />
    </div>
  );
}

/**
 * "My tickets": a search box plus the same dashed-pill Date/checkbox-list
 * filter chips the transaction tables use (`@/components/common/filters/FilterChips`),
 * rather than plain `<Select>` dropdowns, so this toolbar reads as the same
 * design-system pattern as everywhere else that filters a list.
 *
 * Filtering happens entirely in the caller, which passes down the
 * already-filtered list — this component only renders the toolbar and rows.
 */
export function TicketList({
  tickets,
  totalCount,
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  topicFilter,
  onTopicFilterChange,
  statusFilter,
  onStatusFilterChange,
}: {
  tickets: SupportTicket[];
  /** Unfiltered count, so an empty result can say "no matches" instead of
   *  "no tickets" when the merchant does have some, just not matching. */
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (value: DateRangeValue) => void;
  topicFilter: string[];
  onTopicFilterChange: (value: string[]) => void;
  statusFilter: string[];
  onStatusFilterChange: (value: string[]) => void;
}) {
  const [openChip, setOpenChip] = useState<ChipKey | null>(null);

  return (
    <>
      {/* Same toolbar-row shell as McaInvoiceTable/McaTransactionTable:
          border-b'd, px-4 py-3, search then chips. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <RotatingSearchInput
          value={search}
          onSearch={onSearchChange}
          words={["subject", "details", "ticket"]}
          ariaLabel="Search tickets"
          className="w-full sm:w-56"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <DateFilterChip
            label="Duration"
            value={dateRange}
            onChange={onDateRangeChange}
            open={openChip === "date"}
            onOpenChange={(open) => setOpenChip(open ? "date" : null)}
          />
          <StatusFilterChip
            label="Topic"
            options={TOPIC_OPTIONS}
            selected={topicFilter}
            onChange={onTopicFilterChange}
            open={openChip === "topic"}
            onOpenChange={(open) => setOpenChip(open ? "topic" : null)}
          />
          <StatusFilterChip
            options={STATUS_OPTIONS}
            selected={statusFilter}
            onChange={onStatusFilterChange}
            open={openChip === "status"}
            onOpenChange={(open) => setOpenChip(open ? "status" : null)}
          />
        </div>
      </div>

      <div className="max-h-88 overflow-y-auto p-4">
        {tickets.length === 0 ? (
          <EmptyState
            className="py-8"
            title={totalCount === 0 ? "No tickets yet" : "No tickets match these filters"}
            description={
              totalCount === 0
                ? "Raise one from the Raise a ticket tab and it will show up here."
                : "Try a wider duration or clearing a filter."
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
