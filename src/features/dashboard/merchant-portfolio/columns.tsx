"use client";

import { Button, type Column } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  FigureCell,
  PortfolioStatusBadge,
  ProductTags,
  inr,
} from "@/features/dashboard/merchant-portfolio/components/PortfolioBits";
import {
  figuresFor,
  formatAgo,
  formatDate,
  lifetimeFigures,
  type DateRange,
} from "@/features/dashboard/merchant-portfolio/derive";
import type {
  PeriodFigures,
  PortfolioMerchant,
  PortfolioPeriod,
} from "@/features/dashboard/merchant-portfolio/types";

/**
 * The portfolio table: which merchants are live, how they're performing and
 * what they contribute. Figures follow the selected period; a deactivated
 * merchant shows its whole history instead, marked "All time", so it never
 * reads as zero.
 */
export function buildPortfolioColumns({
  period,
  custom,
  nowMs,
  onViewTransactions,
}: {
  period: PortfolioPeriod;
  custom?: DateRange;
  nowMs: number;
  onViewTransactions: (m: PortfolioMerchant) => void;
}): Column<PortfolioMerchant>[] {
  const shown = (m: PortfolioMerchant): { f: PeriodFigures; allTime: boolean } => {
    const life = lifetimeFigures(m);
    return life ? { f: life, allTime: true } : { f: figuresFor(m, period, custom), allTime: false };
  };
  const byFigure = (k: keyof PeriodFigures) => (a: PortfolioMerchant, b: PortfolioMerchant) =>
    shown(a).f[k] - shown(b).f[k];

  return [
    {
      key: "merchant",
      header: "Merchant",
      minWidth: 220,
      cellClassName: "pl-5",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (m) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">{m.name}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{m.merchantId}</p>
        </div>
      ),
    },
    {
      key: "products",
      header: "Products",
      minWidth: 110,
      render: (m) => <ProductTags merchant={m} />,
    },
    {
      key: "status",
      header: "Status",
      minWidth: 120,
      render: (m) => <PortfolioStatusBadge merchant={m} />,
    },
    {
      key: "grossVolume",
      header: "Gross volume",
      minWidth: 130,
      align: "right",
      sorter: byFigure("grossVolume"),
      render: (m) => {
        const { f, allTime } = shown(m);
        return <FigureCell value={inr(f.grossVolume)} allTime={allTime} />;
      },
    },
    {
      key: "transactions",
      header: "Transactions",
      minWidth: 120,
      align: "right",
      sorter: byFigure("transactions"),
      render: (m) => {
        const { f, allTime } = shown(m);
        return <FigureCell value={f.transactions.toLocaleString("en-IN")} allTime={allTime} />;
      },
    },
    {
      key: "commission",
      header: "Commission",
      minWidth: 120,
      align: "right",
      sorter: byFigure("commission"),
      render: (m) => {
        const { f, allTime } = shown(m);
        return <FigureCell value={inr(f.commission)} allTime={allTime} />;
      },
    },
    {
      key: "lastTransaction",
      header: "Last transaction",
      minWidth: 150,
      cellClassName: "pl-6",
      sorter: (a, b) => a.lastTransactionAt.localeCompare(b.lastTransactionAt),
      render: (m) => (
        <span className="flex flex-col">
          <span className="whitespace-nowrap text-[12px] font-medium text-foreground">
            {formatAgo(m.lastTransactionAt, nowMs)}
          </span>
          {m.deactivatedOn && (
            <span className="text-[11px] text-muted-foreground">
              Deactivated {formatDate(m.deactivatedOn)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      minWidth: 150,
      render: (m) => (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            rightIcon={<Icon name="chevron-right" className="h-2.5 w-2.5" />}
            onClick={(e) => {
              e.stopPropagation();
              onViewTransactions(m);
            }}
            className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap shadow-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            View transactions
          </Button>
        </div>
      ),
    },
  ];
}
