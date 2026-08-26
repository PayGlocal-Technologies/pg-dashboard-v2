import type { ReactNode } from "react";

interface SettingsDetailRowProps {
  label: string;
  value: ReactNode;
}

/** Simple read-only label/value row, used for Personal details' "Full name".
 * Business details uses its own richer field row (label + description +
 * boxed value), see BusinessDetailsFeature. */
export function SettingsDetailRow({ label, value }: SettingsDetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
