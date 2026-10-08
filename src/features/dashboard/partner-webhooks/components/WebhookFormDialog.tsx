"use client";

import { useForm } from "@tanstack/react-form";
import {
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
  PasswordInput,
  Textarea,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  AUTH_LABEL,
  WEBHOOK_EVENTS,
  type PartnerWebhook,
  type WebhookAuthType,
} from "@/features/dashboard/partner-webhooks/mock-data";

export interface WebhookFormValue {
  groupName: string;
  url: string;
  events: string[];
  authType: WebhookAuthType;
  authUser: string;
  notes: string;
}

const AUTH_OPTIONS: { value: WebhookAuthType; icon: IconName; hint: string }[] = [
  { value: "NONE", icon: "globe", hint: "Open endpoint" },
  { value: "BASIC", icon: "user", hint: "Username and password" },
  { value: "BEARER", icon: "lock", hint: "Token in the header" },
];

function urlError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return "Enter the endpoint URL";
  try {
    if (new URL(v).protocol !== "https:") return "The URL must start with https://";
  } catch {
    return "Enter a valid URL, like https://your-server.com/webhooks";
  }
  return undefined;
}

const required = (msg: string) => ({
  onSubmit: ({ value }: { value: string }) => (value.trim() ? undefined : msg),
});

/** Add or edit a webhook endpoint (DESIGN MOCK: saves to the page only). */
export function WebhookFormDialog({
  open,
  onOpenChange,
  webhook,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The endpoint being edited; omitted when adding. */
  webhook?: PartnerWebhook;
  onSave: (value: WebhookFormValue) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {/* Mounted only while open, so each open starts from a fresh form. */}
        {open && (
          <WebhookForm
            webhook={webhook}
            onCancel={() => onOpenChange(false)}
            onSave={(v) => {
              onSave(v);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function WebhookForm({
  webhook,
  onCancel,
  onSave,
}: {
  webhook?: PartnerWebhook;
  onCancel: () => void;
  onSave: (value: WebhookFormValue) => void;
}) {
  const editing = !!webhook;
  const form = useForm({
    defaultValues: {
      groupName: webhook?.groupName ?? "",
      url: webhook?.url ?? "",
      events: webhook?.events ?? ([] as string[]),
      authType: webhook?.authType ?? ("NONE" as WebhookAuthType),
      authUser: webhook?.authUser ?? "",
      authSecret: "",
      notes: webhook?.notes ?? "",
    },
    canSubmitWhenInvalid: true,
    onSubmit: ({ value }) =>
      onSave({
        groupName: value.groupName.trim(),
        url: value.url.trim(),
        events: value.events,
        authType: value.authType,
        authUser: value.authType === "BASIC" ? value.authUser.trim() : "",
        notes: value.notes.trim(),
      }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex items-start gap-3 border-b border-border px-6 pt-6 pb-4 pr-14">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="webhook" size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <DialogTitle className="text-lg leading-tight">
            {editing ? "Edit endpoint" : "Add endpoint"}
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-[13px]">
            PayGlocal sends an HTTPS POST to this URL whenever a selected event happens.
          </DialogDescription>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {/* ── Endpoint ── */}
        <section className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Endpoint
          </p>
          <form.Field name="groupName" validators={required("Name this endpoint")}>
            {(field) => (
              <Field>
                <FieldLabel htmlFor="wh-group">Group name</FieldLabel>
                <Input
                  id="wh-group"
                  autoFocus
                  placeholder="e.g. Transaction webhooks"
                  aria-invalid={field.state.meta.errors.length > 0}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>
          <form.Field
            name="url"
            validators={{
              onBlur: ({ value }) => urlError(value),
              onSubmit: ({ value }) => urlError(value),
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="wh-url">Endpoint URL</FieldLabel>
                <Input
                  id="wh-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://your-server.com/webhooks"
                  className="font-mono text-[13px]"
                  aria-invalid={field.state.meta.errors.length > 0}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>
        </section>

        {/* ── Events ── */}
        <form.Field
          name="events"
          validators={{
            onSubmit: ({ value }) => (value.length ? undefined : "Select at least one event"),
          }}
        >
          {(field) => (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Events to send
                </p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto min-h-0 p-0 text-xs font-semibold"
                  onClick={() =>
                    field.handleChange(
                      field.state.value.length === WEBHOOK_EVENTS.length
                        ? []
                        : WEBHOOK_EVENTS.map((e) => e.value)
                    )
                  }
                >
                  {field.state.value.length === WEBHOOK_EVENTS.length ? "Clear all" : "Select all"}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {WEBHOOK_EVENTS.map((event) => {
                  const checked = field.state.value.includes(event.value);
                  return (
                    <label
                      key={event.value}
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
                              ? [...field.state.value, event.value]
                              : field.state.value.filter((v) => v !== event.value)
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-foreground">
                          {event.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {event.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <FieldError>{field.state.meta.errors[0]}</FieldError>
            </section>
          )}
        </form.Field>

        {/* ── Authentication ── */}
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Authentication
          </p>
          <form.Field name="authType">
            {(field) => (
              <div
                role="radiogroup"
                aria-label="Authentication type"
                className="grid gap-2 sm:grid-cols-3"
              >
                {AUTH_OPTIONS.map((opt) => {
                  const selected = field.state.value === opt.value;
                  return (
                    <Button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      variant="outline"
                      onClick={() => field.handleChange(opt.value)}
                      className={cn(
                        "h-auto min-h-0 justify-start rounded-lg px-3 py-2.5 text-left whitespace-normal shadow-none",
                        "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary hover:bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Icon
                        name={opt.icon}
                        size={15}
                        aria-hidden
                        className={selected ? "text-primary" : "text-muted-foreground"}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-foreground">
                          {AUTH_LABEL[opt.value]}
                        </span>
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          {opt.hint}
                        </span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(s) => s.values.authType}>
            {(authType) =>
              authType === "BASIC" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <form.Field name="authUser" validators={required("Enter the username")}>
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="wh-user">Username</FieldLabel>
                        <Input
                          id="wh-user"
                          autoComplete="off"
                          aria-invalid={field.state.meta.errors.length > 0}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        <FieldError>{field.state.meta.errors[0]}</FieldError>
                      </Field>
                    )}
                  </form.Field>
                  <form.Field
                    name="authSecret"
                    validators={editing ? undefined : required("Enter the password")}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="wh-pass">Password</FieldLabel>
                        <PasswordInput
                          id="wh-pass"
                          autoComplete="new-password"
                          placeholder={editing ? "Leave blank to keep" : undefined}
                          aria-invalid={field.state.meta.errors.length > 0}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        <FieldError>{field.state.meta.errors[0]}</FieldError>
                      </Field>
                    )}
                  </form.Field>
                </div>
              ) : authType === "BEARER" ? (
                <form.Field
                  name="authSecret"
                  validators={editing ? undefined : required("Enter the token")}
                >
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="wh-token">Bearer token</FieldLabel>
                      <PasswordInput
                        id="wh-token"
                        autoComplete="off"
                        placeholder={editing ? "Leave blank to keep the current token" : undefined}
                        aria-invalid={field.state.meta.errors.length > 0}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError>{field.state.meta.errors[0]}</FieldError>
                    </Field>
                  )}
                </form.Field>
              ) : null
            }
          </form.Subscribe>
        </section>

        {/* ── Notes ── */}
        <form.Field
          name="notes"
          validators={required("Add a short note on what this endpoint is for")}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="wh-notes">Configuration notes</FieldLabel>
              <Textarea
                id="wh-notes"
                rows={3}
                placeholder="What this endpoint is for, and who owns it"
                aria-invalid={field.state.meta.errors.length > 0}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="text-[13px]"
              />
              <FieldError>{field.state.meta.errors[0]}</FieldError>
            </Field>
          )}
        </form.Field>
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="shadow-none"
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm">
          {editing ? "Save changes" : "Add endpoint"}
        </Button>
      </div>
    </form>
  );
}
