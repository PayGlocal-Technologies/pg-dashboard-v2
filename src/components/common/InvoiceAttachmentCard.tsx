"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatFileSize } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export interface InvoiceAttachmentCardProps {
  fileName: string;
  /** Omitted wherever the caller only has a file name to go on (e.g. the
   *  settlement timeline, whose upload event never carries a size). The
   *  size text is left out entirely rather than showing a made-up figure. */
  fileSizeBytes?: number;
  onDownload: () => void;
  className?: string;
}

/**
 * A full-width bordered row for a single uploaded file: static filename +
 * size on the left, one "Download invoice" button (icon + label together)
 * on the right. Not tied to any one screen; every prop needed to render or
 * trigger a download is passed in, so this drops into any transaction/hold
 * detail view that shows an invoice attachment.
 */
export function InvoiceAttachmentCard({
  fileName,
  fileSizeBytes,
  onDownload,
  className,
}: InvoiceAttachmentCardProps) {
  return (
    // rounded-xl: the same corner radius Card (and every other bordered
    // content surface in the design system) uses, rather than a bespoke
    // pill shape.
    <div
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-muted px-5 py-2.5",
        className
      )}
    >
      {/* Static, non-interactive: min-w-0 + truncate lets the filename
          ellipsize instead of wrapping or pushing the download action out
          of the pill's single row. */}
      <span className="flex min-w-0 flex-1 items-baseline gap-3">
        <span className="truncate text-[13px] font-medium text-muted-foreground">{fileName}</span>
        {fileSizeBytes != null && (
          <span className="shrink-0 text-[13px] text-muted-foreground">
            {formatFileSize(fileSizeBytes)}
          </span>
        )}
      </span>

      {/* One Button, icon and label together as a single unit, rather than
          a plain-text label beside a separately-styled icon box.
          hover:bg-accent overrides ghost's own default hover:bg-muted,
          which would be invisible against this row's own bg-muted surface,
          the same swap Header.tsx's own ghost buttons make when they sit on
          a muted background. cursor-pointer: flux-ui's Button carries no
          cursor override of its own, and Tailwind v4's preflight resets
          buttons to the browser's plain cursor: default rather than
          pointer, so this needs to be set explicitly. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDownload}
        aria-label={`Download ${fileName}`}
        leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
        className="h-auto min-h-0 shrink-0 gap-1.5 px-3 py-1.5 text-[13px] font-medium hover:bg-accent cursor-pointer"
      >
        Download invoice
      </Button>
    </div>
  );
}
