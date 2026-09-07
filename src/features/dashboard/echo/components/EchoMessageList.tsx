"use client";

import { Icon } from "@/components/icon";
import { useEchoChat } from "@/stores/useEchoChat";
import { EchoAgentSteps } from "@/features/dashboard/echo/components/EchoAgentSteps";
import { EchoFollowUps } from "@/features/dashboard/echo/components/EchoFollowUps";
import { EchoMessageActions } from "@/features/dashboard/echo/components/EchoMessageActions";
import { EchoResultCard } from "@/features/dashboard/echo/components/EchoResultCards";

function EchoAvatar() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center">
      <Icon name="echo-mark" className="h-7 w-7" />
    </span>
  );
}

/** The transcript — reads straight from `useEchoChat` rather than taking
 *  `messages` as a prop, so the side panel and the full page render exactly
 *  the same list logic (actions, follow-ups, regenerate) without either one
 *  having to thread the store's actions through by hand. */
export function EchoMessageList() {
  const { messages, busy, sendMessage, regenerate } = useEchoChat();

  return (
    <ul className="flex list-none flex-col gap-5 p-0">
      {messages.map((message, index) => (
        <li key={message.id}>
          {message.role === "user" ? (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl border border-border bg-card px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground shadow-sm">
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              <EchoAvatar />
              <div className="min-w-0 flex-1 space-y-2.5">
                {message.steps && message.steps.length > 0 && (
                  <EchoAgentSteps steps={message.steps} />
                )}
                {message.text && (
                  <p className="text-[13.5px] leading-relaxed text-foreground">{message.text}</p>
                )}
                {message.results?.map((result, i) => (
                  <EchoResultCard key={i} result={result} />
                ))}
                {message.complete && (
                  <EchoFollowUps
                    closingLine={message.closingLine}
                    followUps={message.followUps ?? []}
                    onSend={sendMessage}
                    disabled={busy}
                  />
                )}
                {message.complete && (
                  <EchoMessageActions
                    plainText={message.text}
                    regenerating={busy}
                    onRegenerate={() => {
                      const userText = messages[index - 1]?.text;
                      if (userText) void regenerate(userText, message.id);
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
