"use client";

import { Badge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import { bodyText } from "@/features/dashboard/support-tickets/helper";
import { TicketAttachmentChip } from "@/features/dashboard/support-tickets/components/TicketAttachmentChip";
import type { TicketConversationEntry } from "@/features/dashboard/support-tickets/types";

/**
 * A ticket's reply thread, oldest first.
 *
 * Deliberately a sibling of `ConversationThread` (mca-transactions) rather
 * than a reuse of it: that component's props are `FrmConversationEntry` —
 * an `authorType` enum and attachments keyed by `fileUUID` for a download
 * endpoint. Freshdesk has none of those; it has `incoming`, and attachments
 * that are already pre-signed URLs. Mapping one onto the other would have
 * meant smuggling a URL through a field named `fileUUID`. The visual language
 * is kept identical on purpose, so the two threads read as one pattern; if a
 * third appears, that is the point to extract a shared presentational
 * component with a normalised entry type.
 *
 * Private entries never arrive here — `useTicketConversations` drops them, per
 * the API reference's filtering rule.
 */

/**
 * The reply's readable text.
 *
 * `body_text` is Freshdesk's plain-text twin of the HTML `body`, but the
 * backend's DTOs do not reliably carry the `_text` variants — the ticket list
 * drops `description_text` entirely — so the HTML field is the fallback,
 * flattened. Either way the result is rendered as a text node, never as
 * markup.
 */
function entryText(entry: TicketConversationEntry): string {
  return bodyText(entry.body_text, entry.body);
}

export function TicketConversation({ entries }: { entries: TicketConversationEntry[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => {
        // `incoming: true` is the merchant's own message, which reached
        // Freshdesk by email; `false` is an agent replying.
        const isMerchant = entry.incoming;
        const text = entryText(entry);
        const attachments = entry.attachments ?? [];

        return (
          <li
            key={entry.id}
            className={cn(
              "rounded-xl border border-border px-3.5 py-3",
              isMerchant ? "bg-primary/5" : "bg-card"
            )}
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={isMerchant ? "default" : "secondary"} size="sm">
                {isMerchant ? "You" : "PayGlocal Support"}
              </Badge>
              <span className="ml-auto whitespace-nowrap text-[11px] text-muted-foreground">
                {formatTransactionTimestamp(entry.created_at)}
              </span>
            </div>

            {text ? (
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                {text}
              </p>
            ) : (
              // A reply that is only an attachment has no body text at all.
              attachments.length === 0 && (
                <p className="text-[13px] italic text-muted-foreground">No message</p>
              )
            )}

            {attachments.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-2">
                {attachments.map((attachment) => (
                  <TicketAttachmentChip key={attachment.id} attachment={attachment} />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
