"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import {
  AUTH_LABEL,
  MOCK_WEBHOOKS,
  WEBHOOK_EVENTS,
  type PartnerWebhook,
} from "@/features/dashboard/partner-webhooks/mock-data";
import {
  WebhookFormDialog,
  type WebhookFormValue,
} from "@/features/dashboard/partner-webhooks/components/WebhookFormDialog";

const EVENT_LABEL = Object.fromEntries(WEBHOOK_EVENTS.map((e) => [e.value, e.label]));

function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-[13px] text-foreground">{children}</div>
    </div>
  );
}

function WebhookCard({
  webhook,
  onEdit,
  onToggle,
  onDelete,
}: {
  webhook: PartnerWebhook;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* Identity: what it is, where it points, whether it's live. */}
      <div className="flex flex-wrap items-start gap-4 px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name="webhook" size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{webhook.groupName}</h2>
            <StatusBadge
              size="sm"
              variant={webhook.active ? "success" : "muted"}
              label={webhook.active ? "Active" : "Disabled"}
              trailIcon={webhook.active ? "check" : "x"}
            />
          </div>
          <CopyableText
            value={webhook.url}
            valueClassName="min-w-0 truncate font-mono text-[13px] text-muted-foreground"
            className="mt-1 max-w-full"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Icon name="pencil" className="h-3.5 w-3.5" />}
            onClick={onEdit}
            className="shadow-none"
          >
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`More actions for ${webhook.groupName}`}
              >
                <Icon name="more-horizontal" size={16} />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onClick={onToggle}>
                <Icon name={webhook.active ? "ban" : "play"} className="h-3.5 w-3.5" />
                {webhook.active ? "Disable endpoint" : "Enable endpoint"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                <Icon name="trash-2" className="h-3.5 w-3.5" />
                Delete endpoint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Its configuration, in one band. */}
      <div className="grid gap-x-8 gap-y-4 border-t border-border bg-muted/20 px-5 py-4 sm:grid-cols-[2fr_1fr]">
        <MetaItem label={`Subscribed events (${webhook.events.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {webhook.events.map((e) => (
              <span
                key={e}
                className="rounded-md border border-border bg-card px-2 py-0.5 text-xs text-foreground/85"
              >
                {EVENT_LABEL[e] ?? e}
              </span>
            ))}
          </div>
        </MetaItem>
        <MetaItem label="Authentication">
          <span className="flex items-center gap-1.5">
            <Icon
              name={webhook.authType === "NONE" ? "globe" : "lock"}
              size={13}
              aria-hidden
              className="text-muted-foreground"
            />
            {AUTH_LABEL[webhook.authType]}
            {webhook.authType === "BASIC" && webhook.authUser && (
              <span className="text-muted-foreground">· {webhook.authUser}</span>
            )}
          </span>
        </MetaItem>
        <MetaItem label="Configuration notes">
          <span className="text-muted-foreground">{webhook.notes}</span>
        </MetaItem>
        <MetaItem label="Last delivery">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Icon name="activity" size={13} aria-hidden />
            {webhook.lastDelivery ?? "No deliveries yet"}
          </span>
        </MetaItem>
      </div>
    </Card>
  );
}

/**
 * DESIGN MOCK: Partners → Webhooks. One card per endpoint (identity and
 * actions on top, configuration beneath), Add / Edit in one form, and a
 * confirmation before deleting. Changes stay on the page.
 */
export function PartnerWebhooksFeature() {
  const [webhooks, setWebhooks] = useState<PartnerWebhook[]>(MOCK_WEBHOOKS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PartnerWebhook | undefined>(undefined);
  const [deleting, setDeleting] = useState<PartnerWebhook | null>(null);

  function openAdd() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function save(value: WebhookFormValue) {
    if (editing) {
      setWebhooks((prev) =>
        prev.map((w) =>
          w.id === editing.id ? { ...w, ...value, authUser: value.authUser || undefined } : w
        )
      );
      toast.success("Endpoint updated");
    } else {
      setWebhooks((prev) => [
        {
          id: `wh-new-${value.url}`,
          ...value,
          authUser: value.authUser || undefined,
          active: true,
        },
        ...prev,
      ]);
      toast.success("Endpoint added");
    }
  }

  function toggle(webhook: PartnerWebhook) {
    setWebhooks((prev) => prev.map((w) => (w.id === webhook.id ? { ...w, active: !w.active } : w)));
    toast.success(webhook.active ? "Endpoint disabled" : "Endpoint enabled");
  }

  const activeCount = webhooks.filter((w) => w.active).length;

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Webhooks"
        subtitle="Get real-time updates from PayGlocal at your own endpoints."
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onClick={openAdd}
          >
            Add endpoint
          </Button>
        }
      />

      {webhooks.length > 0 && (
        <p className="text-[13px] text-muted-foreground">
          {webhooks.length} {webhooks.length === 1 ? "endpoint" : "endpoints"} · {activeCount}{" "}
          active
        </p>
      )}

      {webhooks.length === 0 ? (
        <Card className="items-center gap-2 border-dashed px-6 py-14 text-center shadow-none">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon name="webhook" size={20} aria-hidden />
          </span>
          <p className="text-sm font-semibold text-foreground">No endpoints yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Add an endpoint to get notified about settlements, FIRCs, compliance alerts and funding.
          </p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onClick={openAdd}
            className="mt-2"
          >
            Add endpoint
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((w) => (
            <WebhookCard
              key={w.id}
              webhook={w}
              onEdit={() => {
                setEditing(w);
                setFormOpen(true);
              }}
              onToggle={() => toggle(w)}
              onDelete={() => setDeleting(w)}
            />
          ))}
        </div>
      )}

      <WebhookFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        webhook={editing}
        onSave={save}
      />

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <div className="flex items-start gap-3 px-6 pt-6 pr-14">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
              <Icon name="trash-2" size={18} aria-hidden />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg leading-tight">Delete this endpoint?</DialogTitle>
              <DialogDescription className="mt-0.5 text-[13px]">
                PayGlocal will stop sending events to it. To pause it instead, disable it.
              </DialogDescription>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
              <p className="text-[13px] font-medium text-foreground">{deleting?.groupName}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {deleting?.url}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleting(null)}
              className="shadow-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                const target = deleting;
                setWebhooks((prev) => prev.filter((w) => w.id !== target?.id));
                setDeleting(null);
                toast.success("Endpoint deleted");
              }}
            >
              Delete endpoint
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
