"use client";

import { useRef, useState } from "react";
import { Button, IconButton, Textarea } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  type UseQueryThreadResult,
} from "@/features/dashboard/mca-transactions/useQueryThread";

const MAX_COMMENT_LENGTH = 2000;

/**
 * Reply box shared by both query tabs: attachments first, then the message,
 * then Send. A comment is required — attachments alone carry no context for
 * whoever picks the query up — which is why Send stays disabled until one is
 * typed, and why files are uploaded as they are picked rather than on submit
 * (so Send is instant and a failed upload is reported against the file, not
 * the message).
 */
export function QueryComposer({ thread }: { thread: UseQueryThreadResult }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const atLimit = thread.attachments.length >= MAX_ATTACHMENTS;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    thread.addFiles(Array.from(fileList));
  };

  return (
    // A rule above the whole thing separates "what has been said" from "what
    // you are about to say" — without it the composer read as one more entry
    // in the thread.
    <div className="border-t border-border pt-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Attach, write and send are one composer, so they share a single
          bordered surface and are divided internally, rather than floating as
          three separate boxes with gaps between them. */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div
          role="button"
          tabIndex={0}
          aria-disabled={atLimit}
          onClick={() => !atLimit && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (atLimit) return;
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
            if (!atLimit) handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex items-center justify-center gap-2 px-3 py-2.5 text-center transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/35",
            atLimit
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
                PDF, PNG, JPG up to 10MB
              </>
            )}
          </span>
        </div>

        {thread.attachments.length > 0 && (
          <ul className="flex flex-col border-t border-border">
            {thread.attachments.map((attachment) => (
              <li key={attachment.fileUUID} className="flex items-center gap-2.5 px-3 py-1.5">
                {attachment.uploading ? (
                  <Icon name="loader" className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                ) : (
                  <Icon name="file-text" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
                  {attachment.fileName}
                </span>
                {attachment.uploading ? (
                  <span className="shrink-0 text-[11px] text-muted-foreground">Uploading…</span>
                ) : (
                  <IconButton
                    aria-label={`Remove ${attachment.fileName}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => thread.removeAttachment(attachment.fileUUID)}
                  >
                    <Icon name="x" className="h-3.5 w-3.5" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Borderless: the card already draws this field's edge, so its own
            border would box it off from the attach row it belongs with. */}
        <Textarea
          rows={3}
          value={thread.comment}
          maxLength={MAX_COMMENT_LENGTH}
          onChange={(e) => thread.setComment(e.target.value)}
          placeholder="Add a comment (required)"
          aria-label="Add a comment"
          className="resize-none rounded-none border-0 border-t border-border bg-transparent text-[13px] shadow-none focus-visible:ring-0"
        />

        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <span className="text-[11px] text-muted-foreground">
            {thread.comment.length}/{MAX_COMMENT_LENGTH}
          </span>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!thread.canSend}
            isLoading={thread.isSending}
            rightIcon={<Icon name="send" className="h-3.5 w-3.5" />}
            onClick={() => void thread.send()}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
