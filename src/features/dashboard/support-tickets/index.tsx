"use client";

import { useMemo, useState } from "react";
import { Alert, AlertDescription, Button, PageHeader } from "@/components/ui";
import {
  toEndOfDayMs,
  toStartOfDayMs,
  type DateRangeValue,
  type FilterChipOption,
} from "@/components/common/filters/FilterChips";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { Icon } from "@/components/icon";
import { issueLabel } from "@/features/dashboard/support-tickets/classification";
import { RaiseTicketForm } from "@/features/dashboard/support-tickets/components/RaiseTicketForm";
import { TicketDetailDrawer } from "@/features/dashboard/support-tickets/components/TicketDetailDrawer";
import { TicketList } from "@/features/dashboard/support-tickets/components/TicketList";
import { useSupportScope, useSupportTickets } from "@/features/dashboard/support-tickets/hooks";
import type { SupportTicket } from "@/features/dashboard/support-tickets/types";

type QueriesTab = "raise" | "tickets";

const EMPTY_DATE_RANGE: DateRangeValue = { from: "", to: "" };

/** Epoch ms for a ticket's ISO `created_at`, or null when it is absent or
 *  unparseable — in which case the date filter must not silently drop the
 *  row (see the filter below). */
function createdAtMs(ticket: SupportTicket): number | null {
  if (!ticket.created_at) return null;
  const parsed = new Date(ticket.created_at).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

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
 * Backed by the Merchant Support API (Freshdesk) — see `hooks.ts`.
 */
export function MyQueriesFeature() {
  const { isOnboardingUser } = useSupportScope();
  const { tickets, isLoading, isError } = useSupportTickets();

  // Always lands on "My tickets", and deliberately does not try to be clever
  // about it.
  //
  // The previous version picked the tab from `tickets.length` in a lazy
  // initializer, which was dead code: the initializer runs on mount while the
  // list is still in flight, so the count was always 0 and it always chose
  // "raise". Deciding after the fetch instead would mean flipping the tab
  // under a merchant who had started typing, and unmounting the form loses
  // what they typed.
  //
  // Landing on the list is the right fixed answer anyway, given how this
  // feature is actually used: a merchant raises a ticket once, then returns
  // repeatedly to see whether an agent has replied or moved the status. The
  // empty state names the other tab for a first-time merchant, and the
  // PageHeader's "Raise a ticket" button is on screen either way.
  const [tab, setTab] = useState<QueriesTab>("tickets");

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(EMPTY_DATE_RANGE);
  const [topicFilter, setTopicFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const [detailTicket, setDetailTicket] = useState<SupportTicket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Built from the tickets present, not from the full classification list —
  // and off the raw `cf_issue`, so a ticket an agent filed under an internal
  // issue is still filterable. `issueLabel` falls back to the raw value.
  const topicOptions = useMemo<FilterChipOption[]>(() => {
    const seen = new Set<string>();
    for (const ticket of tickets) {
      const issue = ticket.custom_fields?.cf_issue;
      if (issue) seen.add(issue);
    }
    return [...seen]
      .map((issue) => ({ value: issue, label: issueLabel(issue) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const floor = dateRange.from ? toStartOfDayMs(dateRange.from) : null;
    const ceiling = dateRange.to ? toEndOfDayMs(dateRange.to) : null;
    const query = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (floor !== null || ceiling !== null) {
        const created = createdAtMs(ticket);
        // A ticket with no usable timestamp is kept rather than hidden: the
        // API document never confirms `created_at` on the list response, and
        // silently filtering away every ticket would look like data loss.
        if (created !== null) {
          if (floor !== null && created < floor) return false;
          if (ceiling !== null && created > ceiling) return false;
        }
      }

      const issue = ticket.custom_fields?.cf_issue ?? "";
      if (topicFilter.length > 0 && !topicFilter.includes(issue)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(String(ticket.status))) return false;

      if (query) {
        const haystack = [
          ticket.subject,
          String(ticket.id),
          issue,
          ticket.custom_fields?.cf_category ?? "",
          ticket.description_text ?? ticket.description ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [tickets, dateRange, topicFilter, statusFilter, search]);

  const openTicket = (ticket: SupportTicket) => {
    setDetailTicket(ticket);
    setDrawerOpen(true);
  };

  // An onboarding user has no support desk to reach from here (see
  // useSupportScope). Saying so beats a page of empty controls.
  if (isOnboardingUser) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 page-enter">
        <PageHeader
          title="My queries"
          subtitle="Raise a ticket, or track one you've already raised."
        />
        <Alert variant="info">
          <AlertDescription>
            Support tickets open up once your account finishes onboarding. In the meantime, your
            onboarding contact at PayGlocal is the fastest way to reach us.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 page-enter">
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

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 pt-3">
          <UnderlineTabs
            tabs={[
              { value: "raise", label: "Raise a ticket" },
              {
                value: "tickets",
                label: `My tickets${tickets.length > 0 ? ` (${tickets.length})` : ""}`,
              },
            ]}
            value={tab}
            onValueChange={(v) => setTab(v as QueriesTab)}
          />
        </div>

        {tab === "raise" ? (
          <div className="p-4">
            <RaiseTicketForm onRaised={() => setTab("tickets")} />
          </div>
        ) : isError ? (
          <div className="p-4">
            <Alert variant="warning">
              <AlertDescription>
                We couldn&apos;t load your tickets just now. Please refresh to try again.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <TicketList
            tickets={filteredTickets}
            totalCount={tickets.length}
            isLoading={isLoading}
            topicOptions={topicOptions}
            search={search}
            onSearchChange={setSearch}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            topicFilter={topicFilter}
            onTopicFilterChange={setTopicFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onOpenTicket={openTicket}
          />
        )}
      </div>

      <TicketDetailDrawer row={detailTicket} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
