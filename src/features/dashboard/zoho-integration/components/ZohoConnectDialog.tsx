"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { useAppForm } from "@/components/form/AppForm";
import { required, rules } from "@/components/form/rules";
import { Icon } from "@/components/icon";
import { ZohoConnectBadge } from "@/features/dashboard/zoho-integration/components/ZohoConnectBadge";
import type { IconName } from "@/components/icon";

/** What the merchant gets by linking, in production's wording and order. */
const BENEFITS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "refresh",
    title: "Auto-sync invoices from Zoho",
    description: "Invoices update automatically, nothing to upload.",
  },
  {
    icon: "repeat",
    title: "Zoho and PayGlocal reconciliation",
    description: "Paid status updates on both sides automatically.",
  },
  {
    icon: "download",
    title: "Download FIRA from Zoho",
    description: "Get FIRA for PayGlocal payments inside Zoho.",
  },
];

/**
 * Starts the OAuth round trip, and first asks which account the link belongs
 * to when the merchant holds several PACB MIDs.
 *
 * This is the only place in the flow that asks: a merchant has one Zoho
 * account, so the MID chosen here is the MID every later sync and disconnect
 * acts on, without asking again.
 */
export function ZohoConnectDialog({
  open,
  onOpenChange,
  onConnect,
  isConnecting,
  pacbMids,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (mid: string) => void;
  isConnecting: boolean;
  pacbMids: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[32rem]">
        <div className="flex shrink-0 flex-col items-center gap-2 border-b border-border px-6 pb-4 pt-10 text-center">
          <ZohoConnectBadge />
          <DialogTitle className="mt-1 text-base font-bold tracking-tight">
            Connect Zoho Books or Invoices
          </DialogTitle>
          <p className="text-[13px] text-muted-foreground">
            One connection keeps invoices, payments, and FIRA in sync.
          </p>
        </div>

        {/* Mounted with the content, so each opening starts with no pick. */}
        <ZohoConnectForm
          pacbMids={pacbMids}
          isConnecting={isConnecting}
          onConnect={onConnect}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The mid pick (only when there is more than one) and the actions. No account
 * at all is the one case Connect stays disabled, since nothing on screen could
 * fix it. A missing pick is a field: Connect stays live and a press names it
 * under the select (the app-wide rule, components/form).
 */
function ZohoConnectForm({
  pacbMids,
  isConnecting,
  onConnect,
  onCancel,
}: {
  pacbMids: string[];
  isConnecting: boolean;
  onConnect: (mid: string) => void;
  onCancel: () => void;
}) {
  const needsMidSelection = pacbMids.length > 1;
  const form = useAppForm({
    defaultValues: { mid: "" },
    onSubmit: ({ value }) => {
      const resolvedMid = value.mid || pacbMids[0] || "";
      if (resolvedMid) onConnect(resolvedMid);
    },
  });
  const connectBlockedReason = pacbMids.length ? null : "No MCA account is available to connect";

  return (
    <form.AppForm>
      <form.Form className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          {needsMidSelection && (
            <form.AppField name="mid" validators={{ onChange: rules(required("Mid")) }}>
              {(field) => (
                <field.SelectField
                  id="zoho-connect-mid"
                  label="Select the mid to connect"
                  labelClassName="text-[13px] font-semibold text-foreground"
                  className="gap-1.5"
                  placeholder="Select a mid"
                  // tabular-nums on the label, since SelectField takes no
                  // per-item class (the old SelectItem carried it).
                  options={pacbMids.map((mid) => ({
                    value: mid,
                    label: <span className="tabular-nums">{mid}</span>,
                  }))}
                />
              )}
            </form.AppField>
          )}

          <div className="space-y-2.5 rounded-xl border border-border bg-muted/40 p-3.5">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card">
                  <Icon name={benefit.icon} className="h-3.5 w-3.5 text-primary" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{benefit.title}</p>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="shield-check" className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            Your data stays safe and protected
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <form.SubmitButton disabledReason={connectBlockedReason} isLoading={isConnecting}>
              Connect securely
            </form.SubmitButton>
          </div>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
