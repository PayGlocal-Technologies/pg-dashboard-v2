"use client";

import { useRef, useState } from "react";
import { AppImage as Image } from "@/components/common/AppImage";
import { Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import {
  SKU_IMAGE_ACCEPTED_MIME_TYPES,
  SKU_IMAGE_MAX_SIZE_BYTES,
} from "@/features/dashboard/sku-management/constants";
import type { SkuImageValue } from "@/features/dashboard/sku-management/types";

interface SkuMediaUploadProps {
  id: string;
  value: SkuImageValue | null;
  onChange: (next: SkuImageValue | null) => void;
  /**
   * The image already on the item when the form opened, if any.
   *
   * Discarding a *newly picked* file has to put the merchant back where they
   * started, and where they started was looking at this. Without it, clicking
   * the X after choosing a replacement would empty the slot and read as "the
   * saved image is gone", which is not something this form can do — see below.
   */
  savedImageUrl?: string;
}

/** Preview tile size — the same 70px the Product column uses, so what the
 *  merchant approves here is exactly what the table will show. */
const TILE = 70;

/**
 * The item's picture. One image, because that is what the catalogue stores:
 * the upload endpoint writes a single object per SKU and the row carries a
 * single `imageUrl`, so a second upload replaces the first. This used to accept
 * six and hold them as object URLs, five of which had nowhere to go.
 *
 * Follows InvoiceDropzone's arrangement — a visually-hidden file input driven
 * by a click/drag surface, with validation messages beneath — rather than
 * introducing a second upload idiom.
 *
 * **There is no remove.** The API has an upload endpoint and no delete, so a
 * saved image can be replaced but not taken away, and offering an X that
 * silently did nothing on save would be a lie. The X appears only over a file
 * the merchant has just picked and not yet saved, where it means "discard this
 * choice" and restores whatever was there before.
 */
export function SkuMediaUpload({ id, value, onChange, savedImageUrl }: SkuMediaUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only a freshly picked file carries one; a saved image is just a URL.
  const isPending = !!value?.file;

  const openFileDialog = () => inputRef.current?.click();

  const selectFile = (files: File[]) => {
    const file = files[0];
    if (!file) return;

    const typeOk = (SKU_IMAGE_ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type);
    if (!typeOk) {
      setError("Images must be PNG, JPG, WEBP, or AVIF.");
      return;
    }
    if (file.size > SKU_IMAGE_MAX_SIZE_BYTES) {
      setError(`The image must be under ${formatFileSize(SKU_IMAGE_MAX_SIZE_BYTES)}.`);
      return;
    }

    // The previous object URL is released here rather than on unmount: this is
    // the only place one stops being displayed, and a merchant cycling through
    // half a dozen candidates would otherwise leave all of them alive. Only the
    // ones this component minted are revoked — a saved image's URL is S3's.
    if (value?.file) URL.revokeObjectURL(value.url);

    setError(null);
    onChange({ url: URL.createObjectURL(file), name: file.name, file });
  };

  const discardPick = () => {
    if (value?.file) URL.revokeObjectURL(value.url);
    setError(null);
    // Back to the saved image if there was one, rather than to an empty slot:
    // discarding a replacement is not the same as deleting what it replaced.
    onChange(savedImageUrl ? { url: savedImageUrl, name: "Current image" } : null);
  };

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    },
    onDragLeave: () => setIsDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      selectFile(Array.from(e.dataTransfer.files ?? []));
    },
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={SKU_IMAGE_ACCEPTED_MIME_TYPES.join(",")}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          // Cleared so re-picking the same file still fires a change event.
          e.target.value = "";
          selectFile(files);
        }}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />

      {!value ? (
        // Empty state: the whole area is the drop target, matching
        // InvoiceDropzone's idle treatment.
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
          {...dropHandlers}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:bg-muted/50"
          )}
        >
          <Icon name="image" className="h-5 w-5 text-muted-foreground" />
          <p className="text-[13px] font-medium text-foreground">
            Drag and drop a product image, or{" "}
            <span className="text-primary underline underline-offset-2">click to browse</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            PNG, JPG, WEBP or AVIF, up to {formatFileSize(SKU_IMAGE_MAX_SIZE_BYTES)}
          </p>
        </div>
      ) : (
        // Populated state: the tile, with the one action that applies to it.
        <div
          {...dropHandlers}
          className={cn(
            "flex items-center gap-3 rounded-lg border-2 border-dashed p-2.5 transition-colors",
            isDragOver ? "border-primary bg-primary/5" : "border-border"
          )}
        >
          <div
            className="group relative shrink-0 overflow-hidden rounded-lg border border-border bg-white"
            style={{ width: TILE, height: TILE }}
          >
            <Image
              src={value.url}
              alt={value.name}
              width={TILE}
              height={TILE}
              // Never optimised, whichever state this is in. An object URL only
              // exists in this tab, so the optimiser cannot fetch it; a saved
              // image is a presigned S3 URL on a host next/image has no
              // remotePattern for, and one that expires in ten minutes besides.
              unoptimized
              className="h-full w-full object-cover"
            />

            {isPending && (
              <IconButton
                type="button"
                aria-label="Discard this image"
                variant="ghost"
                size="xs"
                onClick={discardPick}
                className={cn(
                  "absolute right-0.5 top-0.5 h-5 w-5 rounded-md bg-background/85 text-foreground",
                  "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                )}
              >
                <Icon name="x" className="h-3 w-3" />
              </IconButton>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">{value.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {isPending ? "Uploads when you save." : "Currently on this item."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={openFileDialog}
          >
            Replace
          </Button>
        </div>
      )}

      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}
