import type { BadgeVariant } from "@/components/ui";
import type { TicketStatus, TicketTopic } from "@/features/dashboard/support-tickets/types";

/** `StatusBadge`'s own trailIcon union — not re-exported from `@/components/ui`,
 *  so mirrored here rather than importing from the flux-ui package directly. */
type StatusBadgeTrailIcon = "check" | "x" | "refresh" | "clock" | "alert" | "arrow-right" | "info";

export const TICKET_TOPICS: { value: TicketTopic; label: string }[] = [
  { value: "SETTLEMENT_DELAYS", label: "Settlement delays" },
  { value: "TRANSACTION_RELATED", label: "Transaction-related" },
  { value: "VIRTUAL_ACCOUNTS", label: "Virtual accounts" },
  { value: "PLATFORM_WITHDRAWALS", label: "Platform withdrawals" },
  { value: "ACCOUNT_RELATED", label: "Account related" },
  { value: "OTHERS", label: "Others" },
];

export function ticketTopicLabel(topic: TicketTopic): string {
  return TICKET_TOPICS.find((t) => t.value === topic)?.label ?? topic;
}

export const TICKET_STATUSES: {
  value: TicketStatus;
  label: string;
  badgeVariant: BadgeVariant;
  trailIcon: StatusBadgeTrailIcon;
}[] = [
  { value: "OPEN", label: "Open", badgeVariant: "info", trailIcon: "clock" },
  { value: "IN_PROGRESS", label: "In progress", badgeVariant: "warning", trailIcon: "refresh" },
  { value: "RESOLVED", label: "Resolved", badgeVariant: "success", trailIcon: "check" },
  { value: "CLOSED", label: "Closed", badgeVariant: "muted", trailIcon: "x" },
];

export function ticketStatusMeta(status: TicketStatus) {
  return TICKET_STATUSES.find((s) => s.value === status) ?? TICKET_STATUSES[0];
}

/** The character cap on the optional "Others" subject line — short, since the
 *  real description belongs in Details. */
export const CUSTOM_SUBJECT_MAX_LENGTH = 80;
