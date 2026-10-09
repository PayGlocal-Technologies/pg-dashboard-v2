import { Card } from "@/components/ui";
import { DISPUTE_REASONS } from "@/features/dashboard/dispute-management/constants";

interface ReasonBreakdown {
  reason: string;
  count: number;
  pct: number;
}

interface DisputeReasonsCardProps {
  breakdown: ReasonBreakdown[];
}

export function DisputeReasonsCard({ breakdown }: DisputeReasonsCardProps) {
  // Empty shows every reason at zero on a dashed track (the MCA dashboard's
  // empty-chart idea), the same rows and height as when there is data.
  const isEmpty = breakdown.length === 0;
  const items = isEmpty
    ? DISPUTE_REASONS.map((reason) => ({ reason, count: 0, pct: 0 }))
    : breakdown;

  return (
    <Card className="h-full gap-4 p-5">
      <h2 className="text-sm font-semibold text-foreground">Dispute reasons</h2>

      <div className="flex flex-1 flex-col justify-center gap-3.5">
        {items.map((item) => (
          <div key={item.reason} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-foreground">{item.reason}</span>
              <span className="whitespace-nowrap text-muted-foreground">
                {item.count} dispute{item.count === 1 ? "" : "s"} · {item.pct}%
              </span>
            </div>
            {isEmpty ? (
              <div
                className="h-1.5 w-full rounded-full border border-dashed border-muted-foreground/40"
                aria-hidden="true"
              />
            ) : (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
