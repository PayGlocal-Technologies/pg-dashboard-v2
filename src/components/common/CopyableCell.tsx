"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

interface CopyableCellProps {
  value: string;
  /** Text actually written to the clipboard, if different from the displayed `value` (e.g. a truncated display). */
  copyValue?: string;
  /** Shown in the copy toast, e.g. "Username copied". */
  label: string;
  monospace?: boolean;
  className?: string;
}

/** Compact table-cell value with a hover-revealed copy button, relies on the
 * row's own `group` class (every DataTable `<tr>` already carries one for the
 * rowAction slot) so the icon only fades in on hover. Same interaction as
 * SettlementUtrCell, generalized for reuse across any table column. */
export function CopyableCell({ value, copyValue, label, monospace, className }: CopyableCellProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied, fail silently, non-critical affordance.
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className={cn(
          "whitespace-nowrap text-[13px] text-foreground",
          monospace && "font-mono",
          className
        )}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : `Copy ${label}`}
        className="h-5 w-5 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Icon name={copied ? "check" : "copy"} size={11} />
      </Button>
    </div>
  );
}
