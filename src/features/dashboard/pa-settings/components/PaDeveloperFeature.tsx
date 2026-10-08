"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
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
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { cn } from "@/lib/utils";
import {
  MOCK_KEYS,
  MOCK_WEBHOOKS,
  type DeveloperKey,
  type KeyEnv,
  type WebhookEndpoint,
} from "@/features/dashboard/pa-settings/developer";
import { WebhookEndpointDialog } from "@/features/dashboard/pa-settings/components/WebhookEndpointDialog";

const ENV_OPTIONS = [
  { value: "live", label: "Live" },
  { value: "test", label: "Test" },
] as const;

const KEY_COPY: Record<
  DeveloperKey["kind"],
  { label: string; icon: "key-round" | "lock"; hint: string }
> = {
  publishable: {
    label: "Publishable key",
    icon: "key-round",
    hint: "Identifies your account in your checkout or app. Safe to use in client code.",
  },
  secret: {
    label: "Secret key",
    icon: "lock",
    hint: "Authenticates requests from your server. Never share it or put it in client code.",
  },
};

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Couldn't copy. Select the key and copy it manually.");
  }
}

/** A secret shown as dots until revealed; the length is fixed so the dots
 *  never hint at the key's own length. */
const MASK = "•".repeat(28);

function KeyRow({ envLabel, devKey }: { envLabel: string; devKey: DeveloperKey }) {
  const [revealed, setRevealed] = useState(false);
  const copyMeta = KEY_COPY[devKey.kind];
  const isSecret = devKey.kind === "secret";
  const label = `${envLabel} ${copyMeta.label.toLowerCase()}`;

  return (
    <li className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:gap-6">
      <div className="flex min-w-0 items-start gap-3 md:w-80 md:shrink-0">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isSecret
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-primary/10 text-primary"
          )}
        >
          <Icon name={copyMeta.icon} size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
            {copyMeta.label}
            {isSecret && (
              <Badge variant="warning" size="sm">
                Server-side only
              </Badge>
            )}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{copyMeta.hint}</p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center rounded-lg border border-border bg-muted/40 px-3">
          <span
            className={cn(
              "truncate font-mono text-[13px] text-foreground",
              isSecret && !revealed && "tracking-widest text-muted-foreground"
            )}
          >
            {isSecret && !revealed ? MASK : devKey.value}
          </span>
        </div>
        {isSecret && (
          <IconButton
            type="button"
            variant="outline"
            size="sm"
            aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
            onClick={() => setRevealed((r) => !r)}
            className="h-10 w-10 shrink-0 shadow-none"
          >
            <Icon name={revealed ? "eye-off" : "eye"} size={15} />
          </IconButton>
        )}
        <IconButton
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Copy ${label}`}
          onClick={() => void copy(devKey.value, copyMeta.label)}
          className="h-10 w-10 shrink-0 shadow-none"
        >
          <Icon name="copy" size={15} />
        </IconButton>
      </div>
    </li>
  );
}

function ApiKeysCard() {
  const router = useRouter();
  const [env, setEnv] = useState<KeyEnv>("live");
  const envLabel = env === "live" ? "Live" : "Test";

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 pb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">API keys</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Credentials your integration uses to talk to PayGlocal.
          </p>
        </div>
        <SegmentedTabs options={ENV_OPTIONS} value={env} onChange={(v) => setEnv(v as KeyEnv)} />
      </div>

      {/* Which environment these keys act on, so a test key is never
          mistaken for a live one. */}
      <div
        className={cn(
          "flex items-center gap-2 border-t border-border px-6 py-2.5 text-[13px]",
          env === "live"
            ? "bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
            : "bg-amber-500/5 text-amber-800 dark:text-amber-300"
        )}
      >
        <span
          aria-hidden
          className={cn("h-2 w-2 rounded-full", env === "live" ? "bg-emerald-500" : "bg-amber-500")}
        />
        {env === "live"
          ? "Live mode: these keys process real payments."
          : "Test mode: use these keys to try your integration. No money moves."}
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {MOCK_KEYS[env].map((k) => (
          // Keyed by environment too, so switching hides a revealed secret.
          <KeyRow key={`${env}-${k.kind}`} envLabel={envLabel} devKey={k} />
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-6 py-3">
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Icon name="shield-alert" size={14} aria-hidden className="shrink-0" />
          Never share secret keys. Rotate them immediately if they&apos;re compromised.
        </p>
        <Button
          type="button"
          variant="link"
          size="sm"
          rightIcon={<Icon name="arrow-right" className="h-3 w-3" />}
          onClick={() => router.push("/key-management-system")}
          className="h-auto min-h-0 p-0 text-xs font-semibold"
        >
          Manage keys
        </Button>
      </div>
    </Card>
  );
}

function WebhooksCard() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>(MOCK_WEBHOOKS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookEndpoint | undefined>(undefined);

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(endpoint: WebhookEndpoint) {
    setEditing(endpoint);
    setDialogOpen(true);
  }

  // MOCK: endpoints change in local state only. TODO(integration).
  function save(value: { url: string; events: string[] }) {
    if (editing) {
      setEndpoints((prev) => prev.map((e) => (e.id === editing.id ? { ...e, ...value } : e)));
      toast.success("Endpoint updated");
    } else {
      // A unique-enough id for a mock row: the next index after the current
      // list, not a random value (no Math.random outside an event's own data).
      setEndpoints((prev) => [
        ...prev,
        { id: `wh_${prev.length + 1}_${value.url}`, ...value, active: true },
      ]);
      toast.success("Endpoint added");
    }
  }

  function toggleActive(endpoint: WebhookEndpoint) {
    setEndpoints((prev) =>
      prev.map((e) => (e.id === endpoint.id ? { ...e, active: !e.active } : e))
    );
    toast.success(endpoint.active ? "Endpoint paused" : "Endpoint resumed");
  }

  function remove(endpoint: WebhookEndpoint) {
    setEndpoints((prev) => prev.filter((e) => e.id !== endpoint.id));
    toast.success("Endpoint deleted");
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 pb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Webhooks</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Endpoints that receive event notifications from PayGlocal.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
          onClick={openAdd}
        >
          Add endpoint
        </Button>
      </div>

      {endpoints.length === 0 ? (
        <div className="mx-6 mb-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon name="webhook" size={18} aria-hidden />
          </span>
          <p className="text-sm font-semibold text-foreground">No endpoints yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Add an endpoint to get notified when payments, refunds, settlements or disputes change.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {endpoints.map((endpoint) => (
            <li key={endpoint.id} className="flex items-start gap-4 px-6 py-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
                <Icon name="webhook" size={16} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate font-mono text-[13px] font-medium text-foreground">
                    {endpoint.url}
                  </p>
                  <StatusBadge
                    size="sm"
                    variant={endpoint.active ? "success" : "muted"}
                    label={endpoint.active ? "Active" : "Paused"}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {endpoint.events.map((event) => (
                    <span
                      key={event}
                      className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11.5px] text-foreground/80"
                    >
                      {event}
                    </span>
                  ))}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon name="activity" size={12} aria-hidden />
                  {endpoint.lastDelivery
                    ? `Last delivery ${endpoint.lastDelivery}`
                    : "No deliveries yet"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon name="pencil" className="h-3.5 w-3.5" />}
                  onClick={() => openEdit(endpoint)}
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
                      aria-label={`More actions for ${endpoint.url}`}
                    >
                      <Icon name="more-horizontal" size={16} />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuItem onClick={() => toggleActive(endpoint)}>
                      <Icon name={endpoint.active ? "pause" : "play"} className="h-3.5 w-3.5" />
                      {endpoint.active ? "Pause endpoint" : "Resume endpoint"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void copy(endpoint.url, "Endpoint URL")}>
                      <Icon name="copy" className="h-3.5 w-3.5" />
                      Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => remove(endpoint)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Icon name="trash-2" className="h-3.5 w-3.5" />
                      Delete endpoint
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      <WebhookEndpointDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        endpoint={editing}
        onSave={save}
      />
    </Card>
  );
}

/** The PA settings Developer page: API keys (live and test) and webhook
 *  endpoints. DESIGN MOCK, see developer.ts. */
export function PaDeveloperFeature() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Developer"
        subtitle="API keys and webhook endpoints for your integration."
      />
      <ApiKeysCard />
      <WebhooksCard />
    </div>
  );
}
