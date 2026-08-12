"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { SkuProduct } from "@/features/dashboard/sku-management/types";

/**
 * The 70x70 square preview in the Product column. Uses flux-ui's Avatar (its
 * image-with-fallback primitive) rather than a bare `next/image`, so a missing
 * or broken `imageUrl` degrades to a placeholder instead of an empty box —
 * which is the common case today, since the catalogue lets an item be created
 * before its artwork exists. Squared off with `rounded-lg` (Avatar's own
 * `rounded-full` default is for people, not products); `cn`'s tailwind-merge
 * is what lets that override land.
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
      {product.imageUrl && <AvatarImage src={product.imageUrl} alt={product.name} />}
      <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
        <Icon name={product.type === "GOODS" ? "package" : "wrench"} className="h-6 w-6" />
      </AvatarFallback>
    </Avatar>
  );
}
