"use client";

import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { SkuProduct } from "@/features/dashboard/sku-management/types";

/** Rendered size of the square preview, in px — also the `next/image` intrinsic
 *  size, so the optimiser serves a thumbnail rather than the 2560px original. */
const THUMBNAIL_SIZE = 70;

/**
 * The 70x70 square preview in the Product column. flux-ui's Avatar supplies the
 * frame (border, muted fill, overflow clipping), squared off with `rounded-lg` —
 * its own `rounded-full` default is for people, not products, and `cn`'s
 * tailwind-merge is what lets that override land.
 *
 * The two branches are mutually exclusive rather than layered: AvatarFallback
 * keys off Radix's own image-loading state, which only advances when an
 * AvatarPrimitive.Image is present. Using `next/image` instead (per CLAUDE.md,
 * and to get the thumbnail resized rather than shipping a 2560px original into
 * a 70px box) means that state never leaves `idle`, so a fallback rendered
 * alongside it would show through the photo permanently.
 */
export function ProductThumbnail({
  product,
  className,
}: {
  product: SkuProduct;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-[70px] w-[70px] rounded-lg", className)}>
      {product.imageUrl ? (
        // object-cover: the photo fills the square edge to edge, cropping
        // whatever doesn't fit rather than letterboxing inside it. The white
        // ground is fixed rather than themed — it's photographic backdrop,
        // matching what's baked into the JPEGs and standing behind the
        // transparent PNGs, so the tile reads the same in either theme.
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={THUMBNAIL_SIZE}
          height={THUMBNAIL_SIZE}
          className="h-full w-full bg-white object-cover"
        />
      ) : (
        <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
          <Icon name={product.type === "GOODS" ? "package" : "wrench"} className="h-6 w-6" />
        </AvatarFallback>
      )}
    </Avatar>
  );
}
