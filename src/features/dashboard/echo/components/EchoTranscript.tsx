"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { EchoAgentSteps } from "@/features/dashboard/echo/components/EchoAgentSteps";
import { EchoChunk } from "@/features/dashboard/echo/components/EchoChunk";
import { EchoListOptions } from "@/features/dashboard/echo/components/EchoListOptions";
import { EchoOptionsSkeleton } from "@/features/dashboard/echo/components/EchoOptionsSkeleton";
import { EchoMessageActions } from "@/features/dashboard/echo/components/EchoMessageActions";
import { ECHO_ENDED_MESSAGE } from "@/features/dashboard/echo/constants";
import { isListChunk, toPlainText } from "@/features/dashboard/echo/helper";
import type { EchoEntry, EchoRequest, EchoStatus } from "@/features/dashboard/echo/types";
import { cn } from "@/lib/utils";

type Props = {
  entries: EchoEntry[];
  status: EchoStatus;
  onButton: (id: string, title: string) => void;
  onListRow: (id: string, title: string) => void;
  onRetry: (entryId: string, request: EchoRequest) => void;
  /** The merchant ended the chat: history stays, nothing in it is actionable. */
  ended?: boolean;
  /** Opens a fresh conversation from the ended footer. */
  onRestart?: () => void;
  /**
   * Welcome block for the opening screen, inside this scroll container so it
   * scrolls away with the conversation rather than pinning to the top. The
   * caller decides when to stop passing it — see EchoHero.
   *
   * A render prop, not a node: when the opening turn offers a menu, that menu
   * becomes the hero's own list of things to tap rather than a second menu
   * below it, so the hero has to be built around it. See `welcomeEntry`.
   */
  hero?: (options?: ReactNode) => ReactNode;
  /** Extra classes on the scroll container, for the panel's tighter gutters. */
  className?: string;
};

export function EchoTranscript({
  entries,
  status,
  onButton,
  onListRow,
  onRetry,
  ended = false,
  onRestart,
  hero,
  className,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries, status]);

  // Only the last assistant turn is live — see the `interactive` note in
  // EchoChunk. A turn that failed does not count: the live screen is still
  // whichever one came before it.
  // null once the chat has ended: no turn is live, so nothing is tappable.
  const liveEntryId = ended
    ? null
    : entries.reduce<string | null>(
        (live, entry) => (entry.role === "assistant" && "chunks" in entry ? entry.id : live),
        null
      );

  /**
   * The opening turn, when it is one this screen can absorb into the hero.
   *
   * The server answers the handshake with a welcome image plus the main-menu
   * list. Rendered as an ordinary turn under a hero that also showed prompt
   * cards, that was two menus and a duplicated mark on one screen. So when the
   * opening turn carries a list, the list becomes the hero's own options and
   * that turn's image and "Please select an option" body are dropped — the
   * hero's mark and greeting already say both.
   *
   * Deliberately NOT conditional on the conversation being untouched: it is
   * the FIRST assistant turn, whatever has happened since. Switching the
   * absorption off after the merchant tapped something meant that same menu
   * re-rendered with its heading and body restored, so the top of the
   * transcript visibly rewrote itself on the first interaction. As history it
   * simply scrolls away, disabled like any other past turn.
   *
   * Only a turn with a list qualifies. Anything else (a plain text greeting, a
   * button chunk carrying real content) renders normally below a standalone
   * hero, so nothing the server said can be swallowed by this.
   */
  const firstAssistant = entries.find((entry) => entry.role === "assistant" && "chunks" in entry);
  const welcomeList =
    hero && firstAssistant && "chunks" in firstAssistant
      ? firstAssistant.chunks.find(isListChunk)
      : undefined;
  const welcomeEntry = welcomeList ? firstAssistant : undefined;

  // Nothing back yet: the hero shows placeholder rows shaped like the real
  // ones, so the menu fills in rather than the screen re-laying out. See
  // EchoOptionsSkeleton.
  const awaitingWelcome = Boolean(hero) && entries.length === 0 && status === "starting";

  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-4 md:px-2", className)}
    >
      <div className="mx-auto w-full max-w-3xl space-y-5">
        {/* Standalone only when the opening turn is not being absorbed — see
            welcomeEntry. Otherwise it renders in the entry's own place below,
            so the greeting sits above the menu it introduces. */}
        {hero && !welcomeEntry ? (
          <div className="pb-1">{hero(awaitingWelcome ? <EchoOptionsSkeleton /> : undefined)}</div>
        ) : null}

        {entries.map((entry) => {
          if (entry.id === welcomeEntry?.id && welcomeList) {
            return (
              <div key={entry.id}>
                {hero?.(
                  <EchoListOptions
                    chunk={welcomeList}
                    disabled={entry.id !== liveEntryId || status !== "idle"}
                    onPick={onListRow}
                    hideHeading
                  />
                )}
              </div>
            );
          }

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
                      disabled={ended}
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

        {ended ? (
          <div className="flex flex-col items-center gap-2 pt-1">
            <div className="flex w-full items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11.5px] font-medium text-muted-foreground">
                {ECHO_ENDED_MESSAGE}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            {onRestart ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRestart}
                leftIcon={<Icon name="rotate-ccw" size={13} />}
                className="text-[13px] font-medium"
              >
                Start a new conversation
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* The stepped loader, not the old typing dots. Mounted only while a
            turn is in flight, which is also what resets it — see
            EchoAgentSteps, and note the steps are a timed affordance rather
            than progress the server reports. */}
        {status !== "idle" && entries.length > 0 ? (
          <div className="flex items-start gap-2.5">
            <Icon name="echo-mark" className="mt-0.5 shrink-0 text-[26px]" />
            <div className="min-w-0 flex-1">
              <EchoAgentSteps />
            </div>
          </div>
        ) : null}
      </div>
      <div ref={bottomRef} className="h-1 shrink-0" />
    </div>
  );
}
