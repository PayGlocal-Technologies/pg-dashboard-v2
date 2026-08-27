"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";

/**
 * A tutorial slot. `videoId` (the id in youtu.be/<id> or youtube.com/watch?v=
 * <id>) is undefined for a slot with no real video recorded yet, which
 * renders as a plain empty placeholder instead of a thumbnail.
 */
export interface TutorialVideo {
  title: string;
  videoId?: string;
}

function youtubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const paddedSeconds = String(seconds).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`
    : `${minutes}:${paddedSeconds}`;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: { onReady?: (event: { target: { getDuration(): number } }) => void };
        }
      ) => { destroy(): void };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const IFRAME_API_SCRIPT_ID = "youtube-iframe-api";

/**
 * The tile's duration badge has to be the video's real length, and YouTube's
 * key-less oEmbed endpoint (used for the title/thumbnail elsewhere in this
 * file) doesn't carry duration — only the official IFrame Player API does.
 * This mounts a 1px, muted player purely to read `getDuration()` once its
 * metadata loads; it's never made visible or unmuted, and is torn down like
 * any other effect resource when the tile unmounts or the video changes.
 */
function useYouTubeDuration(videoId: string | undefined): number | null {
  const [seconds, setSeconds] = useState<number | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoId) return;
    let destroyed = false;
    let player: { destroy(): void } | undefined;

    const createPlayer = () => {
      if (destroyed || !hostRef.current || !window.YT) return;
      player = new window.YT.Player(hostRef.current, {
        videoId,
        playerVars: { controls: 0, disablekb: 1 },
        events: {
          onReady: (event) => {
            if (!destroyed) setSeconds(Math.round(event.target.getDuration()));
          },
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      if (!document.getElementById(IFRAME_API_SCRIPT_ID)) {
        const script = document.createElement("script");
        script.id = IFRAME_API_SCRIPT_ID;
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
      // The IFrame API calls this global once the script it just loaded is
      // ready — chaining onto whatever was already registered rather than
      // overwriting it, in case some other player on the page got here first.
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        createPlayer();
      };
    }

    return () => {
      destroyed = true;
      player?.destroy();
    };
  }, [videoId]);

  return seconds;
}

/**
 * The real player, in a modal: clicking the tile below brings the video into
 * focus rather than playing inline in the drawer's own cramped width. Plain
 * flux-ui Dialog (a real modal, dimmed backdrop and all) is the right choice
 * here, unlike the Help drawer itself — a video demands the room and the
 * focus a spotlight gives it, which is the opposite of what the drawer's own
 * no-overlay, background-stays-usable design is for.
 *
 * The iframe only renders while `open`, so closing the dialog (which
 * unmounts DialogContent) stops playback for free — no imperative pause
 * needed.
 */
function VideoSpotlightDialog({
  open,
  onOpenChange,
  videoId,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100%,56rem)] p-3 [&>button:last-child]:top-3">
        <DialogTitle asChild>
          <VisuallyHidden>{title}</VisuallyHidden>
        </DialogTitle>
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          {open && (
            <iframe
              key={videoId}
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={title}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One tutorial tile: real thumbnail + title + real duration once
 * `video.videoId` is set, clicking through to the spotlight player above; a
 * plain empty box otherwise. `role="button"` on a plain div rather than
 * flux-ui's `<Button>` — the same choice Header.tsx's own CREATE_ITEMS rows
 * make — because this is a rich content card (thumbnail image, badge text,
 * title, duration) that Button's fixed-height/icon+label model doesn't fit,
 * not a text action.
 */
export function TutorialTile({ video }: { video: TutorialVideo }) {
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const durationSeconds = useYouTubeDuration(video.videoId);
  const ready = Boolean(video.videoId);

  const open = () => {
    if (ready) setSpotlightOpen(true);
  };

  return (
    <>
      <div
        role={ready ? "button" : undefined}
        tabIndex={ready ? 0 : undefined}
        aria-label={ready ? `Play tutorial: ${video.title}` : undefined}
        onClick={open}
        onKeyDown={(e) => {
          if (ready && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            open();
          }
        }}
        className={ready ? "cursor-pointer" : "cursor-default"}
      >
        <div
          className={cn(
            "relative aspect-video w-full overflow-hidden rounded-xl",
            ready ? "bg-black" : "bg-muted"
          )}
        >
          {ready && video.videoId && (
            <>
              {/* unoptimized: an external CDN thumbnail, not one of this
                  app's own assets or a domain in next.config's image
                  allowlist — AppImage's basePath rewrite has nothing to
                  rewrite here either way, only `fill` sizing to apply. */}
              <AppImage
                src={youtubeThumbnailUrl(video.videoId)}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg">
                  <Icon name="play-circle" className="h-7 w-7" />
                </span>
              </div>
            </>
          )}
        </div>

        <div className="mt-2 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{video.title}</p>
          {durationSeconds != null && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDuration(durationSeconds)}
            </span>
          )}
        </div>
      </div>

      {ready && video.videoId && (
        <VideoSpotlightDialog
          open={spotlightOpen}
          onOpenChange={setSpotlightOpen}
          videoId={video.videoId}
          title={video.title}
        />
      )}
    </>
  );
}
