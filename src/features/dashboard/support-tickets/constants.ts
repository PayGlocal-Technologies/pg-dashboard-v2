import type { BadgeVariant } from "@/components/ui";
import {
  TICKET_STATUS_CLOSED,
  TICKET_STATUS_OPEN,
  TICKET_STATUS_PENDING,
  TICKET_STATUS_RESOLVED,
} from "@/features/dashboard/support-tickets/types";

/** `StatusBadge`'s own trailIcon union — not re-exported from `@/components/ui`,
 *  so mirrored here rather than importing from the flux-ui package directly. */
type StatusBadgeTrailIcon = "check" | "x" | "refresh" | "clock" | "alert" | "arrow-right" | "info";

export interface TicketStatusMeta {
  label: string;
  badgeVariant: BadgeVariant;
  trailIcon: StatusBadgeTrailIcon;
}

/**
 * Freshdesk's four default statuses.
 *
 * "Pending" is Freshdesk's term for *waiting on the customer*, which is the
 * one status the merchant has to act on — hence the warning variant, where
 * "Open" (waiting on us) is merely informational.
 */
const STATUS_META: Record<number, TicketStatusMeta> = {
  [TICKET_STATUS_OPEN]: { label: "Open", badgeVariant: "info", trailIcon: "clock" },
  [TICKET_STATUS_PENDING]: {
    label: "Awaiting your reply",
    badgeVariant: "warning",
    trailIcon: "alert",
  },
  [TICKET_STATUS_RESOLVED]: { label: "Resolved", badgeVariant: "success", trailIcon: "check" },
  [TICKET_STATUS_CLOSED]: { label: "Closed", badgeVariant: "muted", trailIcon: "x" },
};

/**
 * A desk can define custom statuses beyond Freshdesk's four defaults, and the
 * API document does not enumerate them. An unrecognised code renders as
 * "Status <n>" rather than being silently mapped onto "Open" — a ticket
 * wrongly shown as Open is worse than one shown as unlabelled.
 */
export function ticketStatusMeta(status: number): TicketStatusMeta {
  return (
    STATUS_META[status] ?? {
      label: `Status ${status}`,
      badgeVariant: "muted",
      trailIcon: "info",
    }
  );
}

/** The four defaults, for the status filter chip. A ticket carrying a custom
 *  status simply will not match any of them. */
export const TICKET_STATUS_FILTER_OPTIONS = [
  TICKET_STATUS_OPEN,
  TICKET_STATUS_PENDING,
  TICKET_STATUS_RESOLVED,
  TICKET_STATUS_CLOSED,
].map((status) => ({ value: String(status), label: ticketStatusMeta(status).label }));

/** 1 Low … 4 Urgent. */
const PRIORITY_LABELS: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

export function ticketPriorityLabel(priority: number | null | undefined): string {
  if (!priority) return "";
  return PRIORITY_LABELS[priority] ?? `Priority ${priority}`;
}

// ─── Attachments ──────────────────────────────────────────────────────────────

/**
 * Freshdesk's own cap, and it is a cap on the request as a whole rather than
 * per file — which is why this is validated as a running total, not per pick.
 */
export const MAX_ATTACHMENT_TOTAL_BYTES = 20 * 1024 * 1024;

/** No API limit on the count; this is to keep the composer's file list from
 *  becoming the whole form. */
export const MAX_ATTACHMENTS = 10;

export const SUBJECT_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 5000;
