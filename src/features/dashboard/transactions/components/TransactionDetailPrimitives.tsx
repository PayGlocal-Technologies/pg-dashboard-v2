import type { ReactNode } from "react";

// Shared by TransactionDetailsDrawer and TransactionDetailFeature so both
// present transaction fields with identical label/value typography.

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-[13px] font-semibold text-foreground/85">{value}</div>
    </div>
  );
}
