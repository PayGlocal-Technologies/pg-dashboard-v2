"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import {
  SKU_IMAGE_ACCEPTED_MIME_TYPES,
  SKU_IMAGE_MAX_SIZE_BYTES,
  SKU_MAX_IMAGES,
} from "@/features/dashboard/sku-management/constants";
import type { SkuMediaItem } from "@/features/dashboard/sku-management/types";

interface SkuMediaUploadProps {
  id: string;
  value: SkuMediaItem[];
  onChange: (next: SkuMediaItem[]) => void;
}

/** Preview tile size — the same 70px the Product column uses, so what the
 *  merchant approves here is exactly what the table will show. */
const TILE = 70;

/**
 * Product images for the item form. Follows InvoiceDropzone's arrangement (a
 * visually-hidden file input driven by a click/drag surface, with validation
 * messages rendered beneath) rather than introducing a second upload idiom,
 * but holds a list instead of a single file: the first image is the item's
 * primary one and the rest are its gallery.
 *
 * Previews are local object URLs. There is no media endpoint yet, so nothing
 * is uploaded anywhere — the URLs are handed to the catalogue row as-is and
 * survive as long as the page does. Swapping in a real upload means replacing
 * `addFiles` below with the call that returns hosted URLs; nothing else here
 * or downstream changes.
 */
export function SkuMediaUpload({ id, value, onChange }: SkuMediaUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Object URLs are minted in event handlers, never during render, so ids can
  // come from a counter rather than Math.random/Date.now — both of which are
  // barred during render and pointless to reach for here anyway.
  const nextIdRef = useRef(0);

  const atCapacity = value.length >= SKU_MAX_IMAGES;

  const openFileDialog = () => inputRef.current?.click();

  const addFiles = (files: File[]) => {
    if (!files.length) return;

    const room = SKU_MAX_IMAGES - value.length;
    const accepted: SkuMediaItem[] = [];
    let rejection: string | null = null;

    for (const file of files) {
      if (accepted.length >= room) {
        rejection = `You can add up to ${SKU_MAX_IMAGES} images.`;
        break;
      }
      const typeOk = (SKU_IMAGE_ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type);
      if (!typeOk) {
        rejection = "Images must be PNG, JPG, WEBP, or AVIF.";
        continue;
      }
      if (file.size > SKU_IMAGE_MAX_SIZE_BYTES) {
        rejection = `Each image must be under ${formatFileSize(SKU_IMAGE_MAX_SIZE_BYTES)}.`;
        continue;
      }
      accepted.push({
        id: `sku-media-${nextIdRef.current++}`,
        url: URL.createObjectURL(file),
        name: file.name,
      });
    }

    setError(rejection);
    if (accepted.length) onChange([...value, ...accepted]);
  };

  const handleRemove = (item: SkuMediaItem) => {
    // Released as soon as the tile goes, so a long editing session doesn't
    // accumulate object URLs for images the merchant already discarded. Only
    // safe because a removed image is gone from `value` in the same tick, so
    // nothing can still be pointing at it.
    URL.revokeObjectURL(item.url);
    setError(null);
    onChange(value.filter((image) => image.id !== item.id));
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept={SKU_IMAGE_ACCEPTED_MIME_TYPES.join(",")}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          // Cleared so re-picking the same file still fires a change event.
          e.target.value = "";
          addFiles(files);
        }}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />

      {value.length === 0 ? (
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
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            addFiles(Array.from(e.dataTransfer.files ?? []));
          }}
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
            Drag and drop product images, or{" "}
            <span className="text-primary underline underline-offset-2">click to browse</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            PNG, JPG, WEBP or AVIF, up to {formatFileSize(SKU_IMAGE_MAX_SIZE_BYTES)} each
          </p>
        </div>
      ) : (
        // Populated state: a strip of square previews with the add tile
        // trailing them, so adding more never moves the images already there.
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            addFiles(Array.from(e.dataTransfer.files ?? []));
          }}
          className={cn(
            "flex flex-wrap gap-2 rounded-lg border-2 border-dashed p-2.5 transition-colors",
            isDragOver ? "border-primary bg-primary/5" : "border-border"
          )}
        >
          {value.map((image, index) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-white"
              style={{ width: TILE, height: TILE }}
            >
              <Image
                src={image.url}
                alt={image.name}
                width={TILE}
                height={TILE}
                // Object URLs can't go through the image optimiser — it fetches
                // by URL server-side and a blob: URL only exists in this tab.
                unoptimized
                className="h-full w-full object-cover"
              />

              {/* The primary marker earns its place only on the first tile,
                  which is the whole rule: images[0] is what the table shows. */}
              {index === 0 && (
                <span className="absolute inset-x-0 bottom-0 bg-foreground/70 py-0.5 text-center text-[9px] font-semibold tracking-wide text-background">
                  PRIMARY
                </span>
              )}

              <IconButton
                type="button"
                aria-label={`Remove ${image.name}`}
                variant="ghost"
                size="xs"
                onClick={() => handleRemove(image)}
                className={cn(
                  "absolute right-0.5 top-0.5 h-5 w-5 rounded-md bg-background/85 text-foreground",
                  "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                )}
              >
                <Icon name="x" className="h-3 w-3" />
              </IconButton>
            </div>
          ))}

          {!atCapacity && (
            <Button
              type="button"
              variant="outline"
              onClick={openFileDialog}
              aria-label="Add another image"
              className="h-auto min-h-0 flex-col gap-0 border-dashed p-0 text-muted-foreground hover:text-foreground"
              style={{ width: TILE, height: TILE }}
            >
              <Icon name="plus" className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {error ? (
        <p className="text-[12px] text-destructive">{error}</p>
      ) : value.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          First image is used as the product image. {value.length} of {SKU_MAX_IMAGES} added.
        </p>
      ) : null}
    </div>
  );
}
