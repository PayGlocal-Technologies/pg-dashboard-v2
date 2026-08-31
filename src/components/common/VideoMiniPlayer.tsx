"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, VisuallyHidden } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export interface VideoMiniPlayerProps {
  /**
   * A directly embeddable video URL (e.g. a YouTube embed URL for an
   * unlisted video), dropped straight into an iframe. Undefined renders an
   * empty placeholder in both the mini-player and the spotlight modal — the
   * current state, since no URL has been provided yet.
   */
  videoUrl?: string;
  title?: string;
  onClose: () => void;
}

function VideoFrame({
  videoUrl,
  title,
  className,
}: {
  videoUrl?: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("aspect-video w-full overflow-hidden bg-muted", className)}>
      {videoUrl && (
        <iframe
          src={videoUrl}
          title={title}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}

/**
 * Always-on-top floating video widget (PiP-style), separate from the Help
 * drawer's own Tutorials tile (TutorialVideoTile.tsx) — this one floats over
 * the page independent of any drawer or scroll position. One shared
 * component, same props, rendered identically on Transactions, International
 * Accounts and Connect Platforms via VideoMiniPlayerTrigger, which owns
 * where it's allowed to appear and its dismiss state.
 */
export function VideoMiniPlayer({
  videoUrl,
  title = "Product walkthrough",
  onClose,
}: VideoMiniPlayerProps) {
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  return (
    <>
      {/* z-40: above ordinary page content, below the Help drawer/Dialog
          overlays (z-[100]+) and FeedbackSheet (z-50) — VideoMiniPlayerTrigger
          hides this entirely while the Help drawer is open rather than
          relying on stacking order alone, since the drawer's full-height
          right-edge panel would otherwise sit directly on top of this same
          corner. */}
      <div
        role="complementary"
        aria-label={title}
        className="fixed bottom-6 right-6 z-40 w-[min(320px,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between p-2">
          <IconButton
            aria-label="Expand video"
            variant="outline"
            size="sm"
            rounded="full"
            onClick={() => setSpotlightOpen(true)}
          >
            <Icon name="expand" className="h-3.5 w-3.5 text-muted-foreground" />
          </IconButton>
          <IconButton
            aria-label="Close video"
            variant="outline"
            size="sm"
            rounded="full"
            onClick={onClose}
          >
            <Icon name="x" className="h-3.5 w-3.5 text-muted-foreground" />
          </IconButton>
        </div>
        <VideoFrame videoUrl={videoUrl} title={title} />
      </div>

      {/* Expand opens this in place of enlarging the mini-player itself, the
          same "spotlight" pattern TutorialVideoTile.tsx uses for the Help
          drawer's Tutorials tile — Dialog supplies its own close button plus
          Escape/click-outside dismissal for free. */}
      <Dialog open={spotlightOpen} onOpenChange={setSpotlightOpen}>
        <DialogContent className="max-w-[min(100%,56rem)] p-3 [&>button:last-child]:top-3">
          <DialogTitle asChild>
            <VisuallyHidden>{title}</VisuallyHidden>
          </DialogTitle>
          <VideoFrame videoUrl={videoUrl} title={title} className="rounded-lg bg-black" />
        </DialogContent>
      </Dialog>
    </>
  );
}
