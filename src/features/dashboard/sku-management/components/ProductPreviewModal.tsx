"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Avatar,
  AvatarFallback,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerTitle,
  IconButton,
  ProgressIndicator,
  Shimmer,
  useBreakpoint,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import {
  SKU_PRICE_LOCALE,
  SKU_TYPE_LABEL,
} from "@/features/dashboard/sku-management/constants";
import type { SkuProduct } from "@/features/dashboard/sku-management/types";

/** Horizontal distance a touch has to travel before it counts as a swipe
 *  rather than a tap that drifted. */
const SWIPE_THRESHOLD_PX = 40;

/** Intrinsic size handed to next/image. The frame's real size comes from
 *  aspect-square plus the modal width; this only tells the optimiser which
 *  resize to serve. */
const PREVIEW_IMAGE_SIZE = 560;

/**
 * The product's images as a square carousel — the modal's dominant element.
 * Always 1:1, never distorted, and static when there's only one image.
 */
function PreviewMedia({ product }: { product: SkuProduct }) {
  const images = product.images ?? [];
  const count = images.length;
  const [index, setIndex] = useState(0);
  // Per-image, so paging to a new one shows its own skeleton rather than
  // inheriting the previous image's resolved state.
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const touchStartXRef = useRef<number | null>(null);

  // Clamped rather than trusted: guards against an index left over from a
  // longer gallery if this instance is ever reused for another item.
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const active = images[safeIndex];

  const goTo = (next: number) => {
    // Wraps both ways, so the last image steps forward to the first and the
    // first steps back to the last.
    setIndex(((next % count) + count) % count);
    setStatus("loading");
  };

  return (
    /*
      aspect-square with w-full is what makes this a true 1:1 frame at every
      width: height derives from the rendered width rather than a fixed px
      value, so the square holds as the modal resizes. It's also what prevents
      layout shift — the box is sized before any image loads, and the skeleton,
      the photo, and the fallback all fill this same frame.

      `group` drives the arrow reveal below. rounded-xl is the frame radius used
      across this page.
    */
    <div
      className="group relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-white"
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const startX = touchStartXRef.current;
        touchStartXRef.current = null;
        if (startX === null || count < 2) return;
        const deltaX = (e.changedTouches[0]?.clientX ?? startX) - startX;
        if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
        // Dragging left moves forward, the direction the content travels.
        goTo(safeIndex + (deltaX < 0 ? 1 : -1));
      }}
    >
      {active && status !== "error" ? (
        <>
          {/* Sits under the image at the same size, so the frame is never empty
              while the file is in flight and nothing moves when it arrives. */}
          {status === "loading" && (
            <Shimmer className="absolute inset-0 h-full w-full" rounded="lg" />
          )}
          <Image
            // Keyed by src so switching images remounts and fires onLoad again
            // — without it a cached second image can leave the skeleton up.
            key={active}
            src={active}
            alt={`${product.name} image ${safeIndex + 1} of ${count}`}
            width={PREVIEW_IMAGE_SIZE}
            height={PREVIEW_IMAGE_SIZE}
            // Images added through the item form are object URLs, which the
            // optimiser can't fetch — it resolves sources server-side and a
            // blob: URL only exists in the tab that minted it.
            unoptimized={active.startsWith("blob:")}
            onLoad={() => setStatus("ready")}
            onError={() => setStatus("error")}
            // cover + center: portrait, landscape, and square sources all fill
            // the frame and crop from the middle rather than stretching.
            className={cn(
              "h-full w-full object-cover object-center transition-opacity duration-200",
              status === "ready" ? "opacity-100" : "opacity-0"
            )}
          />
        </>
      ) : (
        // Covers both "no artwork" and "the file failed to load" — the frame
        // keeps its size and shows the item's type glyph either way, rather
        // than collapsing. Same Avatar placeholder the Product column uses.
        <Avatar className="h-full w-full rounded-none border-0">
          <AvatarFallback className="rounded-none bg-muted text-muted-foreground">
            <Icon name={product.type === "GOODS" ? "package" : "wrench"} className="h-10 w-10" />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Neither control renders for a single image, which needs no
          navigation. Arrows are the desktop affordance, hover-revealed; touch
          is served by swipe and by the indicator below. */}
      {count > 1 && (
        <>
          <IconButton
            type="button"
            aria-label="Previous image"
            variant="secondary"
            size="sm"
            onClick={() => goTo(safeIndex - 1)}
            className="absolute top-1/2 left-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
          </IconButton>
          <IconButton
            type="button"
            aria-label="Next image"
            variant="secondary"
            size="sm"
            onClick={() => goTo(safeIndex + 1)}
            className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Icon name="chevron-right" className="h-4 w-4" />
          </IconButton>

          {/* Overlaid on the frame's bottom edge rather than placed beneath it,
              so the indicator costs the 1:1 box no height. The translucent pill
              keeps it legible over a photo of any colour. */}
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <div className="rounded-full bg-background/80 px-2 py-1 shadow-sm backdrop-blur-sm">
              <ProgressIndicator
                aria-label={`${product.name} images`}
                size="sm"
                values={images.map((_, i) => `Image ${i + 1}`)}
                selectedIndex={safeIndex}
                onChange={goTo}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** One price, label above value. `lead` carries the selling price, which is
 *  the figure this preview exists to confirm; the cost trails it a size down
 *  and muted, so the two read as headline and support. */
function PriceBlock({
  label,
  amount,
  currency,
  lead = false,
}: {
  label: string;
  amount: number;
  currency: SkuProduct["currency"];
  lead?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 tabular-nums whitespace-nowrap",
          lead
            ? "text-[18px] leading-tight font-semibold tracking-tight text-foreground"
            : "text-[14px] leading-tight font-medium text-muted-foreground"
        )}
      >
        {formatCurrency(amount, currency, SKU_PRICE_LOCALE)}
      </p>
    </div>
  );
}

function PreviewBody({ product }: { product: SkuProduct }) {
  const hasDescription = product.description.trim().length > 0;

  return (
    // One padded card: media, then information, then description. Separation
    // is spacing alone — no rules between the bands.
    <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
      <PreviewMedia product={product} />

      {/* Name and metadata left, pricing right where there's room. Wrapping
          (not scrolling) is what keeps narrow widths from overflowing: the
          price block drops below the metadata instead. */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {/* Strongest text below the image. */}
          <h2 className="truncate text-[18px] leading-tight font-semibold tracking-tight text-foreground">
            {product.name}
          </h2>
          {/* Type and tax code as one quiet supporting line, well below the
              name and the selling price in the hierarchy. */}
          <p className="mt-1 text-[12px] text-muted-foreground">
            {SKU_TYPE_LABEL[product.type]}
            <span aria-hidden className="px-1.5">
              ·
            </span>
            HSN/SAC {product.hsnSac}
          </p>
        </div>

        <div className="flex shrink-0 items-start gap-5">
          <PriceBlock
            label="Selling price"
            amount={product.sellingPrice}
            currency={product.currency}
            lead
          />
          <PriceBlock
            label="Product cost"
            amount={product.productCost}
            currency={product.currency}
          />
        </div>
      </div>

      {/* Omitted entirely when there isn't one, rather than leaving a labelled
          blank. */}
      {hasDescription && (
        <div className="mt-4">
          <p className="text-[11px] font-medium text-muted-foreground">Description</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        </div>
      )}
    </div>
  );
}

interface ProductPreviewModalProps {
  /** The item being previewed, or null when nothing is. Driving both the
   *  content and the open state from one value means the modal can never
   *  render a stale product mid-close. */
  product: SkuProduct | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Read-only preview of one SKU, opened by clicking anywhere on its table row.
 *
 * Deliberately carries no actions, no form controls, and no save: Edit,
 * Archive, and Delete stay on the row's overflow menu, so there is one home
 * for them and this stays a look-don't-touch view. Closing is the modal's own
 * close button, Escape, or a click outside — flux's Dialog/Drawer behaviour,
 * unmodified.
 */
export function ProductPreviewModal({ product, onOpenChange }: ProductPreviewModalProps) {
  const { isMobile } = useBreakpoint();
  const open = product !== null;

  // Remounts per item so the carousel's position resets rather than carrying
  // over to the next product previewed.
  const body = product ? <PreviewBody key={product.id} product={product} /> : null;

  // The name is the card's own primary text, so the accessible title is
  // hidden rather than repeated in a header bar — which is also what lets the
  // media sit flush at the top, as the reference shows.
  const title = product?.name ?? "Product preview";

  // Drawer on mobile, Dialog above — the same responsive pairing the item form
  // and UploadInvoiceModal use.
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} side="bottom">
        <DrawerContent className="flex max-h-[92vh] flex-col rounded-t-2xl p-0">
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 30rem keeps the 1:1 media around 440px: dominant, but leaving the
          information and description on screen without the modal running tall.
          A wider modal would make the square the whole viewport. */}
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,46rem)] w-[min(100%-1.5rem,30rem)] max-w-none flex-col",
          "gap-0 overflow-hidden rounded-2xl p-0"
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
}
