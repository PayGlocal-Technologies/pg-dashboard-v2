"use client";

import {
  Alert,
  AlertDescription,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  Shimmer,
  StatusBadge,
  useBreakpoint,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { cn } from "@/lib/utils";
import { bodyText } from "@/features/dashboard/support-tickets/helper";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import { categoryLabel, issueLabel } from "@/features/dashboard/support-tickets/classification";
import {
  ticketPriorityLabel,
  ticketStatusMeta,
} from "@/features/dashboard/support-tickets/constants";
import { TicketConversation } from "@/features/dashboard/support-tickets/components/TicketConversation";
import {
  useTicketConversations,
  useTicketDetail,
} from "@/features/dashboard/support-tickets/hooks";
import { type SupportTicket } from "@/features/dashboard/support-tickets/types";

function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-border px-3.5 py-3">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="mt-2 h-3.5 w-full" />
          <Shimmer className="mt-1.5 h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[12.5px] font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

/**
 * One ticket: its classification, the description it was raised with, and the
 * reply thread. Read-only by decision — the merchant raises a ticket here and
 * follows it here, but the conversation itself is carried on over email, where
 * Freshdesk's own notifications already take a merchant's reply back onto the
 * ticket as an incoming message.
 *
 * `row` is the ticket as the list already has it, and it renders immediately
 * while the detail call is in flight — a drawer that opens into a skeleton it
 * did not need reads as slower than it is. The detail response then takes over
 * (`ticket`), since the description may only be on that endpoint.
 */
export function TicketDetailDrawer({
  row,
  open,
  onOpenChange,
}: {
  row: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ticketId = row?.id ?? null;
  const { ticket: detail, isLoading: isDetailLoading } = useTicketDetail(open ? ticketId : null);
  const {
    conversations,
    isLoading: isThreadLoading,
    isError: isThreadError,
  } = useTicketConversations(open ? ticketId : null);
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");

  if (!row) return null;

  const ticket = detail ?? row;
  const statusMeta = ticketStatusMeta(ticket.status);
  // The live API returns `description` (HTML) and no `description_text` at
  // all, so reading only the latter showed "No description was recorded" on
  // every ticket. Both are tried, and the HTML one is flattened.
  const description = bodyText(ticket.description_text, ticket.description);
  const priority = ticketPriorityLabel(ticket.priority);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={isBottomSheet ? "bottom" : "right"}>
      <DrawerContent
        className={cn(
          "[&>button:last-child]:hidden",
          !isBottomSheet && "w-full sm:w-[36rem] sm:max-w-[94vw]"
        )}
      >
        <DrawerHeader className="flex shrink-0 flex-row items-start justify-between gap-2 py-3">
          <div className="min-w-0">
            <DrawerTitle className="truncate text-[15px]">{ticket.subject}</DrawerTitle>
            <div className="mt-1 flex items-center gap-2">
              {/* Copies the bare number: a merchant quoting a ticket to
                  support wants "53131", not "#53131". */}
              <CopyableText
                value={String(ticket.id)}
                displayValue={`#${ticket.id}`}
                valueClassName="text-muted-foreground"
                className="gap-0.5"
              />
              <StatusBadge
                variant={statusMeta.badgeVariant}
                label={statusMeta.label}
                trailIcon={statusMeta.trailIcon}
                size="sm"
              />
            </div>
          </div>
          <IconButton
            aria-label="Close"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-border bg-card p-4">
              <MetaField label="Raised on" value={formatTransactionTimestamp(ticket.created_at)} />
              <MetaField
                label="Last updated"
                value={formatTransactionTimestamp(ticket.updated_at)}
              />
              <MetaField label="Topic" value={issueLabel(ticket.custom_fields?.cf_issue)} />
              <MetaField
                label="Category"
                value={categoryLabel(ticket.custom_fields?.cf_category)}
              />
              {/* Every ticket is created at Low, so the field only earns its
                  space once the desk has actually raised it. */}
              {priority && priority !== "Low" && <MetaField label="Priority" value={priority} />}
            </div>

            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-foreground">What you told us</p>
              {description ? (
                <p className="whitespace-pre-wrap rounded-xl border border-border bg-card px-3.5 py-3 text-[13px] leading-relaxed text-foreground">
                  {description}
                </p>
              ) : isDetailLoading ? (
                <Shimmer className="h-16 w-full rounded-xl" />
              ) : (
                <p className="rounded-xl border border-border bg-card px-3.5 py-3 text-[13px] italic text-muted-foreground">
                  No description was recorded for this ticket.
                </p>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-foreground">Conversation</p>
              {isThreadLoading ? (
                <ThreadSkeleton />
              ) : isThreadError ? (
                <Alert variant="warning">
                  <AlertDescription>
                    We couldn&apos;t load the replies on this ticket. Please try again.
                  </AlertDescription>
                </Alert>
              ) : conversations.length > 0 ? (
                <TicketConversation entries={conversations} />
              ) : (
                <Alert variant="info">
                  <AlertDescription>
                    No replies yet. Our support team will respond here.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
