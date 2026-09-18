"use client";

import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import type { TicketAttachment } from "@/features/dashboard/support-tickets/types";

/**
 * One file already on a ticket or on a reply.
 *
 * Shared by the drawer (the files the merchant raised the ticket with) and the
 * conversation thread (files on a reply), because they are the same Freshdesk
 * attachment object and should not read as two different things.
 *
 * `size` is rendered only when present, and that is not defensiveness for its
 * own sake: the ticket-detail endpoint returns it, the conversations endpoint
 * does not. Formatting an absent one put "NaN MB" under a filename.
 */
export function TicketAttachmentChip({ attachment }: { attachment: TicketAttachment }) {
  const extension = attachment.name.split(".").pop()?.toUpperCase() ?? "";
  const href = attachment.attachment_url ?? "";
  const meta = [extension, attachment.size ? formatFileSize(attachment.size) : ""]
    .filter(Boolean)
    .join(" · ");

  const inner = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon name="file-text" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-foreground">
          {attachment.name}
        </span>
        {meta && <span className="block text-[11px] text-muted-foreground">{meta}</span>}
      </span>
    </>
  );

  const shell =
    "flex w-full max-w-sm items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2 text-left";

  // Freshdesk's attachment URLs are pre-signed and expire (the ones on a ticket
  // carry a 300s X-Amz-Expires). Without one there is nothing to link to, so the
  // chip stays a label rather than becoming a link that 403s.
  if (!href) {
    return (
      <div className={cn(shell, "opacity-70")} title="This attachment is no longer available">
        {inner}
      </div>
    );
  }

  return (
    // Bare <a>, not flux-ui's <Link>: this renders as a file card rather than
    // inline text, which linkVariants has no variant for, and a real anchor
    // keeps middle-click and "save link as" working.
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
