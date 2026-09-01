import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsDetailRowProps {
  label: string;
  /** Optional helper line under the label (Business details uses these). */
  description?: string;
  value: ReactNode;
}

/** Read-only label/value row shared by Personal details and Business details.
 *  The value is plain text, never a disabled input — a boxed field reads as
 *  editable and misleads the user. Rows with a description align to the top so
 *  the value sits level with the label, not the middle of the block. */
export function SettingsDetailRow({ label, description, value }: SettingsDetailRowProps) {
  return (
    <div
      className={cn(
        "flex justify-between gap-6 py-3",
        description ? "items-start" : "items-center"
      )}
    >
      <div className="max-w-xs">
        <p className="text-sm text-muted-foreground">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground/70">{description}</p>
        ) : null}
      </div>
      <div className="text-right text-sm font-semibold break-words text-foreground">{value}</div>
    </div>
  );
}
