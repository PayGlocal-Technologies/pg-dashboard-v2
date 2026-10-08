"use client";

import { toast } from "sonner";
import {
  Button,
  Callout,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  IconButton,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import type { KeyKind } from "@/features/dashboard/partner-keys/mock-data";

export interface GeneratedKey {
  kind: Exclude<KeyKind, "certificate">;
  kid: string;
}

/** MOCK one-time values: placeholders, never real credentials. */
const DEMO_API_KEY = "demo_api_key_000000000000000000000000";
const DEMO_SALT = "demo_salt_0000000000000000000000";

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Couldn't copy. Select the value and copy it manually.");
  }
}

function SecretRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-[13px] text-foreground">{value}</p>
      </div>
      <IconButton
        type="button"
        variant="outline"
        size="sm"
        aria-label={`Copy ${label}`}
        onClick={() => void copy(value, label)}
        className="h-10 w-10 shrink-0 shadow-none"
      >
        <Icon name="copy" size={15} />
      </IconButton>
    </div>
  );
}

/**
 * Shown once, right after a key is generated. An API key comes with its salt,
 * and both can only be copied now; an RSA key's private half is a file the
 * partner keeps.
 */
export function GeneratedKeyDialog({
  generated,
  onClose,
}: {
  generated: GeneratedKey | null;
  onClose: () => void;
}) {
  const isApi = generated?.kind === "apiKey";

  return (
    <Dialog open={!!generated} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <div className="flex flex-col items-center px-6 pt-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Icon name="check-circle" size={24} aria-hidden />
          </span>
          <DialogTitle className="mt-3 text-lg">
            {isApi ? "Your API key is ready" : "Your RSA key is ready"}
          </DialogTitle>
          <DialogDescription className="mt-1 max-w-sm text-[13px]">
            {isApi
              ? "Use the key and salt together to authenticate your API calls."
              : "Download the private key and store it securely. PayGlocal keeps only the public key."}
          </DialogDescription>
        </div>

        <div className="space-y-3 px-6 py-5">
          <Callout variant="warning">
            <Icon name="alert-triangle" size={16} aria-hidden className="mt-0.5 shrink-0" />
            <p className="text-[13px] leading-relaxed">
              {isApi
                ? "This is the only time you can copy the API key and salt. Copy them now and keep them somewhere secure."
                : "The private key can only be downloaded now. If you lose it, generate a new key."}
            </p>
          </Callout>

          {generated && <SecretRow label="Key ID" value={generated.kid} />}
          {isApi ? (
            <>
              <SecretRow label="API key" value={DEMO_API_KEY} />
              <SecretRow label="Salt key" value={DEMO_SALT} />
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
              onClick={() =>
                toast.message("Private key download isn't connected yet", {
                  description: "In the live page this downloads the key file.",
                })
              }
              className="w-full shadow-none"
            >
              Download private key
            </Button>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          {isApi && generated && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Icon name="copy" className="h-3.5 w-3.5" />}
              onClick={() =>
                void copy(
                  `Key ID: ${generated.kid}\nAPI key: ${DEMO_API_KEY}\nSalt key: ${DEMO_SALT}`,
                  "Key ID, API key and salt"
                )
              }
              className="shadow-none"
            >
              Copy all
            </Button>
          )}
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
