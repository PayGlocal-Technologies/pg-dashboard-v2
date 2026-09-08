"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { Button, Textarea } from "@/components/ui";
import { Icon } from "@/components/icon";
import { getEchoPageContextLabel } from "@/features/dashboard/echo/pageContext";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (text: string) => void;
  /** True while a turn is in flight. The field stays usable; only send is held. */
  busy?: boolean;
  /** Closes the composer entirely — used when the chat has ended. */
  disabled?: boolean;
  autoFocus?: boolean;
  /**
   * Shows the "Add context of this page" chip. Off, and nothing passes it
   * today: `EchoRequest` has no context field, so the chip can only prefix
   * the page name into the message text and hope the server makes something
   * of it. Kept wired for the day a real field exists — flipping this on is
   * the whole change. (The full page would not want it regardless: naming
   * that route back to Echo says nothing useful.)
   */
  showPageContext?: boolean;
  className?: string;
};

/**
 * Free-text input, always available.
 *
 * The protocol carries no flag for whether the current screen accepts typing —
 * some plainly need it (transaction search, payment-link creation) and most
 * are pure menus — so rather than guessing per screen, the composer is always
 * shown and the server decides what to do with whatever arrives. Typing on a
 * menu screen is a normal `inputType: "text"` turn.
 *
 * No Attach or Voice control. `EchoRequest` carries `userInput` and
 * `inputType` and nothing else, so there is no field to put a file or an audio
 * clip in — a button that can only decline is worse than no button. Add them
 * back alongside the request fields that make them work.
 */
export function EchoComposer({
  onSend,
  busy = false,
  disabled = false,
  autoFocus = false,
  showPageContext = false,
  className,
}: Props) {
  const pathname = usePathname() ?? "/";
  const pageContext = getEchoPageContextLabel(pathname);

  const [value, setValue] = useState("");
  const [pageContextActive, setPageContextActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [autoFocus, disabled]);

  // A chip left on from a previous screen would attach the wrong page's name to
  // the next message. Deferred to a timer callback rather than called in the
  // effect body, per CLAUDE.md's no-synchronous-setState rule.
  useEffect(() => {
    const timer = window.setTimeout(() => setPageContextActive(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // Auto-grow, capped at ~6 lines.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`;
  }, [value]);

  const submit = useCallback(() => {
    if (busy || disabled) return;
    const trimmed = value.trim();
    // The page name goes as a plain prefix in the text turn — there is no
    // context field in EchoRequest, so this is the only way to pass it, and
    // the server treats it as part of the message.
    const parts: string[] = [];
    if (pageContextActive && showPageContext) parts.push(`[Current page: ${pageContext}]`);
    if (trimmed) parts.push(trimmed);
    if (parts.length === 0) return;

    onSend(parts.join("\n\n"));
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [busy, disabled, onSend, pageContext, pageContextActive, showPageContext, value]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const canSend = Boolean(value.trim()) || (pageContextActive && showPageContext);

  return (
    <div className={cn("shrink-0 px-3 pb-3", className)}>
      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm focus-within:border-primary/40">
        {showPageContext && (
          <div className="mb-2 flex justify-start">
            {pageContextActive ? (
              <span
                className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-border bg-muted/70 py-1 pl-2 pr-1 text-[11px] font-medium text-foreground"
                title={`You are on: ${pageContext}`}
              >
                <Icon name="layout-grid" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{pageContext}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 min-h-0 shrink-0 rounded-sm p-0 text-muted-foreground hover:text-foreground"
                  aria-label="Remove page context"
                  onClick={() => setPageContextActive(false)}
                >
                  <Icon name="x" className="h-3 w-3" />
                </Button>
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                title="Include the current page in your message to Echo"
                className="h-auto min-h-0 gap-1.5 rounded-md border-dashed border-border/90 bg-muted/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                onClick={() => setPageContextActive(true)}
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                Add context of this page
              </Button>
            )}
          </div>
        )}

        {/* `items-end` rather than `items-center`: the field auto-grows, and
            the button should stay level with the last line the merchant is
            typing on instead of drifting to the middle of a tall box. */}
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            disabled={disabled}
            placeholder={disabled ? "This chat has ended" : "Ask Echo anything…"}
            aria-label="Message Echo"
            className="max-h-36 min-h-11 flex-1 resize-none border-0 bg-transparent px-0 py-0 text-[13.5px] leading-relaxed shadow-none focus-visible:ring-0"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={busy || disabled || !canSend}
            isLoading={busy}
            onClick={submit}
            aria-label="Send message"
            className="h-9 w-9 min-h-0 shrink-0 rounded-full p-0 shadow-sm"
          >
            <Icon name="arrow-up" className="h-4 w-4" strokeWidth={2.5} />
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground/70">
        Echo may make mistakes. Verify important information.
      </p>
    </div>
  );
}
