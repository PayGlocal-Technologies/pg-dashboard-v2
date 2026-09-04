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
import type { FeedbackPayload } from "@/features/dashboard/feedback/types";

/**
 * pg-dashboard's (v1) origin per environment — mirrors `dashboardOrigin()` in
 * `refer-and-earn/constants.ts` (UAT moved to pygcl.com; dev/test/prod stay on
 * payglocal.in). Kept local rather than imported: that helper is private to
 * the referral feature and this is the only other call site so far, so
 * sharing it isn't worth a new export yet.
 */
function oldDashboardOrigin(): string {
  const env = process.env.NEXT_PUBLIC_ENV;
  if (env === "prod") return "https://dashboard.payglocal.in";
  const domain = env === "uat" ? "pygcl.com" : "payglocal.in";
  return `https://${env ?? "dev"}.dashboard.${domain}`;
}

/**
 * "Switch to old view" — an escape hatch back to pg-dashboard for a merchant
 * who isn't ready for this one yet, with a two-question feedback ask on the
 * way out. A raw browser navigation, not `router.push`: pg-dashboard is a
 * separate app (a different origin outside prod, and outside this app's own
 * basePath even in prod — see `src/constants/basePath.ts`), not a route
 * within this one.
 *
 * The popover owns its own trigger, matching `HeaderHelpMenu` beside it, and
 * Radix doesn't mount `PopoverContent` until the trigger is actually clicked
 * — the form below never exists in the DOM until then.
 *
 * Feedback is best-effort: it rides the same generic "GENERAL" survey
 * endpoint the rest of the app uses, since there's no dedicated contract for
 * this flow. A failed submission never blocks the actual switch, via
 * `onSettled` rather than `onSuccess` — the merchant is leaving either way,
 * and a support-side hiccup shouldn't strand them here.
 */
export function SwitchToOldViewButton() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [changeRequest, setChangeRequest] = useState("");

  const { mutate: sendFeedback, isPending } = usePost<unknown, FeedbackPayload>(feedbackApi, {
    invalidateQueries: false,
  });

  const goToOldView = () => {
    window.location.href = `${oldDashboardOrigin()}/app`;
  };

  const handleSubmit = () => {
    sendFeedback(
      {
        type: "GENERAL",
        rating: 0,
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
              placeholder="Optional — we read every note"
              className="min-h-16 px-3 py-2 text-[13px] leading-normal"
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={goToOldView}>
            Skip
          </Button>
          <Button type="button" variant="primary" size="sm" isLoading={isPending} onClick={handleSubmit}>
            Send and continue
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
