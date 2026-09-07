"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { IconButton, Textarea } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (text: string) => void;
  /** True while a turn is in flight. The field stays usable; only send is held. */
  busy?: boolean;
  autoFocus?: boolean;
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
 */
export function EchoComposer({ onSend, busy = false, autoFocus = false, className }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [autoFocus]);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
    setValue("");
  }, [busy, onSend, value]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className={cn("shrink-0 px-3 pb-3", className)}>
      <div className="rounded-2xl border border-border bg-card p-2.5 shadow-sm focus-within:border-primary/40">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Ask Echo anything…"
          aria-label="Message Echo"
          className="max-h-32 min-h-[42px] w-full resize-none border-0 bg-transparent p-1 text-[13.5px] shadow-none focus-visible:ring-0"
        />
        <div className="mt-1 flex items-center justify-end">
          <IconButton
            type="button"
            variant="primary"
            size="sm"
            rounded="full"
            aria-label="Send message"
            disabled={busy || !value.trim()}
            isLoading={busy}
            onClick={submit}
          >
            <Icon name="arrow-up" size={16} strokeWidth={2.5} />
          </IconButton>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground/70">
        Echo may make mistakes. Verify important information.
      </p>
    </div>
  );
}
