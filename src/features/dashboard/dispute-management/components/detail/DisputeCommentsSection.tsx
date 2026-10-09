"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  Button,
  Field,
  FieldError,
  Shimmer,
  Textarea,
} from "@/components/ui";
import { usePost } from "@/lib/api/hooks";
import { formatTimestamp } from "@/lib/utils/format";
import { DetailSection } from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import { cbSendMessageApi } from "@/features/dashboard/dispute-management/services";
import { useCbMessages } from "@/features/dashboard/dispute-management/hooks";
import { apiErrorMessage, initialsOf } from "@/features/dashboard/dispute-management/helpers";

/**
 * The conversation with PayGlocal's team about this dispute, pg-dashboard's
 * CbCommentsCard: GET `/v2/cb/{mid}/messaging/{cbId}`, the latest three with
 * a toggle for the rest, and a box that POSTs `{ message, attachments: [] }`
 * to `.../send`. A sent message refreshes the thread (the hook refreshes
 * every query) and clears the box, with no toast, as there.
 */
export function DisputeCommentsSection({ mid, cbId }: { mid: string; cbId: string }) {
  const { messages, isLoading } = useCbMessages(mid, cbId);
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState("");
  const [showError, setShowError] = useState(false);

  const send = usePost<unknown, { message: string; attachments: [] }>(cbSendMessageApi(mid, cbId), {
    onSuccess: () => setDraft(""),
    onError: (e) => toast.error(apiErrorMessage(e, "Failed to send message.")),
  });

  const visible = showAll ? messages : messages.slice(-3);
  const isEmpty = !draft.trim();

  const submit = () => {
    if (isEmpty) {
      setShowError(true);
      return;
    }
    send.mutate({ message: draft, attachments: [] });
  };

  return (
    <DetailSection title="Comments">
      <p className="text-[13px] text-muted-foreground">
        Leave a note for our team if you need help or clarification
      </p>

      {isLoading ? (
        <Shimmer className="h-16 w-full rounded-md" />
      ) : (
        visible.length > 0 && (
          <ul className="flex flex-col gap-3">
            {visible.map((item, index) => {
              const name = item.username || "System";
              return (
                <li key={item.messageId ?? index} className="flex items-start gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
                      {initialsOf(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{name}</span>
                      {item.creationTime ? ` · ${formatTimestamp(item.creationTime, "")}` : ""}
                    </span>
                    <span className="whitespace-pre-wrap text-[13px] text-foreground/85">
                      {item.message}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      )}

      {messages.length > 3 && (
        <Button
          type="button"
          variant="link"
          onClick={() => setShowAll((prev) => !prev)}
          className="h-auto w-fit p-0 text-sm font-medium"
        >
          {showAll ? "Show less" : `View all ${messages.length} comments`}
        </Button>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        <Field>
          <Textarea
            aria-label="Comment"
            rows={2}
            placeholder="Share details or questions about this dispute…"
            value={draft}
            aria-invalid={showError && isEmpty}
            onChange={(e) => {
              setDraft(e.target.value);
              setShowError(false);
            }}
          />
          {showError && isEmpty ? <FieldError>Please enter your comment</FieldError> : null}
        </Field>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="w-fit"
          isLoading={send.isPending}
        >
          Send message
        </Button>
      </form>
    </DetailSection>
  );
}
