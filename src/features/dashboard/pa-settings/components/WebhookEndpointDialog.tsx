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
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { WEBHOOK_EVENTS, type WebhookEndpoint } from "@/features/dashboard/pa-settings/developer";

function urlError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return "Enter the endpoint URL";
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") return "The URL must start with https://";
  } catch {
    return "Enter a valid URL, like https://api.yoursite.com/webhooks";
  }
  return undefined;
}

/** Add or edit a webhook endpoint: its URL and the events it receives. */
export function WebhookEndpointDialog({
  open,
  onOpenChange,
  endpoint,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The endpoint being edited; omitted when adding. */
  endpoint?: WebhookEndpoint;
  onSave: (value: { url: string; events: string[] }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        {/* Mounted only while open, so each open starts from a fresh form. */}
        {open && (
          <EndpointForm
            endpoint={endpoint}
            onCancel={() => onOpenChange(false)}
            onSave={(value) => {
              onSave(value);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EndpointForm({
  endpoint,
  onCancel,
  onSave,
}: {
  endpoint?: WebhookEndpoint;
  onCancel: () => void;
  onSave: (value: { url: string; events: string[] }) => void;
}) {
  const form = useForm({
    defaultValues: { url: endpoint?.url ?? "", events: endpoint?.events ?? [] },
    // The URL field validates on blur, and clicking Submit blurs it first;
    // without this an invalid URL stops the submit before the events check
    // runs, so only one of the two errors would ever show.
    canSubmitWhenInvalid: true,
    onSubmit: ({ value }) => onSave({ url: value.url.trim(), events: value.events }),
  });

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
          <Icon name="webhook" size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <DialogTitle className="text-lg leading-tight">
            {endpoint ? "Edit endpoint" : "Add endpoint"}
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-[13px]">
            PayGlocal sends an HTTPS POST to this URL when a selected event happens.
          </DialogDescription>
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        <form.Field
          name="url"
          validators={{
            onBlur: ({ value }) => urlError(value),
            onSubmit: ({ value }) => urlError(value),
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="webhook-url">Endpoint URL</FieldLabel>
              <Input
                id="webhook-url"
                type="url"
                inputMode="url"
                autoFocus
                placeholder="https://api.yoursite.com/webhooks/payglocal"
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

        <form.Field
          name="events"
          validators={{
            onSubmit: ({ value }) => (value.length === 0 ? "Select at least one event" : undefined),
          }}
        >
          {(field) => (
            <Field>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel>Events to send</FieldLabel>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto min-h-0 p-0 text-xs font-semibold"
                  onClick={() =>
                    field.handleChange(
                      field.state.value.length === WEBHOOK_EVENTS.length
                        ? []
                        : WEBHOOK_EVENTS.map((e) => e.name)
                    )
                  }
                >
                  {field.state.value.length === WEBHOOK_EVENTS.length ? "Clear all" : "Select all"}
                </Button>
              </div>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {WEBHOOK_EVENTS.map((event) => {
                  const checked = field.state.value.includes(event.name);
                  return (
                    <label
                      key={event.name}
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
                              ? [...field.state.value, event.name]
                              : field.state.value.filter((n) => n !== event.name)
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block font-mono text-[12.5px] font-medium text-foreground">
                          {event.name}
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
          {endpoint ? "Save changes" : "Add endpoint"}
        </Button>
      </div>
    </form>
  );
}
