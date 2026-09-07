"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * The row of small utility icons under a completed assistant reply: copy,
 * thumbs up/down, regenerate. Thumbs are cosmetic — there's no feedback
 * endpoint behind Echo yet (see mockPipeline's BACKEND GAP note) — but they
 * still track a local pressed state so tapping one gives real feedback of
 * its own, rather than doing nothing visibly.
 */
export function EchoMessageActions({
  plainText,
  onRegenerate,
  regenerating,
}: {
  plainText: string;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  const copy = () => {
    void navigator.clipboard.writeText(plainText).then(
      () => toast.success("Copied"),
      () => toast.error("Could not copy")
    );
  };

  return (
    <div className="flex items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 min-h-0 rounded-md p-0 text-muted-foreground hover:text-foreground"
        aria-label="Copy message"
        title="Copy"
        onClick={copy}
      >
        <Icon name="copy" className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={vote === "up"}
        className={cn(
          "h-7 w-7 min-h-0 rounded-md p-0 text-muted-foreground hover:text-foreground",
          vote === "up" && "text-primary"
        )}
        aria-label="Good response"
        title="Helpful"
        onClick={() => setVote((v) => (v === "up" ? null : "up"))}
      >
        <Icon name="thumbs-up" className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={vote === "down"}
        className={cn(
          "h-7 w-7 min-h-0 rounded-md p-0 text-muted-foreground hover:text-foreground",
          vote === "down" && "text-destructive"
        )}
        aria-label="Bad response"
        title="Not helpful"
        onClick={() => setVote((v) => (v === "down" ? null : "down"))}
      >
        <Icon name="thumbs-down" className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={regenerating}
        className="h-7 w-7 min-h-0 rounded-md p-0 text-muted-foreground hover:text-foreground"
        aria-label="Regenerate"
        title="Regenerate"
        onClick={onRegenerate}
      >
        <Icon name="rotate-ccw" className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} />
      </Button>
    </div>
  );
}
