"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
} from "@/components/ui";
import { usePost } from "@/lib/api/hooks";
import { requestPlatformApi } from "@/features/dashboard/platforms/services";
import type {
  RequestPlatformRequest,
  RequestPlatformResponse,
} from "@/features/dashboard/platforms/types";

/**
 * Lets a merchant name a platform this page doesn't cover yet.
 *
 * Ported from pg-dashboard's RequestPlatformForm, including its question ("Which
 * other platforms do you use?") and its single free-text field — the point is to
 * learn which marketplace to document next, not to collect a structured record.
 */
export function RequestPlatformDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [message, setMessage] = useState("");

  const { mutate: requestPlatform, isPending } = usePost<
    RequestPlatformResponse,
    RequestPlatformRequest
  >(requestPlatformApi, { invalidateQueries: false });

  const submit = () => {
    const platformRequestMessage = message.trim();
    if (!platformRequestMessage) return;

    requestPlatform(
      { platformRequestMessage },
      {
        onSuccess: (response) => {
          toast.success(response?.message || "Thanks, we've noted your request.");
          setMessage("");
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message || "Couldn't send your request."),
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // Dismissing discards the draft, so reopening starts clean rather than
        // showing a request the merchant chose not to send.
        if (!next) setMessage("");
      }}
    >
      {/* The close button keeps its default top-3 here: it centres on the
          header's title row, so the old top-6 nudge is no longer needed. */}
      <DialogContent className="flex max-h-[90vh] max-w-[min(100%,30rem)] flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle className="text-base font-semibold text-foreground">
            Request a platform
          </DialogTitle>

          <p className="mt-1 text-[13px] text-muted-foreground">
            Tell us where else you get paid and we&apos;ll look at adding a walkthrough for it.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <Field>
            <FieldLabel htmlFor="platform-request">Which other platforms do you use?</FieldLabel>
            <Input
              id="platform-request"
              autoComplete="off"
              placeholder="Enter a platform or marketplace"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              // Enter submits: a one-field form shouldn't need a trip to the
              // button.
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </Field>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={isPending || !message.trim()}>
            {isPending ? "Sending…" : "Submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
