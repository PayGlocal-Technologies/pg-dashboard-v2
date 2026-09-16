"use client";

import { useState } from "react";
import { AppImage as Image } from "@/components/common/AppImage";
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
  // The catalogue row's presigned S3 URL, good for about ten minutes.
  const imageUrl = product.imageUrl;

  // Which is why this exists. A merchant who leaves the table open past the
  // expiry would otherwise get the browser's broken-image glyph in every
  // Product cell; falling back to the type icon is the same thing a SKU with
  // no artwork shows, which is the honest reading of "we can't show it".
  // Keyed off the url so a refetch with a fresh link tries again.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = !!imageUrl && failedUrl !== imageUrl;

  return (
    <Avatar className={cn("h-[70px] w-[70px] rounded-lg", className)}>
      {showImage ? (
        // object-cover: the photo fills the square edge to edge, cropping
        // whatever doesn't fit rather than letterboxing inside it. The white
        // ground is fixed rather than themed — it's photographic backdrop,
        // matching what's baked into the JPEGs and standing behind the
        // transparent PNGs, so the tile reads the same in either theme.
        <Image
          src={imageUrl}
          alt={product.name}
          width={THUMBNAIL_SIZE}
          height={THUMBNAIL_SIZE}
          // Always unoptimised. The optimiser resolves sources server-side, and
          // neither kind of source here survives that: an S3 host has no
          // remotePattern configured and its signed URL expires anyway, and an
          // object URL from the item form only exists in the tab that minted it.
          unoptimized
          onError={() => setFailedUrl(imageUrl)}
          className="h-full w-full bg-white object-cover"
        />
      ) : (
        <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
          <Icon name={product.type === "SERVICES" ? "wrench" : "package"} className="h-6 w-6" />
        </AvatarFallback>
      )}
    </Avatar>
  );
}
