"use client";

import { Badge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import { bodyText } from "@/features/dashboard/support-tickets/helper";
import type {
  TicketAttachment,
  TicketConversationEntry,
} from "@/features/dashboard/support-tickets/types";

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

function AttachmentChip({ attachment }: { attachment: TicketAttachment }) {
  const extension = attachment.name.split(".").pop()?.toUpperCase() ?? "";
  const href = attachment.attachment_url ?? "";

  const inner = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon name="file-text" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-foreground">
          {attachment.name}
        </span>
        {extension && <span className="block text-[11px] text-muted-foreground">{extension}</span>}
      </span>
    </>
  );

  const shell =
    "flex w-full max-w-sm items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2 text-left";

  // Freshdesk's attachment URLs are pre-signed and expire. Without one there
  // is nothing to link to, so the chip stays as a label rather than becoming
  // a link that 403s.
  if (!href) {
    return (
      <div className={cn(shell, "opacity-70")} title="This attachment is no longer available">
        {inner}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${attachment.name}`}
      className={cn(shell, "transition-colors hover:bg-muted")}
    >
      {inner}
      <Icon name="download" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
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
                  <AttachmentChip key={attachment.id} attachment={attachment} />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
