"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button, Textarea } from "@/components/ui";
import { Icon } from "@/components/icon";

/**
 * The full page's composer — Attach, an optional reset, Mic, Send. No
 * "Add context of this page" chip here: that's the panel's own affordance
 * (`EchoComposer`), since the full page has no single "current screen" the
 * merchant navigated away from to get here.
 */
export function EchoFullPageComposer({
  onSend,
  onReset,
  disabled,
}: {
  onSend: (text: string) => void;
  onReset?: () => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow focus-within:border-primary/40 focus-within:shadow-md">
        <Textarea
          ref={taRef}
          data-echo-composer
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="Ask Echo anything…"
          aria-label="Ask Echo"
          className="min-h-11 max-h-40 w-full resize-none border-0 bg-transparent px-4 pb-2 pt-4 text-[14px] shadow-none focus-visible:ring-0"
        />

        <div className="flex items-center gap-1.5 px-3 pb-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-auto min-h-0 gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
            aria-label="Attach file"
            title="Attach file"
            onClick={() => toast("Attachments aren't available here yet")}
          >
            <Icon name="paperclip" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Attach</span>
          </Button>

          <div className="flex-1" />

          {onReset && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-9 w-9 min-h-0 rounded-lg p-0 text-muted-foreground hover:text-foreground"
              aria-label="Reset conversation"
              title="Reset conversation"
              onClick={onReset}
            >
              <Icon name="rotate-ccw" className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-9 w-9 min-h-0 rounded-full bg-muted/80 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Voice input"
            title="Voice input isn't available yet"
            onClick={() => toast("Voice input isn't available yet")}
          >
            <Icon name="mic" className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={disabled || !value.trim()}
            onClick={submit}
            aria-label="Send message"
            className="h-9 w-9 min-h-0 rounded-full p-0 shadow-sm"
          >
            <Icon name="arrow-up" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="mt-1.5 text-center text-[11px] text-muted-foreground/60">
        Echo may make mistakes. Verify important information.
      </p>
    </div>
  );
}
