"use client";

import { Button } from "@/components/ui";
import { AppImage } from "@/components/common/AppImage";
import { EchoBody } from "@/features/dashboard/echo/components/EchoBody";
import { EchoListOptions } from "@/features/dashboard/echo/components/EchoListOptions";
import {
  buttonsOf,
  chunkBodyText,
  isButtonChunk,
  isImageChunk,
  isListChunk,
  isTextChunk,
} from "@/features/dashboard/echo/helper";
import type { EchoChunk as EchoChunkType } from "@/features/dashboard/echo/types";

type Props = {
  chunk: EchoChunkType;
  /**
   * False for every assistant turn but the latest. The server has moved its
   * session on, so tapping a button from three screens back would send an id
   * the current step does not expect — the transcript keeps the history
   * readable, but only the live screen is actionable.
   */
  interactive: boolean;
  onButton: (id: string, title: string) => void;
  onListRow: (id: string, title: string) => void;
};

export function EchoChunk({ chunk, interactive, onButton, onListRow }: Props) {
  const body = chunkBodyText(chunk);

  if (isTextChunk(chunk)) {
    return <EchoBody text={body} />;
  }

  if (isImageChunk(chunk)) {
    return (
      <div className="space-y-2.5">
        {/* `unoptimized` because the link is whatever host the server names
            (static.payglocal.in today) and the optimizer rejects any host not
            listed in next.config.ts. Explicit dimensions are required with it,
            per the AppImage note in CLAUDE.md; the classes cap the rendered
            size while keeping the aspect ratio. */}
        <AppImage
          src={chunk.image.link}
          alt=""
          width={480}
          height={480}
          unoptimized
          className="h-auto w-auto max-h-40 max-w-[10rem] object-contain"
        />
        {body ? <EchoBody text={body} /> : null}
      </div>
    );
  }

  if (isButtonChunk(chunk)) {
    const buttons = buttonsOf(chunk);
    return (
      <div className="space-y-2.5">
        {body ? <EchoBody text={body} /> : null}
        {/* Chips on one wrapping row rather than stacked full-width buttons.
            The protocol caps reply buttons at three and they are short
            follow-ups ("Main Menu", "Raise a Query", "End Chat"), so three
            full-width bars overstate them and push the reply above out of
            view — a list chunk is the control for a real set of choices. */}
        {buttons.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {buttons.map(({ reply }) => (
              <Button
                key={reply.id}
                type="button"
                variant="outline"
                size="sm"
                disabled={!interactive}
                onClick={() => onButton(reply.id, reply.title)}
                className="h-auto min-h-0 rounded-lg border-border px-3 py-1.5 text-[12px] font-medium text-foreground hover:border-primary/40 hover:bg-muted/40"
              >
                {reply.title || reply.id}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (isListChunk(chunk)) {
    return (
      <div className="space-y-2.5">
        {body ? <EchoBody text={body} /> : null}
        <EchoListOptions chunk={chunk} disabled={!interactive} onPick={onListRow} />
      </div>
    );
  }

  // An unknown chunk type from a newer server build. Rendering nothing is the
  // same silent skip §7 prescribes for a blank body.
  return null;
}
