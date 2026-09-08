"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

type Props = {
  plainText: string;
  className?: string;
};

/**
 * Copy / helpful / not-helpful, ported from Nova's EchoMessageActions.
 *
 * The two ratings are local-only: there is no feedback endpoint on the Echo
 * API, so a thumb records the merchant's click in this component and nothing
 * else. Kept because the affordance is part of the ported design and costs
 * nothing; wire it to a real endpoint when one exists.
 */
export function EchoMessageActions({ plainText, className }: Props) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  return (
    <div className={cn("mt-1.5 flex items-center gap-0.5", className)}>
      <IconButton
        type="button"
        variant="ghost"
        size="xs"
        aria-label="Copy message"
        title="Copy"
        onClick={() => {
          void navigator.clipboard.writeText(plainText).then(
            () => toast.success("Copied"),
            () => toast.error("Could not copy")
          );
        }}
      >
        <Icon name="copy" size={13} />
      </IconButton>
      <IconButton
        type="button"
        variant="ghost"
        size="xs"
        aria-label="Helpful"
        title="Helpful"
        aria-pressed={rating === "up"}
        onClick={() => setRating((r) => (r === "up" ? null : "up"))}
      >
        <Icon name="thumbs-up" size={13} className={cn(rating === "up" && "text-primary")} />
      </IconButton>
      <IconButton
        type="button"
        variant="ghost"
        size="xs"
        aria-label="Not helpful"
        title="Not helpful"
        aria-pressed={rating === "down"}
        onClick={() => setRating((r) => (r === "down" ? null : "down"))}
      >
        <Icon name="thumbs-down" size={13} className={cn(rating === "down" && "text-primary")} />
      </IconButton>
    </div>
  );
}
