"use client";

import { useState } from "react";
import {
  DateFilterChip,
  StatusFilterChip,
  type DateRangeValue,
  type FilterChipOption,
} from "@/components/common/filters/FilterChips";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { EmptyState, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import { categoryLabel, issueLabel } from "@/features/dashboard/support-tickets/classification";
import {
  TICKET_STATUS_FILTER_OPTIONS,
  ticketStatusMeta,
} from "@/features/dashboard/support-tickets/constants";
import type { SupportTicket } from "@/features/dashboard/support-tickets/types";

const STATUS_OPTIONS: FilterChipOption[] = TICKET_STATUS_FILTER_OPTIONS;

/** Which chip's popover is open, if any — lifted here (not local to each
 *  chip) so opening one closes another, matching the transaction tables'
 *  own toolbar. */
type ChipKey = "date" | "topic" | "status";

function RowSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="py-3 first:pt-0">
          <Shimmer className="h-4 w-52" />
          <Shimmer className="mt-2 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

function TicketRow({ ticket, onOpen }: { ticket: SupportTicket; onOpen: () => void }) {
  const meta = ticketStatusMeta(ticket.status);
  const issue = issueLabel(ticket.custom_fields?.cf_issue);
  const category = categoryLabel(ticket.custom_fields?.cf_category);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group flex w-full items-start justify-between gap-3 py-3 text-left first:pt-0 last:pb-0",
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-foreground">
          <span className="truncate group-hover:underline">{ticket.subject}</span>
          <span className="shrink-0 font-normal tabular-nums text-muted-foreground">
            #{ticket.id}
          </span>
        </p>
        {(issue || category) && (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {[issue, category].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">
          Raised {formatTransactionTimestamp(ticket.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <StatusBadge
          variant={meta.badgeVariant}
          label={meta.label}
          trailIcon={meta.trailIcon}
          size="sm"
        />
        <Icon
          name="chevron-right"
          className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
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
 *
 * The Topic chip's options are built from the tickets actually present rather
 * than from the full classification list: a merchant with three tickets should
 * not scroll twelve topics to filter them, and a ticket filed by an agent
 * under an internal issue still needs to be filterable.
 */
export function TicketList({
  tickets,
  totalCount,
  isLoading,
  topicOptions,
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  topicFilter,
  onTopicFilterChange,
  statusFilter,
  onStatusFilterChange,
  onOpenTicket,
}: {
  tickets: SupportTicket[];
  /** Unfiltered count, so an empty result can say "no matches" instead of
   *  "no tickets" when the merchant does have some, just not matching. */
  totalCount: number;
  isLoading: boolean;
  topicOptions: FilterChipOption[];
  search: string;
  onSearchChange: (value: string) => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (value: DateRangeValue) => void;
  topicFilter: string[];
  onTopicFilterChange: (value: string[]) => void;
  statusFilter: string[];
  onStatusFilterChange: (value: string[]) => void;
  onOpenTicket: (ticket: SupportTicket) => void;
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
          words={["subject", "ticket number", "topic"]}
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
            options={topicOptions}
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

      <div className="max-h-[32rem] overflow-y-auto p-4">
        {isLoading ? (
          <RowSkeleton />
        ) : tickets.length === 0 ? (
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
              <TicketRow key={ticket.id} ticket={ticket} onOpen={() => onOpenTicket(ticket)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
