"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Textarea,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/features/dashboard/partner-home/mock-data";

export type FollowUpKind = "send-reminder" | "resend-invite";

type Channel = "email" | "sms";

const COPY: Record<
  FollowUpKind,
  {
    icon: IconName;
    title: (merchant: string) => string;
    description: string;
    submit: string;
    sentTitle: string;
    sentNext: string;
  }
> = {
  "send-reminder": {
    icon: "bell",
    title: (m) => `Remind ${m}`,
    description: "Nudge the merchant to finish what's blocking their onboarding.",
    submit: "Send reminder",
    sentTitle: "Reminder sent",
    sentNext: "We'll update this merchant on your dashboard once they upload what's missing.",
  },
  "resend-invite": {
    icon: "send",
    title: (m) => `Resend invite to ${m}`,
    description: "Send the onboarding invite again, to the same or a corrected email.",
    submit: "Resend invite",
    sentTitle: "Invite resent",
    sentNext: "The new link replaces the earlier one. We'll show here when they open it.",
  },
};

function defaultMessage(kind: FollowUpKind, item: ActionItem): string {
  return kind === "send-reminder"
    ? `Hi, a quick reminder to finish setting up your PayGlocal account. Pending: ${item.issue}. It only takes a few minutes, and you can start accepting payments as soon as it's done.`
    : `Hi, you're invited to set up your PayGlocal account for ${item.product === "PA" ? "payment gateway" : "multi-currency"} payments. Use the link in this message to get started; it takes about 10 minutes.`;
}

function emailError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return "Enter the merchant's email";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : "Enter a valid email address";
}

/**
 * The follow-up a partner sends a stalled merchant: a reminder to finish
 * onboarding, or the invite again. Who it goes to and why, then the channels
 * and the message (editable), then a sent confirmation in place.
 *
 * MOCK: nothing is sent; the send waits briefly and succeeds.
 * TODO(integration): the partner reminder / resend-invite endpoints.
 */
export function MerchantFollowUpDialog({
  kind,
  item,
  open,
  onOpenChange,
  onSent,
}: {
  kind: FollowUpKind;
  item: ActionItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: (item: ActionItem, kind: FollowUpKind) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        {/* Mounted only while open, so each open starts from a fresh form. */}
        {open && item && (
          <FollowUpBody
            kind={kind}
            item={item}
            onClose={() => onOpenChange(false)}
            onSent={() => onSent(item, kind)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FollowUpBody({
  kind,
  item,
  onClose,
  onSent,
}: {
  kind: FollowUpKind;
  item: ActionItem;
  onClose: () => void;
  onSent: () => void;
}) {
  const copy = COPY[kind];
  const [sent, setSent] = useState<{ channels: Channel[]; email: string } | null>(null);

  const form = useForm({
    defaultValues: {
      channels: ["email"] as Channel[],
      email: item.contact.email,
      message: defaultMessage(kind, item),
      includeLink: true,
    },
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      // MOCK: stands in for the request.
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      setSent({ channels: value.channels, email: value.email.trim() });
      onSent();
    },
  });

  if (sent) {
    const via = sent.channels.map((c) => (c === "email" ? "email" : "SMS")).join(" and ");
    return (
      <div className="flex flex-col items-center px-6 pt-10 pb-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Icon name="check-circle" size={24} aria-hidden />
        </span>
        <DialogTitle className="mt-4 text-lg">{copy.sentTitle}</DialogTitle>
        <DialogDescription className="mt-1 max-w-sm text-[13px]">
          Sent to {item.merchant} by {via}
          {sent.channels.includes("email") ? ` (${sent.email})` : ""}.
        </DialogDescription>
        <p className="mt-3 max-w-sm text-xs text-muted-foreground">{copy.sentNext}</p>
        <Button type="button" variant="primary" size="sm" className="mt-6" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      noValidate
    >
      <div className="flex items-start gap-3 px-6 pt-6 pr-14">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name={copy.icon} size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <DialogTitle className="text-lg leading-tight">{copy.title(item.merchant)}</DialogTitle>
          <DialogDescription className="mt-0.5 text-[13px]">{copy.description}</DialogDescription>
        </div>
      </div>

      {/* Who it goes to, and why. */}
      <div className="mx-6 mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground">{item.merchant}</span>
          <Badge variant="secondary" size="sm">
            {item.product}
          </Badge>
          <span className="ml-auto text-[11px] font-medium text-amber-700 dark:text-amber-400">
            Waiting {item.waitingDays} {item.waitingDays === 1 ? "day" : "days"}
          </span>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-foreground/80">
          <Icon name="alert-circle" size={12} aria-hidden className="shrink-0 text-amber-600" />
          {item.issue}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon name="history" size={12} aria-hidden className="shrink-0" />
          {item.lastContact}
        </p>
      </div>

      <div className="space-y-5 px-6 py-5">
        <form.Field
          name="channels"
          validators={{
            onSubmit: ({ value }) =>
              value.length === 0 ? "Choose at least one way to send it" : undefined,
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel>Send by</FieldLabel>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "email", label: "Email", icon: "mail", detail: item.contact.email },
                    { value: "sms", label: "SMS", icon: "smartphone", detail: item.contact.phone },
                  ] as const
                ).map((c) => {
                  const checked = field.state.value.includes(c.value);
                  return (
                    <label
                      key={c.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                        checked
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={checked}
                        onCheckedChange={(next) =>
                          field.handleChange(
                            next === true
                              ? [...field.state.value, c.value]
                              : field.state.value.filter((v) => v !== c.value)
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                          <Icon name={c.icon} size={13} aria-hidden />
                          {c.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {c.detail}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <FieldError>{field.state.meta.errors[0]}</FieldError>
            </Field>
          )}
        </form.Field>

        {/* Resend only: the invite may have gone to the wrong address. */}
        {kind === "resend-invite" && (
          <form.Subscribe selector={(s) => s.values.channels.includes("email")}>
            {(byEmail) =>
              byEmail && (
                <form.Field
                  name="email"
                  validators={{
                    onBlur: ({ value }) => emailError(value),
                    onSubmit: ({ value }) => emailError(value),
                  }}
                >
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="followup-email">Merchant email</FieldLabel>
                      <Input
                        id="followup-email"
                        type="email"
                        inputMode="email"
                        aria-invalid={field.state.meta.errors.length > 0}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                      <FieldError>{field.state.meta.errors[0]}</FieldError>
                    </Field>
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>
        )}

        <form.Field
          name="message"
          validators={{
            onSubmit: ({ value }) => (value.trim() ? undefined : "Add a message"),
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="followup-message">Message</FieldLabel>
              <Textarea
                id="followup-message"
                rows={4}
                aria-invalid={field.state.meta.errors.length > 0}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="text-[13px] leading-relaxed"
              />
              <FieldError>{field.state.meta.errors[0]}</FieldError>
            </Field>
          )}
        </form.Field>

        {kind === "send-reminder" && (
          <form.Field name="includeLink">
            {(field) => (
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-foreground">
                <Checkbox
                  checked={field.state.value}
                  onCheckedChange={(next) => field.handleChange(next === true)}
                />
                Include a secure link to finish onboarding
              </label>
            )}
          </form.Field>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="shadow-none">
          Cancel
        </Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<Icon name={copy.icon} className="h-3.5 w-3.5" />}
            >
              {copy.submit}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
