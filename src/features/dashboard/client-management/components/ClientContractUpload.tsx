"use client";

import { useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import {
  CLIENT_CONTRACT_ACCEPTED_MIME_TYPES,
  CLIENT_CONTRACT_MAX_SIZE_BYTES,
} from "@/features/dashboard/client-management/constants";

interface ClientContractUploadProps {
  id: string;
  value: { name: string; size?: number; file?: File } | null;
  onChange: (next: { name: string; size?: number; file?: File } | null) => void;
  /**
   * Opens the contract already stored against this client. Passed only when there
   * is one: the URL is a presigned GET fetched at the moment of the click, so
   * there is nothing to offer for a file that has not been saved yet.
   */
  onViewStored?: () => void;
  /** Removes the stored contract server-side. Distinct from clearing the field:
   *  clearing a just-picked file needs no call, deleting a saved one does. */
  onRemoveStored?: () => void;
}

/**
 * The contract attachment on the Add client form.
 *
 * flux-ui ships no file-upload component (its exports carry inputs, selects,
 * and the rest, but nothing for files), so this follows the upload idiom the
 * product already has — a visually-hidden file input behind a click/drag
 * surface, with the accepted file shown as a compact row and validation
 * messages beneath — exactly as InvoiceDropzone and SkuMediaUpload do. Every
 * visible control is a flux component; what's assembled here is the
 * arrangement, not a new one of those.
 *
 * Single-file, unlike SkuMediaUpload's gallery: a client has one contract, and
 * choosing another replaces it. The picked File is handed up alongside its name
 * and size, because the upload happens after the client is saved — a contract can
 * only be attached to a client that already exists — so the form has to keep hold
 * of the bytes until then (see useClientContractUpload).
 */
export function ClientContractUpload({
  id,
  value,
  onChange,
  onViewStored,
  onRemoveStored,
}: ClientContractUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openFileDialog = () => inputRef.current?.click();

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (!(CLIENT_CONTRACT_ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Contracts must be a PDF or Word document.");
      return;
    }
    if (file.size > CLIENT_CONTRACT_MAX_SIZE_BYTES) {
      setError(`The contract must be under ${formatFileSize(CLIENT_CONTRACT_MAX_SIZE_BYTES)}.`);
      return;
    }
    setError(null);
    onChange({ name: file.name, size: file.size, file });
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={CLIENT_CONTRACT_ACCEPTED_MIME_TYPES.join(",")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Cleared so re-picking the same file still fires a change event.
          e.target.value = "";
          acceptFile(file);
        }}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />

      {value ? (
        // Populated: name and size on one compact row, with replace and remove
        // as its two actions — the same treatment the Transaction Details
        // page's uploaded-invoice row gets.
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <Icon name="file-text" className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-foreground">{value.name}</p>
            {/* Size only when we know it — a file picked in this session. A
                contract loaded from the server has none: the API's contract
                object carries a filename and an id but no size, so the line is
                dropped rather than showing a zero or a dash under every stored
                document. */}
            {value.size !== undefined ? (
              <p className="text-[11px] text-muted-foreground">{formatFileSize(value.size)}</p>
            ) : null}
          </div>
          {onViewStored ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onViewStored}
              className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
            >
              View
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openFileDialog}
            className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
          >
            Replace
          </Button>
          <IconButton
            type="button"
            aria-label={`Remove ${value.name}`}
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(null);
              // A stored contract has to be deleted server-side; clearing the
              // field alone would leave it attached and the form showing nothing.
              onRemoveStored?.();
              onChange(null);
            }}
            className="shrink-0"
          >
            <Icon name="x" className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={openFileDialog}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openFileDialog();
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
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:bg-muted/50"
          )}
        >
          <Icon name="upload" className="h-4 w-4 text-muted-foreground" />
          <p className="text-[13px] font-medium text-foreground">
            Drag and drop the contract, or{" "}
            <span className="text-primary underline underline-offset-2">click to browse</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            PDF or Word, up to {formatFileSize(CLIENT_CONTRACT_MAX_SIZE_BYTES)}
          </p>
        </div>
      )}

      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}
