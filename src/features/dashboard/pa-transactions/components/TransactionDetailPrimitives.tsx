import type { ReactNode } from "react";

// Shared by TransactionDetailsDrawer and TransactionDetailFeature so both
// present transaction fields with identical label/value typography.

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {/* break-words: an arbitrary string value here (an ID, a long
       * unbroken merchant reference) has no whitespace to wrap on
       * otherwise, and would force this card — and the whole sticky
       * right-column grid track it sits in — wider than its 360px track,
       * causing page-level horizontal scroll. */}
      <div className="mt-0.5 wrap-break-word text-[13px] font-semibold text-foreground/85">
        {value}
      </div>
    </div>
  );
}
