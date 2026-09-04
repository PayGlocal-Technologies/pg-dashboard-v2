"use client";

import { useMemo, useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import {
  toEndOfDayMs,
  toStartOfDayMs,
  type DateRangeValue,
} from "@/components/common/filters/FilterChips";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { Icon } from "@/components/icon";
import { BackendGapNotice } from "@/features/dashboard/settings/components/BackendGapNotice";
import { RaiseTicketForm } from "@/features/dashboard/support-tickets/components/RaiseTicketForm";
import { TicketList } from "@/features/dashboard/support-tickets/components/TicketList";
import { ticketTopicLabel } from "@/features/dashboard/support-tickets/constants";
import { useSupportTickets } from "@/stores/useSupportTickets";

type QueriesTab = "raise" | "tickets";

const EMPTY_DATE_RANGE: DateRangeValue = { from: "", to: "" };

/**
 * "My queries", at /my-queries — raising a ticket and tracking the ones
 * already raised, as its own page rather than a dialog. It started as a
 * popup off the header's Help menu; a search box and three filters over a
 * list, plus a multi-field form, is enough surface that it reads better with
 * room to breathe than crammed into a panel anchored to a header icon. The
 * Help menu now links here instead of opening it inline.
 *
 * Built on the same shell every other list page in this app uses (MCA
 * Transactions, Invoice management): a bordered card holding an
 * `UnderlineTabs` bar, a toolbar row, and the content below — rather than a
 * one-off `Card` wrapping flux-ui's boxed `Tabs`. The primary CTA sits in
 * `PageHeader`'s `actions` slot, matching how Client Management places "Add
 * client" there, instead of a small text link buried beside the tabs.
 *
 * The "My tickets" toolbar also reuses the same Date/checkbox-list filter
 * chips the transaction tables use (`@/components/common/filters/FilterChips`)
 * rather than a bespoke `<Select>`-based toolbar, so a merchant who has
 * filtered a transaction list already knows how this one works.
 *
 * See `useSupportTickets` for why every figure here is local-only for now.
 */
export function MyQueriesFeature() {
  const tickets = useSupportTickets((s) => s.tickets);

  // Whichever tab has something to show wins on first load: a merchant with
  // tickets already raised almost certainly came to check on one, not to
  // raise another, and a merchant with none has nothing to see on "My
  // tickets" yet. Lazy initializer — reads `tickets` once, on mount, rather
  // than re-deciding the tab out from under someone mid-visit.
  const [tab, setTab] = useState<QueriesTab>(() => (tickets.length > 0 ? "tickets" : "raise"));

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(EMPTY_DATE_RANGE);
  const [topicFilter, setTopicFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const filteredTickets = useMemo(() => {
    const floor = dateRange.from ? toStartOfDayMs(dateRange.from) : null;
    const ceiling = dateRange.to ? toEndOfDayMs(dateRange.to) : null;
    const query = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (floor !== null && ticket.createdAt < floor) return false;
      if (ceiling !== null && ticket.createdAt > ceiling) return false;
      if (topicFilter.length > 0 && !topicFilter.includes(ticket.topic)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(ticket.status)) return false;
      if (query) {
        const haystack =
          `${ticketTopicLabel(ticket.topic)} ${ticket.customSubject} ${ticket.details}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [tickets, dateRange, topicFilter, statusFilter, search]);

  return (
    <div className="max-w-3xl space-y-4 page-enter">
      <PageHeader
        title="My queries"
        subtitle="Raise a ticket, or track one you've already raised."
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onClick={() => setTab("raise")}
          >
            Raise a ticket
          </Button>
        }
      />

      <BackendGapNotice message="Tickets you raise are saved to this browser only, until our support system connects here." />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 pt-3">
          <UnderlineTabs
            tabs={[
              { value: "raise", label: "Raise a ticket" },
              { value: "tickets", label: `My tickets${tickets.length > 0 ? ` (${tickets.length})` : ""}` },
            ]}
            value={tab}
            onValueChange={(v) => setTab(v as QueriesTab)}
          />
        </div>

        {tab === "raise" ? (
          <div className="p-4">
            <RaiseTicketForm onRaised={() => setTab("tickets")} />
          </div>
        ) : (
          <TicketList
            tickets={filteredTickets}
            totalCount={tickets.length}
            search={search}
            onSearchChange={setSearch}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            topicFilter={topicFilter}
            onTopicFilterChange={setTopicFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}
      </div>
    </div>
  );
}
