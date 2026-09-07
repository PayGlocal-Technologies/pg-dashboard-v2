"use client";

import { useEffect, useRef } from "react";
import { Button, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { EchoChunk } from "@/features/dashboard/echo/components/EchoChunk";
import { EchoMessageActions } from "@/features/dashboard/echo/components/EchoMessageActions";
import { toPlainText } from "@/features/dashboard/echo/helper";
import type { EchoEntry, EchoRequest, EchoStatus } from "@/features/dashboard/echo/types";
import { cn } from "@/lib/utils";

type Props = {
  entries: EchoEntry[];
  status: EchoStatus;
  onButton: (id: string, title: string) => void;
  onListRow: (id: string, title: string) => void;
  onRetry: (entryId: string, request: EchoRequest) => void;
};

export function EchoTranscript({ entries, status, onButton, onListRow, onRetry }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries, status]);

  // Only the last assistant turn is live — see the `interactive` note in
  // EchoChunk. A turn that failed does not count: the live screen is still
  // whichever one came before it.
  const liveEntryId = entries.reduce<string | null>(
    (live, entry) => (entry.role === "assistant" && "chunks" in entry ? entry.id : live),
    null
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-4 md:px-2">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        {entries.length === 0 && status === "starting" ? <StartingPlaceholder /> : null}

        {entries.map((entry) => {
          if (entry.role === "user") {
            return (
              <div key={entry.id} className="flex justify-end">
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-sm",
                    "text-[13.5px] leading-relaxed text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap">{entry.label}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={entry.id} className="flex items-start gap-2.5">
              <Icon name="echo-mark" className="mt-0.5 shrink-0 text-[26px]" />
              <div className="min-w-0 flex-1">
                {"failure" in entry ? (
                  <div className="space-y-2.5">
                    <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                      {entry.failure.message}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRetry(entry.id, entry.failure.request)}
                      leftIcon={<Icon name="rotate-ccw" size={13} />}
                      className="text-[13px] font-medium"
                    >
                      Try again
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {entry.chunks.map((chunk, index) => (
                        <EchoChunk
                          key={index}
                          chunk={chunk}
                          interactive={entry.id === liveEntryId && status === "idle"}
                          onButton={onButton}
                          onListRow={onListRow}
                        />
                      ))}
                    </div>
                    <EchoMessageActions plainText={toPlainText(entry.chunks)} />
                  </>
                )}
              </div>
            </div>
          );
        })}

        {status !== "idle" && entries.length > 0 ? <TypingIndicator /> : null}
      </div>
      <div ref={bottomRef} className="h-1 shrink-0" />
    </div>
  );
}

/** Shown while the opening handshake is in flight and there is nothing yet. */
function StartingPlaceholder() {
  return (
    <div className="flex items-start gap-2.5" aria-busy>
      <Icon name="echo-mark" className="mt-0.5 shrink-0 text-[26px]" />
      <div className="min-w-0 flex-1 space-y-2 pt-1">
        <Shimmer className="h-2.5 w-[55%]" rounded="md" />
        <Shimmer className="h-2.5 w-[80%]" rounded="md" />
        <Shimmer className="h-2.5 w-[40%]" rounded="md" />
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5" role="status" aria-live="polite">
      <Icon name="echo-mark" className="shrink-0 text-[26px]" />
      <span className="inline-flex gap-1" aria-hidden>
        <span className="echo-typing-dot" />
        <span className="echo-typing-dot" />
        <span className="echo-typing-dot" />
      </span>
      <span className="sr-only">Echo is replying</span>
    </div>
  );
}
