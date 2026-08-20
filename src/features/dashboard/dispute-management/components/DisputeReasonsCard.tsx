import { Card } from "@/components/ui";

interface ReasonBreakdown {
  reason: string;
  count: number;
  pct: number;
}

interface DisputeReasonsCardProps {
  breakdown: ReasonBreakdown[];
}

export function DisputeReasonsCard({ breakdown }: DisputeReasonsCardProps) {
  return (
    <Card className="h-full gap-4 p-5">
      <h2 className="text-sm font-semibold text-foreground">Dispute reasons</h2>

      <div className="flex flex-1 flex-col justify-center gap-3.5">
        {breakdown.map((item) => (
          <div key={item.reason} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-foreground">{item.reason}</span>
              <span className="whitespace-nowrap text-muted-foreground">
                {item.count} dispute{item.count === 1 ? "" : "s"} · {item.pct}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${item.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
