import { Button, Card, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { SettlementPayment } from "@/features/dashboard/settlement-reports/types";

interface ReleasedFromHoldInfoPanelProps {
  onClose: () => void;
  payments: SettlementPayment[];
}

/** Explains the "Released from hold" chip in the Payments table, opened via
 * its info icon (either the per-row one or the summary one in the table
 * header). Same right-docked, non-overlay pattern as the other "About this
 * settlement" panels on this page, so every info interaction here behaves
 * identically. */
export function ReleasedFromHoldInfoPanel({ onClose, payments }: ReleasedFromHoldInfoPanelProps) {
  const count = payments.length;

  return (
    <Card className="sticky top-4 gap-5 p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">About released holds</p>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          aria-label="Close"
          className="h-7 w-7 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground"
        >
          <Icon name="x" size={14} />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon name="check-circle" size={16} />
        </span>
        <p className="text-sm font-semibold text-foreground">
          What does &quot;Released from hold&quot; mean?
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {count} payment{count === 1 ? " in this settlement was" : "s in this settlement were"}{" "}
          flagged during risk or compliance review and temporarily excluded from settlement while
          under review. Once cleared, they were included in the next available settlement cycle,
          this one.
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Released payments
        </p>
        <div className="divide-y divide-border rounded-lg border border-border">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] text-primary/80">{p.id}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {p.releasedFromHold?.reason}
                </p>
              </div>
              <Icon
                name="check-circle"
                size={14}
                className="shrink-0 text-emerald-500"
                aria-hidden
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
