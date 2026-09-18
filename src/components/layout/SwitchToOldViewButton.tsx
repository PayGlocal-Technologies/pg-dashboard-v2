"use client";

import { useState } from "react";
import {
  Button,
  Field,
  FieldLabel,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { usePost } from "@/lib/api/hooks";
import { feedbackApi } from "@/features/dashboard/feedback/services";
import type {
  FeedbackSubmitResponse,
  SwitchBackFeedbackPayload,
} from "@/features/dashboard/feedback/types";

/**
 * "Switch to old view" — an escape hatch back to pg-dashboard for a merchant
 * who isn't ready for this one yet, with a two-question feedback ask on the
 * way out. A raw browser navigation, not `router.push`: pg-dashboard is a
 * separate app served from `/app` on the same origin as this one's `/app-v2`
 * (see `src/constants/basePath.ts`), so it is reachable only by leaving this
 * app's basePath, not by routing within it. Origin-relative so the switch
 * stays on whatever host the merchant is on — see `goToOldView`.
 *
 * The popover owns its own trigger, matching `HeaderHelpMenu` beside it, and
 * Radix doesn't mount `PopoverContent` until the trigger is actually clicked
 * — the form below never exists in the DOM until then.
 *
 * Feedback goes to POST /gcc/v3/feedback under its own survey type,
 * `SWITCH_BACK_TO_OLD_VIEW`: the two answers are sent as `freeText` (what is
 * making them switch) and `expectations` (what they want fixed or added). No
 * rating is sent — nothing here scores anything, and the contract for this
 * type carries no such field.
 *
 * Submission is best-effort. A failure never blocks the actual switch, via
 * `onSettled` rather than `onSuccess` — the merchant is leaving either way,
 * and a support-side hiccup shouldn't strand them here. Nothing is reported
 * back to them for the same reason: the navigation is already under way, so a
 * toast would be torn down before it could be read.
 */
export function SwitchToOldViewButton() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [changeRequest, setChangeRequest] = useState("");

  const { mutate: sendFeedback, isPending } = usePost<
    FeedbackSubmitResponse,
    SwitchBackFeedbackPayload
  >(feedbackApi, { invalidateQueries: false });

  const goToOldView = () => {
    // Origin-relative on purpose: pg-dashboard (the old view) is served from
    // `/app` on the SAME origin this app runs on (`/app-v2`), so switching must
    // stay on the current host — localhost when local, the uat/prod host when
    // deployed. Hardcoding a live host is what sent a local session off to uat.
    window.location.href = `${window.location.origin}/app/dashboard`;
  };

  const handleSubmit = () => {
    sendFeedback(
      {
        type: "SWITCH_BACK_TO_OLD_VIEW",
        freeText: reason.trim(),
        expectations: changeRequest.trim(),
      },
      { onSettled: goToOldView }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="history" size={15} className="text-muted-foreground" />}
          className="hidden text-[13px] text-muted-foreground hover:text-foreground sm:inline-flex"
        >
          Switch to old view
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[340px] p-4">
        <p className="text-[13px] font-semibold text-foreground">Before you go</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          Two quick questions help us make this view worth staying on.
        </p>

        <div className="mt-3.5 space-y-3">
          <Field>
            <FieldLabel htmlFor="switch-to-old-view-reason" className="text-[12.5px]">
              What&apos;s making you switch back?
            </FieldLabel>
            <Textarea
              id="switch-to-old-view-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us what isn't working for you here"
              className="min-h-16 px-3 py-2 text-[13px] leading-normal"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="switch-to-old-view-change-request" className="text-[12.5px]">
              Anything you&apos;d like us to fix or add?
            </FieldLabel>
            <Textarea
              id="switch-to-old-view-change-request"
              rows={2}
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
              placeholder="Optional, we read every note"
              className="min-h-16 px-3 py-2 text-[13px] leading-normal"
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={goToOldView}
          >
            Skip
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isPending}
            onClick={handleSubmit}
          >
            Send and continue
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
