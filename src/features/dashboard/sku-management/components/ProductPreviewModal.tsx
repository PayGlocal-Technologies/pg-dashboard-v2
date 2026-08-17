"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Avatar,
  AvatarFallback,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerTitle,
  StatusBadge,
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

/** Label above a value, the pairing the transaction details view uses, so
 *  metadata reads the same wherever it appears in the product. */
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[13px] text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}

/** The large image, plus a thumbnail strip when the item has more than one.
 *  Selecting a thumbnail only changes which image is shown — nothing here
 *  writes to the item. */
function PreviewMedia({ product }: { product: SkuProduct }) {
  const images = product.images ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  // Guards against an index left over from a longer gallery if the same
  // component instance is ever reused for another item.
  const active = images[activeIndex] ?? images[0];

  return (
    <div className="flex flex-col gap-2">
      {/* aspect-square keeps the frame the same size whether or not there's an
          image, so the layout doesn't jump between items. */}
      <div className="aspect-square w-full overflow-hidden rounded-xl border border-border">
        {active ? (
          // object-contain, not the table thumbnail's cover: this is the one
          // place the whole product should be visible, and a preview that
          // crops the item it exists to show would be self-defeating.
          <Image
            src={active}
            alt={product.name}
            width={400}
            height={400}
            unoptimized={active.startsWith("blob:")}
            className="h-full w-full bg-white object-contain"
          />
        ) : (
          // Same Avatar placeholder the Product column falls back to, scaled
          // up — an item without artwork looks the same in both places.
          <Avatar className="h-full w-full rounded-none border-0">
            <AvatarFallback className="rounded-none bg-muted text-muted-foreground">
              <Icon
                name={product.type === "GOODS" ? "package" : "wrench"}
                className="h-10 w-10"
              />
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <Button
              key={`${image}-${index}`}
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-12 w-12 min-h-0 shrink-0 overflow-hidden rounded-lg border p-0",
                "[&>span]:block [&>span]:h-full [&>span]:w-full",
                index === activeIndex ? "border-primary" : "border-border"
              )}
            >
              <Image
                src={image}
                alt=""
                width={48}
                height={48}
                unoptimized={image.startsWith("blob:")}
                className="h-full w-full bg-white object-cover"
              />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewBody({ product }: { product: SkuProduct }) {
  return (
    <div className="flex min-h-0 flex-col">
      {/* Header carries the name — the strongest text in the modal — and the
          Dialog/Drawer draws its own close button at the top right. pr-10
          keeps a long name clear of it. */}
      <div className="flex-shrink-0 border-b border-border px-5 py-4 pr-10">
        <h2 className="truncate text-[16px] font-semibold tracking-tight text-foreground">
          {product.name}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {/* Image beside the details from sm up, stacked below it — image
            first either way, since it's the primary visual element. */}
        <div className="grid gap-5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <PreviewMedia product={product} />

          <div className="flex min-w-0 flex-col gap-4">
            {/* Selling price leads: it's the figure this preview exists to
                confirm. Cost trails it at body size and muted, so the two read
                as headline and supporting figure rather than a pair. */}
            <div>
              <p className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
                Selling price
              </p>
              <p className="mt-0.5 text-[22px] leading-tight font-semibold tabular-nums tracking-tight text-foreground">
                {formatCurrency(product.sellingPrice, product.currency, SKU_PRICE_LOCALE)}
              </p>
              <p className="mt-1 text-[12px] tabular-nums text-muted-foreground">
                Product cost{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(product.productCost, product.currency, SKU_PRICE_LOCALE)}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
                  Product type
                </p>
                <div className="mt-1">
                  <StatusBadge
                    variant={product.type === "GOODS" ? "info" : "muted"}
                    label={SKU_TYPE_LABEL[product.type]}
                    size="sm"
                  />
                </div>
              </div>
              <DetailField label="HSN/SAC" value={product.hsnSac} />
              <DetailField label="Currency" value={product.currency} />
            </div>
          </div>
        </div>

        {/* Full width under both columns — descriptions are sentences and read
            badly in a narrow column. Omitted entirely when there isn't one,
            rather than leaving an empty labelled section. */}
        {product.description.trim() && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
              Description
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>
        )}
      </div>
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
 * Read-only preview of one SKU, opened by clicking a row's product cell.
 *
 * Deliberately carries no actions: Edit, Archive, and Delete stay with the
 * row's overflow menu, so there is one place those live and this stays a
 * look-don't-touch view. Closing is the modal's own close button, Escape, or
 * a click outside — flux's Dialog/Drawer behaviour, unmodified.
 */
export function ProductPreviewModal({ product, onOpenChange }: ProductPreviewModalProps) {
  const { isMobile } = useBreakpoint();
  const open = product !== null;

  // Remounts per item so PreviewMedia's selected thumbnail resets rather than
  // carrying over to the next product previewed.
  const body = product ? <PreviewBody key={product.id} product={product} /> : null;

  // Drawer on mobile, Dialog above — the same responsive pairing the item form
  // and UploadInvoiceModal use.
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} side="bottom">
        <DrawerContent className="flex max-h-[90vh] flex-col rounded-t-2xl p-0">
          <DrawerTitle className="sr-only">{product?.name ?? "Product preview"}</DrawerTitle>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,44rem)] w-[min(100%-1.5rem,38rem)] max-w-none flex-col",
          "gap-0 overflow-hidden rounded-2xl p-0"
        )}
      >
        <DialogTitle className="sr-only">{product?.name ?? "Product preview"}</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
}
