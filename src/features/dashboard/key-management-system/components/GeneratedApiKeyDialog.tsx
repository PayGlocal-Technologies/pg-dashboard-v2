"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  IconButton,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import type { GeneratedApiKey } from "@/features/dashboard/key-management-system/types";

function SecretField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };
  return (
    <div>
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <p className="min-w-0 flex-1 font-mono text-[12.5px] break-all text-foreground">{value}</p>
        <IconButton
          aria-label={`Copy ${label}`}
          variant="ghost"
          size="sm"
          onClick={copy}
          className="-my-1 -mr-1.5 shrink-0"
        >
          <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

/**
 * A new API key, shown once: pg-dashboard's ApiKeyDrawer. The key, its id and
 * salt are never retrievable again, so each can be copied on its own, or all
 * three together in the same JSON pg-dashboard's Copy Keys writes. An outside
 * click doesn't close it: one stray click would lose the key for good.
 */
export function GeneratedApiKeyDialog({
  generated,
  onClose,
}: {
  generated: GeneratedApiKey | null;
  onClose: () => void;
}) {
  const copyAll = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          { apiKey: generated.apiKey, kid: generated.kid, salt: generated.salt },
          null,
          2
        )
      );
      toast.success("All keys copied to clipboard");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return (
    <Dialog open={!!generated} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {generated && (
          <>
            <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
              <DialogTitle>API key generated</DialogTitle>
              <DialogDescription>
                Use these with every API request your integration signs.
              </DialogDescription>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
              <Alert variant="warning">
                <AlertDescription>
                  This is the only time you can see this API key and salt. Copy them now and store
                  them somewhere secure.
                </AlertDescription>
              </Alert>
              <SecretField label="API key" value={generated.apiKey ?? ""} />
              <SecretField label="Key ID" value={generated.kid ?? ""} />
              <SecretField label="Salt" value={generated.salt ?? ""} />
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Done
              </Button>
              <Button
                type="button"
                leftIcon={<Icon name="copy" className="h-3.5 w-3.5" />}
                onClick={() => void copyAll()}
              >
                Copy all keys
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
