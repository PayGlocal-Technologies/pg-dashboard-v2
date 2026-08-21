"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Slider,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage as Image } from "@/components/common/AppImage";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ".png,.jpg,.jpeg";
/** Side of the square export, in device pixels. */
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Pick a logo, then frame it.
 *
 * Why this exists rather than a bare file input: the logo asset is stored per
 * merchant, not per invoice, so replacing it changes every invoice raised from
 * here afterwards. A wide wordmark uploaded raw is then letterboxed into a
 * square slot on every one of them, and the only fix is to re-upload. Framing
 * before the upload is therefore worth a dialog.
 *
 * The crop is applied client-side and the *cropped* square is what uploads, so
 * nothing downstream has to know this screen exists: `useInvoiceAsset().upload`
 * receives an ordinary File, exactly as it does from the plain picker.
 *
 * Pan is a pointer drag on the image; zoom is a flux Slider. The stage is a
 * plain <div> because it is a structural drag surface with no flux equivalent —
 * the escape hatch CLAUDE.md allows, for the reason given there.
 */
export function LogoUploadDialog({
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
        <CropBody
          // Remount per open so a previous image, zoom and offset never persist
          // into the next upload.
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

function CropBody({
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
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragOrigin = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isRendering, setIsRendering] = useState(false);
  /** True once the off-DOM image has decoded and can be drawn to a canvas. */
  const [imageReady, setImageReady] = useState(false);

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
    const url = URL.createObjectURL(next);

    setObjectUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImageReady(false);

    /**
     * An off-DOM image, decoded once, used for two things: its intrinsic size
     * and as the source `drawImage` reads from.
     *
     * Deliberately not a ref onto the rendered <AppImage>: that component does
     * not forward one, and making it do so to serve this dialog would change a
     * component every screen in the app uses. Decoupling also means the crop
     * maths depends on the image itself rather than on how Next chose to render
     * it. Constructed in an event handler, never during render.
     */
    const decoded = new window.Image();
    decoded.onload = () => {
      imageRef.current = decoded;
      setImageReady(true);
    };
    decoded.onerror = () => {
      toast.error(`Couldn't read that ${label.toLowerCase()}`, {
        description: "The file may be corrupt. Try another image.",
      });
    };
    decoded.src = url;
  };

  /**
   * Keeps the image covering the frame.
   *
   * At zoom 1 the image exactly fills the square (object-fit: cover), so there
   * is nothing to pan and the offset must stay at 0. Every step of zoom past
   * that frees up (zoom - 1) / 2 of the frame in each direction. Clamping here
   * rather than on drag means a zoom-out can never leave the image parked
   * off-centre with a transparent wedge in the corner.
   */
  const clampOffset = useCallback(
    (next: { x: number; y: number }, atZoom: number) => {
      const stage = stageRef.current?.clientWidth ?? 0;
      const limit = (stage * (atZoom - 1)) / 2;
      return {
        x: Math.max(-limit, Math.min(limit, next.x)),
        y: Math.max(-limit, Math.min(limit, next.y)),
      };
    },
    []
  );

  const handleZoom = (next: number) => {
    setZoom(next);
    setOffset((current) => clampOffset(current, next));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!objectUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOrigin.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current;
    if (!origin) return;
    setOffset(
      clampOffset(
        {
          x: origin.offsetX + (event.clientX - origin.x),
          y: origin.offsetY + (event.clientY - origin.y),
        },
        zoom
      )
    );
  };

  const endDrag = () => {
    dragOrigin.current = null;
  };

  /**
   * Renders the visible square to a canvas and hands back a File.
   *
   * The maths mirrors what CSS is doing on screen: `cover` scales the image so
   * its shorter side fills the stage, zoom multiplies that, and the offset
   * shifts it. Working in stage units and scaling once at the end (by
   * OUTPUT_SIZE / stage) keeps the exported crop identical to the preview at any
   * stage size.
   */
  const exportCrop = async () => {
    const image = imageRef.current;
    const stage = stageRef.current?.clientWidth ?? 0;
    if (!image || !imageReady || !stage) return;

    setIsRendering(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no 2d context");

      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;
      const cover = Math.max(stage / naturalWidth, stage / naturalHeight);
      const scale = cover * zoom * (OUTPUT_SIZE / stage);

      const drawWidth = naturalWidth * scale;
      const drawHeight = naturalHeight * scale;
      const ratio = OUTPUT_SIZE / stage;
      const drawX = (OUTPUT_SIZE - drawWidth) / 2 + offset.x * ratio;
      const drawY = (OUTPUT_SIZE - drawHeight) / 2 + offset.y * ratio;

      // A white ground, not transparency: the invoice document and the emailed
      // PDF are both white, and a transparent PNG of dark artwork disappears on
      // any viewer that composites onto a dark background.
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 0.95)
      );
      if (!blob) throw new Error("canvas produced no blob");

      // The extension matters: useInvoiceAsset reads it off the name to ask the
      // server for the right presigned URL.
      onUpload(new File([blob], `${label.toLowerCase()}.png`, { type: "image/png" }));
    } catch {
      toast.error(`Couldn't prepare the ${label.toLowerCase()}`, {
        description: "Try a different image.",
      });
    } finally {
      setIsRendering(false);
    }
  };

  const busy = isUploading || isRendering;

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
        <div className="space-y-4">
          <div
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="relative mx-auto aspect-square w-full max-w-[18rem] cursor-grab touch-none overflow-hidden rounded-xl border border-border bg-muted/30 active:cursor-grabbing"
          >
            <Image
              src={objectUrl}
              alt={`${label} being framed`}
              width={OUTPUT_SIZE}
              height={OUTPUT_SIZE}
              unoptimized
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none object-cover"
              style={{
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              }}
            />
          </div>

          <Field>
            <FieldLabel htmlFor="logo-zoom">Zoom</FieldLabel>
            <div className="flex items-center gap-3">
              <Icon name="zoom-out" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <Slider
                id="logo-zoom"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.05}
                value={[zoom]}
                onValueChange={([next]) => handleZoom(next ?? 1)}
                aria-label="Zoom"
                className="flex-1"
              />
              <Icon name="zoom-in" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </div>
            <FieldDescription>Drag the image to reposition it inside the frame.</FieldDescription>
          </Field>

          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => inputRef.current?.click()}
          >
            Choose a different image
          </Button>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!imageReady || busy}
          leftIcon={<Icon name="crop" className="h-3.5 w-3.5" />}
          onClick={exportCrop}
        >
          {busy ? "Uploading…" : `Use this ${label.toLowerCase()}`}
        </Button>
      </div>
    </div>
  );
}
