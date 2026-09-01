"use client";

import { useState } from "react";
import { AppImage as Image } from "@/components/common/AppImage";
import {
  Avatar,
  AvatarFallback,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerTitle,
  Shimmer,
  useBreakpoint,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { SKU_PRICE_LOCALE, SKU_TYPE_LABEL } from "@/features/dashboard/sku-management/constants";
import type { SkuProduct } from "@/features/dashboard/sku-management/types";

/** Intrinsic size handed to next/image. The frame's real size comes from
 *  aspect-square plus the modal width; this only tells the optimiser which
 *  resize to serve. */
const PREVIEW_IMAGE_SIZE = 560;

/**
 * The product's picture as a square, the modal's dominant element. Always 1:1
 * and never distorted.
 *
 * One image, not a carousel: the catalogue stores a single object per SKU, so
 * there is nothing to page through. The arrows, the swipe handling and the dot
 * indicator that used to live here were paging a gallery the API cannot hold.
 */
function PreviewMedia({ product }: { product: SkuProduct }) {
  const imageUrl = product.imageUrl;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  return (
    /*
      aspect-square with w-full is what makes this a true 1:1 frame at every
      width: height derives from the rendered width rather than a fixed px
      value, so the square holds as the modal resizes. It's also what prevents
      layout shift — the box is sized before any image loads, and the skeleton,
      the photo, and the fallback all fill this same frame.

      rounded-xl is the frame radius used across this page.
    */
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-white">
      {imageUrl && status !== "error" ? (
        <>
          {/* Sits under the image at the same size, so the frame is never empty
              while the file is in flight and nothing moves when it arrives. */}
          {status === "loading" && (
            <Shimmer className="absolute inset-0 h-full w-full" rounded="lg" />
          )}
          <Image
            // Keyed by src so a refreshed presigned URL remounts and fires
            // onLoad again — without it a cached response can leave the
            // skeleton up, or a stale error state can outlive the new link.
            key={imageUrl}
            src={imageUrl}
            alt={product.name}
            width={PREVIEW_IMAGE_SIZE}
            height={PREVIEW_IMAGE_SIZE}
            // Always unoptimised: this is a presigned S3 URL on a host with no
            // remotePattern configured, and it expires in about ten minutes, so
            // there is nothing worth caching against it.
            unoptimized
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
        // Covers both "no artwork" and "the link stopped working" — a presigned
        // URL that has aged out lands here rather than on a broken-image glyph.
        // The frame keeps its size either way. Same Avatar placeholder the
        // Product column uses.
        <Avatar className="h-full w-full rounded-none border-0">
          <AvatarFallback className="rounded-none bg-muted text-muted-foreground">
            <Icon name={product.type === "SERVICES" ? "wrench" : "package"} className="h-10 w-10" />
          </AvatarFallback>
        </Avatar>
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
            {product.type ? SKU_TYPE_LABEL[product.type] : "—"}
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
