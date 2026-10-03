"use client";

import { Badge, Button, Card, DataTable, Shimmer, StatusBadge, type Column } from "@/components/ui";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { cn } from "@/lib/utils";
import { inr } from "@/features/dashboard/partner-home/format";
import type { TopMerchant } from "@/features/dashboard/partner-home/mock-data";

/** DataTable's own card and footer dropped: the section Card is the surface. */
const FLUSH_TABLE = "rounded-none border-0 bg-transparent [&>div+div]:hidden";

function Change({ pct }: { pct: number }) {
  return (
    <span
      className={cn(
        "text-[13px] tabular-nums",
        pct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      )}
    >
      {pct >= 0 ? "+" : "−"}
      {Math.abs(pct)}%
    </span>
  );
}

function Products({ products }: { products: TopMerchant["products"] }) {
  return (
    <span className="flex gap-1">
      {products.map((p) => (
        <Badge key={p} variant="secondary" size="sm">
          {p}
        </Badge>
      ))}
    </span>
  );
}

const COLUMNS: Column<TopMerchant>[] = [
  {
    key: "merchant",
    header: "Merchant",
    minWidth: 200,
    render: (m) => <span className="text-[13px] font-medium text-foreground">{m.merchant}</span>,
  },
  {
    key: "products",
    header: "Products",
    minWidth: 120,
    render: (m) => <Products products={m.products} />,
  },
  {
    key: "status",
    header: "Status",
    minWidth: 100,
    render: () => <StatusBadge variant="success" label="Live" size="sm" />,
  },
  {
    key: "grossVolume",
    header: "Gross volume",
    minWidth: 120,
    align: "right",
    render: (m) => (
      <span className="text-[13px] tabular-nums text-foreground">{inr(m.grossVolume)}</span>
    ),
  },
  {
    key: "transactions",
    header: "Transactions",
    minWidth: 110,
    align: "right",
    render: (m) => (
      <span className="text-[13px] tabular-nums text-muted-foreground">
        {m.transactions.toLocaleString("en-IN")}
      </span>
    ),
  },
  {
    key: "change",
    header: "vs last month",
    minWidth: 110,
    align: "right",
    render: (m) => <Change pct={m.changePct} />,
  },
  {
    key: "commission",
    header: "Your commission",
    minWidth: 130,
    align: "right",
    render: (m) => (
      <span className="text-[13px] font-semibold tabular-nums text-foreground">
        {inr(m.commission)}
      </span>
    ),
  },
];

/**
 * Top earning merchants: this month, ranked by the commission each earns the
 * partner. A table from md up, a compact list below (the MCA tables' own
 * split), so the page never scrolls sideways.
 */
export function TopMerchantsCard({
  merchants,
  isLoading,
  onSeeAll,
}: {
  merchants: TopMerchant[];
  isLoading?: boolean;
  onSeeAll: () => void;
}) {
  const ranked = [...merchants].sort((a, b) => b.commission - a.commission);

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Top earning merchants</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            This month, ranked by the commission they earn you.
          </p>
        </div>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onSeeAll}
          className="h-auto min-h-0 shrink-0 p-0 text-xs font-semibold"
        >
          See all live merchants
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2 px-5 pb-5">
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <PlaceholderState
          variant="no-transactions"
          size="sm"
          title="No live merchants yet"
          description="Merchants appear here once they go live and start earning you commission."
          className="pb-6"
        />
      ) : (
        <>
          <div className="hidden border-t border-border md:block">
            <DataTable
              columns={COLUMNS}
              data={ranked}
              rowKey={(m) => m.id}
              density="compact"
              headerStyle="minimal"
              className={FLUSH_TABLE}
            />
          </div>
          <ul className="divide-y divide-border border-t border-border md:hidden">
            {ranked.map((m) => (
              <li key={m.id} className="space-y-1.5 px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[13px] font-medium text-foreground">
                    {m.merchant}
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums text-foreground">
                    {inr(m.commission)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11.5px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Products products={m.products} />
                    {inr(m.grossVolume)} · {m.transactions.toLocaleString("en-IN")} txns
                  </span>
                  <Change pct={m.changePct} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
