"use client";

import { Badge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatEpochDateTime } from "@/lib/utils/format";
import type { FrmConversationEntry } from "@/features/dashboard/mca-transactions/types";

// One query thread, oldest message first. Ops and compliance both surface as
// "PayGlocal Team" — the merchant has no use for the internal distinction —
// while the merchant's own messages are visually distinguished so a thread is
// scannable as a back-and-forth.

type AuthorType = FrmConversationEntry["authorType"];

const AUTHOR_ROLE: Record<
  AuthorType,
  { label: string; isMerchant: boolean; displayName?: string }
> = {
  GLOCAL: { label: "PayGlocal Team", isMerchant: false },
  OPS: { label: "PayGlocal Team", isMerchant: false, displayName: "PayGlocal" },
  MERCHANT: { label: "You", isMerchant: true },
};

function AttachmentChip({ fileName, onDownload }: { fileName: string; onDownload: () => void }) {
  const extension = fileName.split(".").pop()?.toUpperCase() ?? "";

  return (
    <button
      type="button"
      onClick={onDownload}
      aria-label={`Download ${fileName}`}
      className="flex w-full max-w-sm items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon name="file-text" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-foreground">{fileName}</span>
        {extension && <span className="block text-[11px] text-muted-foreground">{extension}</span>}
      </span>
      <Icon name="download" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function ConversationThread({
  entries,
  onDownload,
}: {
  entries: FrmConversationEntry[];
  onDownload: (fileUUID: string) => void;
}) {
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry, index) => {
        const role = AUTHOR_ROLE[entry.authorType] ?? {
          label: entry.authorType,
          isMerchant: false,
        };
        const author = role.displayName ?? entry.author;

        return (
          <li
            key={`${String(entry.creationTime)}-${index}`}
            className={cn(
              "rounded-xl border border-border px-3.5 py-3",
              role.isMerchant ? "bg-primary/5" : "bg-card"
            )}
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={role.isMerchant ? "default" : "secondary"} size="sm">
                {role.label}
              </Badge>
              {author && author !== role.label && (
                <span className="text-[12px] text-muted-foreground">{author}</span>
              )}
              <span className="ml-auto whitespace-nowrap text-[11px] text-muted-foreground">
                {formatEpochDateTime(entry.creationTime, "")}
              </span>
            </div>

            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
              {entry.message}
            </p>

            {entry.attachments?.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-2">
                {entry.attachments.map((attachment) => (
                  <AttachmentChip
                    key={attachment.fileUUID}
                    fileName={attachment.fileName}
                    onDownload={() => onDownload(attachment.fileUUID)}
                  />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
