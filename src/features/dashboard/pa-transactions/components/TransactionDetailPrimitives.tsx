import type { ReactNode } from "react";
import { Button, Card, CardContent } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// Shared by TransactionDetailsDrawer, TransactionDetailFeature and
// DisputeDetailFeature so they present transaction fields with identical
// label/value typography. Matched to the Multi-Currency Accounts transaction
// details page (mca-transactions/components/TransactionDetailsPage.tsx), so a
// Payments transaction and an MCA one read as the same screen.

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

interface DetailRowProps {
  /** Usually text; a node when the label carries an ⓘ explanation. */
  label: ReactNode;
  value: ReactNode;
}

/** Label above, value below, as in the MCA details cards. */
export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      {/* break-words: an arbitrary string value here (an ID, a long
       * unbroken merchant reference) has no whitespace to wrap on
       * otherwise, and would force this card, and the whole right-column
       * grid track it sits in, wider than its track, causing page-level
       * horizontal scroll. */}
      <div className="wrap-break-word text-[13px] font-medium text-foreground">{value}</div>
    </div>
  );
}
