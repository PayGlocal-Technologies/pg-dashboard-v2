"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  filterKeysByEnv,
  MOCK_API_KEYS,
  type ApiKeyEnvFilter,
} from "@/features/dashboard/settings/apiKeys";
import { BackendGapNotice } from "@/features/dashboard/settings/components/BackendGapNotice";

const ENV_TABS: { value: ApiKeyEnvFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "test", label: "Test" },
];

async function copyValue(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    // Clipboard access denied, non-critical affordance, fail silently.
  }
}

export function ApiKeysFeature() {
  const [envFilter, setEnvFilter] = useState<ApiKeyEnvFilter>("all");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const rows = filterKeysByEnv(MOCK_API_KEYS, envFilter);

  function toggleRevealed(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="API keys" subtitle="Live and test credentials for your integration." />

      <BackendGapNotice message="No API-key management endpoint exists yet — the keys shown are illustrative placeholders." />

      <Card className="gap-0 p-5">
        <div className="inline-flex w-fit items-center gap-0.5 rounded-full bg-muted p-1">
          {ENV_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              variant="ghost"
              onClick={() => setEnvFilter(tab.value)}
              className={cn(
                "h-auto min-h-0 rounded-full px-3.5 py-1.5 text-sm font-medium",
                envFilter === tab.value
                  ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {rows.map((row) => {
            const isSecret = row.kind === "secret";
            const isRevealed = revealed.has(row.id);
            const displayValue = isSecret && !isRevealed ? "•".repeat(28) : row.value;
            return (
              <div key={row.id} className="rounded-xl border border-border p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {row.label}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm text-foreground">
                    {displayValue}
                  </div>
                  {isSecret && (
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={isRevealed ? `Hide ${row.label}` : `Show ${row.label}`}
                      className="h-9 w-9 min-h-0 min-w-0 rounded-lg p-0"
                      onClick={() => toggleRevealed(row.id)}
                    >
                      <Icon name={isRevealed ? "eye-off" : "eye"} size={16} />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Copy ${row.label}`}
                    className="h-9 w-9 min-h-0 min-w-0 rounded-lg p-0"
                    onClick={() => void copyValue(row.value, row.label)}
                  >
                    <Icon name="copy" size={16} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon name="shield-check" size={13} />
          Never share secret keys. Rotate them immediately if compromised.
        </p>
      </Card>
    </div>
  );
}
