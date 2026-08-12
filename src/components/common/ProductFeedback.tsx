"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Textarea } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { ViewPortal } from "@/components/layout/ViewPortal";
import { cn } from "@/lib/utils";

interface Rating {
  value: number;
  icon: IconName;
  label: string;
  activeClassName: string;
}

const RATINGS: Rating[] = [
  { value: 1, icon: "angry", label: "Very unhappy", activeClassName: "bg-red-500 text-white" },
  { value: 2, icon: "frown", label: "Unhappy", activeClassName: "bg-orange-500 text-white" },
  { value: 3, icon: "meh", label: "Neutral", activeClassName: "bg-amber-400 text-white" },
  { value: 4, icon: "smile", label: "Happy", activeClassName: "bg-yellow-400 text-white" },
  { value: 5, icon: "laugh", label: "Very happy", activeClassName: "bg-emerald-500 text-white" },
];

/**
 * "How are you liking our product?" feedback widget. No thumbs-up/down
 * trigger, it opens itself as soon as it's mounted. Callers gate whether it
 * renders at all (e.g. only for a "success" / "sent for capture" transaction)
 * and should pass a `key` tied to that record's id so a new qualifying record
 * mounts a fresh instance (and reopens) instead of reusing one the user
 * already dismissed.
 *
 * Deliberately not a Dialog: this is an optional, non-blocking prompt, not a
 * task the user must resolve before continuing. It renders as a floating card
 * pinned to the bottom-right corner with no backdrop, so the rest of the page
 * (including a Transaction Details drawer it may be mounted inside of) stays
 * fully interactive. It's portaled to document.body via ViewPortal so its
 * fixed positioning anchors to the real viewport corner even when mounted
 * inside the drawer, whose slide-in animation applies a CSS transform to its
 * own subtree (a transformed ancestor would otherwise become the containing
 * block for `position: fixed`).
 */
export function ProductFeedback() {
  const [open, setOpen] = useState(true);
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  if (!open) return null;

  function handleSubmit() {
    setOpen(false);
    toast.success("Thank you for your feedback.");
  }

  const showComments = rating != null && rating <= 3;

  return (
    <ViewPortal>
      <div
        role="dialog"
        aria-label="Product feedback"
        className="fixed bottom-5 right-5 z-90 w-75 animate-in fade-in slide-in-from-bottom-4 rounded-xl border border-border bg-card p-4 shadow-lg duration-300"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">How are you liking our product?</p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            aria-label="Dismiss"
            className="h-6 w-6 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground"
          >
            <Icon name="x" size={13} />
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {RATINGS.map((r) => (
              <Button
                key={r.value}
                type="button"
                variant="ghost"
                onClick={() => setRating(r.value)}
                aria-label={r.label}
                aria-pressed={rating === r.value}
                className={cn(
                  "h-9 w-9 min-h-0 min-w-0 rounded-full p-0 text-muted-foreground/50 transition-colors",
                  rating === r.value ? r.activeClassName : "hover:text-muted-foreground"
                )}
              >
                <Icon name={r.icon} size={18} />
              </Button>
            ))}
          </div>
          {rating != null && !showComments && (
            <Button type="button" variant="primary" size="sm" onClick={handleSubmit}>
              Submit
            </Button>
          )}
        </div>

        {showComments && (
          <div className="mt-3 flex flex-col gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What could we improve?"
              rows={3}
              className="resize-none text-sm"
            />
            <Button type="button" variant="primary" size="sm" onClick={handleSubmit} className="self-end">
              Submit
            </Button>
          </div>
        )}
      </div>
    </ViewPortal>
  );
}
