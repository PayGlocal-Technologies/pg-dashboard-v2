"use client";

/**
 * The Design Agent chat panel. Composes login gate, model picker, usage and
 * publish dialogs, the streamed conversation, and the prompt input. Dev-only;
 * rendered inside the draggable overlay.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Separator,
  Textarea,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { LoginGate } from "@/components/devtools/LoginGate";
import { UsageDialog } from "@/components/devtools/UsageDialog";
import { PublishDialog } from "@/components/devtools/PublishDialog";
import { SessionsMenu } from "@/components/devtools/SessionsMenu";
import {
  useAgentChat,
  type ChatMessage,
  type MessageBlock,
} from "@/components/devtools/useAgentChat";

export function ChatPanel({
  onClose,
  onDragHandlePointerDown,
}: {
  onClose: () => void;
  onDragHandlePointerDown?: (e: React.PointerEvent) => void;
}) {
  const chat = useAgentChat();
  const [input, setInput] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  const handleLogout = useCallback(() => {
    setIsLoggedOut(true);
    setShowSessions(false);
    void fetch("/api/design-agent/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
  }, []);

  // On mount, auto-reconnect to any in-progress turn interrupted by a page reload.
  useEffect(() => {
    const msgs = chat.messages;
    if (msgs.length === 0) return;
    const last = msgs[msgs.length - 1];
    if (last.role !== "assistant") return;
    const hasTools = last.blocks.some((b) => b.type === "tool");
    const hasText = last.blocks.some((b) => b.type === "text");
    if (hasTools && !hasText) {
      void chat.reconnect(chat.activeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — checks for interrupted sessions from page reload.
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openLightbox = useCallback((url: string) => setLightboxUrl(url), []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAttachedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    e.target.value = "";
  };

  const clearAttachment = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAttachedFile(null);
    setPreviewUrl(null);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(e.clipboardData.items).find((item) =>
      item.type.startsWith("image/")
    );
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAttachedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const submit = () => {
    if (!input.trim() && !attachedFile) return;
    void chat.send(input, attachedFile);
    setInput("");
    clearAttachment();
  };

  // Auto-scroll to bottom when messages update.
  const msgCount = chat.messages.length;
  useEffect(() => {
    if (!showSessions) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [msgCount, showSessions]);

  const activeSession = chat.conversations.find((c) => c.id === chat.activeId);

  // True when a previous turn was interrupted (e.g. page reload) and the server
  // no longer has an active session to reconnect to.
  const lastMsg = chat.messages[chat.messages.length - 1];
  const isInterrupted =
    !chat.streaming &&
    lastMsg?.role === "assistant" &&
    lastMsg.blocks.some((b) => b.type === "tool") &&
    !lastMsg.blocks.some((b) => b.type === "text");

  return (
    <div className="flex h-[32rem] w-[24rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <div
        className="flex cursor-grab items-center gap-1.5 border-b border-border px-2 py-2 select-none"
        onPointerDown={onDragHandlePointerDown}
      >
        <div onPointerDown={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title={showSessions ? "Back to chat" : "Sessions"}
            onClick={() => setShowSessions((v) => !v)}
          >
            <Icon name={showSessions ? "x" : "menu"} className="h-4 w-4" />
          </Button>
        </div>

        <Icon name="sparkles" className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 truncate text-sm font-semibold">
          {activeSession?.name ?? "Design Agent"}
        </span>

        <div onPointerDown={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose} title="Close">
            <Icon name="x" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <LoginGate forceLoggedOut={isLoggedOut} onLoginSuccess={() => setIsLoggedOut(false)}>
        {() => (
          <>
            {showSessions ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                <SessionsMenu
                  conversations={chat.conversations}
                  activeId={chat.activeId}
                  onSelect={(id) => {
                    chat.switchConversation(id);
                    setShowSessions(false);
                  }}
                  onCreate={() => {
                    chat.createConversation();
                    setShowSessions(false);
                  }}
                  onRename={chat.renameConversation}
                  onDelete={chat.deleteConversation}
                />
                <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
                  <div className="flex items-center gap-0.5">
                    <UsageDialog />
                    <PublishDialog />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={handleLogout}
                    leftIcon={<Icon name="log-out" className="h-3.5 w-3.5" />}
                  >
                    Log out
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 space-y-3 overflow-x-hidden overflow-y-auto p-3"
                >
                  {chat.messages.length === 0 && (
                    <p className="px-1 pt-6 text-center text-xs text-muted-foreground">
                      Describe the UI you want to build or change. The agent edits pg-dashboard-v2
                      and you&apos;ll see it update live.
                    </p>
                  )}
                  {chat.messages.map((m, i) => (
                    <MessageBubble
                      key={i}
                      message={m}
                      isStreaming={chat.streaming && i === chat.messages.length - 1}
                      onImageClick={openLightbox}
                    />
                  ))}

                  {isInterrupted && (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300/50 bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      <span>Session interrupted — page reloaded mid-task.</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-6 shrink-0 px-2 text-[11px]"
                        onClick={() =>
                          void chat.send(
                            "Please continue where you left off — the page reloaded and interrupted your previous task."
                          )
                        }
                      >
                        Continue
                      </Button>
                    </div>
                  )}

                  {chat.creditsExhausted && (
                    <div className="rounded-md border border-amber-300/50 bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      Your Claude credits are used up for now. Your conversation is saved — just
                      come back and continue when they refill.
                    </div>
                  )}
                  {chat.error && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
                      {chat.error}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Unsent attachment preview */}
                {previewUrl && (
                  <div className="relative mx-3 mt-2 w-fit">
                    <Image
                      src={previewUrl}
                      alt="Attachment"
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 cursor-zoom-in rounded-md border border-border object-cover"
                      onClick={() => openLightbox(previewUrl)}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0"
                      onClick={clearAttachment}
                    >
                      <Icon name="x" className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                )}

                <div className="flex items-end gap-2 p-2">
                  {/* Hidden native file picker */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 p-0"
                    title="Attach image"
                    disabled={chat.streaming}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icon name="paperclip" className="h-4 w-4" />
                  </Button>
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    onPaste={handlePaste}
                    placeholder="Ask the agent to build or change a screen…"
                    rows={2}
                    className="min-h-0 resize-none text-sm"
                    disabled={chat.streaming}
                  />
                  {chat.streaming ? (
                    <Button size="sm" variant="secondary" onClick={chat.stop} title="Stop">
                      <Icon name="square" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={submit}
                      disabled={!input.trim() && !attachedFile}
                      title="Send"
                    >
                      <Icon name="send-horizontal" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </LoginGate>

      {/* Image preview modal */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent
          className="max-w-3xl p-2 z-[2147483647]"
          overlayClassName="z-[2147483646] backdrop-blur-sm"
        >
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          <DialogDescription className="sr-only">Full size image preview</DialogDescription>
          {lightboxUrl && (
            <Image
              src={lightboxUrl}
              alt="Preview"
              width={800}
              height={600}
              unoptimized
              className="max-h-[80vh] w-full rounded object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Three bouncing dots — shown while the assistant is generating. */
function ThinkingDots() {
  return (
    <span className="flex items-center gap-0.5 py-0.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
    </span>
  );
}

function MessageBubble({
  message,
  isStreaming,
  onImageClick,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
  onImageClick?: (url: string) => void;
}) {
  const isUser = message.role === "user";
  const blocks: MessageBlock[] = message.blocks ?? [];
  const isEmpty = !message.content && !blocks.length;

  return (
    <div className={isUser ? "flex min-w-0 justify-end" : "flex min-w-0 justify-start"}>
      <div
        className={
          isUser
            ? "min-w-0 max-w-[85%] overflow-hidden rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            : "min-w-0 max-w-[90%] overflow-hidden rounded-lg bg-muted px-3 py-2 text-sm"
        }
      >
        {/* Image attachment */}
        {message.imagePreviewUrl && (
          <Image
            src={message.imagePreviewUrl}
            alt="Attached image"
            width={400}
            height={300}
            unoptimized
            className="mb-2 max-h-32 w-full cursor-zoom-in rounded object-cover"
            onClick={() => onImageClick?.(message.imagePreviewUrl!)}
          />
        )}

        {/* Ordered content blocks: text and tool calls interleaved */}
        {blocks.length > 0 ? (
          <div className="flex flex-col gap-1">
            {blocks.map((block, i) => {
              if (block.type === "text") {
                return (
                  <span key={i} className="break-words whitespace-pre-wrap leading-relaxed">
                    {block.text}
                  </span>
                );
              }
              const isLastBlock = i === blocks.length - 1;
              return (
                <span
                  key={i}
                  className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  {isStreaming && isLastBlock ? (
                    <ThinkingDots />
                  ) : (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                  )}
                  <span className="truncate">{block.summary}</span>
                </span>
              );
            })}
          </div>
        ) : isUser && message.content ? (
          // User messages are created with empty blocks — fall back to content.
          <span className="break-words whitespace-pre-wrap leading-relaxed">{message.content}</span>
        ) : !isUser && isEmpty && isStreaming ? (
          <ThinkingDots />
        ) : null}
      </div>
    </div>
  );
}
