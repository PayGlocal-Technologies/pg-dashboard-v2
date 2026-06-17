"use client";

/**
 * Option B usage display: surfaces Claude Code's own `/usage` view. If the
 * pseudo-terminal capture isn't available, falls back to a link to the account
 * usage page. (Subscription quota has no public API — see IMPLEMENTATION §8.)
 */
import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import type { AgentUsageResult } from "@/lib/design-agent/types";

export function UsageDialog() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentUsageResult | null>(null);

  const load = async (open: boolean) => {
    if (!open) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/design-agent/usage", { cache: "no-store" });
      setResult((await res.json()) as AgentUsageResult);
    } catch {
      setResult({ kind: "fallback", accountUrl: "https://claude.ai/settings/usage" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={load}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Usage & limits">
          <Icon name="gauge" className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md z-[2147483647]" overlayClassName="z-[2147483646]">
        <DialogTitle>Usage & limits</DialogTitle>
        <DialogDescription>Your current Claude usage for this account.</DialogDescription>

        {loading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Icon name="loader" className="h-4 w-4 animate-spin" /> Loading usage…
          </div>
        )}

        {!loading && result?.kind === "view" && (
          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
            {result.text}
          </pre>
        )}

        {!loading && result?.kind === "fallback" && (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Live usage couldn&apos;t be read here. Check it in your Claude account.
            </p>
            <Button
              size="sm"
              leftIcon={<Icon name="arrow-up-right" />}
              onClick={() => window.open(result.accountUrl, "_blank", "noreferrer")}
            >
              Open usage page
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
