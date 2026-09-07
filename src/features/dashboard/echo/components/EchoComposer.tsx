"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button, Textarea } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { getEchoPageContextLabel } from "@/features/dashboard/echo/pageContext";

/**
 * The panel's message box: an optional "current page" chip, the text field,
 * and a toolbar (Attach, Auto, Mic, Send). The full page uses its own
 * simpler composer (`EchoFullPageComposer`) without the page-context chip —
 * matching the reference, where that affordance is panel-only.
 *
 * Attach and Mic are both real UI, not stubs that do nothing: Attach reads
 * real files and lists their names (there's just nowhere to upload them —
 * Echo has no backend, see mockPipeline's BACKEND GAP note), and Mic says so
 * plainly instead of pretending to listen.
 */
export function EchoComposer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const pageContext = getEchoPageContextLabel(pathname);

  const [value, setValue] = useState("");
  const [pageContextActive, setPageContextActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // A page-context chip left on from a previous screen would attach the
  // wrong page's name to the next message. Deferred to a timer callback,
  // not called synchronously in the effect body — see CLAUDE.md's rule.
  useEffect(() => {
    const id = setTimeout(() => setPageContextActive(false), 0);
    return () => clearTimeout(id);
  }, [pathname]);

  // Auto-grow, capped at ~6 lines.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`;
  }, [value]);

  const submit = () => {
    if (disabled) return;
    const chunks: string[] = [];
    if (pageContextActive) chunks.push(`[Current page: ${pageContext}]`);
    if (value.trim()) chunks.push(value.trim());
    if (chunks.length === 0) return;
    onSend(chunks.join("\n\n"));
    setValue("");
    setFiles([]);
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex justify-start">
        {pageContextActive ? (
          <span
            className="group inline-flex max-w-full items-center gap-1 truncate rounded-md border border-border bg-muted/70 py-1 pl-2 pr-1 text-[11px] font-medium text-foreground"
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
            disabled={disabled}
            title="Include the current page in your message to Echo"
            className="h-auto min-h-0 gap-1.5 rounded-md border-dashed border-border/90 bg-muted/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            onClick={() => setPageContextActive(true)}
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Add context of this page
          </Button>
        )}
      </div>

      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {files.map((f) => (
            <span
              key={f.name + f.size}
              className="inline-flex max-w-50 items-center gap-1 truncate rounded-md bg-muted px-2 py-0.5 text-[11px] text-foreground"
            >
              {f.name}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 min-h-0 shrink-0 rounded-sm p-0 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
              >
                <Icon name="x" className="h-3 w-3" />
              </Button>
            </span>
          ))}
        </div>
      )}

      <Textarea
        ref={taRef}
        data-echo-composer
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        rows={2}
        placeholder="Ask Echo anything…"
        aria-label="Ask Echo"
        className="max-h-36 min-h-11 w-full resize-none border-0 bg-transparent px-0 py-0 text-[13px] leading-relaxed shadow-none focus-visible:ring-0"
      />

      <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const list = e.target.files;
            if (!list?.length) return;
            setFiles((prev) => [...prev, ...Array.from(list)]);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-auto min-h-0 gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
          aria-label="Attach file"
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="paperclip" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Attach</span>
        </Button>

        {!pageContextActive && (
          <span className="text-[12px] font-medium text-muted-foreground">Auto</span>
        )}

        <div className="flex-1" />

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
          disabled={disabled || (!value.trim() && !pageContextActive)}
          onClick={submit}
          aria-label="Send"
          className={cn("h-9 w-9 min-h-0 rounded-full p-0 shadow-sm")}
        >
          <Icon name="arrow-up" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
