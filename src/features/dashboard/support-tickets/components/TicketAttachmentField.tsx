"use client";

import { useRef, useState } from "react";
import { IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import { MAX_ATTACHMENTS } from "@/features/dashboard/support-tickets/constants";
import type { TicketAttachmentsState } from "@/features/dashboard/support-tickets/useTicketAttachments";

/**
 * Click-or-drag attach row plus the list of what has been picked, used when
 * raising a ticket. (The ticket drawer is read-only, so this is the only place
 * a merchant attaches anything.)
 *
 * The visual language is the transaction query composer's
 * (`QueryComposer`) — same paperclip row, same one-line file entries — because
 * a merchant who has attached a document to a transaction query should not
 * have to learn a second control here. What differs is the state behind it:
 * these files are held until submit, so an entry shows its size rather than an
 * upload spinner, and removal is instant.
 */
export function TicketAttachmentField({
  attachments,
  disabled = false,
  className,
}: {
  attachments: TicketAttachmentsState;
  disabled?: boolean;
  className?: string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const atLimit = attachments.picked.length >= MAX_ATTACHMENTS;
  const locked = disabled || atLimit;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    attachments.addFiles(Array.from(fileList));
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      {/* The only bare <input> here: no flux-ui component wraps a file picker,
          and it is visually hidden anyway — the row below is the control. */}
      {/* No `accept`: the support API restricts no file type, and Freshdesk is
          the authority on what it will take. An allowlist here also only ever
          half-worked, since `accept` filters the picker but not a dropped file,
          so the same attachment was refused one way and taken the other. */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          handleFiles(e.target.files);
          // Cleared so re-picking the same file fires onChange again.
          e.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        aria-disabled={locked}
        onClick={() => !locked && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (locked) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (!locked) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex items-center justify-center gap-2 px-3 py-2.5 text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/35",
          locked
            ? "cursor-not-allowed opacity-60"
            : isDragOver
              ? "cursor-pointer bg-primary/5"
              : "cursor-pointer hover:bg-muted/50"
        )}
      >
        <Icon name="paperclip" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">
          {atLimit ? (
            `Attachment limit reached (${MAX_ATTACHMENTS})`
          ) : (
            <>
              <span className="font-medium text-foreground">Click or drag files</span> to attach ·
              up to {MAX_ATTACHMENTS} files · 20MB total
            </>
          )}
        </span>
      </div>

      {attachments.picked.length > 0 && (
        <ul className="flex flex-col border-t border-border">
          {attachments.picked.map(({ id, file }) => (
            <li key={id} className="flex items-center gap-2.5 px-3 py-1.5">
              <Icon name="file-text" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
                {file.name}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <IconButton
                aria-label={`Remove ${file.name}`}
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => attachments.removeFile(id)}
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
