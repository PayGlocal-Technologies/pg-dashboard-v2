"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage as Image } from "@/components/common/AppImage";

/** Matches pg-dashboard's dragger: `.png,.jpg`, one file, 10MB. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ".png,.jpg,.jpeg";

/**
 * Pick a logo or signature, see it, upload it.
 *
 * The file that uploads is the file the merchant chose, byte for byte. This
 * screen used to crop and pan it into a 512px square first, on the reasoning
 * that the asset is stored per merchant and a letterboxed wordmark would then
 * appear on every future invoice. That reasoning was wrong about where the
 * decision belongs: pg-dashboard uploads the raw file, both apps write the same
 * merchant-level asset, and a v2 upload that silently re-rendered it to a square
 * PNG meant the same logo looked different depending on which dashboard it was
 * uploaded from. The preview does the honest version of the same job — it shows
 * what will print, before anything is sent.
 *
 * The preview is `object-contain` inside the slot's own aspect ratio, so a wide
 * wordmark reads as letterboxed here exactly as it will on the document.
 */
export function AssetUploadDialog({
  open,
  onOpenChange,
  label,
  isUploading,
  onUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "Logo" or "Signature" — this dialog serves both. */
  label: string;
  isUploading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Upload {label.toLowerCase()}</DialogTitle>
        <UploadBody
          // Remount per open so a previously chosen file never carries over.
          key={open ? "open" : "closed"}
          label={label}
          isUploading={isUploading}
          onCancel={() => onOpenChange(false)}
          onUpload={(file) => {
            onUpload(file);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function UploadBody({
  label,
  isUploading,
  onCancel,
  onUpload,
}: {
  label: string;
  isUploading: boolean;
  onCancel: () => void;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // A blob URL is a live handle into memory; without this the browser holds
  // every image the merchant auditioned until the tab closes.
  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl]
  );

  const pickFile = (next: File | undefined) => {
    if (!next) return;

    if (next.size > MAX_UPLOAD_BYTES) {
      toast.error(`${label} is too large`, { description: "Maximum size is 10MB." });
      return;
    }

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setFile(next);
    setObjectUrl(URL.createObjectURL(next));
  };

  return (
    <div className="mt-4">
      {/* No flux component wraps a file picker, so the native input is hidden
          behind a Button, which is the real interactive element. */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0])}
      />

      {!objectUrl ? (
        <Button
          type="button"
          variant="outline"
          className="h-36 w-full border-dashed"
          onClick={() => inputRef.current?.click()}
        >
          {/* One child carries the column: flux wraps a Button's children in a
              single plain <span>, so `flex-col` on the button never reaches
              them and the three would flow inline. */}
          <span className="flex flex-col items-center gap-1.5">
            <Icon name="image-plus" className="h-5 w-5 text-muted-foreground" />
            <span className="text-[13px] font-medium">Choose an image</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              .png or .jpg, max 10MB
            </span>
          </span>
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="mx-auto flex aspect-square w-full max-w-[14rem] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 p-3">
            <Image
              src={objectUrl}
              alt={`${label} preview`}
              width={512}
              height={512}
              // A blob URL cannot go through the image optimizer, and its
              // intrinsic size is unknown until it decodes, hence both props.
              unoptimized
              className="max-h-full w-auto object-contain"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[12px] text-muted-foreground">
              {file?.name}
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto shrink-0 p-0"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              Choose another
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={isUploading} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!file || isUploading}
          leftIcon={<Icon name="upload" className="h-3.5 w-3.5" />}
          onClick={() => file && onUpload(file)}
        >
          {isUploading ? "Uploading…" : `Upload ${label.toLowerCase()}`}
        </Button>
      </div>
    </div>
  );
}
